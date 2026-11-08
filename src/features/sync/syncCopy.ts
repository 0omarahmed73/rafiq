// Every string the Sync card shows, in Arabic (simple standard, first person) and English (a draft until reviewed).
import type { Bi } from '../../i18n';
import { checkPassphrase, type SyncAccountErrorKind } from './syncAccount';
import type { SyncIssue, SyncState } from './syncEngine';

export const PRIVACY: Bi = {
  ar:
    'بياناتي تُشفَّر على هذا الهاتف قبل أن تغادره. ' +
    'إذا نسيت عبارة المرور أستطيع إعادة ضبط النسخة السحابية من جهاز ما زال يحتوي بياناتي.',
  en:
    'My data is encrypted on this phone before it leaves it. ' +
    'If I forget the passphrase, I can reset the cloud copy from a device that still has my data.',
};

const NEWER_VERSION: Bi = {
  ar: 'يعمل جهازي الآخر بنسخة أحدث من التطبيق. أحدّث التطبيق على هذا الجهاز لأتابع المزامنة.',
  en: 'My other device runs a newer version of the app. I update the app on this device to keep syncing.',
};

/** Copy for a failed account call; `{n}` is the minimum passphrase length. */
export const ERRORS: Record<SyncAccountErrorKind, Bi> = {
  newerVersion: NEWER_VERSION,
  tooShort: {
    ar: 'أختار عبارة مرور من {n} أحرف على الأقل.',
    en: 'I choose a passphrase with at least {n} characters.',
  },
  notSignedIn: { ar: 'انتهى تسجيل الدخول. أبدأ من جديد.', en: 'The sign-in session ended. I can start again.' },
  network: {
    ar: 'تعذّر الاتصال. أتحقق من الإنترنت وأحاول ثانية.',
    en: 'Could not connect. I check my connection and try again.',
  },
  auth: { ar: 'تعذّر التحقق من الحساب أو الرمز.', en: 'Could not verify the account or code.' },
  tooLarge: {
    ar: 'النسخة أكبر من الحد الذي تسمح به الخدمة. بياناتي باقية على هذا الجهاز.',
    en: 'This copy is larger than the service allows. My data stays on this device.',
  },
  vaultExists: {
    ar: 'توجد نسخة سحابية بالفعل. أفتحها بعبارة مرورها.',
    en: 'A cloud copy already exists. I unlock it with its passphrase.',
  },
  noVault: {
    ar: 'لم أجد نسخة سحابية. أتحقق من الحالة وأحاول ثانية.',
    en: 'No cloud copy was found. I can check again and retry.',
  },
  emptyLocal: {
    ar: 'لا توجد سجلات على هذا الجهاز. أؤكد صراحة قبل استبدال النسخة.',
    en: 'This device has no records. I must explicitly confirm before replacing the copy.',
  },
  damaged: {
    ar: 'النسخة السحابية تالفة أو لا يمكن قراءتها. بياناتي على هذا الجهاز لم تتغيّر.',
    en: 'The cloud copy is damaged or cannot be read. My data on this device has not changed.',
  },
  unknown: { ar: 'تعذّرت العملية. أستطيع المحاولة مرة أخرى.', en: 'That did not work. I can try again.' },
};

export const ISSUES: Record<SyncIssue, Bi> = {
  wrongPassphrase: {
    ar: 'أحتاج إلى عبارة المرور لفتح النسخة المشفّرة.',
    en: 'I need the passphrase to open the encrypted copy.',
  },
  keyChanged: {
    ar: 'تغيّرت عبارة المرور على جهاز آخر. أدخل العبارة الجديدة.',
    en: 'The passphrase changed on another device. I enter the new one.',
  },
  damaged: {
    ar: 'تعذّر فتح النسخة السحابية أو التحقق منها. بياناتي على هذا الجهاز لم تتغيّر.',
    en: 'The cloud copy could not be opened or validated. My data on this device has not changed.',
  },
  newerVersion: NEWER_VERSION,
  tooLarge: ERRORS.tooLarge,
  auth: {
    ar: 'انتهى تسجيل الدخول. أسجّل الدخول من جديد لأتابع المزامنة.',
    en: 'My sign-in expired. I sign in again to keep syncing.',
  },
  busy: {
    ar: 'تغيّرت النسخة أكثر من مرة أثناء المزامنة. سأحاول ثانية.',
    en: 'The copy changed repeatedly during sync. I will try again.',
  },
  unknown: ERRORS.unknown,
};

const ATTENTION: Bi = { ar: 'تحتاج المزامنة إلى انتباهي:', en: 'Sync needs my attention:' };

