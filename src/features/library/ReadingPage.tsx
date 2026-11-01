import { readingPageById, type ReadingPage as Page } from '../../content/library';
import { BackLink, DraftBadge, Footer, Sources, card } from './parts';

/** «ما هو اضطراب…» and «الأمل والتعافي»: sections of calm reading with their sources. */
export function ReadingPage({ page }: { page: Page['id'] }) {
  const content = readingPageById(page);
  return (
    <article className="flex min-w-0 flex-col gap-5">
      <BackLink to="/library">مكتبتي</BackLink>
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-snug">{content.title}</h1>
        <DraftBadge status={content.status} />
        <p className="m-0 rounded-2xl bg-teal-soft p-4 text-[16px] leading-8 text-teal-ink">{content.intro}</p>
      </header>

      {content.sections.map((section) => (
        <section key={section.id} aria-labelledby={`sec-${section.id}`} className={card}>
          <h2 id={`sec-${section.id}`} className="text-[18px] font-bold leading-snug text-teal-ink">
            {section.heading}
          </h2>
          {section.paragraphs.map((text) => (
            <p key={text} className="m-0 text-[16px] leading-8 text-ink">
              {text}
            </p>
          ))}
        </section>
      ))}

      <Sources ids={content.sourceIds} />
      <Footer />
    </article>
  );
}
