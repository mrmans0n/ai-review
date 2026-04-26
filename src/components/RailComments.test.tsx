import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RailComments } from "./RailComments";
import { formatCommentRange } from "../hooks/commentHelpers";
import type { Comment } from "../types";

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    file: "src/App.tsx",
    startLine: 10,
    endLine: 10,
    side: "new",
    text: "Fix this",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeProps(overrides: Partial<Parameters<typeof RailComments>[0]> = {}) {
  return {
    comments: [] as Comment[],
    onGoToComment: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
    onOpenOverview: vi.fn(),
    ...overrides,
  };
}

describe("RailComments", () => {
  it("renders an empty state", () => {
    render(<RailComments {...makeProps()} />);
    expect(screen.getByText("No comments yet")).toBeTruthy();
  });

  it("renders all draft comments grouped by file", () => {
    const comments = [
      makeComment({ id: "c1", file: "src/App.tsx", text: "App comment" }),
      makeComment({ id: "c2", file: "src/lib.ts", text: "Lib comment" }),
    ];
    render(<RailComments {...makeProps({ comments })} />);

    expect(screen.getByText("App comment")).toBeTruthy();
    expect(screen.getByText("Lib comment")).toBeTruthy();
  });

  it("formats single-line, range, and file-level labels", () => {
    expect(formatCommentRange(makeComment({ startLine: 7, endLine: 7 }))).toBe("L7");
    expect(formatCommentRange(makeComment({ startLine: 7, endLine: 9 }))).toBe("L7-9");
    expect(formatCommentRange(makeComment({ startLine: 0, endLine: 0 }))).toBe("File");
  });

  it("shows deleted only for old-side line comments", () => {
    render(
      <RailComments
        {...makeProps({
          comments: [
            makeComment({ id: "line-old", side: "old" }),
            makeComment({ id: "file-old", side: "old", startLine: 0, endLine: 0, text: "Whole file" }),
          ],
        })}
      />
    );

    expect(screen.getAllByText("deleted")).toHaveLength(1);
  });

  it("navigates when a card is clicked", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    render(<RailComments {...makeProps({ comments: [comment], onGoToComment })} />);

    fireEvent.click(screen.getByText("Fix this"));
    expect(onGoToComment).toHaveBeenCalledWith(comment);
  });

  it("starts editing without navigating", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    const onStartEditComment = vi.fn();
    render(
      <RailComments
        {...makeProps({ comments: [comment], onGoToComment, onStartEditComment })}
      />
    );

    fireEvent.click(screen.getByText("Edit"));
    expect(onStartEditComment).toHaveBeenCalledWith("c1");
    expect(onGoToComment).not.toHaveBeenCalled();
  });

  it("deletes without navigating", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    const onDeleteComment = vi.fn();
    render(
      <RailComments
        {...makeProps({ comments: [comment], onGoToComment, onDeleteComment })}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    expect(onDeleteComment).toHaveBeenCalledWith("c1");
    expect(onGoToComment).not.toHaveBeenCalled();
  });

  it("shows the current comment text when inline editing opens", () => {
    const comment = makeComment({ text: "Updated from overview" });
    render(
      <RailComments
        {...makeProps({ comments: [comment], editingCommentId: "c1" })}
      />
    );

    expect(screen.getByRole("textbox")).toHaveValue("Updated from overview");
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("saves edits through existing handlers", () => {
    const comment = makeComment();
    const onEditComment = vi.fn();
    const onStopEditComment = vi.fn();
    render(
      <RailComments
        {...makeProps({
          comments: [comment],
          editingCommentId: "c1",
          onEditComment,
          onStopEditComment,
        })}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onEditComment).toHaveBeenCalledWith("c1", "Updated");
    expect(onStopEditComment).toHaveBeenCalled();
  });

  it("opens the overview modal", () => {
    const onOpenOverview = vi.fn();
    render(
      <RailComments
        {...makeProps({ comments: [makeComment()], onOpenOverview })}
      />
    );

    fireEvent.click(screen.getByText("Open overview"));
    expect(onOpenOverview).toHaveBeenCalled();
  });
});
