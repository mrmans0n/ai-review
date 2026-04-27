import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TitlebarContext } from "./TitlebarContext";
import type { TitlebarContext as TitlebarContextValue } from "../lib/titlebarContext";

const context: TitlebarContextValue = {
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
  });

  it("marks the scroll state for overlay styling", () => {
    const { container } = render(<TitlebarContext {...makeProps({ scrolled: true })} />);

    expect(container.querySelector("header")).toHaveAttribute("data-scrolled", "true");
  });

  it("marks visible title text as draggable", () => {
    const { container } = render(<TitlebarContext {...makeProps()} />);

    const dragRegions = Array.from(
      container.querySelectorAll("[data-tauri-drag-region]")
    ).map((element) => element.textContent ?? "");

    expect(dragRegions).toContain("Air");
    expect(dragRegions.some((text) => text.includes("ai-review"))).toBe(true);
    expect(dragRegions.some((text) => text.includes("Unstaged changes"))).toBe(true);
    expect(dragRegions).toContain("3 files");
  });

  it("keeps titlebar actions clickable", () => {
    const onToggleRail = vi.fn();
    const onToggleTheme = vi.fn();
    render(<TitlebarContext {...makeProps({ onToggleRail, onToggleTheme })} />);

    fireEvent.click(screen.getByRole("button", { name: "Hide review rail" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(onToggleRail).toHaveBeenCalledOnce();
    expect(onToggleTheme).toHaveBeenCalledOnce();
  });
});
