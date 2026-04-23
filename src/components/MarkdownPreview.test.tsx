import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownPreview } from "./MarkdownPreview";
import type { Comment } from "../types";

// Mock the hook to control output with known data attributes
vi.mock("../hooks/useMarkdownRenderer", () => ({
  useMarkdownRenderer: (_content: string) => {
    const React = require("react");
    return {
      content: React.createElement("div", { "data-testid": "md-root" }, [
        React.createElement(
          "h1",
          { key: "h1", "data-source-start": 1, "data-source-end": 1, "data-source-type": "heading" },
          "Title"
        ),
        React.createElement(
          "p",
          { key: "p", "data-source-start": 3, "data-source-end": 5, "data-source-type": "paragraph" },
          "Paragraph text"
        ),
        // List with nested listItem to test SKIP_TYPES
        React.createElement(
          "ul",
          { key: "ul", "data-source-start": 7, "data-source-end": 9, "data-source-type": "list" },
          React.createElement(
            "li",
            { key: "li1", "data-source-start": 7, "data-source-end": 7, "data-source-type": "listItem" },
            "Item one"
          ),
          React.createElement(
            "li",
            { key: "li2", "data-source-start": 8, "data-source-end": 8, "data-source-type": "listItem" },
            "Item two"
          )
        ),
        // Blockquote with inner paragraph to test SKIP_TYPES
        React.createElement(
          "blockquote",
          { key: "bq", "data-source-start": 11, "data-source-end": 12, "data-source-type": "blockquote" },
          React.createElement(
            "p",
            { key: "bq-p", "data-source-start": 11, "data-source-end": 12, "data-source-type": "paragraph" },
            "Quote text"
          )
        ),
        // Table with tableRow to test SKIP_TYPES (tableRow defers to table)
        React.createElement(
          "table",
          { key: "tbl", "data-source-start": 14, "data-source-end": 16, "data-source-type": "table" },
          React.createElement(
            "tbody",
            { key: "tbody" },
            React.createElement(
              "tr",
              { key: "tr1", "data-source-start": 14, "data-source-end": 14, "data-source-type": "tableRow" },
              React.createElement("td", { key: "td1" }, "Cell A")
            )
          )
        ),
      ]),
      sourceMap: [],
    };
  },
}));

vi.mock("./CommentWidget", () => ({
  CommentWidget: (props: any) => (
    <div data-testid="comment-widget" data-comment-id={props.comments[0]?.id}>
      {props.comments.map((c: any) => (
        <span key={c.id} data-testid={`comment-${c.id}`}>{c.text}</span>
      ))}
    </div>
  ),
}));

vi.mock("./AddCommentForm", () => ({
  AddCommentForm: (props: any) => (
    <div
      data-testid="add-comment-form"
      data-start={props.startLine}
      data-end={props.endLine}
      data-side={props.side}
    >
      <button onClick={() => props.onSubmit("test comment")} data-testid="submit-comment">
        Submit
      </button>
      <button onClick={props.onCancel} data-testid="cancel-comment">
        Cancel
      </button>
    </div>
  ),
}));

