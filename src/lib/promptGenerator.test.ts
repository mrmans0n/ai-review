import { describe, it, expect } from "vitest";
import { generatePrompt } from "./promptGenerator";
import type { Comment, PromptContext } from "../types";

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

  it("should prepend commit context when selectedCommit is provided", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/auth.ts",
        startLine: 42,
        endLine: 42,
        side: "new",
        text: "Use bcrypt instead of md5",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "commit",
      selectedCommit: {
        hash: "abc123def456",
        short_hash: "abc123d",
        message: "Fix auth flow",
        author: "test",
        date: "2024-01-01",
        refs: "",
      },
      selectedBranch: null,
    };

    const result = generatePrompt(comments, context);
    expect(result).toBe(
      `These comments are from reviewing commit abc123d ("Fix auth flow").\nApply the feedback to the current version of the code.\n\nPlease address these review comments:\n\n- \`src/auth.ts:42\` — Use bcrypt instead of md5`
    );
  });

  it("should prepend branch context when selectedBranch is provided", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/auth.ts",
        startLine: 10,
        endLine: 10,
        side: "new",
        text: "Add error handling",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "commit",
      selectedCommit: null,
      selectedBranch: {
        name: "feature/auth",
        short_hash: "def789a",
        subject: "Auth feature",
        author: "test",
        date: "2024-01-01",
      },
    };

    const result = generatePrompt(comments, context);
    expect(result).toBe(
      `These comments are from reviewing branch feature/auth (at def789a).\nApply the feedback to the current version of the code.\n\nPlease address these review comments:\n\n- \`src/auth.ts:10\` — Add error handling`
    );
  });

  it("should prepend commit ref context when only commitRef is provided", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/main.ts",
        startLine: 5,
        endLine: 5,
        side: "new",
        text: "Rename variable",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "commit",
      commitRef: "HEAD~3",
      selectedCommit: null,
      selectedBranch: null,
    };

    const result = generatePrompt(comments, context);
    expect(result).toBe(
      `These comments are from reviewing changes relative to HEAD~3.\nApply the feedback to the current version of the code.\n\nPlease address these review comments:\n\n- \`src/main.ts:5\` — Rename variable`
    );
  });

  it("should not prepend context for unstaged changes", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/main.ts",
        startLine: 1,
        endLine: 1,
        side: "new",
        text: "Fix typo",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "unstaged",
      selectedCommit: null,
      selectedBranch: null,
    };

    const result = generatePrompt(comments, context);
    expect(result).toBe(
      `Please address these review comments:\n\n- \`src/main.ts:1\` — Fix typo`
    );
  });

  it("should not prepend context for staged changes", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/main.ts",
        startLine: 1,
        endLine: 1,
        side: "new",
        text: "Fix typo",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "staged",
      selectedCommit: null,
      selectedBranch: null,
    };

    const result = generatePrompt(comments, context);
    expect(result).toBe(
      `Please address these review comments:\n\n- \`src/main.ts:1\` — Fix typo`
    );
  });

  it("should prioritize selectedCommit over selectedBranch when both provided", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/auth.ts",
        startLine: 42,
        endLine: 42,
        side: "new",
        text: "Fix issue",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];
    const context: PromptContext = {
      mode: "commit",
      selectedCommit: {
        hash: "abc123def456",
        short_hash: "abc123d",
        message: "Fix auth flow",
        author: "test",
        date: "2024-01-01",
        refs: "",
      },
      selectedBranch: {
        name: "feature/auth",
        short_hash: "def789a",
        subject: "Auth feature",
        author: "test",
        date: "2024-01-01",
      },
    };

    const result = generatePrompt(comments, context);
    expect(result).toContain("commit abc123d");
    expect(result).not.toContain("branch feature/auth");
  });

  it("should annotate old-side comments with (deleted)", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/components/Button.tsx",
        startLine: 15,
        endLine: 15,
        side: "old",
        text: "This old code had a bug",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:\n\n- \`src/components/Button.tsx:15 (deleted)\` — This old code had a bug`
    );
  });

  it("should not annotate new-side comments with (deleted)", () => {
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
    ];

    const result = generatePrompt(comments);
    expect(result).not.toContain("(deleted)");
  });

  it("should handle mix of old and new side comments", () => {
    const comments: Comment[] = [
      {
        id: "1",
        file: "src/auth.ts",
        startLine: 10,
        endLine: 10,
        side: "old",
        text: "This was wrong",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "2",
        file: "src/auth.ts",
        startLine: 20,
        endLine: 25,
        side: "new",
        text: "Good replacement",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generatePrompt(comments);
    expect(result).toBe(
      `Please address these review comments:\n\n- \`src/auth.ts:10 (deleted)\` — This was wrong\n- \`src/auth.ts:20-25\` — Good replacement`
    );
  });
});
