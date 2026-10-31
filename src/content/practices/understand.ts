import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string, example?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
  ...(example ? { example } : {}),
});

/** Step 4, فهم الذات (a proposal until the therapist confirms it): tracing a trigger. */
export const understand: PracticeDef = {
  id: 'understand',
  stepId: 4,
  title: 'تتبّع المحفّز',
  prompts: [
    text('u1', 'ما الموقف بالتحديد؟'),
    text('u2', 'ما أول فكرة خطرت لي؟'),
    text('u3', 'أين شعرتُ به في جسدي؟'),
    text('u4', 'ماذا فعلتُ بعد ذلك؟'),
    text('u5', 'ما الحاجة أو الخوف الذي كان خلف ذلك؟'),
    text('u6', 'هل مرّ بي شعور مشابه من قبل؟ متى؟ ومع من؟'),
    text(
      'u7',
      'أسمّي هذا النمط بجملة قصيرة',
      undefined,
      'أنسحب حين أشعر بأنني مُهمَل.',
    ),
  ],
};
