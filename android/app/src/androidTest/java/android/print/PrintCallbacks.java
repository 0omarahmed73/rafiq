package android.print;

/** Test-only access to the package-private print callback constructors (the framework offers no public ones). */
public final class PrintCallbacks {
    public interface Layout {
        void finished();

        void failed(CharSequence error);
    }

    public interface Write {
        void finished();

        void failed(CharSequence error);
    }

    private PrintCallbacks() {}

    public static PrintDocumentAdapter.LayoutResultCallback layout(Layout layout) {
        return new PrintDocumentAdapter.LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                layout.finished();
            }

            @Override
            public void onLayoutFailed(CharSequence error) {
                layout.failed(error);
            }
        };
    }

    public static PrintDocumentAdapter.WriteResultCallback write(Write write) {
        return new PrintDocumentAdapter.WriteResultCallback() {
            @Override
            public void onWriteFinished(PageRange[] pages) {
                write.finished();
            }

            @Override
            public void onWriteFailed(CharSequence error) {
                write.failed(error);
            }
        };
    }
}
