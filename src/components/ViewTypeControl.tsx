interface ViewTypeControlProps {
  value: "split" | "unified";
  onChange: (value: "split" | "unified") => void;
}

export function ViewTypeControl({ value, onChange }: ViewTypeControlProps) {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-ctp-surface1 bg-ctp-base px-1 py-1">
      <span className="px-1.5 text-[11px] font-medium uppercase tracking-wide text-ctp-overlay0">
        View
      </span>
      {(["split", "unified"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-sm px-2 py-1 text-xs capitalize transition-colors ${
            value === option
              ? "bg-ctp-surface1 text-ctp-text"
              : "text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text"
          }`}
          aria-pressed={value === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
