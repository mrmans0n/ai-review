import { describe, it, expect } from "vitest";
import { generatePrompt } from "./promptGenerator";
import type { Comment } from "../types";

describe("generatePrompt", () => {
  it("should return empty string for empty comments array", () => {
    const result = generatePrompt([]);
    expect(result).toBe("");
  });

  it("should generate prompt for single line comment", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/components/Button.tsx",
        startLine: 15,
        endLine: 15,
        side: "new",
        text: "This should use a sealed class instead",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:

- \`src/components/Button.tsx:15\` — This should use a sealed class instead`
    );
  });

  it("should generate prompt for multi-line comment", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/components/Button.tsx",
        startLine: 15,
        endLine: 23,
        side: "new",
        text: "This should use a sealed class instead",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:

- \`src/components/Button.tsx:15-23\` — This should use a sealed class instead`
    );
  });

  it("should group comments by file and sort alphabetically", () => {
    const comments: Comment[] = [
      {
        id: "2",
        file: "src/utils/Logger.kt",
        startLine: 42,
        endLine: 42,
        side: "new",
        text: "Missing null check here",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "1",
        file: "src/components/Button.tsx",
        startLine: 15,
        endLine: 23,
        side: "new",
        text: "This should use a sealed class instead",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:

- \`src/components/Button.tsx:15-23\` — This should use a sealed class instead
- \`src/utils/Logger.kt:42\` — Missing null check here`
    );
  });

  it("should sort comments within the same file by line number", () => {
    const comments: Comment[] = [
      {
        id: "2",
        file: "src/utils/Logger.kt",
        startLine: 100,
        endLine: 100,
        side: "new",
        text: "Second issue",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "1",
        file: "src/utils/Logger.kt",
        startLine: 42,
        endLine: 42,
        side: "new",
        text: "First issue",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "3",
        file: "src/utils/Logger.kt",
        startLine: 75,
        endLine: 80,
        side: "new",
        text: "Middle issue",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:

- \`src/utils/Logger.kt:42\` — First issue
- \`src/utils/Logger.kt:75-80\` — Middle issue
- \`src/utils/Logger.kt:100\` — Second issue`
    );
  });

  it("should handle multiple files with multiple comments", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/components/Button.tsx",
        startLine: 15,
        endLine: 15,
        side: "new",
        text: "Add error handling",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        file: "src/components/Button.tsx",
        startLine: 30,
        endLine: 35,
        side: "new",
        text: "Extract to separate function",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "3",
        file: "src/App.tsx",
        startLine: 50,
        endLine: 50,
        side: "new",
        text: "Use useCallback here",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "4",
        file: "src/utils/helpers.ts",
        startLine: 10,
        endLine: 20,
        side: "new",
        text: "Add JSDoc comments",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:

- \`src/App.tsx:50\` — Use useCallback here
- \`src/components/Button.tsx:15\` — Add error handling
- \`src/components/Button.tsx:30-35\` — Extract to separate function
- \`src/utils/helpers.ts:10-20\` — Add JSDoc comments`
    );
  });
});
