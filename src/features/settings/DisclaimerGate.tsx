import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { useI18n } from '../../i18n/LanguageProvider';

/**
 * Shows the "supports, does not replace therapy" notice until it is accepted once.
 * The calm page is never behind it: help must always be one tap away.
 */
export function DisclaimerGate({ children }: { children: ReactNode }) {
  const repo = useRepo();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [state, setState] = useState<'loading' | 'needed' | 'accepted'>('loading');

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((s) => alive && setState(s.disclaimerAcceptedAt ? 'accepted' : 'needed'));
    return () => {
      alive = false;
    };
  }, [repo]);

  async function accept() {
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, disclaimerAcceptedAt: new Date().toISOString() });
    setState('accepted');
  }

  if (pathname === '/calm' || state === 'accepted') return <>{children}</>;
  if (state === 'loading') return null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-10">
      <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'مرحبًا في رفيق', en: 'Welcome to Rafiq' })}</h1>
      <p className="text-base leading-8">
        {t({
          ar: 'رفيق أداة تساعدني على العناية بنفسي خطوة بخطوة، وليس بديلًا عن العلاج النفسي. إن كنتُ أتلقّى علاجًا فهو المرجع الأول.',
          en: 'Rafiq is a tool that helps me take care of myself step by step. It is not a replacement for psychological treatment. If I am receiving treatment, my therapist is my first point of reference.',
        })}
      </p>
      <p className="text-base leading-8">
        {t({
          ar: 'كل ما أكتبه هنا يبقى على جهازي فقط، ولا يُرسل إلى أي مكان.',
          en: 'Everything I write here stays on my device only. It is not sent anywhere.',
        })}
      </p>
      <Link
        to="/calm"
        className="flex min-h-12 items-center justify-center rounded-full bg-teal-soft px-6 text-base font-semibold text-teal-ink"
      >
        {t({ ar: 'أحتاج تهدئة الآن', en: 'I need calm now' })}
      </Link>
      <button
        type="button"
        onClick={accept}
        className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card"
      >
        {t({ ar: 'أفهم، لنبدأ', en: 'I understand, let\'s begin' })}
      </button>
    </main>
  );
}
