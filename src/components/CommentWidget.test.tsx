import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommentWidget } from "./CommentWidget";
import type { Comment } from "../types";

vi.mock("highlight.js/lib/core", () => ({
  default: {
    highlight: (_code: string, _opts: any) => ({ value: `<span class="hljs">${_code}</span>` }),
    highlightAuto: (_code: string) => ({ value: `<span class="hljs-auto">${_code}</span>` }),
  },
}));

vi.mock("../lib/parseCommentText", () => ({
  parseCommentText: vi.fn(),
}));

import { parseCommentText } from "../lib/parseCommentText";

function makeComment(text: string): Comment {
  return {
    id: "c1",
    file: "a.ts",
    startLine: 1,
    endLine: 1,
    side: "new",
    text,
    createdAt: "2024-01-01T00:00:00Z",
  };
}

function makeProps(text: string) {
  return {
    comments: [makeComment(text)],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    editingId: null as string | null,
    onStartEdit: vi.fn(),
    onStopEdit: vi.fn(),
  };
}

describe("CommentWidget text rendering", () => {
  beforeEach(() => {
    vi.mocked(parseCommentText).mockReset();
  });

  it("renders plain text segment as a span", () => {
    vi.mocked(parseCommentText).mockReturnValue([
      { type: "text", content: "fix this" },
    ]);
    render(<CommentWidget {...makeProps("fix this")} />);
    expect(screen.getByText("fix this")).toBeTruthy();
  });

  it("renders code segment using hljs.highlight when language is set", () => {
    vi.mocked(parseCommentText).mockReturnValue([
      { type: "code", language: "typescript", content: "const x = 1;" },
    ]);
    const { container } = render(
      <CommentWidget {...makeProps("```typescript\nconst x = 1;\n```")} />
    );
    const code = container.querySelector("code.hljs");
    expect(code).toBeTruthy();
    expect(code!.innerHTML).toContain("const x = 1;");
  });

  it("renders code segment using hljs.highlightAuto when language is null", () => {
    vi.mocked(parseCommentText).mockReturnValue([
      { type: "code", language: null, content: "some code" },
    ]);
    const { container } = render(
      <CommentWidget {...makeProps("```\nsome code\n```")} />
    );
    const code = container.querySelector("code.hljs");
    expect(code!.innerHTML).toContain("hljs-auto");
  });

  it("renders mixed text and code segments", () => {
    vi.mocked(parseCommentText).mockReturnValue([
      { type: "text", content: "Consider:" },
      { type: "code", language: "ts", content: "const y = 2;" },
    ]);
    const { container } = render(
      <CommentWidget {...makeProps("Consider:\n```ts\nconst y = 2;\n```")} />
    );
    expect(screen.getByText("Consider:")).toBeTruthy();
    expect(container.querySelector("pre")).toBeTruthy();
  });
});
