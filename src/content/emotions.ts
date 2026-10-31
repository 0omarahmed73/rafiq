import type { EmotionGroup } from './schema';

export const emotionGroups: EmotionGroup[] = [
  {
    id: 'sad',
    label: 'الحزن',
    words: [
      { id: 'sadness', label: 'حزن' },
      { id: 'loneliness', label: 'وحدة' },
      { id: 'disappointment', label: 'خيبة' },
      { id: 'grief', label: 'فقد' },
      { id: 'hopelessness', label: 'يأس' },
      { id: 'sorrow', label: 'أسى' },
      { id: 'brokenness', label: 'انكسار' },
    ],
  },
  {
    id: 'fear',
    label: 'الخوف',
    words: [
      { id: 'fear', label: 'خوف' },
      { id: 'anxiety', label: 'قلق' },
      { id: 'tense', label: 'متوتّر' },
      { id: 'confused', label: 'مرتبك' },
      { id: 'dread', label: 'رهبة' },
      { id: 'panic', label: 'هلع' },
      { id: 'insecurity', label: 'انعدام الأمان' },
    ],
  },
  {
    id: 'shame',
    label: 'الخجل',
    words: [
      { id: 'shame', label: 'خجل' },
      { id: 'guilty', label: 'مذنب' },
      { id: 'embarrassed', label: 'مُحرَج' },
      { id: 'disgrace', label: 'عار' },
      { id: 'regret', label: 'ندم' },
      { id: 'inadequacy', label: 'شعور بالنقص' },
      { id: 'humiliated', label: 'مُهان' },
    ],
  },
  {
    id: 'anger',
    label: 'الغضب',
    words: [
      { id: 'anger', label: 'غضب' },
      { id: 'annoyed', label: 'انزعاج' },
      { id: 'resentment', label: 'استياء' },
      { id: 'disgust', label: 'اشمئزاز' },
      { id: 'frustrated', label: 'إحباط' },
      { id: 'rage', label: 'غيظ' },
      { id: 'bitterness', label: 'مرارة' },
    ],
  },
  {
    id: 'tired',
    label: 'التعب',
    words: [
      { id: 'exhaustion', label: 'إرهاق' },
      { id: 'drained', label: 'مُستنزَف' },
      { id: 'unmotivated', label: 'فاقد الحماس' },
      { id: 'numb', label: 'خدر' },
      { id: 'bored', label: 'ملل' },
      { id: 'heavy', label: 'ثقل' },
      { id: 'scattered', label: 'تشتّت' },
    ],
  },
  {
    id: 'ease',
    label: 'الراحة',
    words: [
      { id: 'grateful', label: 'ممتنّ' },
      { id: 'calm', label: 'هادئ' },
      { id: 'relaxed', label: 'مرتاح' },
      { id: 'reassured', label: 'مطمئن' },
      { id: 'hopeful', label: 'متفائل' },
      { id: 'proud', label: 'فخور' },
      { id: 'warm', label: 'دفء' },
    ],
  },
];
