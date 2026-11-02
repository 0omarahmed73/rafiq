import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DEFAULT_LANGUAGE, type Lang } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { LanguageChoice } from './LanguageChoice';

/**
 * The first screen of the app: it asks for a language until one is chosen, English preselected. It comes before the
 * disclaimer. The calm page is never behind it, so help stays one tap away. This screen is bilingual on purpose:
 * the person has not chosen yet, so neither language can be assumed.
 */
export function LanguageGate({ children }: { children: ReactNode }) {
  const { chosen, setLanguage } = useLanguage();
  const { pathname } = useLocation();
  const [choice, setChoice] = useState<Lang>(DEFAULT_LANGUAGE);
  const [failed, setFailed] = useState(false);

  if (pathname === '/calm' || chosen) return <>{children}</>;

  async function save() {
    setFailed(false);
    try {
      await setLanguage(choice);
    } catch {
      setFailed(true);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <h1 className="text-[28px] font-bold leading-snug">
        <span className="block" lang="en">
          Choose your language
        </span>
        <span className="block" lang="ar">
          اختر لغتك
        </span>
      </h1>
      <LanguageChoice
        name="first-run-language"
        legend={
          <>
            <span lang="en">Language</span> · <span lang="ar">اللغة</span>
          </>
        }
        value={choice}
        onChange={setChoice}
      />
      {failed && (
        <p role="alert" className="rounded-2xl bg-teal-soft px-4 py-3 text-base text-teal-ink">
          <span className="block" lang="en">
            Your choice could not be saved. Please try again.
          </span>
          <span className="block" lang="ar">
            تعذّر حفظ اختيارك، حاول مرة أخرى.
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={save}
        className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card"
      >
        <span lang="en">Continue</span> · <span lang="ar">متابعة</span>
      </button>
      <Link
        to="/calm"
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-soft px-6 text-base font-semibold text-teal-ink"
      >
        <span lang="en">I need calm now</span> · <span lang="ar">أحتاج تهدئة الآن</span>
      </Link>
    </main>
  );
}
