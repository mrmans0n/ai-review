import { describe, it, expect } from "vitest";
import { parsePromptLines } from "./promptParser";

describe("parsePromptLines", () => {
  it("should parse a single-line comment", () => {
    const input = "- `src/components/Button.tsx:15` — Add error handling";
    const result = parsePromptLines(input);
    expect(result).toEqual([
      {
        type: "comment",
        fullPath: "src/components/Button.tsx",
        fileName: "Button.tsx",
        startLine: 15,
        endLine: null,
        deleted: false,
        text: "Add error handling",
      },
    ]);
  });

  it("should parse a multi-line range comment", () => {
    const input = "- `src/utils/helpers.ts:10-20` — Extract to function";
    const result = parsePromptLines(input);
    expect(result).toEqual([
      {
        type: "comment",
        fullPath: "src/utils/helpers.ts",
        fileName: "helpers.ts",
        startLine: 10,
        endLine: 20,
        deleted: false,
        text: "Extract to function",
      },
    ]);
  });

  it("should parse non-comment lines as text", () => {
    const input = "Please address these review comments:";
    const result = parsePromptLines(input);
    expect(result).toEqual([{ type: "text", content: "Please address these review comments:" }]);
  });

  it("should parse empty lines as text", () => {
    const input = "";
    const result = parsePromptLines(input);
    expect(result).toEqual([{ type: "text", content: "" }]);
  });

  it("should parse a full prompt with context header and comments", () => {
    const input = [
      'These comments are from reviewing commit abc123d ("Fix auth flow").',
      "Apply the feedback to the current version of the code.",
      "",
      "Please address these review comments:",
      "",
      "- `src/App.tsx:50` — Use useCallback here",
      "- `src/components/Button.tsx:15-23` — Extract to function",
    ].join("\n");

    const result = parsePromptLines(input);
    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      type: "text",
      content: 'These comments are from reviewing commit abc123d ("Fix auth flow").',
    });
    expect(result[5]).toEqual({
      type: "comment",
      fullPath: "src/App.tsx",
      fileName: "App.tsx",
      startLine: 50,
      endLine: null,
      deleted: false,
      text: "Use useCallback here",
    });
    expect(result[6]).toEqual({
      type: "comment",
      fullPath: "src/components/Button.tsx",
      fileName: "Button.tsx",
      startLine: 15,
      endLine: 23,
      deleted: false,
      text: "Extract to function",
    });
  });

  it("should extract filename from paths with directories", () => {
    const input = "- `src/deep/nested/dir/Component.tsx:5` — Fix this";
    const result = parsePromptLines(input);
    expect(result[0]).toMatchObject({
      type: "comment",
      fullPath: "src/deep/nested/dir/Component.tsx",
      fileName: "Component.tsx",
    });
  });

  it("should handle file at root (no directory)", () => {
    const input = "- `README.md:1` — Update docs";
    const result = parsePromptLines(input);
    expect(result[0]).toMatchObject({
      type: "comment",
      fullPath: "README.md",
      fileName: "README.md",
    });
  });

  it("should parse a deleted comment", () => {
    const input = "- `src/components/Button.tsx:15 (deleted)` — This old code had a bug";
    const result = parsePromptLines(input);
    expect(result).toEqual([
      {
        type: "comment",
        fullPath: "src/components/Button.tsx",
        fileName: "Button.tsx",
        startLine: 15,
        endLine: null,
        deleted: true,
        text: "This old code had a bug",
      },
    ]);
  });

  it("should parse a deleted comment with line range", () => {
    const input = "- `src/auth.ts:10-20 (deleted)` — Remove this block";
    const result = parsePromptLines(input);
    expect(result).toEqual([
      {
        type: "comment",
        fullPath: "src/auth.ts",
        fileName: "auth.ts",
        startLine: 10,
        endLine: 20,
        deleted: true,
        text: "Remove this block",
      },
    ]);
  });

  it("should set deleted to false for non-deleted comments", () => {
    const input = "- `src/App.tsx:50` — Use useCallback here";
    const result = parsePromptLines(input);
    expect(result[0]).toMatchObject({
      type: "comment",
      deleted: false,
    });
  });
});
