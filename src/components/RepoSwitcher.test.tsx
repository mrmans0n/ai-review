import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RepoSwitcher } from "./RepoSwitcher";
import type { RepoInfo } from "../types";

const repos: RepoInfo[] = [
  {
    name: "ai-review",
    path: "/Users/dev/repos/ai-review",
    last_activity: 1,
  },
  {
    name: "mission-control",
    path: "/Users/dev/repos/mission-control",
    last_activity: 2,
  },
];

function makeProps(overrides: Partial<Parameters<typeof RepoSwitcher>[0]> = {}) {
  return {
    currentPath: repos[0].path,
    repos,
    onSwitchRepo: vi.fn(),
    onAddRepo: vi.fn(),
    onRemoveRepo: vi.fn(),
    ...overrides,
  };
}

describe("RepoSwitcher", () => {
  it("renders a compact titlebar variant and marks it as no-drag", () => {
    const { container } = render(<RepoSwitcher {...makeProps({ variant: "titlebar" })} />);

    expect(screen.getByRole("button", { name: /ai-review/i })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("titlebar-no-drag");
  });

  it("switches repositories from the dropdown", () => {
    const onSwitchRepo = vi.fn();
    render(<RepoSwitcher {...makeProps({ onSwitchRepo, variant: "titlebar" })} />);

    fireEvent.click(screen.getByRole("button", { name: /ai-review/i }));
    fireEvent.click(screen.getByRole("button", { name: /mission-control/i }));

    expect(onSwitchRepo).toHaveBeenCalledWith(repos[1].path);
  });

  it("shows the current repository as selected", () => {
    render(<RepoSwitcher {...makeProps({ variant: "titlebar" })} />);

    fireEvent.click(screen.getByRole("button", { name: /ai-review/i }));

    expect(screen.getByText("current")).toBeInTheDocument();
  });
});
