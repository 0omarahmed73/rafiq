export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 min-w-14 items-center justify-center"
      >
        <span
          className={`flex h-[26px] w-11 items-center rounded-full p-[3px] ${
            checked ? 'justify-end bg-teal' : 'justify-start bg-line'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-card" />
        </span>
      </button>
    </div>
  );
}
