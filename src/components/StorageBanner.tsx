import { Banner } from './Banner';

export function StorageBanner({ persistent }: { persistent: boolean }) {
  if (persistent) return null;
  return (
    <Banner>
      التخزين غير متاح في هذا المتصفح، لذلك لن تُحفظ بياناتي بعد إغلاق الصفحة. يمكنك تصدير نسخة احتياطية من
      الإعدادات قبل الخروج.
    </Banner>
  );
}
