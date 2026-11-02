import type { PracticeDef } from '../../content/schema';

/** A small practice with a text, a branching choice, a gated chips prompt and a list. */
export const branchingDef: PracticeDef = {
  id: 't1',
  stepId: 2,
  title: { ar: 'تمرين تجريبي', en: 'Trial practice' },
  prompts: [
    { id: 'p1', kind: 'text', label: { ar: 'ما الموقف؟', en: 'What is the situation?' } },
    {
      id: 'p2',
      kind: 'choice',
      label: { ar: 'ما نوعه؟', en: 'What kind is it?' },
      options: [
        { value: 'need', label: { ar: 'حاجة', en: 'A need' } },
        { value: 'desire', label: { ar: 'رغبة', en: 'A desire' } },
      ],
    },
    {
      id: 'p3',
      kind: 'chips',
      label: { ar: 'أي حاجة؟', en: 'Which need?' },
      options: [{ value: 'respect', label: { ar: 'الاحترام', en: 'Respect' } }],
      showWhen: { promptId: 'p2', equals: 'need' },
    },
    { id: 'p4', kind: 'list', label: { ar: 'الأسباب', en: 'Reasons' } },
  ],
};
