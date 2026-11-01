package dev.omarasaeed.rafiq;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.content.ClipData;
import android.os.Bundle;
import android.text.TextUtils;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Local-only backup document access through Android's Storage Access Framework. */
@CapacitorPlugin(name = "RafiqDocuments")
public final class RafiqDocumentsPlugin extends Plugin {
    private static final String JSON_MIME = "application/json";
    private final Object callLock = new Object();
    private PluginCall activeCall;

    @PluginMethod
    public void saveBackup(PluginCall call) {
        String filename = call.getString("filename");
        String text = call.getString("text");
        if (TextUtils.isEmpty(text)) {
            call.reject("Backup contents are missing");
            return;
        }
        if (!begin(call)) return;

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(JSON_MIME)
            .putExtra(Intent.EXTRA_TITLE, safeFilename(filename))
            .putExtra(Intent.EXTRA_LOCAL_ONLY, true);
        launchPicker(call, intent, "saveBackupResult");
    }

    @Override
    public void load() {
        // A shared copy only needs to outlive the share sheet, so anything left from an earlier run is stale.
        clearSharedBackups();
    }

    @PluginMethod
    public void shareBackup(PluginCall call) {
        String text = call.getString("text");
        if (TextUtils.isEmpty(text)) {
            call.reject("Backup contents are missing");
            return;
        }
        try {
            clearSharedBackups();
            File directory = sharedBackupsDirectory();
            if (!directory.isDirectory() && !directory.mkdirs() && !directory.isDirectory()) {
                throw new IOException("Could not create " + directory);
            }
            File file = new File(directory, safeFilename(call.getString("filename")));
            try (OutputStream output = new FileOutputStream(file, false)) {
                output.write(text.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND)
                .setType(JSON_MIME)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            send.setClipData(ClipData.newRawUri(file.getName(), uri));
            Intent chooser = Intent.createChooser(send, null);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (IOException | RuntimeException error) {
            call.reject("Could not open the share sheet", error);
        }
    }

    private File sharedBackupsDirectory() {
        return new File(getContext().getCacheDir(), "shared-backups");
    }

    private void clearSharedBackups() {
        File[] old = sharedBackupsDirectory().listFiles();
        if (old == null) return;
        for (File file : old) {
            if (!file.delete()) file.deleteOnExit();
        }
    }

    @PluginMethod
    public void readBackup(PluginCall call) {
        if (!begin(call)) return;

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(JSON_MIME)
            .putExtra(Intent.EXTRA_LOCAL_ONLY, true);
        launchPicker(call, intent, "readBackupResult");
    }

    private void launchPicker(PluginCall call, Intent intent, String callbackName) {
        bridge.executeOnMainThread(() -> {
            if (!isActive(call)) return;
            try {
                startActivityForResult(call, intent, callbackName);
            } catch (ActivityNotFoundException | IllegalStateException | SecurityException error) {
                rejectActive(call, "Could not open the local document picker", error);
            }
        });
    }

    @ActivityCallback
    private void saveBackupResult(PluginCall call, ActivityResult result) {
        if (!isActive(call)) {
            rejectDangling(call);
            return;
        }
        if (result == null || result.getResultCode() != Activity.RESULT_OK) {
            resolveCancelled(call);
            return;
        }
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (uri == null) {
            rejectActive(call, "The document picker returned no destination", null);
            return;
        }

        String text = call.getString("text");
        execute(() -> {
            if (!isActive(call)) return;
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IllegalStateException("The document provider returned no output stream");
                try (OutputStreamWriter writer = new OutputStreamWriter(output, StandardCharsets.UTF_8)) {
                    writer.write(text);
                    writer.flush();
                }
                resolveSaved(call);
            } catch (Exception error) {
                rejectActive(call, "Could not write the backup document", error);
            }
        });
    }

    @ActivityCallback
    private void readBackupResult(PluginCall call, ActivityResult result) {
        if (!isActive(call)) {
            rejectDangling(call);
            return;
        }
        if (result == null || result.getResultCode() != Activity.RESULT_OK) {
            resolveCancelled(call);
            return;
        }
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (uri == null) {
            rejectActive(call, "The document picker returned no file", null);
            return;
        }

        execute(() -> {
            if (!isActive(call)) return;
            try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
                if (input == null) throw new IllegalStateException("The document provider returned no input stream");
                StringBuilder text = new StringBuilder();
                try (InputStreamReader reader = new InputStreamReader(input, StandardCharsets.UTF_8)) {
                    char[] buffer = new char[8192];
                    int count;
                    while ((count = reader.read(buffer)) != -1) text.append(buffer, 0, count);
                }
                if (!complete(call)) return;
                JSObject response = new JSObject();
                response.put("cancelled", false);
                response.put("text", text.toString());
                call.resolve(response);
            } catch (Exception error) {
                rejectActive(call, "Could not read the backup document", error);
            }
        });
    }

