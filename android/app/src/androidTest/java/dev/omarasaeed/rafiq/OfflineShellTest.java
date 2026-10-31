package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PermissionInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.res.Resources;
import android.content.res.XmlResourceParser;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public class OfflineShellTest {
    private static final String[] PRIVATE_DATA_DOMAINS = {
        "root", "file", "database", "sharedpref", "external",
        "device_root", "device_file", "device_database", "device_sharedpref"
    };

    @Test
    public void backupRulesExcludeAllAppData() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ApplicationInfo app = context.getApplicationInfo();

        assertEquals("dev.omarasaeed.rafiq", context.getPackageName());
        assertFalse("Android backup must be disabled", (app.flags & ApplicationInfo.FLAG_ALLOW_BACKUP) != 0);
        assertDomainsExcluded(context.getResources(), R.xml.backup_rules, "full-backup-content", PRIVATE_DATA_DOMAINS);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            assertDomainsExcluded(context.getResources(), R.xml.data_extraction_rules, "cloud-backup", PRIVATE_DATA_DOMAINS);
            assertDomainsExcluded(context.getResources(), R.xml.data_extraction_rules, "device-transfer", PRIVATE_DATA_DOMAINS);
        }

        assertNoBroadStorageOrExportedBridge(context);
        assertEquals("0.1.0", context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName);
    }

    /** Invoke once with phase=seed, force-stop the target from the host, then invoke with phase=assert. */
    @Test
    public void coldLaunchWorksOfflineAndPersistsAfterRestart() throws Exception {
        Bundle arguments = InstrumentationRegistry.getArguments();
        String phase = arguments.getString("phase");
        assumeTrue("run externally with phase=seed and phase=assert", phase != null);
        if ("seed".equals(phase)) {
            seedCheckinWhileOffline();
        } else if ("assert".equals(phase)) {
            assertCheckinPersistedAfterRestart();
        } else {
            throw new AssertionError("pass -e phase=seed or -e phase=assert");
        }
    }

    private void seedCheckinWhileOffline() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("the host must disable network before the first launch", 1,
            Settings.Global.getInt(context.getContentResolver(), Settings.Global.AIRPLANE_MODE_ON, 0));

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            assertWebViewExpression(activity, "document.readyState === 'complete' && !!document.querySelector('#root button')");
            assertNativeWebShell(activity);
            assertClickButton(activity, "أفهم، لنبدأ");
            assertClickButton(activity, "حزن");
            assertClickButton(activity, "حفظ");
            assertWebViewExpression(activity, "Array.from(document.querySelectorAll('[role=status]')).some(el => el.textContent.trim() === 'تم الحفظ')");
            assertCheckinExists(activity);
        }
    }

    private void assertCheckinPersistedAfterRestart() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            assertWebViewExpression(activity, "document.readyState === 'complete' && !!document.querySelector('#root button')");
            assertNativeWebShell(activity);
            assertCheckinExists(activity);
        }
    }

    private static void assertNoBroadStorageOrExportedBridge(Context context) throws Exception {
        PackageManager pm = context.getPackageManager();
        PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(),
            PackageManager.GET_ACTIVITIES | PackageManager.GET_PROVIDERS |
                PackageManager.GET_RECEIVERS | PackageManager.GET_SERVICES | PackageManager.GET_PERMISSIONS |
                PackageManager.GET_META_DATA);

        Set<String> requested = packageInfo.requestedPermissions == null
            ? new HashSet<>() : new HashSet<>(Arrays.asList(packageInfo.requestedPermissions));
        String internalReceiverPermission = context.getPackageName() + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION";
        assertEquals("only local WebView access, the local daily reminder's permissions and AndroidX's signature-scoped receiver permission are allowed",
            new HashSet<>(Arrays.asList("android.permission.INTERNET", "android.permission.POST_NOTIFICATIONS",
                "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.WAKE_LOCK", internalReceiverPermission)), requested);
        assertFalse("the reminder is inexact: no exact-alarm permission may be requested",
            requested.contains("android.permission.SCHEDULE_EXACT_ALARM") || requested.contains("android.permission.USE_EXACT_ALARM"));
        PermissionInfo internalPermission = pm.getPermissionInfo(internalReceiverPermission, 0);
        assertEquals("AndroidX receiver permission must be signature-scoped", PermissionInfo.PROTECTION_SIGNATURE,
            internalPermission.protectionLevel & PermissionInfo.PROTECTION_MASK_BASE);

        Set<String> broadStoragePermissions = new HashSet<>(Arrays.asList(
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE",
            "android.permission.MANAGE_EXTERNAL_STORAGE",
            "android.permission.READ_MEDIA_IMAGES",
            "android.permission.READ_MEDIA_VIDEO",
            "android.permission.READ_MEDIA_AUDIO"
        ));
        for (String permission : requested) {
            assertFalse("broad storage permission must not be requested: " + permission,
                broadStoragePermissions.contains(permission));
        }

        assertNotNull(packageInfo.activities);
        assertEquals("only the launcher activity is exported", 1, packageInfo.activities.length);
        ActivityInfo launcher = packageInfo.activities[0];
        assertEquals(MainActivity.class.getName(), launcher.name);
        assertTrue("launcher entry point must remain launchable", launcher.exported);
        if (packageInfo.providers != null) {
            for (ProviderInfo provider : packageInfo.providers) {
                assertFalse("document or bridge providers must not be exported: " + provider.name, provider.exported);
            }
        }
        if (packageInfo.receivers != null) {
            for (android.content.pm.ActivityInfo receiver : packageInfo.receivers) {
                if (receiver.exported) {
                    assertEquals("only AndroidX's signature-protected profile receiver may be exported",
                        "androidx.profileinstaller.ProfileInstallReceiver", receiver.name);
                    assertEquals("android.permission.DUMP", receiver.permission);
                }
            }
        }
        assertNoExportedComponents(packageInfo.services, "service");
        assertStartupMetadataIsLocalOnly(packageInfo.providers);
    }

    private static void assertStartupMetadataIsLocalOnly(ProviderInfo[] providers) {
        boolean foundStartupProvider = false;
        for (ProviderInfo provider : providers) {
            if ("androidx.startup.InitializationProvider".equals(provider.name)) {
                foundStartupProvider = true;
                assertNotNull("startup provider metadata must be readable", provider.metaData);
                assertFalse("EmojiCompat's default font provider is not used by the WebView shell",
                    provider.metaData.containsKey("androidx.emoji2.text.EmojiCompatInitializer"));
                assertTrue("keep AndroidX lifecycle startup", provider.metaData.containsKey("androidx.lifecycle.ProcessLifecycleInitializer"));
                assertTrue("keep AndroidX profile installer startup", provider.metaData.containsKey("androidx.profileinstaller.ProfileInstallerInitializer"));
            }
        }
        assertTrue("retain the non-exported AndroidX startup provider", foundStartupProvider);
    }

    private static void assertNoExportedComponents(android.content.pm.ComponentInfo[] components, String kind) {
        if (components == null) return;
        for (android.content.pm.ComponentInfo component : components) {
            assertFalse(kind + " must not be exported: " + component.name, component.exported);
        }
    }

    private static void assertDomainsExcluded(Resources resources, int resourceId, String section, String[] expectedDomains)
        throws Exception {
        XmlResourceParser parser = resources.getXml(resourceId);
        try {
            boolean inSection = false;
            Set<String> excluded = new HashSet<>();
            int event = parser.getEventType();
            while (event != XmlResourceParser.END_DOCUMENT) {
                if (event == XmlResourceParser.START_TAG && section.equals(parser.getName())) {
                    inSection = true;
                } else if (event == XmlResourceParser.END_TAG && section.equals(parser.getName())) {
                    inSection = false;
                } else if (inSection && event == XmlResourceParser.START_TAG && "exclude".equals(parser.getName())) {
                    String domain = parser.getAttributeValue(null, "domain");
                    String path = parser.getAttributeValue(null, "path");
                    assertEquals("each exclusion must cover the whole domain", ".", path);
                    assertNotNull("each exclusion must identify a storage domain", domain);
                    excluded.add(domain);
                }
                event = parser.next();
            }
            assertTrue("missing exclusions in " + section + ": " + difference(expectedDomains, excluded),
                excluded.containsAll(Arrays.asList(expectedDomains)));
        } finally {
            parser.close();
        }
    }

    private static Set<String> difference(String[] expected, Set<String> actual) {
        Set<String> missing = new HashSet<>(Arrays.asList(expected));
        missing.removeAll(actual);
        return missing;
    }

    private static MainActivity awaitActivity(ActivityScenario<MainActivity> scenario) throws Exception {
        CompletableFuture<MainActivity> result = new CompletableFuture<>();
        scenario.onActivity(result::complete);
        return result.get(10, TimeUnit.SECONDS);
    }

    private static void assertClickButton(MainActivity activity, String label) throws Exception {
        String quoted = "'" + label.replace("\\", "\\\\").replace("'", "\\'") + "'";
        assertWebViewExpression(activity, "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === " + quoted + ")");
        String script = "Array.from(document.querySelectorAll('button')).some(button => " +
            "button.textContent.trim() === " + quoted + " && (button.click(), true)) ? '1' : '0'";
        assertEquals("expected visible app button: " + label, "1", evaluate(activity, script));
    }

    private static void assertNativeWebShell(MainActivity activity) throws Exception {
        assertWebViewExpression(activity,
            "location.origin === 'https://localhost' && document.fonts.check('16px \"IBM Plex Sans Arabic\"')");
    }

    private static void assertWebViewExpression(MainActivity activity, String expression) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        while (System.nanoTime() < deadline) {
            if ("1".equals(evaluate(activity, expression + " ? '1' : '0'"))) return;
            Thread.sleep(200);
        }
        throw new AssertionError("timed out waiting for WebView expression: " + expression);
    }

    private static void assertCheckinExists(MainActivity activity) throws Exception {
        String script = "window.__rafiqCheckinState = 'checking'; (async () => {" +
            "const db = await new Promise((resolve, reject) => {" +
            "const open = indexedDB.open('rafiq'); open.onerror = () => reject(open.error); open.onsuccess = () => resolve(open.result);" +
            "});" +
            "const rows = await new Promise((resolve, reject) => {" +
            "const request = db.transaction('checkins', 'readonly').objectStore('checkins').getAll();" +
            "request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);" +
            "});" +
            "window.__rafiqCheckinState = rows.some(row => row.emotions.includes('sadness') && row.intensity === 5) ? 'present' : 'missing';" +
            "})().catch(error => window.__rafiqCheckinState = 'error:' + String(error)); 'started'";
        assertEquals("start IndexedDB assertion", "started", evaluate(activity, script));
        assertWebViewExpression(activity, "window.__rafiqCheckinState !== 'checking'");
        assertEquals("synthetic check-in must remain in IndexedDB after process restart", "present",
            evaluate(activity, "window.__rafiqCheckinState"));
    }

    private static String evaluate(MainActivity activity, String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, result::complete);
        });
        return result.get(15, TimeUnit.SECONDS).replace("\\\"", "\"").replaceAll("^\"|\"$", "");
    }
}
