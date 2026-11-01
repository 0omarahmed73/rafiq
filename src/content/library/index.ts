import { about } from './about';
import { hope } from './hope';
import type { ReadingPage, Symptom } from './schema';
import { sourceById, sources } from './sources';
import { symptoms } from './symptoms';

export { about, hope, sourceById, sources, symptoms };
export type { LibrarySource, PageSection, ReadingPage, ReviewStatus, Symptom } from './schema';

export const readingPages: ReadingPage[] = [about, hope];

export const symptomById = (id: string): Symptom | undefined => symptoms.find((s) => s.id === id);
export const readingPageById = (id: ReadingPage['id']): ReadingPage => (id === 'about' ? about : hope);

/** Every piece of text a reader can see, for the language guard test. */
export function allTexts(): string[] {
  const pages = readingPages.flatMap((p) => [p.title, p.intro, ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs])]);
  const cards = symptoms.flatMap((s) => [s.title, s.summary, s.feels, s.need, ...s.selfSentences, s.tool.label, s.note ?? '']);
  return [...pages, ...cards].filter(Boolean);
}

export function libraryStats() {
  const items = [...readingPages, ...symptoms];
  return { total: items.length, drafts: items.filter((i) => i.status === 'draft').length };
}
