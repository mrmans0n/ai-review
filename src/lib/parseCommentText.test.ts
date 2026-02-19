// src/lib/parseCommentText.test.ts
import { describe, it, expect } from "vitest";
import { parseCommentText } from "./parseCommentText";

describe("parseCommentText", () => {
  it("plain text only returns single text segment", () => {
    expect(parseCommentText("hello world")).toEqual([
      { type: "text", content: "hello world" },
    ]);
  });

  it("code-only returns single code segment", () => {
    expect(parseCommentText("```typescript\nconst x = 1;\n```")).toEqual([
      { type: "code", language: "typescript", content: "const x = 1;\n" },
    ]);
  });

  it("text then code block", () => {
    const text = "Consider this:\n```js\nfoo();\n```";
    expect(parseCommentText(text)).toEqual([
      { type: "text", content: "Consider this:\n" },
      { type: "code", language: "js", content: "foo();\n" },
    ]);
  });

  it("code block then text", () => {
    const text = "```\ncode\n```\nafter";
    expect(parseCommentText(text)).toEqual([
      { type: "code", language: null, content: "code\n" },
      { type: "text", content: "\nafter" },
    ]);
  });

  it("multiple code blocks", () => {
    const text = "before\n```ts\na\n```\nbetween\n```js\nb\n```\nafter";
    const result = parseCommentText(text);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: "text", content: "before\n" });
    expect(result[1]).toEqual({ type: "code", language: "ts", content: "a\n" });
    expect(result[2]).toEqual({ type: "text", content: "\nbetween\n" });
    expect(result[3]).toEqual({ type: "code", language: "js", content: "b\n" });
    expect(result[4]).toEqual({ type: "text", content: "\nafter" });
  });

  it("empty string returns empty array", () => {
    expect(parseCommentText("")).toEqual([]);
  });

  it("unclosed fence treated as plain text", () => {
    const text = "start\n```ts\nunclosed";
    expect(parseCommentText(text)).toEqual([
      { type: "text", content: "start\n```ts\nunclosed" },
    ]);
  });

  it("no language tag sets language to null", () => {
    expect(parseCommentText("```\ncode\n```")).toEqual([
      { type: "code", language: null, content: "code\n" },
    ]);
  });
});
