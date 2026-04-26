import { useEffect, useRef } from "react";

interface FileExplorerProps {
  isOpen: boolean;
  files: string[];
  searchQuery: string;
  selectedIndex: number;
  loading: boolean;
  onSearchChange: (query: string) => void;
  onSelect: (file: string) => Promise<string>;
  onClose: () => void;
}

export function FileExplorer({
  isOpen,
  files,
  searchQuery,
  selectedIndex,
  loading,
  onSearchChange,
  onSelect,
  onClose,
}: FileExplorerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div className="bg-surface-raised border border-divider rounded-md shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-divider">
          <div className="w-0.5 h-5 bg-accent-review rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ink-primary">Open File</h2>
        </div>
        <div className="p-4 border-b border-divider">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files... (fuzzy match)"
            className="w-full bg-canvas border border-divider rounded-sm text-ink-primary text-sm px-3 py-2 placeholder:text-ink-muted focus:border-accent-review focus:outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-ink-secondary">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-ink-secondary">
              {searchQuery ? "No matching files" : "No files found"}
            </div>
          ) : (
            files.map((file, index) => {
              const parts = file.split("/");
              const fileName = parts.pop() || file;
              const directory = parts.join("/");

              return (
                <div
                  key={file}
                  ref={index === selectedIndex ? selectedRef : null}
                  onClick={() => onSelect(file)}
                  className={`cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "px-4 py-3 bg-surface border-l-2 border-accent-review"
                      : "px-4 py-3 hover:bg-surface-hover"
                  }`}
                >
                  <div className="font-mono text-sm">
                    <div className="font-semibold text-ink-primary">{fileName}</div>
                    {directory && (
                      <div className="text-xs mt-0.5 text-ink-muted">
                        {directory}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-divider bg-canvas text-xs text-ink-muted">
          <span className="mr-4">↑↓ Navigate</span>
          <span className="mr-4">Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
