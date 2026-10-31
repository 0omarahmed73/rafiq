import { selfUnderstandingGuide as guide } from '../../content/practices/selfUnderstanding';

export function SelfUnderstandingGuide({ question, lesson }: { question: string; lesson: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold leading-8 text-ink">{guide.subtitle}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="shame-story-title" className="rounded-2xl border border-line bg-card p-4">
          <h2 id="shame-story-title" className="mb-2 text-base font-bold text-teal-ink">قصة الخزي</h2>
          <p className="text-[15px] leading-8">{guide.shameStory}</p>
        </section>
        <section aria-labelledby="fair-reading-title" className="rounded-2xl border border-line bg-card p-4">
          <h2 id="fair-reading-title" className="mb-2 text-base font-bold text-teal-ink">كيف أقرأ قصتي؟</h2>
          <p className="text-[15px] leading-8">{guide.rules}</p>
        </section>
      </div>
      <section className="rounded-2xl bg-teal-soft p-4">
        <h2 className="mb-2 text-xs font-semibold text-teal-ink">سؤالي الأساسي</h2>
        <p className="text-[17px] font-semibold leading-8 text-teal-ink">{question}</p>
        <ul className="mb-0 mt-3 list-disc space-y-1 ps-5 text-sm leading-7 text-teal-ink">
          {guide.reflections.map(text => <li key={text}>{text}</li>)}
        </ul>
      </section>
      <p className="text-[15px] leading-8">{lesson}</p>
      <details className="rounded-2xl border border-line bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-teal-ink">أقرأ الفكرة بهدوء</summary>
        <ol className="mb-0 mt-2 list-decimal space-y-3 ps-5 text-[15px] leading-8">
          {guide.explanation.map(text => <li key={text}>{text}</li>)}
        </ol>
      </details>
    </div>
  );
}