/** The live status line for the on panel. */
export function stateText(state: SyncState, t: (text: Bi) => string): string {
  if (state.status === 'syncing') return t({ ar: 'أزامن الآن…', en: 'Syncing now…' });
  if (state.status === 'offline') {
    return t({ ar: 'لا يوجد اتصال. سأحاول عند عودة الإنترنت.', en: 'Offline. I will retry when I am online.' });
  }
  if (state.status === 'attention') return `${t(ATTENTION)} ${t(state.issue ? ISSUES[state.issue] : ERRORS.unknown)}`;
  return t({ ar: 'المزامنة مفعّلة.', en: 'Sync is on.' });
}

export type Strength = 'empty' | 'tooShort' | 'ok' | 'strong';
export const STRONG_LENGTH = 14;

/** A simple hint: too short below the minimum, strong from 14 characters with at least two kinds of characters. */
export function passphraseStrength(passphrase: string): Strength {
  if (!passphrase) return 'empty';
  if (checkPassphrase(passphrase) === 'tooShort') return 'tooShort';
  const kinds = [/\p{L}/u, /\p{N}/u, /[^\p{L}\p{N}]/u].filter((kind) => kind.test(passphrase)).length;
  return passphrase.length >= STRONG_LENGTH && kinds >= 2 ? 'strong' : 'ok';
}

export const STRENGTH: Record<Exclude<Strength, 'empty'>, Bi> = {
  tooShort: { ar: 'قصيرة: أحتاج إلى {n} أحرف على الأقل.', en: 'Too short: I need at least {n} characters.' },
  ok: {
    ar: 'مقبولة. عبارة أطول فيها أحرف وأرقام أو رموز تكون أقوى.',
    en: 'Acceptable. A longer one with letters and numbers or symbols is stronger.',
  },
  strong: { ar: 'قوية.', en: 'Strong.' },
};

