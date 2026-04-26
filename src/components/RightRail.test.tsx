import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RightRail } from "./RightRail";
import type { ChangedFileRailItem, Comment } from "../types";

const files: ChangedFileRailItem[] = [
  {
    path: "src/App.tsx",
    displayPath: "src/App.tsx",
    status: "modified",
    additions: 0,
    deletions: 0,
    viewed: false,
    commentCount: 0,
  },
];
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
    onStartResize: vi.fn(),
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
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Rail comment")).toBeInTheDocument();
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
