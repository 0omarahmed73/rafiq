import { useI18n } from '../i18n/LanguageProvider';
import { Banner } from './Banner';

export function StorageBanner({ persistent }: { persistent: boolean }) {
  const { t } = useI18n();
  if (persistent) return null;
  return (
    <Banner>
      {t({
        ar: 'التخزين غير متاح في هذا المتصفح، لذلك لن تُحفظ بياناتي بعد إغلاق الصفحة. يمكنك تصدير نسخة احتياطية من الإعدادات قبل الخروج.',
        en: 'Storage is not available in this browser, so my data will not be kept after I close the page. I can export a backup from Settings before I leave.',
      })}
    </Banner>
  );
}
