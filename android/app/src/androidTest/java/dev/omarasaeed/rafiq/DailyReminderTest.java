package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.accessibilityservice.AccessibilityService;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.service.notification.StatusBarNotification;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.After;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;

import java.util.Calendar;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Emulator-only. Grants or revokes the notification permission through UiAutomation on the disposable test device.
 * Revoking a granted permission kills the app process (which is the test process), so the no-permission case must
 * run first, before any test grants it; the tests are ordered by name for that reason.
 */
@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class DailyReminderTest {
    private static final String PERMISSION = "android.permission.POST_NOTIFICATIONS";
    private static final String BODY = "آخذ لحظة للاطمئنان على نفسي.";

    @After
    public void cleanUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();
    }

    private static void setPermission(boolean granted) {
        String pkg = InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName();
        if (granted) InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(pkg, PERMISSION);
        else InstrumentationRegistry.getInstrumentation().getUiAutomation().revokeRuntimePermission(pkg, PERMISSION);
    }

    @Test
    public void a_startupNeverPromptsAndSchedulesNothingWithoutPermission() throws Exception {
        setPermission(false);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            assertEquals("no pending reminder", 0, pending(activity).length());
            assertTrue("the app still has focus: no system permission dialog appeared", activity.hasWindowFocus());
            assertTrue("permission is not granted", !"granted".equals(plugin(activity, "checkPermissions()").getString("display")));
        }
    }

    @Test
    public void b_savingKeepsExactlyOneGenericDailyReminderAndDisablingCancelsIt() throws Exception {
        setPermission(true);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);

            saveReminder(activity, "20", "30");
            JSONArray first = pending(activity);
            assertEquals(1, first.length());
            assertEquals(1, first.getJSONObject(0).getInt("id"));
            assertEquals("رفيق", first.getJSONObject(0).getString("title"));
            assertEquals(BODY, first.getJSONObject(0).getString("body"));

            String alarms = alarmDump();
            android.util.Log.i("DailyReminderTest", "ALARM-DUMP-START\n" + rafiqAlarmLines(alarms) + "\nALARM-DUMP-END");
            assertTrue("one inexact alarm is registered for the app", rafiqAlarmLines(alarms).contains("dev.omarasaeed.rafiq"));

            saveReminder(activity, "07", "05");
            assertEquals("a changed time replaces the alarm", 1, pending(activity).length());

            clickButton(activity, "إيقاف التذكير");
            waitFor(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'أوقفتُ التذكير.')");
            assertEquals("disabling cancels it", 0, pending(activity).length());
        }
    }

    @Test
    public void c_deliversTheGenericNotificationWhileTheAppIsInTheBackground() throws Exception {
        setPermission(true);
        Calendar due = Calendar.getInstance();
        due.add(Calendar.MINUTE, 1);
        String hour = String.format("%02d", due.get(Calendar.HOUR_OF_DAY));
        String minute = String.format("%02d", due.get(Calendar.MINUTE));
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            openSettings(activity);
            saveReminder(activity, hour, minute);
        }
        InstrumentationRegistry.getInstrumentation().getUiAutomation().performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);

        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        // The alarm is inexact on purpose, so Android may deliver it somewhat after the minute; allow a few minutes.
        long deadline = System.nanoTime() + TimeUnit.MINUTES.toNanos(5);
        StatusBarNotification delivered = null;
        while (System.nanoTime() < deadline && delivered == null) {
            for (StatusBarNotification n : manager.getActiveNotifications()) if (n.getId() == 1) delivered = n;
            if (delivered == null) Thread.sleep(2000);
        }
        assertNotNull("the reminder was delivered while the app was in the background", delivered);
        assertEquals("رفيق", delivered.getNotification().extras.getCharSequence(Notification.EXTRA_TITLE).toString());
        assertEquals(BODY, delivered.getNotification().extras.getCharSequence(Notification.EXTRA_TEXT).toString());
        assertEquals("rafiq-daily", delivered.getNotification().getChannelId());
    }

    private static void saveReminder(MainActivity activity, String hour, String minute) throws Exception {
        for (String[] field : new String[][] {{"reminder-hour", hour}, {"reminder-minute", minute}}) {
            evaluate(activity, "(() => { const s = document.getElementById('" + field[0] + "'); s.value = '" + field[1]
                + "'; s.dispatchEvent(new Event('change', { bubbles: true })); return '1'; })()");
        }
        clickButton(activity, "حفظ التذكير");
        waitFor(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.startsWith('تم حفظ التذكير'))");
    }

    private static String alarmDump() throws Exception {
        try (java.io.InputStream in = new android.os.ParcelFileDescriptor.AutoCloseInputStream(
            InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("dumpsys alarm"))) {
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    private static String rafiqAlarmLines(String dump) {
        StringBuilder out = new StringBuilder();
        for (String line : dump.split("\n")) if (line.contains("dev.omarasaeed.rafiq")) out.append(line.trim()).append('\n');
        return out.toString();
    }

    private static JSONArray pending(MainActivity activity) throws Exception {
        return plugin(activity, "getPending()").getJSONArray("notifications");
    }

    /** Calls a LocalNotifications method from the page and returns its JSON result. */
    private static JSONObject plugin(MainActivity activity, String call) throws Exception {
        evaluate(activity, "window.__r = undefined; Capacitor.Plugins.LocalNotifications." + call
            + ".then(r => window.__r = JSON.stringify(r)).catch(e => window.__r = JSON.stringify({ error: String(e) })); '1'");
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (System.nanoTime() < deadline) {
            String value = evaluate(activity, "window.__r === undefined ? '' : window.__r");
            if (!value.isEmpty()) return new JSONObject(value);
            Thread.sleep(150);
        }
        throw new AssertionError("timed out waiting for " + call);
    }

    private static void openSettings(MainActivity activity) throws Exception {
        waitFor(activity, "document.readyState === 'complete' && !!document.querySelector('#root button')");
        evaluate(activity, "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'أفهم، لنبدأ'); if (b) b.click(); return '1'; })()");
        evaluate(activity, "history.pushState({}, '', '/settings'); window.dispatchEvent(new PopStateEvent('popstate')); '1'");
        waitFor(activity, "document.querySelector('h1')?.textContent.trim() === 'الإعدادات' && !!document.getElementById('reminder-hour')");
    }

    private static void clickButton(MainActivity activity, String label) throws Exception {
        waitFor(activity, "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '" + label + "')");
        assertEquals("1", evaluate(activity, "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '" + label + "' && (b.click(), true)) ? '1' : '0'"));
    }

    private static MainActivity awaitActivity(ActivityScenario<MainActivity> scenario) throws Exception {
        CompletableFuture<MainActivity> result = new CompletableFuture<>();
        scenario.onActivity(result::complete);
        return result.get(10, TimeUnit.SECONDS);
    }

    /** Runs a script and returns its string result (decoded from the JSON the WebView hands back). */
    private static String evaluate(MainActivity activity, String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, result::complete);
        });
        Object value = new JSONTokener(result.get(15, TimeUnit.SECONDS)).nextValue();
        return value == null || JSONObject.NULL.equals(value) ? "" : String.valueOf(value);
    }

    private static void waitFor(MainActivity activity, String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (System.nanoTime() < deadline) {
            if ("1".equals(evaluate(activity, "(" + expression + ") ? '1' : '0'"))) return;
            Thread.sleep(150);
        }
        throw new AssertionError("timed out waiting for: " + expression);
    }
}
