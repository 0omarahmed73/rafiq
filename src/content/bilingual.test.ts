import { emotionGroups, steps } from '.';
import { practices } from './practices';
import { allTexts, symptoms, readingPages, sources } from './library';
import { readinessQuestions } from './readiness';
import { weeklyQuestions } from './weeklyQuestions';
import { EGYPT_SUPPORT, SUPPORT_DIRECTORY } from './supportContacts';
import { YEAR_GOALS, YEAR_MONTHS, YEAR_REVIEW_QUESTIONS, YEAR_VISION } from './yearPlan';
import { selfUnderstandingGuide } from './practices/selfUnderstanding';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
/** Latin words that are kept as they are in the Arabic too: clinical names, the list of the app's own terms. */
const ALLOWED_LATIN_IN_ARABIC = /\b(DBT|CV|portfolio|PDF|DSM|NHS|NIMH|IASP|CBT)\b/g;

/** Every `{ ar, en }` text in the shipped content, wherever it sits. */
function bilingualTexts(value: unknown, found: { ar: string; en: string }[] = []): { ar: string; en: string }[] {
  if (Array.isArray(value)) {
    for (const item of value) bilingualTexts(item, found);
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('ar' in record || 'en' in record) {
      if (typeof record.ar === 'string' && typeof record.en === 'string') found.push({ ar: record.ar, en: record.en });
      else throw new Error(`Text with only one language: ${JSON.stringify(record)}`);
      return found;
    }
    for (const item of Object.values(record)) bilingualTexts(item, found);
  }
  return found;
}

const shipped = bilingualTexts([
  steps,
  emotionGroups,
  readinessQuestions,
  weeklyQuestions,
  practices,
  allTexts(),
  readingPages,
  symptoms,
  sources.map((s) => s.about),
  sources.map((s) => s.limit).filter(Boolean),
  EGYPT_SUPPORT,
  SUPPORT_DIRECTORY,
  YEAR_GOALS,
  YEAR_MONTHS,
  YEAR_REVIEW_QUESTIONS,
  YEAR_VISION,
  selfUnderstandingGuide,
]);

describe('bilingual content', () => {
  it('has text in both languages for everything the reader sees', () => {
    expect(shipped.length).toBeGreaterThan(300);
    for (const text of shipped) {
      expect(text.ar.trim(), text.en).not.toBe('');
      expect(text.en.trim(), text.ar).not.toBe('');
    }
  });

  it('keeps Arabic out of the English text', () => {
    for (const text of shipped) expect(text.en, text.en).not.toMatch(ARABIC);
  });

  it('keeps Latin letters out of the Arabic text, except for the few terms that stay as written', () => {
    for (const text of shipped) {
      expect(text.ar.replace(/\{\w+\}/g, '').replace(ALLOWED_LATIN_IN_ARABIC, ''), text.ar).not.toMatch(LATIN);
    }
  });

  it('keeps the placeholders of each sentence the same in both languages', () => {
    for (const text of shipped) {
      const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(placeholders(text.en), text.en).toEqual(placeholders(text.ar));
    }
  });
});