    private final SummaryPrinter printer = new SummaryPrinter(null);

    @PluginMethod
    public void printSummary(PluginCall call) {
        String html = call.getString("html");
        if (TextUtils.isEmpty(html)) {
            call.reject("Summary contents are missing");
            return;
        }
        bridge.executeOnMainThread(() -> {
            if (getActivity() == null) {
                call.reject("The app is not in the foreground");
                return;
            }
            printer.print(getActivity(), html, SummaryPrinter.SYSTEM_LAUNCHER, new SummaryPrinter.Callback() {
                @Override
                public void onHandedOff() {
                    call.resolve();
                }

                @Override
                public void onFailed(Exception error) {
                    boolean busy = error.getMessage() != null && error.getMessage().startsWith("DOCUMENT_PRINT_BUSY");
                    if (busy) call.reject("A print is already open", "DOCUMENT_PRINT_BUSY");
                    else call.reject("Could not open the print dialog", error);
                }
            });
        });
    }

    private boolean begin(PluginCall call) {
        boolean busy;
        synchronized (callLock) {
            busy = activeCall != null;
            if (!busy) activeCall = call;
        }
        if (busy) call.reject("Another document operation is already in progress", "DOCUMENT_PICKER_BUSY");
        return !busy;
    }

    private boolean isActive(PluginCall call) {
        if (call == null) return false;
        synchronized (callLock) {
            return activeCall != null && activeCall.getCallbackId().equals(call.getCallbackId());
        }
    }

    private boolean complete(PluginCall call) {
        synchronized (callLock) {
            if (activeCall == null || call == null ||
                !activeCall.getCallbackId().equals(call.getCallbackId())) return false;
            activeCall = null;
            return true;
        }
    }

    private void resolveCancelled(PluginCall call) {
        if (!complete(call)) {
            rejectDangling(call);
            return;
        }
        JSObject response = new JSObject();
        response.put("cancelled", true);
        call.resolve(response);
    }

    private void resolveSaved(PluginCall call) {
        if (!complete(call)) return;
        JSObject response = new JSObject();
        response.put("cancelled", false);
        call.resolve(response);
    }

    private void rejectActive(PluginCall call, String message, Exception error) {
        if (!complete(call)) {
            rejectDangling(call);
            return;
        }
        if (error == null) call.reject(message);
        else call.reject(message, error);
    }

    private void rejectDangling(PluginCall call) {
        if (call != null && PluginCall.CALLBACK_ID_DANGLING.equals(call.getCallbackId())) {
            call.reject("Document operation was interrupted; choose the file again");
        }
    }

    private static String safeFilename(String filename) {
        String value = filename == null ? "" : filename.trim().replaceAll("[\\\\/\\p{Cntrl}]", "_");
        if (value.isEmpty()) value = "rafiq-backup.json";
        if (!value.toLowerCase(Locale.ROOT).endsWith(".json")) value += ".json";
        return value;
    }

    @Override
    protected Bundle saveInstanceState() {
        // The picker result is never replayed after process death. The interrupted call is rejected
        // in handleOnDestroy and the user must explicitly choose a file again.
        return null;
    }

    @Override
    protected void handleOnDestroy() {
        PluginCall interrupted;
        synchronized (callLock) {
            interrupted = activeCall;
            activeCall = null;
        }
        if (interrupted != null) interrupted.reject("Document operation was interrupted; choose the file again");
    }
}
