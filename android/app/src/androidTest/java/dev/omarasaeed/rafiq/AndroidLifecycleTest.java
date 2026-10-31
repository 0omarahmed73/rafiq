package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;

import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@RunWith(AndroidJUnit4.class)
public class AndroidLifecycleTest {
    @Test
    public void backWalksAppHistoryThenExitsFromHome() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity activity = awaitActivity(scenario);
            waitFor(activity, "document.readyState === 'complete' && !!document.querySelector('#root button')");
            evaluate(activity, "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'أفهم، لنبدأ'); if (b) b.click(); return '1'; })()");
            evaluate(activity, "history.pushState({}, '', '/journey'); window.dispatchEvent(new PopStateEvent('popstate')); '1'");
            waitFor(activity, "location.pathname === '/journey'");

            pressBack(activity);
            waitFor(activity, "location.pathname === '/'");
            assertEquals("still in the app after one Back", Lifecycle.State.RESUMED, scenario.getState());

            pressBack(activity);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (System.nanoTime() < deadline && scenario.getState() != Lifecycle.State.DESTROYED) Thread.sleep(150);
            assertTrue("Back from home leaves the app", scenario.getState() == Lifecycle.State.DESTROYED);
        }
    }

    private static void pressBack(MainActivity activity) {
        activity.runOnUiThread(() -> activity.getOnBackPressedDispatcher().onBackPressed());
    }

    private static MainActivity awaitActivity(ActivityScenario<MainActivity> scenario) throws Exception {
        CompletableFuture<MainActivity> result = new CompletableFuture<>();
        scenario.onActivity(result::complete);
        return result.get(10, TimeUnit.SECONDS);
    }

    private static String evaluate(MainActivity activity, String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        activity.runOnUiThread(() -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, result::complete);
        });
        return result.get(15, TimeUnit.SECONDS).replaceAll("^\"|\"$", "");
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
