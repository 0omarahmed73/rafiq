import { practiceById, practicesForStep } from '.';

const get = (id: string) => {
  const def = practiceById(id);
  if (!def) throw new Error(`missing practice ${id}`);
  return def;
};

describe('practices for steps 4 to 10', () => {
  it.each([
    ['understand', 4, 7],
    ['compassion', 5, 4],
    ['forgive', 6, 6],
    ['boundaries', 7, 6],
    ['trust', 8, 6],
    ['care', 9, 5],
    ['values', 10, 6],
  ])('%s belongs to step %i and has %i prompts', (id, stepId, count) => {
    const def = get(id);
    expect(def.stepId).toBe(stepId);
    expect(def.prompts).toHaveLength(count);
  });

  it('files the practices under their steps', () => {
    expect(practicesForStep(4).map((p) => p.id)).toEqual(['understand']);
    expect(practicesForStep(5).map((p) => p.id)).toEqual(['compassion', 'compassion-letter', 'gratitude-letter']);
    expect(practicesForStep(6).map((p) => p.id)).toEqual(['forgive', 'forgiveness-letter']);
    expect(practicesForStep(7).map((p) => p.id)).toEqual(['boundaries']);
    expect(practicesForStep(8).map((p) => p.id)).toEqual(['trust']);
    expect(practicesForStep(9).map((p) => p.id)).toEqual(['care']);
    expect(practicesForStep(10).map((p) => p.id)).toEqual(['values']);
  });

  it('writes each letter practice to the right kind of letter', () => {
    expect(get('gratitude-letter').sink).toBe('letter:gratitude');
    expect(get('compassion-letter').sink).toBe('letter:self');
    expect(get('forgiveness-letter').sink).toBe('letter:forgiveness');
    for (const id of ['gratitude-letter', 'compassion-letter', 'forgiveness-letter']) {
      expect(get(id).prompts[0].kind).toBe('text');
    }
  });

  it('asks guilt or shame in the forgiveness practice', () => {
    const f3 = get('forgive').prompts[2];
    expect(f3.kind).toBe('choice');
    expect(f3.options!.map((o) => o.value)).toEqual(['guilt', 'shame', 'both']);
  });

  it('lets the user write the boundary and its sentence in structured fields', () => {
    const [, , b3, b4] = get('boundaries').prompts;
    expect(b3.fields!.map((f) => f.id)).toEqual(['accept', 'refuse']);
    expect(b4.fields!.map((f) => f.id)).toEqual(['when', 'feel', 'need', 'action']);
  });

  it('prefills the care list from the soothing list and saves additions back', () => {
    const g2 = get('care').prompts[1];
    expect(g2.kind).toBe('list');
    expect(g2.prefill).toBe('soothingList');
    expect(g2.saveToSoothing).toBe('step9');
  });

  it('saves the soothing choices of step 1 to the soothing list', () => {
    expect(get('validate').prompts[4].saveToSoothing).toBe('step1');
  });
});
