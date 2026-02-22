import { useEffect, useRef } from "react";

interface SearchBarProps {
  isOpen: boolean;
  query: string;
  matchCount: number;
  currentMatchIndex: number;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function SearchBar({
  isOpen,
  query,
  matchCount,
  currentMatchIndex,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isOpen]);

  if (!isOpen) return null;

  const current = matchCount === 0 ? 0 : currentMatchIndex + 1;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) {
              onPrev();
            } else {
              onNext();
            }
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        placeholder="Search in code..."
        className="w-80 flex-1 bg-transparent text-ctp-text text-sm placeholder:text-ctp-overlay0 focus:outline-none"
      />
      <span className="text-xs text-ctp-subtext min-w-16 text-right">
        {current} of {matchCount}
      </span>
      <button
        onClick={onPrev}
        className="p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
        aria-label="Previous match"
      >
        ▲
      </button>
      <button
        onClick={onNext}
        className="p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
        aria-label="Next match"
      >
        ▼
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
        aria-label="Close search"
      >
        ×
      </button>
    </div>
  );
}
