import { useState, useRef, useEffect } from "react";
import type { RepoInfo } from "../types";

interface RepoSwitcherProps {
  currentPath: string;
  repos: RepoInfo[];
  onSwitchRepo: (path: string) => void;
  onAddRepo: () => void;
  onRemoveRepo: (path: string) => void;
}

export function RepoSwitcher({
  currentPath,
  repos,
  onSwitchRepo,
  onAddRepo,
  onRemoveRepo,
}: RepoSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentName =
    currentPath.split("/").filter(Boolean).pop() || currentPath;

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors text-sm"
      >
        <span className="font-medium">{currentName}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-64 overflow-auto">
            {repos.map((repo) => (
              <div
                key={repo.path}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors group ${
                  repo.path === currentPath ? "bg-gray-700" : ""
                }`}
              >
                <button
                  onClick={() => {
                    if (repo.path !== currentPath) {
                      onSwitchRepo(repo.path);
                    }
                    setIsOpen(false);
                  }}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-sm text-white font-medium flex items-center gap-2">
                    {repo.name}
                    {repo.path === currentPath && (
                      <span className="text-green-400 text-xs">current</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {repo.path}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRepo(repo.path);
                  }}
                  className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 shrink-0"
                  title="Remove from list"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-600">
            <button
              onClick={() => {
                onAddRepo();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Repository...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
