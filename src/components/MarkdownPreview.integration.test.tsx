import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownPreview } from "./MarkdownPreview";
import type { Comment } from "../types";

// No mock on useMarkdownRenderer — uses real remark pipeline

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

const SAMPLE_MD = `# Welcome

This is a paragraph with **bold** and *italic*.

## Features

- Item one
- Item two
- Item three

> A blockquote
> with two lines

\`\`\`typescript
const x = 42;
\`\`\`

---

Final paragraph.
`;

describe("MarkdownPreview integration", () => {
  const baseProps = {
    content: SAMPLE_MD,
    fileName: "README.md",
    comments: [] as Comment[],
    onAddComment: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null as string | null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
  };

  it("renders all markdown elements via real pipeline", () => {
    const { container } = render(<MarkdownPreview {...baseProps} />);
    expect(container.querySelector("h1")).toHaveTextContent("Welcome");
    expect(container.querySelector("h2")).toHaveTextContent("Features");
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
    expect(container.querySelectorAll("li")).toHaveLength(3);
    expect(container.querySelector("blockquote")).toBeInTheDocument();
    expect(container.querySelector("pre")).toBeInTheDocument();
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("rendered blocks have data-source-start and data-source-type attributes", () => {
    const { container } = render(<MarkdownPreview {...baseProps} />);
    const h1 = container.querySelector("h1");
    expect(h1?.getAttribute("data-source-start")).toBe("1");
    expect(h1?.getAttribute("data-source-end")).toBe("1");
    expect(h1?.getAttribute("data-source-type")).toBe("heading");
    const h2 = container.querySelector("h2");
    expect(h2?.getAttribute("data-source-start")).toBe("5");
    expect(h2?.getAttribute("data-source-type")).toBe("heading");
  });

  it("clicking a rendered block opens AddCommentForm with correct source lines", () => {
    const { container } = render(<MarkdownPreview {...baseProps} />);
    const h1 = container.querySelector("h1")!;
    fireEvent.click(h1);
    const form = screen.getByTestId("add-comment-form");
    expect(form.getAttribute("data-start")).toBe("1");
    expect(form.getAttribute("data-end")).toBe("1");
    expect(form.getAttribute("data-side")).toBe("new");
  });

  it("submitting a comment calls onAddComment with full data", () => {
    const onAddComment = vi.fn();
    const { container } = render(
      <MarkdownPreview {...baseProps} onAddComment={onAddComment} />
    );
    const h1 = container.querySelector("h1")!;
    fireEvent.click(h1);
    fireEvent.click(screen.getByTestId("submit-comment"));
    expect(onAddComment).toHaveBeenCalledWith("README.md", 1, 1, "new", "test comment");
  });

  it("cancelling closes the form", () => {
    const { container } = render(<MarkdownPreview {...baseProps} />);
    fireEvent.click(container.querySelector("h1")!);
    expect(screen.getByTestId("add-comment-form")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cancel-comment"));
    expect(screen.queryByTestId("add-comment-form")).not.toBeInTheDocument();
  });

  it("existing comments are placed after matching blocks", () => {
    const comment: Comment = {
      id: "c1",
      file: "README.md",
      startLine: 1,
      endLine: 1,
      side: "new",
      text: "great title",
      createdAt: "2026-01-01T00:00:00Z",
    };
    render(
      <MarkdownPreview {...baseProps} comments={[comment]} />
    );
    expect(screen.getByTestId("comment-c1")).toHaveTextContent("great title");
  });

  it("comments on non-existent lines appear in orphaned section", () => {
    const comment: Comment = {
      id: "c-orphan",
      file: "README.md",
      startLine: 999,
      endLine: 999,
      side: "new",
      text: "orphaned comment",
      createdAt: "2026-01-01T00:00:00Z",
    };
    render(<MarkdownPreview {...baseProps} comments={[comment]} />);
    expect(screen.getByText("Comments on lines not visible in preview:")).toBeInTheDocument();
    expect(screen.getByTestId("comment-c-orphan")).toHaveTextContent("orphaned comment");
  });

  describe("type-aware anchor resolution", () => {
    it("clicking a list item anchors to the item, not the whole list", () => {
      const { container } = render(<MarkdownPreview {...baseProps} />);
      const firstLi = container.querySelector("li")!;
      fireEvent.click(firstLi);
      const form = screen.getByTestId("add-comment-form");
      // List item "- Item one" is on line 7, should anchor to just that item
      expect(form.getAttribute("data-start")).toBe("7");
      expect(form.getAttribute("data-end")).toBe("7");
    });

    it("clicking inside a blockquote anchors to the inner paragraph", () => {
      const { container } = render(<MarkdownPreview {...baseProps} />);
      const bqParagraph = container.querySelector("blockquote p")!;
      fireEvent.click(bqParagraph);
      const form = screen.getByTestId("add-comment-form");
      // The paragraph inside the blockquote spans lines 11-12
      expect(form.getAttribute("data-start")).toBe("11");
      expect(form.getAttribute("data-end")).toBe("12");
    });

    it("comment on a list item is placed after the containing list block", () => {
      const comment: Comment = {
        id: "c-li",
        file: "README.md",
        startLine: 7,
        endLine: 7,
        side: "new",
        text: "list item comment",
        createdAt: "2026-01-01T00:00:00Z",
      };
      render(<MarkdownPreview {...baseProps} comments={[comment]} />);
      expect(screen.getByTestId("comment-c-li")).toHaveTextContent("list item comment");
    });

    it("add-comment form appears after containing block for nested anchors", () => {
      const { container } = render(<MarkdownPreview {...baseProps} />);
      // Click first list item
      const firstLi = container.querySelector("li")!;
      fireEvent.click(firstLi);
      // The form should appear (placed after the <ul> that contains the <li>)
      const form = screen.getByTestId("add-comment-form");
      expect(form).toBeInTheDocument();
      expect(form.getAttribute("data-start")).toBe("7");
    });
  });
});

describe("MarkdownPreview GFM table anchor resolution", () => {
  const TABLE_MD = `# Title

| Col A | Col B |
| ----- | ----- |
| val 1 | val 2 |
| val 3 | val 4 |
`;

  const tableProps = {
    content: TABLE_MD,
    fileName: "table.md",
    comments: [] as Comment[],
    onAddComment: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    editingCommentId: null as string | null,
    onStartEditComment: vi.fn(),
    onStopEditComment: vi.fn(),
  };

  it("clicking a table cell anchors to the whole table, not the row", () => {
    const { container } = render(<MarkdownPreview {...tableProps} />);
    const td = container.querySelector("td")!;
    fireEvent.click(td);
    const form = screen.getByTestId("add-comment-form");
    // Should anchor to the whole table (lines 3-6), not just the row
    expect(form.getAttribute("data-start")).toBe("3");
    expect(form.getAttribute("data-end")).toBe("6");
  });
});
