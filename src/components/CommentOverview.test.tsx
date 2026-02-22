import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentOverview } from "./CommentOverview";
import type { Comment } from "../types";

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "1",
    file: "src/App.tsx",
    startLine: 10,
    endLine: 10,
    side: "new",
    text: "Looks good",
    ...overrides,
  };
}

function makeProps(overrides: Partial<Parameters<typeof CommentOverview>[0]> = {}) {
  return {
    comments: [],
    onClose: vi.fn(),
    onGoToComment: vi.fn(),
    ...overrides,
  };
}

describe("CommentOverview", () => {
  it("shows comment count in header", () => {
    const comments = [makeComment({ text: "First" }), makeComment({ id: "2", text: "Second" })];
    render(<CommentOverview {...makeProps({ comments })} />);
    expect(screen.getByText(/2 comments/)).toBeTruthy();
  });

  it("shows singular 'comment' for one comment", () => {
    render(<CommentOverview {...makeProps({ comments: [makeComment()] })} />);
    expect(screen.getByText(/1 comment[^s]/)).toBeTruthy();
  });

  it("shows file count in header", () => {
    const comments = [
      makeComment({ file: "src/A.tsx" }),
      makeComment({ id: "2", file: "src/B.tsx" }),
    ];
    render(<CommentOverview {...makeProps({ comments })} />);
    expect(screen.getByText(/2 files/)).toBeTruthy();
  });

  it("groups comments under their file", () => {
    const comments = [
      makeComment({ file: "src/App.tsx", text: "App comment" }),
      makeComment({ id: "2", file: "src/utils.ts", text: "Utils comment" }),
    ];
    render(<CommentOverview {...makeProps({ comments })} />);
    expect(screen.getByText("src/App.tsx")).toBeTruthy();
    expect(screen.getByText("src/utils.ts")).toBeTruthy();
    expect(screen.getByText("App comment")).toBeTruthy();
    expect(screen.getByText("Utils comment")).toBeTruthy();
  });

  it("sorts comments within a file by startLine", () => {
    const comments = [
      makeComment({ id: "1", startLine: 30, text: "Later line" }),
      makeComment({ id: "2", startLine: 5, text: "Earlier line" }),
    ];
    render(<CommentOverview {...makeProps({ comments })} />);
    const texts = screen.getAllByText(/line/);
    expect(texts[0].textContent).toBe("Earlier line");
    expect(texts[1].textContent).toBe("Later line");
  });

  it("calls onGoToComment when a comment is clicked", () => {
    const onGoToComment = vi.fn();
    const comment = makeComment({ text: "Click me" });
    render(<CommentOverview {...makeProps({ comments: [comment], onGoToComment })} />);
    fireEvent.click(screen.getByText("Click me"));
    expect(onGoToComment).toHaveBeenCalledWith(comment);
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(<CommentOverview {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<CommentOverview {...makeProps({ onClose })} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("comment items have no horizontal row dividers", () => {
    const comments = [
      makeComment({ id: "1", text: "First" }),
      makeComment({ id: "2", startLine: 20, text: "Second" }),
    ];
    const { container } = render(<CommentOverview {...makeProps({ comments })} />);
    const items = container.querySelectorAll("button[class*='w-full']");
    items.forEach((item) => {
      // The inner div should not have border-b divider classes
      const inner = item.querySelector("div");
      expect(inner?.className).not.toContain("border-b border-ctp-surface1/50");
    });
  });

  it("shows line range for multi-line comments", () => {
    const comment = makeComment({ startLine: 5, endLine: 10 });
    render(<CommentOverview {...makeProps({ comments: [comment] })} />);
    expect(screen.getByText("L5-10")).toBeTruthy();
  });

  it("shows single line label for single-line comments", () => {
    const comment = makeComment({ startLine: 7, endLine: 7 });
    render(<CommentOverview {...makeProps({ comments: [comment] })} />);
    expect(screen.getByText("L7")).toBeTruthy();
  });

  it("shows deleted label for old-side comments", () => {
    const comment = makeComment({ side: "old" });
    render(<CommentOverview {...makeProps({ comments: [comment] })} />);
    expect(screen.getByText("deleted")).toBeTruthy();
  });
});
