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
      <div className="bg-ctp-surface0 border border-ctp-surface1 rounded-md shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
          <div className="w-0.5 h-5 bg-ctp-peach rounded-full flex-shrink-0" />
          <h2 className="text-base font-semibold text-ctp-text">Open File</h2>
        </div>
        <div className="p-4 border-b border-ctp-surface1">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files... (fuzzy match)"
            className="w-full bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text text-sm px-3 py-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-ctp-subtext">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-ctp-subtext">
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
                      ? "px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach"
                      : "px-4 py-3 hover:bg-ctp-surface0"
                  }`}
                >
                  <div className="font-mono text-sm">
                    <div className="font-semibold text-ctp-text">{fileName}</div>
                    {directory && (
                      <div className="text-xs mt-0.5 text-ctp-overlay0">
                        {directory}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 border-t border-ctp-surface1 bg-ctp-base text-xs text-ctp-overlay0">
          <span className="mr-4">↑↓ Navigate</span>
          <span className="mr-4">Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
