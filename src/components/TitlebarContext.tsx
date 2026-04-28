import { useEffect, useRef, useState } from "react";
import type { TitlebarContext as TitlebarContextValue } from "../lib/titlebarContext";
import type { DiffModeConfig, GitChangeStatus, RepoInfo } from "../types";
import { MiddleEllipsis } from "./MiddleEllipsis";
import { RepoSwitcher } from "./RepoSwitcher";
import { TitlebarSettingsMenu } from "./TitlebarSettingsMenu";

interface TitlebarContextProps {
  context: TitlebarContextValue;
  scrolled: boolean;
  onToggleTheme: () => void;
  onToggleRail: () => void;
  railVisible: boolean;
  theme: "dark" | "light";
  currentPath: string;
  repos: RepoInfo[];
  viewType: "split" | "unified";
  diffMode: DiffModeConfig;
  changeStatus: GitChangeStatus;
  showReviewChrome: boolean;
  showReviewSettings: boolean;
  onSwitchRepo: (path: string) => void;
  onAddRepo: () => void;
  onRemoveRepo: (path: string) => void;
  onViewTypeChange: (viewType: "split" | "unified") => void;
  onDiffModeChange: (mode: DiffModeConfig) => void;
  onBrowseCommits: () => void;
}

export function TitlebarContext({
  context,
  scrolled,
  onToggleTheme,
  onToggleRail,
  railVisible,
  theme,
  currentPath,
  repos,
  viewType,
  diffMode,
  changeStatus,
  showReviewChrome,
  showReviewSettings,
  onSwitchRepo,
  onAddRepo,
  onRemoveRepo,
  onViewTypeChange,
  onDiffModeChange,
  onBrowseCommits,
}: TitlebarContextProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCopied(false);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
  }, [context.primary]);

  const handleCopyPrimary = async () => {
    try {
      await navigator.clipboard.writeText(context.primary);
      setCopied(true);

      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy titlebar context:", err);
    }
  };

  return (
    <header
      data-tauri-drag-region
      data-scrolled={scrolled}
      className={`app-titlebar absolute inset-x-0 top-0 z-40 flex h-9 items-center pr-3 transition-colors duration-150 ${
        scrolled
          ? "border-b border-divider/80 bg-surface/85 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-surface/45 backdrop-blur-md"
      }`}
    >
      <div data-tauri-drag-region className="w-[82px] flex-shrink-0" />
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 text-[13px]"
      >
        <RepoSwitcher
          currentPath={currentPath}
          repos={repos}
          onSwitchRepo={onSwitchRepo}
          onAddRepo={onAddRepo}
          onRemoveRepo={onRemoveRepo}
          variant="titlebar"
        />
        {showReviewChrome && (
          <>
            <span data-tauri-drag-region className="text-ink-muted">·</span>
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={handleCopyPrimary}
                className="titlebar-text min-w-0 cursor-pointer rounded-sm text-ink-secondary transition-colors hover:text-ink-primary"
                aria-label={`Copy ${context.primary}`}
                title="Copy to clipboard"
              >
                <MiddleEllipsis text={context.primary} />
              </button>
              {copied && (
                <span
                  role="status"
                  className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-sm border border-divider bg-surface-raised px-2 py-1 text-xs text-ink-primary shadow-sm"
                >
                  Copied!
                </span>
              )}
            </div>
            {context.secondary && (
              <>
                <span data-tauri-drag-region className="hidden text-ink-muted md:inline">·</span>
                <span className="titlebar-text hidden min-w-0 select-text text-ink-muted md:inline">
                  <MiddleEllipsis text={context.secondary} />
                </span>
              </>
            )}
          </>
        )}
      </div>
      <div className="titlebar-no-drag flex flex-shrink-0 items-center gap-2">
        {showReviewChrome && context.fileSummary && (
          <span className="titlebar-text hidden select-text text-xs text-ink-muted sm:inline">
            {context.fileSummary}
          </span>
        )}
        {showReviewChrome && (
          <button
            type="button"
            onClick={onToggleRail}
            className={`rounded-sm p-1.5 transition-colors ${
              railVisible
                ? "bg-surface-hover text-ink-primary"
                : "text-ink-secondary hover:bg-surface-hover hover:text-ink-primary"
            }`}
            title={railVisible ? "Hide review rail" : "Show review rail"}
            aria-label={railVisible ? "Hide review rail" : "Show review rail"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M15 4v16" />
            </svg>
          </button>
        )}
        {showReviewSettings && (
          <TitlebarSettingsMenu
            viewType={viewType}
            diffMode={diffMode}
            changeStatus={changeStatus}
            onViewTypeChange={onViewTypeChange}
            onDiffModeChange={onDiffModeChange}
            onBrowseCommits={onBrowseCommits}
          />
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-sm p-1.5 text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink-primary"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
