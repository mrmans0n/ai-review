import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TitlebarContext } from "./TitlebarContext";
import type { TitlebarContext as TitlebarContextValue } from "../lib/titlebarContext";

const context: TitlebarContextValue & { activeFile: string } = {
  repoName: "ai-review",
  primary: "Unstaged changes",
  secondary: "feature/titlebar-overlay",
  activeFile: "src/components/TitlebarContext.tsx",
  fileSummary: "3 files",
};

function makeProps(overrides: Partial<Parameters<typeof TitlebarContext>[0]> = {}) {
  return {
    context,
    scrolled: false,
    onToggleTheme: vi.fn(),
    onToggleRail: vi.fn(),
    railVisible: true,
    theme: "dark" as const,
    currentPath: "/tmp/ai-review",
    repos: [{ name: "ai-review", path: "/tmp/ai-review", last_activity: 0 }],
    viewType: "split" as const,
    diffMode: { mode: "unstaged" as const },
    changeStatus: { has_unstaged: true, has_staged: true },
    showReviewSettings: true,
    onSwitchRepo: vi.fn(),
    onAddRepo: vi.fn(),
    onRemoveRepo: vi.fn(),
    onViewTypeChange: vi.fn(),
    onDiffModeChange: vi.fn(),
    onBrowseCommits: vi.fn(),
    ...overrides,
  };
}

describe("TitlebarContext", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders compact review context without product prefix", () => {
    render(<TitlebarContext {...makeProps()} />);

    const titlebar = screen.getByRole("banner");

    expect(titlebar).not.toHaveTextContent("Air");
    expect(titlebar).toHaveTextContent("ai-review");
    expect(titlebar).toHaveTextContent("Unstaged changes");
    expect(titlebar).toHaveTextContent("3 files");

    expect(titlebar).not.toHaveTextContent("src/components/TitlebarContext.tsx");
  });

  it("marks the scroll state for overlay styling", () => {
    const { container } = render(<TitlebarContext {...makeProps({ scrolled: true })} />);

    expect(container.querySelector("header")).toHaveAttribute("data-scrolled", "true");
  });

  it("keeps the native traffic-light control lane aligned with the overlay titlebar", () => {
    const { container } = render(<TitlebarContext {...makeProps()} />);

    const titlebar = container.querySelector("header");
    const nativeControlsLane = titlebar?.querySelector("[data-tauri-drag-region]");

    expect(titlebar).toHaveClass("h-9");
    expect(nativeControlsLane).toHaveClass("w-[82px]");
  });

  it("keeps titlebar actions clickable", () => {
    const onToggleRail = vi.fn();
    const onToggleTheme = vi.fn();
    render(<TitlebarContext {...makeProps({ onToggleRail, onToggleTheme })} />);

    fireEvent.click(screen.getByRole("button", { name: "Hide review rail" }));
    fireEvent.click(screen.getByRole("button", { name: "Review settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(onToggleRail).toHaveBeenCalledOnce();
    expect(onToggleTheme).toHaveBeenCalledOnce();
    expect(screen.getByText("Scope")).toBeInTheDocument();
  });

  it("copies the primary context when clicked", () => {
    render(<TitlebarContext {...makeProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Unstaged changes" }));

    expect(writeText).toHaveBeenCalledWith("Unstaged changes");
  });

  it("copies the full primary value for long ranges", () => {
    const range = "feature/really-long-branch-name..main-with-another-long-name";
    const customContext = { ...context, primary: range };
    render(<TitlebarContext {...makeProps({ context: customContext })} />);

    fireEvent.click(screen.getByRole("button", { name: `Copy ${range}` }));

    expect(writeText).toHaveBeenCalledWith(range);
  });

  it("shows and hides the copied popover after a successful copy", async () => {
    render(<TitlebarContext {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy Unstaged changes" }));
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Copied!");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not mark the copy button as a drag region", () => {
    render(<TitlebarContext {...makeProps()} />);

    expect(screen.getByRole("button", { name: "Copy Unstaged changes" })).not.toHaveAttribute(
      "data-tauri-drag-region"
    );
  });
});
