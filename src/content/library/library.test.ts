import { symptoms, readingPages, sources, sourceById, allTexts, libraryStats } from '.';

const DIACRITICS = /[ً-ْـ]/g;
const normalize = (text: string) => text.replace(DIACRITICS, '');
const AR = '\\u0621-\\u064A';
const hasWord = (text: string, word: string) =>
  new RegExp(`(?<![${AR}])${word}(?![${AR}])`).test(normalize(text));

describe('library content structure', () => {
  it('has the nine symptoms, the two reading pages and a source for each citation', () => {
    expect(symptoms).toHaveLength(9);
    expect(readingPages.map((p) => p.id).sort()).toEqual(['about', 'hope']);
    expect(sources.length).toBeGreaterThan(5);
  });

  it('gives every source an unique id, a title, an Arabic description and a plain address', () => {
    const ids = sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of sources) {
      expect(s.title.trim(), s.id).not.toBe('');
      expect(s.about.trim(), s.id).not.toBe('');
      expect(s.address ?? '', s.id).toMatch(/^$|^[a-z0-9.\-/_:?=%#&]+$/i);
    }
  });

  it('cites at least one existing source in every page and symptom', () => {
    for (const item of [...readingPages, ...symptoms]) {
      expect(item.sourceIds.length, item.id).toBeGreaterThan(0);
      for (const id of item.sourceIds) expect(sourceById(id), `${item.id} -> ${id}`).toBeDefined();
    }
  });

  it('uses a known review status, and requires a named reviewer before anything is approved', () => {
    for (const item of [...readingPages, ...symptoms]) {
      expect(['draft', 'approved']).toContain(item.status);
      if (item.status === 'approved') expect(item.reviewedBy?.trim(), item.id).toBeTruthy();
    }
  });

  it('keeps every symptom complete: title, kind summary, feeling, need, two or three sentences and a tool inside the app', () => {
    for (const s of symptoms) {
      for (const field of [s.title, s.summary, s.feels, s.need, s.tool.label]) expect(field.trim(), s.id).not.toBe('');
      expect(s.selfSentences.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.selfSentences.length, s.id).toBeLessThanOrEqual(3);
      expect(s.tool.to, s.id).toMatch(/^\/(calm|checkin|step\/\d+|practice\/[a-z-]+|journey|triggers)?$/);
    }
    expect(new Set(symptoms.map((s) => s.id)).size).toBe(9);
  });

  it('sends the symptom about harm to the crisis page and marks it as a safety card', () => {
    const harm = symptoms.find((s) => s.safety);
    expect(harm?.tool.to).toBe('/calm');
    expect(symptoms.filter((s) => s.safety)).toHaveLength(1);
  });

  it('has no placeholder text', () => {
    for (const text of allTexts()) expect(text).not.toMatch(/TODO|TBD|lorem|XXX|\?\?\?/i);
  });

  it('reports how many texts are still drafts', () => {
    const stats = libraryStats();
    expect(stats.total).toBe(11);
    expect(stats.drafts).toBe(stats.total);
  });
});

describe('language guard for people in pain', () => {
  const texts = () => allTexts();

  it('never tells the reader they have the disorder or hands them a diagnosis', () => {
    const banned = [
      /أنت\s+(تعاني|مصاب|لديك)/,
      /أنتِ\s+(تعانين|مصابة|لديك)/,
      /تشخيصك/,
      /لديك\s+اضطراب/,
      /من\s+المؤكد\s+أنك/,
      /هل\s+أنت\s+حدي/,
    ];
    for (const text of texts()) for (const rx of banned) expect(normalize(text), text).not.toMatch(rx);
  });

  it('never uses «حدّي» as a noun for a person', () => {
    for (const text of texts()) {
      for (const word of ['حدي', 'الحدي', 'حديون', 'الحديون', 'حديين', 'الحديين']) {
        expect(hasWord(text, word), `${word} in: ${text}`).toBe(false);
      }
    }
  });

  it('never praises the illness, the pain or self-harm', () => {
    const banned = [
      /(المرض|الاضطراب|الألم|الجرح)\s+(نعمة|هبة|ميزة|قوة\s+خارقة)/,
      /أحب\s+(مرضي|اضطرابي)/,
      /(إيذاء|جرح|قطع)\s+(نفسي|النفس)\s+(يريحني|يساعدني|حل)/,
    ];
    for (const text of texts()) for (const rx of banned) expect(normalize(text), text).not.toMatch(rx);
  });

  it('shows no suicide figures or methods', () => {
    const banned = [/(نسبة|معدل|معدّل)\s+(الانتحار|الوفاة)/, /يموت/, /طريقة\s+(للانتحار|للإيذاء)/, /٪[^.\n]*انتحار|انتحار[^.\n]*٪/];
    for (const text of texts()) for (const rx of banned) expect(normalize(text), text).not.toMatch(rx);
  });

  it('keeps every symptom page from saying the card is a test of the reader', () => {
    for (const s of symptoms) {
      const all = normalize([s.summary, s.feels, s.need, ...s.selfSentences].join(' '));
      expect(all).not.toMatch(/اختبر\s+نفسك|درجتك|نتيجتك/);
    }
  });
});