export const COPY = {
  title: { ar: 'المزامنة', en: 'Sync' },
  turnOn: { ar: 'تفعيل المزامنة', en: 'Turn on sync' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  back: { ar: 'رجوع', en: 'Back' },
  email: { ar: 'البريد الإلكتروني', en: 'Email address' },
  sendCode: { ar: 'إرسال رمز', en: 'Send a code' },
  codeSent: { ar: 'أرسلتُ رمزًا إلى بريدي الإلكتروني.', en: 'I sent a code to my email.' },
  newCodeSent: { ar: 'أرسلتُ رمزًا جديدًا إلى بريدي الإلكتروني.', en: 'I sent a new code to my email.' },
  enterCode: { ar: 'أدخل الرمز الذي وصل إلى بريدي الإلكتروني.', en: 'I enter the code sent to my email.' },
  code: { ar: 'رمز البريد الإلكتروني', en: 'Email code' },
  verify: { ar: 'التحقق من الرمز', en: 'Verify code' },
  resendIn: { ar: 'إعادة الإرسال بعد {seconds} ثانية', en: 'Resend in {seconds} seconds' },
  resend: { ar: 'إعادة إرسال الرمز', en: 'Resend code' },
  changeEmail: { ar: 'تغيير البريد الإلكتروني', en: 'Change email' },
  wrongCode: {
    ar: 'الرمز غير صحيح أو انتهت صلاحيته. أتحقق منه أو أطلب رمزًا جديدًا.',
    en: 'That code is not right or has expired. I can check it or ask for a new one.',
  },
  vaultUnknown: {
    ar: 'تم تسجيل الدخول، لكن تعذّر فحص النسخة السحابية.',
    en: 'I signed in, but could not check the cloud copy.',
  },
  checkAgain: { ar: 'التحقق مرة أخرى', en: 'Check again' },
  createIntro: {
    ar: 'أنشئ عبارة مرور من {n} أحرف على الأقل وأحفظها. لا أستطيع استعادتها إذا نسيتها.',
    en: 'I create and save a passphrase with at least {n} characters. I cannot recover it if I forget it.',
  },
  passphrase: { ar: 'عبارة المرور', en: 'Passphrase' },
  repeat: { ar: 'أكرر عبارة المرور', en: 'Repeat passphrase' },
  create: { ar: 'إنشاء النسخة المشفّرة', en: 'Create encrypted copy' },
  mismatch: { ar: 'عبارتا المرور غير متطابقتين.', en: 'The passphrases do not match.' },
  created: { ar: 'أنشأتُ نسخة مشفّرة وبدأت المزامنة.', en: 'I created an encrypted copy and started syncing.' },
  unlockIntro: {
    ar: 'أدخل عبارة المرور التي أنشأتُ بها النسخة السحابية.',
    en: 'I enter the passphrase I used to create the cloud copy.',
  },
  unlock: { ar: 'فتح النسخة', en: 'Unlock copy' },
  wrongPassphrase: {
    ar: 'عبارة المرور غير صحيحة. أتحقق منها وأحاول ثانية.',
    en: 'That passphrase is not right. I can check it and try again.',
  },
  unlocked: { ar: 'فتحتُ النسخة وبدأت المزامنة.', en: 'I unlocked the copy and started syncing.' },
  lastSynced: { ar: 'آخر مزامنة:', en: 'Last synced:' },
  enterPassphrase: { ar: 'إدخال عبارة المرور', en: 'Enter passphrase' },
  tryAgain: { ar: 'المحاولة مرة أخرى', en: 'Try again' },
  signInAgain: { ar: 'سجّل الدخول من جديد', en: 'Sign in again' },
  otherAccount: {
    ar:
      'كان هذا حسابًا آخر، فأوقفتُ المزامنة على هذا الجهاز ونسيتُ مفتاحه. بياناتي باقية هنا. ' +
      'أفعّل المزامنة من جديد بالحساب الذي أريده.',
    en:
      'That was a different account, so I turned off sync on this device and forgot its key. ' +
      'My data stays here. I can turn sync on again with the account I want.',
  },
  signedInAgain: { ar: 'سجّلتُ الدخول من جديد وأتابع المزامنة.', en: 'I signed in again and sync continues.' },
  syncNow: { ar: 'مزامنة الآن', en: 'Sync now' },
  reset: { ar: 'إعادة ضبط النسخة السحابية', en: 'Reset cloud copy' },
  turnOff: { ar: 'إيقاف المزامنة على هذا الجهاز', en: 'Turn off sync on this device' },
  turnOffConfirm: {
    ar: 'سأحتاج إلى عبارة المرور من جديد لتفعيل المزامنة. بياناتي على هذا الجهاز والنسخة السحابية باقيتان.',
    en: 'I will need the passphrase again to turn sync back on. My data on this device and the cloud copy stay.',
  },
  confirmTurnOff: { ar: 'تأكيد الإيقاف', en: 'Confirm turning off' },
  turnedOff: {
    ar: 'أوقفتُ المزامنة على هذا الجهاز. بياناتي المحلية باقية.',
    en: 'I turned off sync on this device. My local data stays here.',
  },
  resetIntro: {
    ar: 'سأحذف النسخة السحابية وأرفع بيانات هذا الجهاز بعبارة مرور جديدة. ستحتاج أجهزتي الأخرى إلى العبارة الجديدة.',
    en:
      'I will delete the cloud copy and upload this device’s data under a new passphrase. ' +
      'My other devices will need the new passphrase.',
  },
  resetCountOne: {
    ar: 'سأرفع السجل الوحيد الموجود على هذا الجهاز.',
    en: 'I will upload the one record on this device.',
  },
  resetCount: {
    ar: 'سأرفع {count} من السجلات الموجودة على هذا الجهاز.',
    en: 'I will upload the {count} records on this device.',
  },
  recordCount: { ar: 'السجلات على هذا الجهاز:', en: 'Records on this device:' },
  resetEmpty: {
    ar: 'لا توجد سجلات. سيؤدي التأكيد إلى استبدال النسخة السحابية ببيانات فارغة.',
    en: 'There are no records. Confirming will replace the cloud copy with empty data.',
  },
  typeWord: { ar: 'أكتب «امسح» للتأكيد', en: 'Type “ERASE” to confirm' },
  typeWordError: { ar: 'أكتب كلمة «امسح» للتأكيد.', en: 'I type “ERASE” to confirm.' },
  eraseWord: { ar: 'امسح', en: 'ERASE' },
  continueReset: { ar: 'متابعة وإدخال عبارة جديدة', en: 'Continue and enter a new passphrase' },
  resetPassIntro: {
    ar: 'أختار عبارة مرور جديدة من {n} أحرف على الأقل. ستفتح هذه العبارة النسخة على أجهزتي الأخرى.',
    en: 'I choose a new passphrase with at least {n} characters. It will unlock the copy on my other devices.',
  },
  newPassphrase: { ar: 'عبارة المرور الجديدة', en: 'New passphrase' },
  repeatNew: { ar: 'أكرر عبارة المرور الجديدة', en: 'Repeat new passphrase' },
  replace: { ar: 'استبدال النسخة السحابية', en: 'Replace cloud copy' },
  replaced: { ar: 'استبدلتُ النسخة السحابية وبدأت المزامنة.', en: 'I replaced the cloud copy and started syncing.' },
} satisfies Record<string, Bi>;
