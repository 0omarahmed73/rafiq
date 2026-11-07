import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi, example?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
  ...(example ? { example } : {}),
});

/** Step 4, فهم الذات (a proposal until the therapist confirms it): tracing a trigger. English is a draft. */
export const understand: PracticeDef = {
  id: 'understand',
  stepId: 4,
  title: { ar: 'تتبّع المحفّز', en: 'Tracing a trigger' },
  prompts: [
    text('u1', { ar: 'ما الموقف بالتحديد؟', en: 'What exactly was the situation?' }),
    text('u2', { ar: 'ما أول فكرة خطرت لي؟', en: 'What was the first thought that came to me?' }),
    text('u3', { ar: 'أين شعرتُ به في جسدي؟', en: 'Where did I feel it in my body?' }),
    text('u4', { ar: 'ماذا فعلتُ بعد ذلك؟', en: 'What did I do after that?' }),
    text('u5', { ar: 'ما الحاجة أو الخوف الذي كان خلف ذلك؟', en: 'What need or fear was behind that?' }),
    text('u6', {
      ar: 'هل مرّ بي شعور مشابه من قبل؟ متى؟ ومع من؟',
      en: 'Have I felt something similar before? When? And with whom?',
    }),
    text(
      'u7',
      { ar: 'أسمّي هذا النمط بجملة قصيرة', en: 'I name this pattern in a short sentence' },
      undefined,
      { ar: 'أنسحب حين أشعر بأنني مُهمَل.', en: 'I withdraw when I feel ignored.' },
    ),
  ],
};
