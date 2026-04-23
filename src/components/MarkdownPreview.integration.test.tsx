import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownPreview } from "./MarkdownPreview";

const complexMarkdown = `# Project Title

A description paragraph with **bold** and *italic* text.

## Features

- Feature one
- Feature two
- Feature three

### Code Example

\`\`\`typescript
function hello() {
  console.log("world");
}
\`\`\`

> This is an important note
> spanning two lines.

| Column A | Column B |
| -------- | -------- |
| Value 1  | Value 2  |

---

[Link text](https://example.com)
`;

function renderPreview(overrides = {}) {
  const defaultProps = {
    markdown: complexMarkdown,
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
    ...overrides,
  };
  return render(<MarkdownPreview {...defaultProps} />);
}

describe("MarkdownPreview integration", () => {
  it("renders all major markdown elements", () => {
    renderPreview();
    // Heading
    expect(screen.getByText("Project Title")).toBeInTheDocument();
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Code Example")).toBeInTheDocument();
    // Paragraph with inline formatting
    expect(screen.getByText(/description paragraph/)).toBeInTheDocument();
    // List items
    expect(screen.getByText("Feature one")).toBeInTheDocument();
    expect(screen.getByText("Feature two")).toBeInTheDocument();
    // Code block content
    expect(screen.getByText(/hello/)).toBeInTheDocument();
    // Blockquote
    expect(screen.getByText(/important note/)).toBeInTheDocument();
    // Link
    expect(screen.getByText("Link text")).toBeInTheDocument();
  });

  it("clicking a heading triggers onBlockClick with correct lines", () => {
    const onBlockClick = vi.fn();
    renderPreview({ onBlockClick });
    fireEvent.click(screen.getByText("Project Title"));
    expect(onBlockClick).toHaveBeenCalledWith(1, 1);
  });

  it("clicking a paragraph triggers onBlockClick", () => {
    const onBlockClick = vi.fn();
    renderPreview({ onBlockClick });
    fireEvent.click(screen.getByText(/description paragraph/));
    expect(onBlockClick).toHaveBeenCalled();
    const [startLine] = onBlockClick.mock.calls[0];
    expect(startLine).toBe(3);
  });

  it("clicking a list item triggers onBlockClick for the list", () => {
    const onBlockClick = vi.fn();
    renderPreview({ onBlockClick });
    fireEvent.click(screen.getByText("Feature one"));
    expect(onBlockClick).toHaveBeenCalled();
  });

  it("renders existing comments below the widget area", () => {
    const comments = [
      {
        id: "c1",
        file: "README.md",
        startLine: 1,
        endLine: 1,
        side: "new" as const,
        text: "Title needs work",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2",
        file: "README.md",
        startLine: 3,
        endLine: 3,
        side: "new" as const,
        text: "Fix the description",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    renderPreview({ comments });
    expect(screen.getByText("Title needs work")).toBeInTheDocument();
    expect(screen.getByText("Fix the description")).toBeInTheDocument();
  });

  it("shows add comment form and submits a comment", async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn();
    renderPreview({
      addingCommentAt: {
        file: "README.md",
        startLine: 1,
        endLine: 1,
        side: "new",
      },
      onAddComment,
    });

    const textarea = screen.getByPlaceholderText(/Enter your comment/);
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, "Great heading!");
    await user.click(screen.getByText("Add Comment"));
    expect(onAddComment).toHaveBeenCalledWith("Great heading!");
  });

  it("does not show comments from other files", () => {
    const comments = [
      {
        id: "c1",
        file: "OTHER.md",
        startLine: 1,
        endLine: 1,
        side: "new" as const,
        text: "Wrong file comment",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    renderPreview({ comments });
    expect(screen.queryByText("Wrong file comment")).not.toBeInTheDocument();
  });

  it("clicking a link does not trigger onBlockClick", () => {
    const onBlockClick = vi.fn();
    renderPreview({ onBlockClick });
    const link = screen.getByText("Link text");
    fireEvent.click(link);
    expect(onBlockClick).not.toHaveBeenCalled();
  });
});
