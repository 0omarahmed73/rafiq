package dev.omarasaeed.rafiq;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintCallbacks;
import android.print.PrintDocumentAdapter;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class SummaryPrintTest {
    private static final String HTML = "<!doctype html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"utf-8\">" +
        "<base href=\"https://appassets.androidplatform.net/assets/public/\"><style>" +
        "@font-face{font-family:'IBM Plex Sans Arabic';font-weight:700;src:url('fonts/ibm-plex-sans-arabic-700.woff2') format('woff2');}" +
        "body{font-family:'IBM Plex Sans Arabic';font-weight:700;font-size:28px}</style></head><body>" +
        "<h1>ملخّص لمعالجي</h1><p>نص عربي اختباري طويل للتأكد من عرض الصفحة من اليمين إلى اليسار.</p>" +
        "<img src=\"https://example.invalid/track.png\">" +
        "<script>new Image().src='https://example.invalid/script.png';</script></body></html>";

    private static final class Observed implements SummaryPrinter.RequestObserver {
        final List<String> allowed = new CopyOnWriteArrayList<>();
        final List<String> blocked = new CopyOnWriteArrayList<>();

        @Override
        public void onRequest(String url, boolean wasAllowed) {
            (wasAllowed ? allowed : blocked).add(url);
        }
    }

    private static final class Outcome implements SummaryPrinter.Callback {
        final CountDownLatch done = new CountDownLatch(1);
        volatile boolean handedOff;
        volatile Exception failure;

        @Override
        public void onHandedOff() {
            handedOff = true;
            done.countDown();
        }

        @Override
        public void onFailed(Exception error) {
            failure = error;
            done.countDown();
        }
    }

    private static final class CapturingLauncher implements SummaryPrinter.Launcher {
        final AtomicReference<PrintDocumentAdapter> adapter = new AtomicReference<>();

        @Override
        public void launch(Activity activity, String jobName, PrintDocumentAdapter printAdapter) {
            adapter.set(printAdapter);
        }
    }

    private static Outcome start(ActivityScenario<MainActivity> scenario, SummaryPrinter printer, CapturingLauncher launcher) {
        Outcome outcome = new Outcome();
        scenario.onActivity(activity -> printer.print(activity, HTML, launcher, outcome));
        return outcome;
    }

    @Test
    public void printAdapterWritesAnA4PdfFromBundledFontsAndNeverReachesTheNetwork() throws Exception {
        Observed observed = new Observed();
        SummaryPrinter printer = new SummaryPrinter(observed);
        CapturingLauncher launcher = new CapturingLauncher();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            Outcome outcome = start(scenario, printer, launcher);
            assertTrue("print handed off", outcome.done.await(15, TimeUnit.SECONDS));
            assertEquals(null, outcome.failure);
            assertTrue(outcome.handedOff);

            File pdf = writePdf(launcher.adapter.get());
            assertTrue("a PDF was written", pdf.length() > 1000);
            try (ParcelFileDescriptor fd = ParcelFileDescriptor.open(pdf, ParcelFileDescriptor.MODE_READ_ONLY);
                 PdfRenderer renderer = new PdfRenderer(fd)) {
                assertTrue(renderer.getPageCount() >= 1);
                try (PdfRenderer.Page page = renderer.openPage(0)) {
                    Bitmap bitmap = Bitmap.createBitmap(page.getWidth(), page.getHeight(), Bitmap.Config.ARGB_8888);
                    bitmap.eraseColor(0xFFFFFFFF);
                    page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT);
                    assertTrue("page has visible ink", hasInk(bitmap));
                }
            }
            launcher.adapter.get().onFinish();
        }
        assertTrue("bundled font was read locally: allowed=" + observed.allowed + " blocked=" + observed.blocked,
            observed.allowed.contains("https://appassets.androidplatform.net/assets/public/fonts/ibm-plex-sans-arabic-700.woff2"));
        assertTrue("external image blocked: " + observed.blocked, observed.blocked.contains("https://example.invalid/track.png"));
        assertFalse("scripts never run", observed.blocked.contains("https://example.invalid/script.png"));
        assertFalse(observed.allowed.toString().contains("example.invalid"));
    }

    @Test
    public void aSecondPrintCannotDiscardTheFirstAndRetryWorksAfterCancel() throws Exception {
        SummaryPrinter printer = new SummaryPrinter(null);
        CapturingLauncher first = new CapturingLauncher();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            assertTrue(start(scenario, printer, first).done.await(15, TimeUnit.SECONDS));

            CapturingLauncher second = new CapturingLauncher();
            Outcome busy = start(scenario, printer, second);
            assertTrue(busy.done.await(5, TimeUnit.SECONDS));
            assertNotNull("second print is rejected while the first is open", busy.failure);
            assertTrue(busy.failure.getMessage(), busy.failure.getMessage().contains("DOCUMENT_PRINT_BUSY"));
            assertEquals(null, second.adapter.get());

            File stillWorks = writePdf(first.adapter.get());
            assertTrue("first print still renders", stillWorks.length() > 1000);

            first.adapter.get().onFinish(); // the user cancelled or finished in the system dialog
            CapturingLauncher retry = new CapturingLauncher();
            Outcome again = start(scenario, printer, retry);
            assertTrue(again.done.await(15, TimeUnit.SECONDS));
            assertEquals(null, again.failure);
            assertNotNull(retry.adapter.get());
            retry.adapter.get().onFinish();
        }
    }

    private static boolean hasInk(Bitmap bitmap) {
        for (int y = 0; y < bitmap.getHeight(); y += 4) {
            for (int x = 0; x < bitmap.getWidth(); x += 4) {
                if (bitmap.getPixel(x, y) != 0xFFFFFFFF) return true;
            }
        }
        return false;
    }

    private static File writePdf(PrintDocumentAdapter adapter) throws Exception {
        PrintAttributes attributes = new PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setResolution(new PrintAttributes.Resolution("r", "r", 300, 300))
            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
            .build();
        CountDownLatch laidOut = new CountDownLatch(1);
        AtomicReference<String> layoutError = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> adapter.onLayout(null, attributes, new CancellationSignal(),
            PrintCallbacks.layout(new PrintCallbacks.Layout() {
                @Override
                public void finished() {
                    laidOut.countDown();
                }

                @Override
                public void failed(CharSequence error) {
                    layoutError.set(String.valueOf(error));
                    laidOut.countDown();
                }
            }), new Bundle()));
        assertTrue("layout finished", laidOut.await(15, TimeUnit.SECONDS));
        assertEquals(null, layoutError.get());

        File file = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "synthetic-print-" + System.nanoTime() + ".pdf");
        CountDownLatch written = new CountDownLatch(1);
        AtomicReference<String> writeError = new AtomicReference<>();
        try (ParcelFileDescriptor fd = ParcelFileDescriptor.open(file,
            ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_TRUNCATE)) {
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES}, fd,
                new CancellationSignal(), PrintCallbacks.write(new PrintCallbacks.Write() {
                    @Override
                    public void finished() {
                        written.countDown();
                    }

                    @Override
                    public void failed(CharSequence error) {
                        writeError.set(String.valueOf(error));
                        written.countDown();
                    }
                })));
            assertTrue("write finished", written.await(15, TimeUnit.SECONDS));
        }
        assertEquals(null, writeError.get());
        return file;
    }
}
