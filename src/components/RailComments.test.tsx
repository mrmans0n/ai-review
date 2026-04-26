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

describe("RailComments", () => {
  it("shows an empty state", () => {
    render(<RailComments comments={[]} onGoToComment={vi.fn()} />);

    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });

  it("calls onGoToComment when a comment is clicked", () => {
    const comment = makeComment();
    const onGoToComment = vi.fn();
    render(<RailComments comments={[comment]} onGoToComment={onGoToComment} />);

    fireEvent.click(screen.getByText("Review note"));

    expect(onGoToComment).toHaveBeenCalledWith(comment);
  });

  it("shows File for whole-file comments", () => {
    render(
      <RailComments
        comments={[makeComment({ startLine: 0, endLine: 0 })]}
        onGoToComment={vi.fn()}
      />
    );

    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.queryByText("L0")).not.toBeInTheDocument();
  });

  it("shows deleted for old-side comments", () => {
    render(
      <RailComments
        comments={[makeComment({ side: "old" })]}
        onGoToComment={vi.fn()}
      />
    );

    expect(screen.getByText("deleted")).toBeInTheDocument();
  });

  it("opens the overview when requested", () => {
    const onOpenOverview = vi.fn();
    render(
      <RailComments
        comments={[makeComment()]}
        onGoToComment={vi.fn()}
        onOpenOverview={onOpenOverview}
      />
    );

    fireEvent.click(screen.getByText("Open overview"));

    expect(onOpenOverview).toHaveBeenCalled();
  });
});
