import { useEffect, useRef, useState } from "react";
import type { DiffModeConfig, GitChangeStatus } from "../types";

interface TitlebarSettingsMenuProps {
  viewType: "split" | "unified";
  diffMode: DiffModeConfig;
  changeStatus: GitChangeStatus;
  onViewTypeChange: (viewType: "split" | "unified") => void;
  onDiffModeChange: (mode: DiffModeConfig) => void;
  onBrowseCommits: () => void;
}

export function TitlebarSettingsMenu({
  viewType,
  diffMode,
  changeStatus,
  onViewTypeChange,
  onDiffModeChange,
  onBrowseCommits,
}: TitlebarSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const btnBase = "px-3 py-1.5 text-sm rounded-sm transition-colors border";
  const btnDefault = `${btnBase} bg-transparent border-ctp-surface1 text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text hover:border-ctp-overlay0`;
  const btnActive = `${btnBase} bg-ctp-surface1 border-ctp-peach text-ctp-text`;

  return (
    <div className="relative titlebar-no-drag" ref={menuRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors titlebar-no-drag"
        title="Review settings"
        aria-label="Review settings"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.7.6z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-md border border-ctp-surface1 bg-ctp-mantle shadow-2xl z-50 p-3 titlebar-no-drag">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase mb-2">
                View
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onViewTypeChange("split")}
                  className={viewType === "split" ? btnActive : btnDefault}
                >
                  Split
                </button>
                <button
                  onClick={() => onViewTypeChange("unified")}
                  className={viewType === "unified" ? btnActive : btnDefault}
                >
                  Unified
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase mb-2">
                Scope
              </div>
              <div className="flex flex-wrap gap-1">
                {changeStatus.has_unstaged && (
                  <button
                    onClick={() => onDiffModeChange({ mode: "unstaged" })}
                    className={diffMode.mode === "unstaged" ? btnActive : btnDefault}
                  >
                    Unstaged
                  </button>
                )}
                {changeStatus.has_staged && (
                  <button
                    onClick={() => onDiffModeChange({ mode: "staged" })}
                    className={diffMode.mode === "staged" ? btnActive : btnDefault}
                  >
                    Staged
                  </button>
                )}
                <button
                  onClick={() => {
                    onBrowseCommits();
                    setIsOpen(false);
                  }}
                  className={`${btnDefault} flex items-center gap-1.5`}
                  title="Browse commits (Ctrl+K)"
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Browse Commits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
