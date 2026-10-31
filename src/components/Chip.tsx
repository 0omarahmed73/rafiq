export function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`min-h-11 rounded-full border px-4 text-[15px] font-medium ${
        selected ? 'border-teal bg-teal text-card' : 'border-line bg-card text-ink'
      }`}
    >
      {label}
    </button>
  );
}