describe("MarkdownPreview", () => {
  const baseProps = {
    content: "# Title\n\nParagraph text\nmore text\nlast line",
    fileName: "README.md",
    comments: [] as Comment[],
    onAddComment: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null as string | null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
  };

  it("renders markdown content", () => {
    render(<MarkdownPreview {...baseProps} />);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Paragraph text")).toBeInTheDocument();
  });

  it("opens AddCommentForm when clicking a block element", () => {
    render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(screen.getByText("Paragraph text"));
    const form = screen.getByTestId("add-comment-form");
    expect(form).toBeInTheDocument();
    expect(form.getAttribute("data-start")).toBe("3");
    expect(form.getAttribute("data-end")).toBe("5");
    expect(form.getAttribute("data-side")).toBe("new");
  });

  it("submitting a comment calls onAddComment with full data", () => {
    const onAddComment = vi.fn();
    render(<MarkdownPreview {...baseProps} onAddComment={onAddComment} />);
    fireEvent.click(screen.getByText("Title"));
    fireEvent.click(screen.getByTestId("submit-comment"));
    expect(onAddComment).toHaveBeenCalledWith(
      "README.md", 1, 1, "new", "test comment"
    );
  });

  it("does not open form when clicking an area without source data", () => {
    const { container } = render(<MarkdownPreview {...baseProps} />);
    // Click the container div which has no data-source-start
    fireEvent.click(container.querySelector(".markdown-preview")!);
    expect(screen.queryByTestId("add-comment-form")).not.toBeInTheDocument();
  });

  it("places comment widget after the matching block", () => {
    const comment: Comment = {
      id: "c1",
      file: "README.md",
      startLine: 1,
      endLine: 1,
      side: "new",
      text: "title comment",
      createdAt: "2026-01-01T00:00:00Z",
    };
    const { container } = render(
      <MarkdownPreview {...baseProps} comments={[comment]} />
    );
    const widget = screen.getByTestId("comment-widget");
    expect(widget).toBeInTheDocument();
    // Verify ordering: h1 before comment widget in DOM
    const allElements = container.querySelectorAll("h1, [data-testid='comment-widget']");
    expect(allElements[0].tagName).toBe("H1");
    expect(allElements[1].getAttribute("data-testid")).toBe("comment-widget");
  });

  it("shows orphaned comments in a separate section", () => {
    const comment: Comment = {
      id: "c-orphan",
      file: "README.md",
      startLine: 999,
      endLine: 999,
      side: "new",
      text: "orphaned",
      createdAt: "2026-01-01T00:00:00Z",
    };
    render(<MarkdownPreview {...baseProps} comments={[comment]} />);
    expect(screen.getByText("Comments on lines not visible in preview:")).toBeInTheDocument();
    expect(screen.getByTestId("comment-c-orphan")).toHaveTextContent("orphaned");
  });

  it("does not show old-side comments", () => {
    const comment: Comment = {
      id: "c-old",
      file: "README.md",
      startLine: 1,
      endLine: 1,
      side: "old",
      text: "old side",
      createdAt: "2026-01-01T00:00:00Z",
    };
    render(<MarkdownPreview {...baseProps} comments={[comment]} />);
    expect(screen.queryByTestId("comment-widget")).not.toBeInTheDocument();
  });

  it("cancelling closes the add-comment form", () => {
    render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(screen.getByText("Title"));
    expect(screen.getByTestId("add-comment-form")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-comment"));
    expect(screen.queryByTestId("add-comment-form")).not.toBeInTheDocument();
  });

  it("clicking a list item anchors to the listItem, not the list", () => {
    render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(screen.getByText("Item one"));
    const form = screen.getByTestId("add-comment-form");
    // Should anchor to the listItem (line 7), not the list (lines 7-9)
    expect(form.getAttribute("data-start")).toBe("7");
    expect(form.getAttribute("data-end")).toBe("7");
  });

  it("clicking blockquote text anchors to inner paragraph, not blockquote", () => {
    render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(screen.getByText("Quote text"));
    const form = screen.getByTestId("add-comment-form");
    // Should anchor to the inner paragraph (11-12), not blockquote container
    expect(form.getAttribute("data-start")).toBe("11");
    expect(form.getAttribute("data-end")).toBe("12");
  });

  it("add-comment form uses containment so nested anchors attach to containing block", () => {
    render(<MarkdownPreview {...baseProps} />);
    // Click a list item — anchor is listItem line 7-7, which is contained
    // within the list block 7-9. The form should still render (containment check).
    fireEvent.click(screen.getByText("Item one"));
    expect(screen.getByTestId("add-comment-form")).toBeInTheDocument();
  });

  it("add-comment form renders exactly once even when containment matches multiple ancestors", () => {
    render(<MarkdownPreview {...baseProps} />);
    // Click a list item — its range (7-7) is contained within the list (7-9).
    // The form must appear only once, not once per matching ancestor.
    fireEvent.click(screen.getByText("Item one"));
    expect(screen.getAllByTestId("add-comment-form")).toHaveLength(1);
  });

  it("clicking a table cell anchors to the table, not the tableRow", () => {
    render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(screen.getByText("Cell A"));
    const form = screen.getByTestId("add-comment-form");
    // tableRow is in SKIP_TYPES, so it defers to the table (14-16)
    expect(form.getAttribute("data-start")).toBe("14");
    expect(form.getAttribute("data-end")).toBe("16");
  });
});
