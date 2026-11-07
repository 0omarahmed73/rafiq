import type { EmotionGroup } from './schema';

// Emotion ids are stored with check-ins, so they never change. Only the labels are translated.
export const emotionGroups: EmotionGroup[] = [
  {
    id: 'sad',
    label: { ar: 'الحزن', en: 'Sadness' },
    words: [
      { id: 'sadness', label: { ar: 'حزن', en: 'Sad' } },
      { id: 'loneliness', label: { ar: 'وحدة', en: 'Lonely' } },
      { id: 'disappointment', label: { ar: 'خيبة', en: 'Disappointed' } },
      { id: 'grief', label: { ar: 'فقد', en: 'Grief' } },
      { id: 'hopelessness', label: { ar: 'يأس', en: 'Hopeless' } },
      { id: 'sorrow', label: { ar: 'أسى', en: 'Sorrowful' } },
      { id: 'brokenness', label: { ar: 'انكسار', en: 'Broken' } },
    ],
  },
  {
    id: 'fear',
    label: { ar: 'الخوف', en: 'Fear' },
    words: [
      { id: 'fear', label: { ar: 'خوف', en: 'Afraid' } },
      { id: 'anxiety', label: { ar: 'قلق', en: 'Anxious' } },
      { id: 'tense', label: { ar: 'متوتّر', en: 'Tense' } },
      { id: 'confused', label: { ar: 'مرتبك', en: 'Confused' } },
      { id: 'dread', label: { ar: 'رهبة', en: 'Dread' } },
      { id: 'panic', label: { ar: 'هلع', en: 'Panicky' } },
      { id: 'insecurity', label: { ar: 'انعدام الأمان', en: 'Insecure' } },
    ],
  },
  {
    id: 'shame',
    label: { ar: 'الخجل', en: 'Shame' },
    words: [
      { id: 'shame', label: { ar: 'خجل', en: 'Ashamed' } },
      { id: 'guilty', label: { ar: 'مذنب', en: 'Guilty' } },
      { id: 'embarrassed', label: { ar: 'مُحرَج', en: 'Embarrassed' } },
      { id: 'disgrace', label: { ar: 'عار', en: 'Disgraced' } },
      { id: 'regret', label: { ar: 'ندم', en: 'Regretful' } },
      { id: 'inadequacy', label: { ar: 'شعور بالنقص', en: 'Not good enough' } },
      { id: 'humiliated', label: { ar: 'مُهان', en: 'Humiliated' } },
    ],
  },
  {
    id: 'anger',
    label: { ar: 'الغضب', en: 'Anger' },
    words: [
      { id: 'anger', label: { ar: 'غضب', en: 'Angry' } },
      { id: 'annoyed', label: { ar: 'انزعاج', en: 'Annoyed' } },
      { id: 'resentment', label: { ar: 'استياء', en: 'Resentful' } },
      { id: 'disgust', label: { ar: 'اشمئزاز', en: 'Disgusted' } },
      { id: 'frustrated', label: { ar: 'إحباط', en: 'Frustrated' } },
      { id: 'rage', label: { ar: 'غيظ', en: 'Furious' } },
      { id: 'bitterness', label: { ar: 'مرارة', en: 'Bitter' } },
    ],
  },
  {
    id: 'tired',
    label: { ar: 'التعب', en: 'Tiredness' },
    words: [
      { id: 'exhaustion', label: { ar: 'إرهاق', en: 'Exhausted' } },
      { id: 'drained', label: { ar: 'مُستنزَف', en: 'Drained' } },
      { id: 'unmotivated', label: { ar: 'فاقد الحماس', en: 'Unmotivated' } },
      { id: 'numb', label: { ar: 'خدر', en: 'Numb' } },
      { id: 'bored', label: { ar: 'ملل', en: 'Bored' } },
      { id: 'heavy', label: { ar: 'ثقل', en: 'Heavy' } },
      { id: 'scattered', label: { ar: 'تشتّت', en: 'Scattered' } },
    ],
  },
  {
    id: 'ease',
    label: { ar: 'الراحة', en: 'Ease' },
    words: [
      { id: 'grateful', label: { ar: 'ممتنّ', en: 'Grateful' } },
      { id: 'calm', label: { ar: 'هادئ', en: 'Calm' } },
      { id: 'relaxed', label: { ar: 'مرتاح', en: 'Relaxed' } },
      { id: 'reassured', label: { ar: 'مطمئن', en: 'Reassured' } },
      { id: 'hopeful', label: { ar: 'متفائل', en: 'Hopeful' } },
      { id: 'proud', label: { ar: 'فخور', en: 'Proud' } },
      { id: 'warm', label: { ar: 'دفء', en: 'Warm' } },
    ],
  },
];
