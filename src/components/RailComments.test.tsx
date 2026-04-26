import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RailComments } from "./RailComments";
import type { Comment } from "../types";

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "c1",
    file: "src/App.tsx",
    startLine: 10,
    endLine: 10,
    side: "new",
    text: "Use a named helper here",
    createdAt: "2026-04-26T10:00:00.000Z",
    ...overrides,
  };
}

function makeProps(overrides: Partial<Parameters<typeof RailComments>[0]> = {}) {
  return {
    comments: [] as Comment[],
    onGoToComment: vi.fn(),
    onOpenOverview: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
    ...overrides,
  };
}

describe("RailComments", () => {
  it("renders an empty state", () => {
    render(<RailComments {...makeProps()} />);
    expect(screen.getByText("No draft comments")).toBeTruthy();
  });

  it("renders comment cards with file path and range labels", () => {
    const comments = [
      makeComment({ id: "c1", file: "src/App.tsx", startLine: 10, endLine: 12 }),
      makeComment({ id: "c2", file: "src/lib/api.ts", startLine: 3, endLine: 3, text: "Check this" }),
    ];
    const { container } = render(<RailComments {...makeProps({ comments })} />);

    expect(container.textContent).toContain("src/App.tsx");
    expect(container.textContent).toContain("src/lib/api.ts");
    expect(screen.getByText("L10-12")).toBeTruthy();
    expect(screen.getByText("L3")).toBeTruthy();
  });

  it("renders file-level and deleted labels", () => {
    const comments = [
      makeComment({ startLine: 0, endLine: 0, side: "old" }),
    ];
    render(<RailComments {...makeProps({ comments })} />);

    expect(screen.getByText("File")).toBeTruthy();
    expect(screen.getByText("deleted")).toBeTruthy();
  });

  it("navigates when a card body is clicked", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    render(<RailComments {...makeProps({ comments: [comment], onGoToComment })} />);

    fireEvent.click(screen.getByText(comment.text));

    expect(onGoToComment).toHaveBeenCalledWith(comment);
  });

  it("does not navigate when edit or delete actions are clicked", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    const onStartEditComment = vi.fn();
    const onDeleteComment = vi.fn();
    render(
      <RailComments
        {...makeProps({
          comments: [comment],
          onGoToComment,
          onStartEditComment,
          onDeleteComment,
        })}
      />
    );

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Delete"));

    expect(onGoToComment).not.toHaveBeenCalled();
    expect(onStartEditComment).toHaveBeenCalledWith(comment.id);
    expect(onDeleteComment).toHaveBeenCalledWith(comment.id);
  });

  it("edits with the existing edit handlers", () => {
    const comment = makeComment();
    const onEditComment = vi.fn();
    const onStopEditComment = vi.fn();
    render(
      <RailComments
        {...makeProps({
          comments: [comment],
          editingCommentId: comment.id,
          onEditComment,
          onStopEditComment,
        })}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Edit comment..."), {
      target: { value: "Updated text" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(onEditComment).toHaveBeenCalledWith(comment.id, "Updated text");
    expect(onStopEditComment).toHaveBeenCalled();
  });

  it("opens the overview modal from the rail", () => {
    const onOpenOverview = vi.fn();
    render(<RailComments {...makeProps({ comments: [makeComment()], onOpenOverview })} />);

    fireEvent.click(screen.getByText("Overview"));

    expect(onOpenOverview).toHaveBeenCalled();
  });
});
