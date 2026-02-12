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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files... (fuzzy match)"
            className="w-full bg-gray-900 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {searchQuery ? "No matching files" : "No files found"}
            </div>
          ) : (
            files.map((file, index) => (
              <div
                key={file}
                ref={index === selectedIndex ? selectedRef : null}
                onClick={() => onSelect(file)}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <div className="font-mono text-sm">{file}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-700 bg-gray-900 text-xs text-gray-400">
          <span className="mr-4">↑↓ Navigate</span>
          <span className="mr-4">Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
