import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RailComments } from "./RailComments";
import type { Comment } from "../types";

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "1",
    file: "src/App.tsx",
    startLine: 12,
    endLine: 12,
    side: "new",
    text: "Review note",
    createdAt: "2026-04-26T00:00:00.000Z",
    ...overrides,
  };
}

const defaultProps = {
  onGoToComment: vi.fn(),
  onEditComment: vi.fn(),
  onDeleteComment: vi.fn(),
  editingCommentId: null,
  onStartEditComment: vi.fn(),
  onStopEditComment: vi.fn(),
};

describe("RailComments", () => {
  it("shows an empty state", () => {
    render(<RailComments comments={[]} {...defaultProps} />);

    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });

  it("calls onGoToComment when a comment card is clicked", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    render(
      <RailComments comments={[comment]} {...defaultProps} onGoToComment={onGoToComment} />
    );

    fireEvent.click(screen.getByText("Review note"));

    expect(onGoToComment).toHaveBeenCalledWith(comment);
  });

  it("shows File for whole-file comments", () => {
    render(
      <RailComments
        comments={[makeComment({ startLine: 0, endLine: 0 })]}
        {...defaultProps}
      />
    );

    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.queryByText("L0")).not.toBeInTheDocument();
  });

  it("shows deleted for old-side comments", () => {
    render(
      <RailComments
        comments={[makeComment({ side: "old" })]}
        {...defaultProps}
      />
    );

    expect(screen.getByText("deleted")).toBeInTheDocument();
  });

  it("opens the overview when requested", () => {
    const onOpenOverview = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        onOpenOverview={onOpenOverview}
      />
    );

    fireEvent.click(screen.getByText("Open overview"));

    expect(onOpenOverview).toHaveBeenCalled();
  });

  it("clicking Edit does not trigger navigation", () => {
    const onGoToComment = vi.fn();
    const onStartEditComment = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        onGoToComment={onGoToComment}
        onStartEditComment={onStartEditComment}
      />
    );

    fireEvent.click(screen.getByText("Edit"));

    expect(onStartEditComment).toHaveBeenCalledWith("1");
    expect(onGoToComment).not.toHaveBeenCalled();
  });

  it("clicking Delete does not trigger navigation", () => {
    const onGoToComment = vi.fn();
    const onDeleteComment = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        onGoToComment={onGoToComment}
        onDeleteComment={onDeleteComment}
      />
    );

    fireEvent.click(screen.getByText("Delete"));

    expect(onDeleteComment).toHaveBeenCalledWith("1");
    expect(onGoToComment).not.toHaveBeenCalled();
  });

  it("shows inline editing when editingCommentId matches", () => {
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        editingCommentId="1"
      />
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("saves edits via onEditComment", () => {
    const onEditComment = vi.fn();
    const onStopEditComment = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        editingCommentId="1"
        onEditComment={onEditComment}
        onStopEditComment={onStopEditComment}
      />
    );

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Updated note" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onEditComment).toHaveBeenCalledWith("1", "Updated note");
    expect(onStopEditComment).toHaveBeenCalled();
  });

  it("cancels editing via onStopEditComment", () => {
    const onStopEditComment = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        {...defaultProps}
        editingCommentId="1"
        onStopEditComment={onStopEditComment}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));

    expect(onStopEditComment).toHaveBeenCalled();
  });
});
