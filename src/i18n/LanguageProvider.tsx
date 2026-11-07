import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRepo } from '../db/RepoContext';
import {
  applyDocumentLanguage,
  currentLanguage,
  DEFAULT_LANGUAGE,
  digits,
  setActiveLanguage,
  t,
  type Lang,
} from '.';

export interface LanguageState {
  lang: Lang;
  /** False until the person picks a language; the language screen shows meanwhile. */
  chosen: boolean;
  setLanguage: (lang: Lang) => Promise<void>;
  /** Re-reads the saved choice, for example after a backup has been imported. */
  reload: () => Promise<void>;
}

const LanguageContext = createContext<LanguageState | null>(null);

/**
 * Holds the saved language. `initial` is `undefined` until the person has chosen one, which reads as English.
 * The active language is set during render, so every `t()` call below this provider uses the current choice.
 */
export function LanguageProvider({ initial, children }: { initial?: Lang; children: ReactNode }) {
  const repo = useRepo();
  const [saved, setSaved] = useState<Lang | undefined>(initial);
  const lang = saved ?? DEFAULT_LANGUAGE;
  setActiveLanguage(lang);

  useLayoutEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const setLanguage = useCallback(
    async (next: Lang) => {
      const settings = await repo.getSettings();
      await repo.saveSettings({ ...settings, language: next });
      setActiveLanguage(next);
      setSaved(next);
    },
    [repo],
  );

  const reload = useCallback(async () => {
    const settings = await repo.getSettings();
    setActiveLanguage(settings.language ?? DEFAULT_LANGUAGE);
    setSaved(settings.language);
  }, [repo]);

  const value = useMemo<LanguageState>(
    () => ({ lang, chosen: saved !== undefined, setLanguage, reload }),
    [lang, saved, setLanguage, reload],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** The saved language and how to change it. Outside a provider (in isolated tests) it reads the active language. */
export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    lang: currentLanguage(),
    chosen: true,
    setLanguage: async (lang: Lang) => setActiveLanguage(lang),
    reload: async () => undefined,
  };
}

/** Use in components that render text: `const { t } = useI18n();` re-renders them when the language changes. */
export function useI18n() {
  const { lang } = useLanguage();
  return { lang, t, digits };
}
