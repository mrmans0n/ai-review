import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownPreview } from "./MarkdownPreview";

const defaultProps = {
  markdown: "# Hello\n\nSome paragraph text.",
  fileName: "README.md",
  comments: [],
  addingCommentAt: null,
  onAddComment: vi.fn(),
  onCancelComment: vi.fn(),
  onBlockClick: vi.fn(),
  onEditComment: vi.fn(),
  onDeleteComment: vi.fn(),
  editingCommentId: null,
  onStartEditComment: vi.fn(),
  onStopEditComment: vi.fn(),
  hoveredCommentIds: null,
  onHoverCommentIds: vi.fn(),
};

describe("MarkdownPreview", () => {
  it("renders markdown content", () => {
    render(<MarkdownPreview {...defaultProps} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Some paragraph text.")).toBeInTheDocument();
  });

  it("renders heading as h1", () => {
    render(<MarkdownPreview {...defaultProps} />);
    const heading = screen.getByText("Hello");
    expect(heading.tagName).toBe("H1");
  });

  it("has document role with aria-label", () => {
    render(<MarkdownPreview {...defaultProps} />);
    const doc = screen.getByRole("document");
    expect(doc).toHaveAttribute("aria-label", "Rendered preview of README.md");
  });

  it("calls onBlockClick when clicking a block with source-line data", () => {
    const onBlockClick = vi.fn();
    render(<MarkdownPreview {...defaultProps} onBlockClick={onBlockClick} />);
    const paragraph = screen.getByText("Some paragraph text.");
    fireEvent.click(paragraph);
    expect(onBlockClick).toHaveBeenCalledWith(3, 3);
  });

  it("does not call onBlockClick when clicking a link", () => {
    const onBlockClick = vi.fn();
    render(
      <MarkdownPreview
        {...defaultProps}
        markdown="[click me](https://example.com)"
        onBlockClick={onBlockClick}
      />
    );
    const link = screen.getByText("click me");
    fireEvent.click(link);
    expect(onBlockClick).not.toHaveBeenCalled();
  });

  it("renders comments for the file", () => {
    const comments = [
      {
        id: "c1",
        file: "README.md",
        startLine: 1,
        endLine: 1,
        side: "new" as const,
        text: "Good heading",
        createdAt: new Date().toISOString(),
      },
    ];
    render(<MarkdownPreview {...defaultProps} comments={comments} />);
    expect(screen.getByText("Good heading")).toBeInTheDocument();
  });

  it("renders the add comment form when addingCommentAt matches", () => {
    render(
      <MarkdownPreview
        {...defaultProps}
        addingCommentAt={{
          file: "README.md",
          startLine: 1,
          endLine: 1,
          side: "new",
        }}
      />
    );
    expect(screen.getByPlaceholderText(/Enter your comment/)).toBeInTheDocument();
  });
});
