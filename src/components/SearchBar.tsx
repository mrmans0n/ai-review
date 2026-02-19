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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
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
        className="w-80 bg-gray-900 text-gray-100 border border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-300 min-w-16 text-right">
        {current} of {matchCount}
      </span>
      <button
        onClick={onPrev}
        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        aria-label="Previous match"
      >
        ▲
      </button>
      <button
        onClick={onNext}
        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        aria-label="Next match"
      >
        ▼
      </button>
      <button
        onClick={onClose}
        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
        aria-label="Close search"
      >
        ×
      </button>
    </div>
  );
}
