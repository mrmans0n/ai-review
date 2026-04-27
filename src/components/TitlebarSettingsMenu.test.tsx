import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TitlebarSettingsMenu } from "./TitlebarSettingsMenu";

function makeProps(
  overrides: Partial<Parameters<typeof TitlebarSettingsMenu>[0]> = {},
) {
  return {
    viewType: "split" as const,
    diffMode: { mode: "unstaged" as const },
    changeStatus: { has_unstaged: true, has_staged: true },
    onViewTypeChange: vi.fn(),
    onDiffModeChange: vi.fn(),
    onBrowseCommits: vi.fn(),
    ...overrides,
  };
}

describe("TitlebarSettingsMenu", () => {
  it("opens view and scope controls from the settings button", () => {
    render(<TitlebarSettingsMenu {...makeProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Review settings" }));

    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Split" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unified" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unstaged" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Staged" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse Commits" })).toBeInTheDocument();
  });

  it("only shows available working tree scopes", () => {
    render(
      <TitlebarSettingsMenu
        {...makeProps({ changeStatus: { has_unstaged: false, has_staged: true } })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review settings" }));

    expect(screen.queryByRole("button", { name: "Unstaged" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Staged" })).toBeInTheDocument();
  });

  it("delegates view, scope, and commit browsing changes", () => {
    const onViewTypeChange = vi.fn();
    const onDiffModeChange = vi.fn();
    const onBrowseCommits = vi.fn();

    render(
      <TitlebarSettingsMenu
        {...makeProps({ onViewTypeChange, onDiffModeChange, onBrowseCommits })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Unified" }));
    fireEvent.click(screen.getByRole("button", { name: "Staged" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse Commits" }));

    expect(onViewTypeChange).toHaveBeenCalledWith("unified");
    expect(onDiffModeChange).toHaveBeenCalledWith({ mode: "staged" });
    expect(onBrowseCommits).toHaveBeenCalled();
    expect(screen.queryByText("Scope")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<TitlebarSettingsMenu {...makeProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "Review settings" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText("Scope")).not.toBeInTheDocument();
  });
});
