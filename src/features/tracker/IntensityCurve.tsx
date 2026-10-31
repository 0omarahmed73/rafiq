import { trendOf } from '../../lib/trend';

const PAD = 6;

/** Points for values given oldest first; time runs right to left, higher intensity is higher up. */
export function curvePoints(values: number[], width: number, height: number): { x: number; y: number }[] {
  const n = values.length;
  const span = width - 2 * PAD;
  return values.map((v, i) => ({
    x: n === 1 ? width / 2 : width - PAD - (i * span) / (n - 1),
    y: PAD + (1 - v / 10) * (height - 2 * PAD),
  }));
}

const LABELS = {
  up: 'تميل الشدّة إلى الارتفاع في آخر الأيام المسجّلة',
  down: 'تميل الشدّة إلى الانخفاض في آخر الأيام المسجّلة',
  flat: 'الشدّة مستقرة في آخر الأيام المسجّلة',
} as const;

export function IntensityCurve({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-sm text-muted">أسجّل يومين على الأقل لأرى المنحنى.</p>;
  }
  const points = curvePoints(values, 300, 60);
  return (
    <svg viewBox="0 0 300 60" role="img" aria-label={LABELS[trendOf(values)]} className="block w-full">
      <line x1="0" y1="56" x2="300" y2="56" className="stroke-line" strokeWidth="1" />
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        className="fill-none stroke-teal"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" className="fill-teal" />
      ))}
    </svg>
  );
}
