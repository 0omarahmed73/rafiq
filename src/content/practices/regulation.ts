import type { PracticeDef } from '../schema';

/** Step 3, تنظيم الذات: the therapist's record of a situation. English is a draft for therapist review. */
export const regulation: PracticeDef = {
  id: 'regulation',
  stepId: 3,
  title: { ar: 'سجلّ الموقف', en: 'Record of a situation' },
  prompts: [
    {
      id: 'situation',
      kind: 'text',
      label: { ar: 'ما الموقف؟', en: 'What was the situation?' },
      hint: { ar: 'أصف ما حدث كما هو.', en: 'I describe what happened as it was.' },
    },
    {
      id: 'feelings',
      kind: 'emotion',
      multi: true,
      label: { ar: 'ما الذي أشعر به؟ وما شدّته؟', en: 'What am I feeling? How strong is it?' },
      hint: {
        ar: 'يمكنني اختيار أكثر من شعور، ولكلٍّ منها شدّة من صفر إلى عشرة.',
        en: 'I can choose more than one feeling, and each one has a strength from zero to ten.',
      },
    },
    { id: 'thought', kind: 'text', label: { ar: 'ما الفكرة التي خطرت لي؟', en: 'What thought came to me?' } },
    {
      id: 'autoReaction',
      kind: 'text',
      label: { ar: 'ما تصرّفي التلقائي؟', en: 'What is my automatic reaction?' },
      hint: { ar: 'ما الذي فعلته أو أردتُ فعله فورًا؟', en: 'What did I do, or want to do, straight away?' },
    },
    {
      id: 'selfInstructions',
      kind: 'text',
      label: { ar: 'ما تعليماتي لنفسي؟', en: 'What are my instructions to myself?' },
      hint: {
        ar: 'أكتب ما سأفعله بدل التصرّف التلقائي: كالصلاة، أو مشاهدة مسلسلي، أو التنفّس.',
        en: 'I write what I will do instead of the automatic reaction: for example prayer, watching a show I like, or breathing.',
      },
    },
  ],
};

/** Opened later: what I tried, whether it helped, and what changed. Stored as a follow-up. */
export const regulationFollowup: PracticeDef = {
  id: 'regulation-followup',
  stepId: 3,
  title: { ar: 'المحاولات والنتيجة', en: 'What I tried and what happened' },
  sink: 'followup',
  prompts: [
    {
      id: 'tried',
      kind: 'chips',
      multi: true,
      label: { ar: 'ماذا جرّبتُ؟', en: 'What did I try?' },
      options: [
        { value: 'validation', label: { ar: 'تصديق المشاعر', en: 'Validating my feelings' } },
        { value: 'breathing', label: { ar: 'تنفّس هادئ', en: 'Slow breathing' } },
        { value: 'away', label: { ar: 'ابتعدتُ عن الموقف', en: 'Stepped away from the situation' } },
        { value: 'show', label: { ar: 'مشاهدة مسلسلي', en: 'Watching a show I like' } },
        { value: 'prayer', label: { ar: 'الصلاة', en: 'Prayer' } },
      ],
      textLabel: { ar: 'أشياء أخرى جرّبتها', en: 'Other things I tried' },
    },
    {
      id: 'helped',
      kind: 'choice',
      label: { ar: 'هل ساعدني ذلك؟', en: 'Did it help?' },
      options: [
        { value: 'much', label: { ar: 'ساعد كثيرًا', en: 'It helped a lot' } },
        { value: 'little', label: { ar: 'ساعد قليلًا', en: 'It helped a little' } },
        { value: 'no', label: { ar: 'لم يساعد', en: 'It did not help' } },
      ],
    },
    {
      id: 'intensityAfter',
      kind: 'scale',
      label: { ar: 'ما شدّة الشعور الآن؟', en: 'How strong is the feeling now?' },
      hint: { ar: 'شدّة الشعور الآن', en: 'How strong the feeling is now' },
    },
    { id: 'noticed', kind: 'text', label: { ar: 'ما الذي لاحظته؟', en: 'What did I notice?' } },
  ],
};
