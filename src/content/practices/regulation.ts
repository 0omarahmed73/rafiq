import type { PracticeDef } from '../schema';

/** Step 3, تنظيم الذات: the therapist's record of a situation. */
export const regulation: PracticeDef = {
  id: 'regulation',
  stepId: 3,
  title: 'سجلّ الموقف',
  prompts: [
    { id: 'situation', kind: 'text', label: 'ما الموقف؟', hint: 'أصف ما حدث كما هو.' },
    {
      id: 'feelings',
      kind: 'emotion',
      multi: true,
      label: 'ما الذي أشعر به؟ وما شدّته؟',
      hint: 'يمكنني اختيار أكثر من شعور، ولكلٍّ منها شدّة من صفر إلى عشرة.',
    },
    { id: 'thought', kind: 'text', label: 'ما الفكرة التي خطرت لي؟' },
    {
      id: 'autoReaction',
      kind: 'text',
      label: 'ما تصرّفي التلقائي؟',
      hint: 'ما الذي فعلته أو أردتُ فعله فورًا؟',
    },
    {
      id: 'selfInstructions',
      kind: 'text',
      label: 'ما تعليماتي لنفسي؟',
      hint: 'أكتب ما سأفعله بدل التصرّف التلقائي: كالصلاة، أو مشاهدة مسلسلي، أو التنفّس.',
    },
  ],
};

/** Opened later: what I tried, whether it helped, and what changed. Stored as a follow-up. */
export const regulationFollowup: PracticeDef = {
  id: 'regulation-followup',
  stepId: 3,
  title: 'المحاولات والنتيجة',
  sink: 'followup',
  prompts: [
    {
      id: 'tried',
      kind: 'chips',
      multi: true,
      label: 'ماذا جرّبتُ؟',
      options: [
        { value: 'validation', label: 'تصديق المشاعر' },
        { value: 'breathing', label: 'تنفّس هادئ' },
        { value: 'away', label: 'ابتعدتُ عن الموقف' },
        { value: 'show', label: 'مشاهدة مسلسلي' },
        { value: 'prayer', label: 'الصلاة' },
      ],
      textLabel: 'أشياء أخرى جرّبتها',
    },
    {
      id: 'helped',
      kind: 'choice',
      label: 'هل ساعدني ذلك؟',
      options: [
        { value: 'much', label: 'ساعد كثيرًا' },
        { value: 'little', label: 'ساعد قليلًا' },
        { value: 'no', label: 'لم يساعد' },
      ],
    },
    {
      id: 'intensityAfter',
      kind: 'scale',
      label: 'ما شدّة الشعور الآن؟',
      hint: 'شدّة الشعور الآن',
    },
    { id: 'noticed', kind: 'text', label: 'ما الذي لاحظته؟' },
  ],
};
