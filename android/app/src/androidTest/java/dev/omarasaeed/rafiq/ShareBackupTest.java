package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public class ShareBackupTest {
    @Test
    public void shareOpensChooserWithReadOnlyJsonStreamHoldingCompleteArabicBackup() throws Exception {
        ChooserMonitor chooser = installChooser();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            setDisplayName(activity, "اسم عربي للمشاركة");
            clickButton(activity, "مشاركة نسخة احتياطية");

            Intent chooserIntent = awaitChooser(chooser);
            Intent send = chooserIntent.getParcelableExtra(Intent.EXTRA_INTENT);
            assertNotNull("chooser wraps the send intent", send);
            assertEquals(Intent.ACTION_SEND, send.getAction());
            assertEquals("application/json", send.getType());
            assertTrue("receiver gets a read grant", (send.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0);
            assertEquals("no write grant", 0, send.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            Uri stream = send.getParcelableExtra(Intent.EXTRA_STREAM);
            assertNotNull(stream);
            assertEquals("content", stream.getScheme());
            assertEquals("dev.omarasaeed.rafiq.fileprovider", stream.getAuthority());

            String shared = read(stream);
            assertTrue("shared file holds the Arabic profile", shared.contains("اسم عربي للمشاركة"));
            assertTrue(shared.contains("\"version\":1"));
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'فتحتُ قائمة المشاركة.')");
        } finally {
            removeChooser(chooser);
        }
    }

    @Test
    public void sharingTwiceLeavesOnlyTheLatestTemporaryFile() throws Exception {
        ChooserMonitor chooser = installChooser();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            clickButton(activity, "مشاركة نسخة احتياطية");
            awaitChooser(chooser);
            chooser.requested = null;
            clickButton(activity, "مشاركة نسخة احتياطية");
            awaitChooser(chooser);

            File[] files = new File(context().getCacheDir(), "shared-backups").listFiles();
            assertNotNull(files);
            assertEquals("older shared copies are deleted", 1, files.length);
        } finally {
            removeChooser(chooser);
        }
    }

    @Test
    public void staleSharedFilesAreRemovedWhenTheAppStarts() throws Exception {
        File directory = new File(context().getCacheDir(), "shared-backups");
        assertTrue(directory.isDirectory() || directory.mkdirs());
        File stale = new File(directory, "rafiq-backup-stale.json");
        assertTrue(stale.createNewFile() || stale.exists());
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitActivity(scenario);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (stale.exists() && System.nanoTime() < deadline) Thread.sleep(100);
            assertTrue("stale copy removed on launch", !stale.exists());
        }
    }

    private static Context context() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    private static String read(Uri uri) throws Exception {
        try (InputStream input = context().getContentResolver().openInputStream(uri)) {
            assertNotNull(input);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) > 0) out.write(buffer, 0, count);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private static ChooserMonitor installChooser() {
        ChooserMonitor monitor = new ChooserMonitor();
        InstrumentationRegistry.getInstrumentation().addMonitor(monitor.recorder);
        InstrumentationRegistry.getInstrumentation().addMonitor(monitor);
        return monitor;
    }

    private static void removeChooser(ChooserMonitor monitor) {
        InstrumentationRegistry.getInstrumentation().removeMonitor(monitor);
        InstrumentationRegistry.getInstrumentation().removeMonitor(monitor.recorder);
    }

    private static Intent awaitChooser(ChooserMonitor monitor) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (monitor.requested != null) return monitor.requested;
            Thread.sleep(100);
        }
        throw new AssertionError("timed out waiting for the intercepted share sheet; hits=" + monitor.getHits());
    }

    private static MainActivity awaitActivity(ActivityScenario<MainActivity> scenario) throws Exception {
        CompletableFuture<MainActivity> result = new CompletableFuture<>();
        scenario.onActivity(result::complete);
        return result.get(10, TimeUnit.SECONDS);
    }

    private static void openSettings(MainActivity activity) throws Exception {
        assertWebViewExpression(activity, "document.readyState === 'complete' && !!document.querySelector('#root button')");
        if ("1".equals(evaluate(activity, "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'أفهم، لنبدأ') ? '1' : '0'"))) {
            clickButton(activity, "أفهم، لنبدأ");
        }
        assertEquals("navigate to settings", "settings", evaluate(activity,
            "history.pushState({}, '', '/settings'); window.dispatchEvent(new PopStateEvent('popstate')); 'settings'"));
        assertWebViewExpression(activity, "document.querySelector('h1')?.textContent.trim() === 'الإعدادات'");
    }

    private static void setDisplayName(MainActivity activity, String name) throws Exception {
        String escaped = name.replace("\\", "\\\\").replace("'", "\\'");
        String script = "(() => { const label = Array.from(document.querySelectorAll('label')).find(item => item.textContent.trim().startsWith('اسمي'));" +
            "if (!label) return '0'; const input = label.querySelector('input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;" +
            "setter.call(input, '" + escaped + "'); input.dispatchEvent(new Event('input', { bubbles: true })); return '1'; })()";
        assertEquals("set synthetic Arabic display name", "1", evaluate(activity, script));
        clickButton(activity, "حفظ معلوماتي");
        assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'تم الحفظ')");
    }

    private static void clickButton(MainActivity activity, String label) throws Exception {
        String quoted = "'" + label.replace("\\", "\\\\").replace("'", "\\'") + "'";
        assertWebViewExpression(activity, "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === " + quoted + ")");
        String script = "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === " + quoted + " && (button.click(), true)) ? '1' : '0'";
        assertEquals("click button " + label, "1", evaluate(activity, script));
    }

    private static void assertWebViewExpression(MainActivity activity, String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (System.nanoTime() < deadline) {
            if ("1".equals(evaluate(activity, expression + " ? '1' : '0'"))) return;
            Thread.sleep(150);
        }
        throw new AssertionError("timed out waiting for WebView expression: " + expression);
    }

    private static String evaluate(MainActivity activity, String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, result::complete);
        });
        return result.get(15, TimeUnit.SECONDS).replace("\\\"", "\"").replaceAll("^\"|\"$", "");
    }

    private static final class ChooserMonitor extends Instrumentation.ActivityMonitor {
        private volatile Intent requested;
        private final Instrumentation.ActivityMonitor recorder;

        ChooserMonitor() {
            super(new IntentFilter(Intent.ACTION_CHOOSER), new Instrumentation.ActivityResult(Activity.RESULT_CANCELED, new Intent()), true);
            // A no-argument monitor sees every start request; it records the chooser while the blocking monitor answers it.
            recorder = new Instrumentation.ActivityMonitor() {
                @Override
                public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                    if (Intent.ACTION_CHOOSER.equals(intent.getAction())) requested = new Intent(intent);
                    return null;
                }
            };
        }
    }
}
