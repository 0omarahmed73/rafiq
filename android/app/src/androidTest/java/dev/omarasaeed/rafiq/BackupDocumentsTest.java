package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public class BackupDocumentsTest {
    private static final String SAMPLE_BACKUP = "{\"version\":1,\"exportedAt\":\"2026-10-31T10:00:00.000Z\",\"data\":{" +
        "\"checkins\":[],\"practices\":[],\"followups\":[],\"letters\":[],\"weeklyReviews\":[]," +
        "\"sessions\":[],\"stepProgress\":[],\"soothingList\":[{\"id\":\"fixture\",\"text\":\"بيانات عربية من ملف اختباري\"," +
        "\"source\":\"user\",\"updatedAt\":\"2026-10-31T10:00:00.000Z\"}],\"settings\":[{\"id\":\"settings\"," +
        "\"theme\":\"system\",\"displayName\":\"اسم عربي\",\"updatedAt\":\"2026-10-31T10:00:00.000Z\"}]," +
        "\"agendaPoints\":[],\"yearPlan\":[]}}";

    @Test
    public void saveUsesLocalOpenableJsonPickerAndWritesArabicUtf8() throws Exception {
        Uri destination = BackupDocumentFixtureProvider.uri("saved.json");
        PickerMonitor picker = installPicker(Intent.ACTION_CREATE_DOCUMENT, Activity.RESULT_OK, destination);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            setDisplayName(activity, "اسم عربي اختباري");
            clickButton(activity, "تصدير نسخة احتياطية");

            Intent requested = awaitPicker(picker);
            assertPickerIntent(requested, Intent.ACTION_CREATE_DOCUMENT);
            assertTrue(requested.getStringExtra(Intent.EXTRA_TITLE).endsWith(".json"));
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'تم حفظ النسخة الاحتياطية.')");
            String written = readFixture("saved.json");
            assertTrue("JSON backup should contain the synthetic Arabic profile text", written.contains("اسم عربي اختباري"));
            assertTrue(written.contains("\"version\":1"));
        } finally {
            removePicker(picker);
        }
    }

    @Test
    public void cancelledSaveSettlesWithoutReportingSuccess() throws Exception {
        PickerMonitor picker = installPicker(Intent.ACTION_CREATE_DOCUMENT, Activity.RESULT_CANCELED, null);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            String before = backupTimestamp(activity);
            clickButton(activity, "تصدير نسخة احتياطية");

            Intent requested = awaitPicker(picker);
            assertPickerIntent(requested, Intent.ACTION_CREATE_DOCUMENT);
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'لم أحفظ النسخة الاحتياطية.')");
            assertEquals("cancelled save must not update the timestamp", before, backupTimestamp(activity));
        } finally {
            removePicker(picker);
        }
    }

    @Test
    public void providerWriteFailureRejectsAndDoesNotReportSaved() throws Exception {
        PickerMonitor picker = installPicker(Intent.ACTION_CREATE_DOCUMENT, Activity.RESULT_OK,
            BackupDocumentFixtureProvider.uri("fail.json"));
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            String before = backupTimestamp(activity);
            clickButton(activity, "تصدير نسخة احتياطية");

            assertPickerIntent(awaitPicker(picker), Intent.ACTION_CREATE_DOCUMENT);
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=alert]')).some(el => el.textContent.trim() === 'تعذّر حفظ النسخة الاحتياطية.')");
            assertEquals("failed write must not update the timestamp", before, backupTimestamp(activity));
        } finally {
            removePicker(picker);
        }
    }

    @Test
    public void openReadsArabicProviderTextAndImportsOnlyAfterConfirmation() throws Exception {
        writeFixture("incoming.json", SAMPLE_BACKUP);
        PickerMonitor picker = installPicker(Intent.ACTION_OPEN_DOCUMENT, Activity.RESULT_OK,
            BackupDocumentFixtureProvider.uri("incoming.json"));
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            clickButton(activity, "اختيار ملف النسخة الاحتياطية");

            Intent requested = awaitPicker(picker);
            assertPickerIntent(requested, Intent.ACTION_OPEN_DOCUMENT);
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'استيراد')");
            assertEquals("picker returns text but does not import before confirmation", "missing", soothingFixtureState(activity));
            clickButton(activity, "استيراد");
            clickButton(activity, "نعم، أستورد");
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'تم استيراد النسخة الاحتياطية.')");
            assertEquals("imported Arabic row should be in IndexedDB", "present", soothingFixtureState(activity));
        } finally {
            removePicker(picker);
        }
    }

    @Test
    public void cancelledOpenClearsPreviousFileAndProviderErrorsAreReported() throws Exception {
        writeFixture("first.json", SAMPLE_BACKUP);
        PickerMonitor selected = installPicker(Intent.ACTION_OPEN_DOCUMENT, Activity.RESULT_OK,
            BackupDocumentFixtureProvider.uri("first.json"));
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            try {
                clickButton(activity, "اختيار ملف النسخة الاحتياطية");
                assertPickerIntent(awaitPicker(selected), Intent.ACTION_OPEN_DOCUMENT);
                assertWebViewExpression(activity, "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'استيراد')");
            } finally {
                removePicker(selected);
            }

            PickerMonitor cancelled = installPicker(Intent.ACTION_OPEN_DOCUMENT, Activity.RESULT_CANCELED, null);
            try {
                clickButton(activity, "اختيار ملف النسخة الاحتياطية");
                assertPickerIntent(awaitPicker(cancelled), Intent.ACTION_OPEN_DOCUMENT);
                assertWebViewExpression(activity, "!Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'استيراد')");
                assertEquals("a cancelled selection must not import the previously selected file", "missing", soothingFixtureState(activity));
            } finally {
                removePicker(cancelled);
            }

            PickerMonitor failed = installPicker(Intent.ACTION_OPEN_DOCUMENT, Activity.RESULT_OK,
                BackupDocumentFixtureProvider.uri("fail.json"));
            try {
                clickButton(activity, "اختيار ملف النسخة الاحتياطية");
                assertPickerIntent(awaitPicker(failed), Intent.ACTION_OPEN_DOCUMENT);
                assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=alert]')).some(el => el.textContent.trim() === 'تعذّر اختيار ملف النسخة الاحتياطية.')");
                assertEquals("provider read error must leave prior records unchanged", "missing", soothingFixtureState(activity));
            } finally {
                removePicker(failed);
            }
        }
    }

    @Test
    public void interruptedPickerDoesNotRestoreStaleImportAfterActivityRecreation() throws Exception {
        PickerMonitor pending = installPendingPicker(Intent.ACTION_OPEN_DOCUMENT);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            clickButton(activity, "اختيار ملف النسخة الاحتياطية");
            assertPickerIntent(awaitPicker(pending), Intent.ACTION_OPEN_DOCUMENT);

            scenario.recreate();
            MainActivity recreated = awaitActivity(scenario);
            assertWebViewExpression(recreated, "document.readyState === 'complete' && !!document.querySelector('#root button')");
            openSettings(recreated);
            assertWebViewExpression(recreated, "!Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'استيراد')");
        } finally {
            removePicker(pending);
        }
    }

    @Test
    public void invalidJsonDoesNotMutateExistingData() throws Exception {
        writeFixture("invalid.json", "{not json");
        PickerMonitor picker = installPicker(Intent.ACTION_OPEN_DOCUMENT, Activity.RESULT_OK,
            BackupDocumentFixtureProvider.uri("invalid.json"));
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            clickButton(activity, "اختيار ملف النسخة الاحتياطية");
            assertPickerIntent(awaitPicker(picker), Intent.ACTION_OPEN_DOCUMENT);
            clickButton(activity, "استيراد");
            clickButton(activity, "نعم، أستورد");
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=alert]')).some(el => el.textContent.trim() === 'الملف غير صالح')");
            assertEquals("invalid backup must not add fixture data", "missing", soothingFixtureState(activity));
        } finally {
            removePicker(picker);
        }
    }

    private static PickerMonitor installPicker(String action, int resultCode, Uri uri) {
        Intent resultData = new Intent();
        if (uri != null) resultData.setData(uri);
        PickerMonitor monitor = new PickerMonitor(pickerFilter(action), new Instrumentation.ActivityResult(resultCode, resultData), true);
        registerPicker(monitor);
        return monitor;
    }

    private static void registerPicker(PickerMonitor monitor) {
        InstrumentationRegistry.getInstrumentation().addMonitor(monitor.recorder);
        InstrumentationRegistry.getInstrumentation().addMonitor(monitor);
    }

    private static IntentFilter pickerFilter(String action) {
        IntentFilter filter = new IntentFilter(action);
        filter.addCategory(Intent.CATEGORY_OPENABLE);
        try {
            filter.addDataType("application/json");
        } catch (IntentFilter.MalformedMimeTypeException error) {
            throw new AssertionError(error);
        }
        return filter;
    }

    private static PickerMonitor installPendingPicker(String action) {
        PickerMonitor monitor = new PickerMonitor(pickerFilter(action), null, true);
        registerPicker(monitor);
        return monitor;
    }

    private static void removePicker(PickerMonitor monitor) {
        InstrumentationRegistry.getInstrumentation().removeMonitor(monitor);
        InstrumentationRegistry.getInstrumentation().removeMonitor(monitor.recorder);
    }

    private static Intent awaitPicker(PickerMonitor monitor) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (monitor.requested != null) return monitor.requested;
            Thread.sleep(100);
        }
        throw new AssertionError("timed out waiting for intercepted document picker; hits=" + monitor.getHits());
    }

    private static void assertPickerIntent(Intent intent, String action) {
        assertEquals(action, intent.getAction());
        assertEquals("application/json", intent.getType());
        assertTrue("picker should be local-only", intent.getBooleanExtra(Intent.EXTRA_LOCAL_ONLY, false));
        assertTrue("picker should expose only openable documents", intent.hasCategory(Intent.CATEGORY_OPENABLE));
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
        clearSoothingFixture(activity);
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

    private static String soothingFixtureState(MainActivity activity) throws Exception {
        String script = "window.__backupFixtureState = 'checking'; (async () => {" +
            "const db = await new Promise((resolve, reject) => { const request = indexedDB.open('rafiq'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); });" +
            "const rows = await new Promise((resolve, reject) => { const request = db.transaction('soothingList', 'readonly').objectStore('soothingList').getAll(); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); });" +
            "window.__backupFixtureState = rows.some(row => row.id === 'fixture') ? 'present' : 'missing';" +
            "})().catch(error => window.__backupFixtureState = 'error:' + String(error)); 'started'";
        assertEquals("start IndexedDB fixture assertion", "started", evaluate(activity, script));
        assertWebViewExpression(activity, "window.__backupFixtureState !== 'checking'");
        return evaluate(activity, "window.__backupFixtureState");
    }

    private static String backupTimestamp(MainActivity activity) throws Exception {
        String script = "window.__backupTimestamp = 'checking'; (async () => {" +
            "const db = await new Promise((resolve, reject) => { const request = indexedDB.open('rafiq'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); });" +
            "const row = await new Promise((resolve, reject) => { const request = db.transaction('settings', 'readonly').objectStore('settings').get('settings'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); });" +
            "window.__backupTimestamp = row?.lastBackupAt || '';" +
            "})().catch(error => window.__backupTimestamp = 'error:' + String(error)); 'started'";
        assertEquals("start backup timestamp assertion", "started", evaluate(activity, script));
        assertWebViewExpression(activity, "window.__backupTimestamp !== 'checking'");
        return evaluate(activity, "window.__backupTimestamp");
    }

    private static void clearSoothingFixture(MainActivity activity) throws Exception {
        String script = "window.__backupFixtureCleared = 'checking'; (async () => {" +
            "const db = await new Promise((resolve, reject) => { const request = indexedDB.open('rafiq'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); });" +
            "await new Promise((resolve, reject) => { const request = db.transaction('soothingList', 'readwrite').objectStore('soothingList').delete('fixture'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); });" +
            "window.__backupFixtureCleared = 'done';" +
            "})().catch(error => window.__backupFixtureCleared = 'error:' + String(error)); 'started'";
        assertEquals("start synthetic fixture cleanup", "started", evaluate(activity, script));
        assertWebViewExpression(activity, "window.__backupFixtureCleared === 'done'");
    }

    private static void writeFixture(String name, String text) throws Exception {
        Bundle extras = new Bundle();
        extras.putString("text", text);
        Bundle result = InstrumentationRegistry.getInstrumentation().getTargetContext().getContentResolver()
            .call(BackupDocumentFixtureProvider.uri(name), "writeFixture", name, extras);
        assertTrue("fixture provider wrote " + name, result != null && result.getBoolean("ok"));
    }

    private static String readFixture(String name) throws Exception {
        Bundle result = InstrumentationRegistry.getInstrumentation().getTargetContext().getContentResolver()
            .call(BackupDocumentFixtureProvider.uri(name), "readFixture", name, null);
        assertTrue("fixture provider read " + name, result != null && result.getBoolean("ok"));
        return result.getString("text");
    }

    private static String evaluate(MainActivity activity, String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, result::complete);
        });
        return result.get(15, TimeUnit.SECONDS).replace("\\\"", "\"").replaceAll("^\"|\"$", "");
    }

    private static final class PickerMonitor extends Instrumentation.ActivityMonitor {
        private volatile Intent requested;
        private final Instrumentation.ActivityMonitor recorder;

        PickerMonitor(IntentFilter filter, Instrumentation.ActivityResult result, boolean block) {
            super(filter, result, block);
            final String action = filter.getAction(0);
            // A no-argument monitor receives every start request; it records the picker intent and lets the blocking monitor answer.
            recorder = new Instrumentation.ActivityMonitor() {
                @Override
                public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                    if (action.equals(intent.getAction())) requested = new Intent(intent);
                    return null;
                }
            };
        }
    }
}
