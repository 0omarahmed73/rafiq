const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

export function toArabicDigits(v: number | string): string {
  return String(v).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}
