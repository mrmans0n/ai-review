import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RightRail } from "./RightRail";
import type { ChangedFileRailItem, Comment, RepoInfo } from "../types";

const files: ChangedFileRailItem[] = [{ path: "src/App.tsx", displayPath: "src/App.tsx", status: "modified", additions: 12, deletions: 4, viewed: false, commentCount: 1 }];
const repos: RepoInfo[] = [{ name: "ai-review", path: "/tmp/ai-review", last_activity: 0 }];
const comments: Comment[] = [
  {
    id: "comment-1",
    file: "src/App.tsx",
    startLine: 4,
    endLine: 4,
    side: "new",
    text: "Rail comment",
    createdAt: "2026-04-26T00:00:00.000Z",
  },
];

function makeProps(overrides: Partial<Parameters<typeof RightRail>[0]> = {}) {
  return {
    files,
    comments,
    width: 320,
    visible: true,
    resizing: false,
    viewedCount: 0,
    renderableFilesCount: 1,
    currentPath: "/tmp/ai-review",
    repos,
    viewType: "split" as const,
    diffMode: { mode: "unstaged" as const },
    changeStatus: { has_unstaged: true, has_staged: true },
    jsonOutput: false,
    cliInstalled: true,
    cliJustInstalled: false,
    installMessage: null,
    onStartResize: vi.fn(),
    onSwitchRepo: vi.fn(),
    onAddRepo: vi.fn(),
    onRemoveRepo: vi.fn(),
    onViewTypeChange: vi.fn(),
    onDiffModeChange: vi.fn(),
    onBrowseCommits: vi.fn(),
    onPreviewPrompt: vi.fn(),
    onGeneratePrompt: vi.fn(),
    onInstallCli: vi.fn(),
    onScrollToFile: vi.fn(),
    onPreviewFile: vi.fn(),
    onGoToComment: vi.fn(),
    onOpenCommentOverview: vi.fn(),
    ...overrides,
  };
}

describe("RightRail", () => {
  it("renders changed files and comments", () => {
    render(<RightRail {...makeProps()} />);

    expect(screen.getByText("Changed Files")).toBeInTheDocument();
    expect(screen.getAllByText("View").length).toBeGreaterThan(0);
    expect(screen.getByText("Scope")).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Rail comment")).toBeInTheDocument();
  });

  it("moves view and scope actions into the rail", () => {
    const onViewTypeChange = vi.fn();
    const onDiffModeChange = vi.fn();
    const onBrowseCommits = vi.fn();
    render(<RightRail {...makeProps({ onViewTypeChange, onDiffModeChange, onBrowseCommits })} />);

    fireEvent.click(screen.getByRole("button", { name: "unified" }));
    fireEvent.click(screen.getByRole("button", { name: "Staged" }));
    fireEvent.click(screen.getByRole("button", { name: "Browse commits" }));

    expect(onViewTypeChange).toHaveBeenCalledWith("unified");
    expect(onDiffModeChange).toHaveBeenCalledWith({ mode: "staged" });
    expect(onBrowseCommits).toHaveBeenCalled();
  });

  it("clicking a changed file scrolls to the diff", () => {
    const onScrollToFile = vi.fn();
    render(<RightRail {...makeProps({ onScrollToFile })} />);

    fireEvent.click(screen.getByRole("button", { name: "src/App.tsx" }));

    expect(onScrollToFile).toHaveBeenCalledWith("src/App.tsx");
  });

  it("clicking the preview action opens preview without scrolling", () => {
    const onScrollToFile = vi.fn();
    const onPreviewFile = vi.fn();
    render(<RightRail {...makeProps({ onScrollToFile, onPreviewFile })} />);

    fireEvent.click(screen.getByLabelText("Preview src/App.tsx"));

    expect(onPreviewFile).toHaveBeenCalledWith("src/App.tsx");
    expect(onScrollToFile).not.toHaveBeenCalled();
  });

  it("clicking a comment delegates navigation", () => {
    const onGoToComment = vi.fn();
    render(<RightRail {...makeProps({ onGoToComment })} />);

    fireEvent.click(screen.getByText("Rail comment"));

    expect(onGoToComment).toHaveBeenCalledWith(comments[0]);
  });

  it("does not render when hidden", () => {
    render(<RightRail {...makeProps({ visible: false })} />);

    expect(screen.queryByText("Changed Files")).not.toBeInTheDocument();
  });
});
