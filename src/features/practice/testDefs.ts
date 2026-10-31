import type { PracticeDef } from '../../content/schema';

/** A small practice with a text, a branching choice, a gated chips prompt and a list. */
export const branchingDef: PracticeDef = {
  id: 't1',
  stepId: 2,
  title: 'تمرين تجريبي',
  prompts: [
    { id: 'p1', kind: 'text', label: 'ما الموقف؟' },
    {
      id: 'p2',
      kind: 'choice',
      label: 'ما نوعه؟',
      options: [
        { value: 'need', label: 'حاجة' },
        { value: 'desire', label: 'رغبة' },
      ],
    },
    {
      id: 'p3',
      kind: 'chips',
      label: 'أي حاجة؟',
      options: [{ value: 'respect', label: 'الاحترام' }],
      showWhen: { promptId: 'p2', equals: 'need' },
    },
    { id: 'p4', kind: 'list', label: 'الأسباب' },
  ],
};
