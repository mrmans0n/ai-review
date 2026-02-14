# Prompt Preview File Path Chips — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render file path + line references as compact clickable chips in the prompt preview, with a toggle to switch to the existing raw textarea.

**Architecture:** Add a `parsePromptLines` helper that splits the prompt text and identifies comment lines via regex. Add a `viewMode` toggle to `PromptPreview`. Rich mode renders parsed lines read-only with chips; raw mode is the existing textarea. Copy always uses the raw text.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest + Testing Library

---

### Task 1: Add `parsePromptLines` helper + tests

**Files:**
- Create: `src/lib/promptParser.ts`
- Create: `src/lib/promptParser.test.ts`

**Step 1: Write the failing tests**

In `src/lib/promptParser.test.ts`:

```typescript
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
      text: "Use useCallback here",
    });
    expect(result[6]).toEqual({
      type: "comment",
      fullPath: "src/components/Button.tsx",
      fileName: "Button.tsx",
      startLine: 15,
      endLine: 23,
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
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/promptParser.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

In `src/lib/promptParser.ts`:

```typescript
export type ParsedTextLine = { type: "text"; content: string };
export type ParsedCommentLine = {
  type: "comment";
  fullPath: string;
  fileName: string;
  startLine: number;
  endLine: number | null;
  text: string;
};
export type ParsedLine = ParsedTextLine | ParsedCommentLine;

const COMMENT_RE = /^- `(.+?):(\d+)(?:-(\d+))?` — (.+)$/;

export function parsePromptLines(prompt: string): ParsedLine[] {
  return prompt.split("\n").map((line) => {
    const match = line.match(COMMENT_RE);
    if (!match) {
      return { type: "text", content: line };
    }
    const fullPath = match[1];
    const parts = fullPath.split("/");
    return {
      type: "comment",
      fullPath,
      fileName: parts[parts.length - 1],
      startLine: parseInt(match[2], 10),
      endLine: match[3] ? parseInt(match[3], 10) : null,
      text: match[4],
    };
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/promptParser.test.ts`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add src/lib/promptParser.ts src/lib/promptParser.test.ts
git commit -m "feat: add parsePromptLines helper for prompt preview chips"
```

---

### Task 2: Add rich view mode to PromptPreview

**Files:**
- Modify: `src/components/PromptPreview.tsx`

**Step 1: Add viewMode state and toggle**

Add `viewMode` state (`"rich"` | `"raw"`, default `"rich"`). Add a toggle button next to the title in the header. Import `parsePromptLines` and its types.

**Step 2: Implement the rich view**

Replace the single `<textarea>` block (lines 62-69) with a conditional:

- **Rich mode**: A read-only `<div>` that maps over `parsePromptLines(editablePrompt)`:
  - `type: "text"` lines: render as `<p>` with `text-gray-300 text-sm` (blank lines get a `min-h` spacer via `&nbsp;`).
  - `type: "comment"` lines: render as a flex row with:
    - A chip `<span>` showing `FileName (L10-L15)` or `FileName (L10)`, styled: `inline-flex items-center gap-1 bg-gray-700 text-gray-200 rounded-full px-2.5 py-0.5 text-xs font-mono flex-shrink-0`
    - Comment text as `<span className="text-gray-200 text-sm">`.
- **Raw mode**: The existing `<textarea>`.

Full replacement for lines 62-69 of `PromptPreview.tsx`:

```tsx
<div className="flex-1 overflow-auto p-6">
  {viewMode === "raw" ? (
    <textarea
      value={editablePrompt}
      onChange={(e) => setEditablePrompt(e.target.value)}
      className="w-full h-full min-h-[60vh] p-4 bg-gray-900 text-gray-100 font-mono text-sm rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      autoFocus
    />
  ) : (
    <div className="min-h-[60vh] p-4 bg-gray-900 rounded space-y-1">
      {parsePromptLines(editablePrompt).map((line, i) =>
        line.type === "text" ? (
          <p key={i} className="text-gray-300 text-sm">
            {line.content || "\u00A0"}
          </p>
        ) : (
          <div key={i} className="flex items-baseline gap-2 text-sm">
            <span className="inline-flex items-center gap-1 bg-gray-700 text-gray-200 rounded-full px-2.5 py-0.5 text-xs font-mono flex-shrink-0">
              {line.fileName}
              <span className="text-gray-400">
                ({line.endLine ? `L${line.startLine}-${line.endLine}` : `L${line.startLine}`})
              </span>
            </span>
            <span className="text-gray-200">{line.text}</span>
          </div>
        )
      )}
    </div>
  )}
</div>
```

**Step 3: Add the toggle button to the header**

In the header bar (line 38-60), add a toggle between the title and the close button:

```tsx
<div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
  <h2 className="text-xl font-semibold text-white">Generated Prompt</h2>
  <div className="flex items-center gap-3">
    <div className="inline-flex bg-gray-900 rounded p-0.5 text-xs">
      <button
        onClick={() => setViewMode("rich")}
        className={`px-2.5 py-1 rounded transition-colors ${
          viewMode === "rich" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Formatted
      </button>
      <button
        onClick={() => setViewMode("raw")}
        className={`px-2.5 py-1 rounded transition-colors ${
          viewMode === "raw" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Raw
      </button>
    </div>
    <button
      onClick={onClose}
      className="text-gray-400 hover:text-white transition-colors"
      aria-label="Close"
    >
      {/* existing SVG */}
    </button>
  </div>
</div>
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: No TypeScript or build errors

**Step 5: Run all tests**

Run: `pnpm test:run`
Expected: All tests pass (existing + new parser tests)

**Step 6: Commit**

```bash
git add src/components/PromptPreview.tsx
git commit -m "feat: add rich view with file path chips to prompt preview"
```
