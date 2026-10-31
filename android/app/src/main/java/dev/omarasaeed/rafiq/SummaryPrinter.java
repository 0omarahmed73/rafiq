package dev.omarasaeed.rafiq;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.util.Locale;

/**
 * Prints the summary HTML from a dedicated, local-only WebView. Only the bundled app assets under
 * {@link #LOCAL_PREFIX} can load; every other request (external images, links, scripts) is answered with an
 * empty 403 and never reaches the network. JavaScript, file and content access are off. The WebView stays alive
 * until the system print flow finishes or is cancelled, then it is destroyed.
 */
final class SummaryPrinter {
    static final String LOCAL_HOST = "appassets.androidplatform.net";
    static final String LOCAL_PREFIX = "/assets/public/";
    static final String BASE_URL = "https://" + LOCAL_HOST + LOCAL_PREFIX;
    private static final long FONT_QUIET_MS = 300;
    private static final long FONT_MAX_WAIT_MS = 3000;

    interface Launcher {
        void launch(Activity activity, String jobName, PrintDocumentAdapter adapter);
    }

    interface Callback {
        /** The system print dialog was opened; this is not a claim that a file was saved. */
        void onHandedOff();

        void onFailed(Exception error);
    }

    interface RequestObserver {
        void onRequest(String url, boolean allowed);
    }

    /** Opens Android's own print dialog (Save as PDF, printers). */
    static final Launcher SYSTEM_LAUNCHER = (activity, jobName, adapter) -> {
        PrintManager manager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
        if (manager == null) throw new IllegalStateException("Print service is unavailable");
        manager.print(jobName, adapter, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
    };

    private final RequestObserver observer;
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile WebView webView;
    private volatile boolean busy;
    private volatile long lastRequestAt;

    SummaryPrinter(RequestObserver observer) {
        this.observer = observer;
    }

    /** Call on the main thread. */
    void print(Activity activity, String html, Launcher launcher, Callback callback) {
        if (busy) {
            callback.onFailed(new IllegalStateException("DOCUMENT_PRINT_BUSY: a print is already open"));
            return;
        }
        busy = true;
        try {
            WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(LOCAL_HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(activity))
                .build();
            WebView view = new WebView(activity);
            webView = view;
            WebSettings settings = view.getSettings();
            settings.setJavaScriptEnabled(false);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setBlockNetworkLoads(true);
            settings.setDomStorageEnabled(false);
            view.setWebViewClient(new LocalOnlyClient(loader, activity, launcher, callback));
            view.loadDataWithBaseURL(BASE_URL, html, "text/html", "UTF-8", null);
        } catch (RuntimeException error) {
            release();
            callback.onFailed(error);
        }
    }

    private void release() {
        WebView view = webView;
        webView = null;
        busy = false;
        if (view == null) return;
        if (Looper.myLooper() == Looper.getMainLooper()) view.destroy();
        else main.post(view::destroy);
    }

    private final class LocalOnlyClient extends WebViewClient {
        private final WebViewAssetLoader loader;
        private final Activity activity;
        private final Launcher launcher;
        private final Callback callback;
        private boolean started;

        LocalOnlyClient(WebViewAssetLoader loader, Activity activity, Launcher launcher, Callback callback) {
            this.loader = loader;
            this.activity = activity;
            this.launcher = launcher;
            this.callback = callback;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            lastRequestAt = System.nanoTime();
            // loadDataWithBaseURL content reaches the interceptor as an inline data: URL; it never touches the network.
            if ("data".equals(request.getUrl().getScheme())) return null;
            String url = request.getUrl().toString();
            boolean local = LOCAL_HOST.equals(request.getUrl().getHost())
                && request.getUrl().getPath() != null
                && request.getUrl().getPath().startsWith(LOCAL_PREFIX)
                && !request.getUrl().getPath().contains("..");
            WebResourceResponse response = local ? loader.shouldInterceptRequest(request.getUrl()) : null;
            if (observer != null) observer.onRequest(url, response != null);
            if (response != null) return response;
            return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null, new ByteArrayInputStream(new byte[0]));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (started) return;
            started = true;
            // JavaScript is off, so fonts cannot be awaited from the page: wait until the font requests go quiet.
            long begin = System.nanoTime();
            lastRequestAt = begin;
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    long now = System.nanoTime();
                    boolean quiet = (now - lastRequestAt) / 1_000_000 >= FONT_QUIET_MS;
                    boolean expired = (now - begin) / 1_000_000 >= FONT_MAX_WAIT_MS;
                    if (webView != view) return;
                    if (quiet || expired) hand(view);
                    else main.postDelayed(this, 100);
                }
            }, FONT_QUIET_MS);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
            if (request.isForMainFrame() && webView == view) {
                release();
                callback.onFailed(new IllegalStateException("Could not render the summary"));
            }
        }

        private void hand(WebView view) {
            try {
                PrintDocumentAdapter inner = view.createPrintDocumentAdapter("رفيق");
                launcher.launch(activity, "رفيق", new Releasing(inner));
                callback.onHandedOff();
            } catch (RuntimeException error) {
                release();
                callback.onFailed(error);
            }
        }
    }

    /** Keeps the WebView alive for the whole print flow and destroys it when the flow ends. */
    private final class Releasing extends PrintDocumentAdapter {
        private final PrintDocumentAdapter inner;

        Releasing(PrintDocumentAdapter inner) {
            this.inner = inner;
        }

        @Override
        public void onStart() {
            inner.onStart();
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal signal,
                             LayoutResultCallback callback, Bundle extras) {
            inner.onLayout(oldAttributes, newAttributes, signal, callback, extras);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal signal, WriteResultCallback callback) {
            inner.onWrite(pages, destination, signal, callback);
        }

        @Override
        public void onFinish() {
            try {
                inner.onFinish();
            } finally {
                release();
            }
        }
    }
}
