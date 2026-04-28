import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
  it("renders compact review context", () => {
    render(<TitlebarContext {...makeProps()} />);

    const titlebar = screen.getByText("Air").closest("header");

    expect(titlebar).toHaveTextContent("Air");
    expect(titlebar).toHaveTextContent("ai-review");
    expect(titlebar).toHaveTextContent("Unstaged changes");
    expect(titlebar).toHaveTextContent("3 files");

    expect(titlebar).not.toHaveTextContent("src/components/TitlebarContext.tsx");
  });

  it("marks the scroll state for overlay styling", () => {
    const { container } = render(<TitlebarContext {...makeProps({ scrolled: true })} />);

    expect(container.querySelector("header")).toHaveAttribute("data-scrolled", "true");
  });

  it("keeps visible title text selectable while leaving empty titlebar space draggable", () => {
    const { container } = render(<TitlebarContext {...makeProps()} />);

    const dragRegions = Array.from(
      container.querySelectorAll("[data-tauri-drag-region]")
    ).map((element) => element.textContent ?? "");

    expect(dragRegions.some((text) => text.includes("Unstaged changes"))).toBe(true);
    expect(container.querySelector("header")).toHaveAttribute("data-tauri-drag-region");

    expect(container.querySelector(".titlebar-text")).not.toBeNull();
    expect(container.querySelector(".titlebar-text[data-tauri-drag-region]")).toBeNull();
    expect(container.querySelector(".middle-ellipsis-start[data-tauri-drag-region]")).toBeNull();
    expect(container.querySelector(".middle-ellipsis-end[data-tauri-drag-region]")).toBeNull();
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
});
