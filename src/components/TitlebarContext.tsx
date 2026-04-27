import type { TitlebarContext as TitlebarContextValue } from "../lib/titlebarContext";
import { MiddleEllipsis } from "./MiddleEllipsis";

interface TitlebarContextProps {
  context: TitlebarContextValue;
  scrolled: boolean;
  onToggleTheme: () => void;
  onToggleRail: () => void;
  railVisible: boolean;
  theme: "dark" | "light";
}

export function TitlebarContext({ context, scrolled, onToggleTheme, onToggleRail, railVisible, theme }: TitlebarContextProps) {
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
        <span data-tauri-drag-region className="font-semibold text-ink-primary">Air</span>
        <span data-tauri-drag-region className="text-ink-muted">/</span>
        <span data-tauri-drag-region className="min-w-0 max-w-[180px] font-medium text-ink-primary">
          <MiddleEllipsis text={context.repoName} dragRegion />
        </span>
        <span data-tauri-drag-region className="text-ink-muted">·</span>
        <span data-tauri-drag-region className="min-w-0 max-w-[260px] text-ink-secondary">
          <MiddleEllipsis text={context.primary} dragRegion />
        </span>
        {context.secondary && (
          <>
            <span data-tauri-drag-region className="hidden text-ink-muted md:inline">·</span>
            <span data-tauri-drag-region className="hidden min-w-0 max-w-[320px] text-ink-muted md:inline">
              <MiddleEllipsis text={context.secondary} dragRegion />
            </span>
          </>
        )}
        {context.activeFile && (
          <>
            <span data-tauri-drag-region className="hidden text-ink-muted lg:inline">·</span>
            <span data-tauri-drag-region className="hidden min-w-0 max-w-[360px] font-mono text-xs text-ink-muted lg:inline">
              <MiddleEllipsis text={context.activeFile} dragRegion />
            </span>
          </>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {context.fileSummary && (
          <span data-tauri-drag-region className="hidden text-xs text-ink-muted sm:inline">
            {context.fileSummary}
          </span>
        )}
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
