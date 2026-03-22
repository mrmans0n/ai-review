import { describe, it, expect } from "vitest";
import { buildJsonFeedback } from "./jsonFeedback";
import type { Comment, PromptContext } from "../types";

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: "c1",
  file: "src/App.tsx",
  startLine: 10,
  endLine: 12,
  side: "new",
  text: "Fix this",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("buildJsonFeedback", () => {
  it("should include the format marker", () => {
    const result = buildJsonFeedback([], { mode: "unstaged" });
    expect(result.format).toBe("ai-review.feedback/v1");
  });

  it("should serialize unstaged context", () => {
    const result = buildJsonFeedback([], { mode: "unstaged" });
    expect(result.context).toEqual({ mode: "unstaged" });
  });

  it("should serialize staged context", () => {
    const result = buildJsonFeedback([], { mode: "staged" });
    expect(result.context).toEqual({ mode: "staged" });
  });

  it("should serialize commit context with commitRef", () => {
    const ctx: PromptContext = {
      mode: "commit",
      commitRef: "HEAD~3",
    };
    const result = buildJsonFeedback([], ctx);
    expect(result.context).toEqual({ mode: "commit", commitRef: "HEAD~3" });
  });

  it("should serialize commit context with selectedCommit", () => {
    const ctx: PromptContext = {
      mode: "commit",
      selectedCommit: {
        hash: "abc123def456",
        short_hash: "abc123d",
        message: "Fix auth",
        author: "test",
        date: "2026-01-01",
        refs: "",
      },
    };
    const result = buildJsonFeedback([], ctx);
    expect(result.context.mode).toBe("commit");
    expect(result.context.selectedCommit?.short_hash).toBe("abc123d");
  });

  it("should serialize branch context with selectedBranch", () => {
    const ctx: PromptContext = {
      mode: "branch",
      selectedBranch: {
        name: "feature/auth",
        short_hash: "def789a",
        subject: "Auth feature",
        author: "test",
        date: "2026-01-01",
      },
    };
    const result = buildJsonFeedback([], ctx);
    expect(result.context.mode).toBe("branch");
    expect(result.context.selectedBranch?.name).toBe("feature/auth");
  });

  it("should serialize range context", () => {
    const ctx: PromptContext = {
      mode: "range",
      commitRef: "abc..def",
    };
    const result = buildJsonFeedback([], ctx);
    expect(result.context).toEqual({ mode: "range", commitRef: "abc..def" });
  });

  it("should omit undefined optional context fields", () => {
    const result = buildJsonFeedback([], { mode: "unstaged" });
    expect(result.context).not.toHaveProperty("commitRef");
    expect(result.context).not.toHaveProperty("selectedCommit");
    expect(result.context).not.toHaveProperty("selectedBranch");
  });

  it("should serialize a single comment", () => {
    const comment = makeComment();
    const result = buildJsonFeedback([comment], { mode: "unstaged" });
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]).toEqual({
      id: "c1",
      file: "src/App.tsx",
      startLine: 10,
      endLine: 12,
      side: "new",
      text: "Fix this",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("should serialize multiple comments preserving order", () => {
    const comments = [
      makeComment({ id: "c1", file: "a.ts", startLine: 1, endLine: 1 }),
      makeComment({ id: "c2", file: "b.ts", startLine: 5, endLine: 10 }),
      makeComment({ id: "c3", file: "a.ts", startLine: 20, endLine: 20, side: "old" }),
    ];
    const result = buildJsonFeedback(comments, { mode: "staged" });
    expect(result.comments).toHaveLength(3);
    expect(result.comments.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("should handle old-side comments", () => {
    const comment = makeComment({ side: "old" });
    const result = buildJsonFeedback([comment], { mode: "unstaged" });
    expect(result.comments[0].side).toBe("old");
  });

  it("should produce valid JSON when stringified", () => {
    const comment = makeComment();
    const ctx: PromptContext = {
      mode: "commit",
      commitRef: "HEAD~1",
      selectedCommit: {
        hash: "abc123",
        short_hash: "abc",
        message: 'Has "quotes" and \\ backslash',
        author: "test",
        date: "2026-01-01",
        refs: "",
      },
    };
    const result = buildJsonFeedback([comment], ctx);
    const json = JSON.stringify(result);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).format).toBe("ai-review.feedback/v1");
  });

  it("should return empty comments array when no comments", () => {
    const result = buildJsonFeedback([], { mode: "unstaged" });
    expect(result.comments).toEqual([]);
  });
});
