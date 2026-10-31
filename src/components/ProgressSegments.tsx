export function ProgressSegments({ total, current }: { total: number; current: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-filled={i < current}
          className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-teal' : 'bg-line'}`}
        />
      ))}
    </div>
  );
}
