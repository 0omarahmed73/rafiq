package dev.omarasaeed.rafiq;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.os.Bundle;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Synthetic, test-apk-only content provider used to exercise document picker streams. */
public final class BackupDocumentFixtureProvider extends ContentProvider {
    public static final String AUTHORITY = "dev.omarasaeed.rafiq.test.documents";

    public static Uri uri(String name) {
        return Uri.parse("content://" + AUTHORITY + "/" + name);
    }

    public static File file(File directory, String name) {
        File files = new File(directory, "synthetic-documents");
        if (!files.isDirectory() && !files.mkdirs() && !files.isDirectory()) {
            throw new IllegalStateException("Could not create fixture directory: " + files.getAbsolutePath());
        }
        return new File(files, name);
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        return "application/json";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        String name = uri.getLastPathSegment();
        if ("fail.json".equals(name)) throw new FileNotFoundException("Synthetic provider failure");
        File target = file(getContext().getCacheDir(), name);
        if (mode.contains("w")) {
            return ParcelFileDescriptor.open(target,
                ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_TRUNCATE);
        }
        return ParcelFileDescriptor.open(target, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Bundle call(String method, String arg, Bundle extras) {
        Bundle result = new Bundle();
        try {
            File target = file(getContext().getCacheDir(), arg);
            if ("writeFixture".equals(method)) {
                String text = extras == null ? null : extras.getString("text");
                if (text == null) throw new IllegalArgumentException("Fixture text is missing");
                try (FileOutputStream output = new FileOutputStream(target, false)) {
                    output.write(text.getBytes(StandardCharsets.UTF_8));
                }
                result.putBoolean("ok", true);
                return result;
            }
            if ("readFixture".equals(method)) {
                byte[] bytes = new byte[(int) target.length()];
                try (FileInputStream input = new FileInputStream(target)) {
                    int offset = 0;
                    while (offset < bytes.length) {
                        int count = input.read(bytes, offset, bytes.length - offset);
                        if (count < 0) break;
                        offset += count;
                    }
                }
                result.putBoolean("ok", true);
                result.putString("text", new String(bytes, StandardCharsets.UTF_8));
                return result;
            }
        } catch (IOException error) {
            throw new IllegalStateException("Could not access synthetic fixture", error);
        }
        throw new IllegalArgumentException("Unknown fixture operation: " + method);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
