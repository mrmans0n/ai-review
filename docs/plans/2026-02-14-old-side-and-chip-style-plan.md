# Old-Side Annotation + Chip Style Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Annotate old-side comments with `(deleted)` in the generated prompt so LLMs know the comment refers to removed code, and change prompt preview chip styling to match the CommentOverview badge.

**Architecture:** Modify `generatePrompt()` to append ` (deleted)` to old-side comment locations. Update `parsePromptLines()` regex to capture the optional `(deleted)` marker. Update `PromptPreview` rich view to show a "deleted" indicator and use the new chip styling. Update `CommentOverview` to show an "old" indicator.

**Tech Stack:** React, TypeScript, Vitest

---

### Task 1: Add `(deleted)` annotation to generatePrompt

**Files:**
- Modify: `src/lib/promptGenerator.ts:61-66`
- Modify: `src/lib/promptGenerator.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/promptGenerator.test.ts` at the end (before the closing `});`):

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/promptGenerator.test.ts`
Expected: 3 new tests FAIL

**Step 3: Implement the change**

In `src/lib/promptGenerator.ts`, change lines 62-66 from:

```typescript
      const location = comment.startLine === comment.endLine
        ? `${file}:${comment.startLine}`
        : `${file}:${comment.startLine}-${comment.endLine}`;

      lines.push(`- \`${location}\` — ${comment.text}`);
```

To:

```typescript
      const lineRef = comment.startLine === comment.endLine
        ? `${comment.startLine}`
        : `${comment.startLine}-${comment.endLine}`;
      const deleted = comment.side === "old" ? " (deleted)" : "";
      const location = `${file}:${lineRef}${deleted}`;

      lines.push(`- \`${location}\` — ${comment.text}`);
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/promptGenerator.test.ts`
Expected: All tests PASS (existing + 3 new)

**Step 5: Commit**

```bash
git add src/lib/promptGenerator.ts src/lib/promptGenerator.test.ts
git commit -m "feat: annotate old-side comments with (deleted) in generated prompt"
```

---

### Task 2: Update parsePromptLines to handle `(deleted)` marker

**Files:**
- Modify: `src/lib/promptParser.ts:2-9,12`
- Modify: `src/lib/promptParser.test.ts`

**Step 1: Write the failing tests**

Add to `src/lib/promptParser.test.ts` at the end (before the closing `});`):

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/lib/promptParser.test.ts`
Expected: 3 new tests FAIL (deleted field missing, regex doesn't match `(deleted)`)

**Step 3: Implement the changes**

In `src/lib/promptParser.ts`:

1. Add `deleted: boolean` to `ParsedCommentLine` type (line 8, after `text: string`).

2. Update the regex (line 12) from:
```typescript
const COMMENT_RE = /^- `(.+?):(\d+)(?:-(\d+))?` — (.+)$/;
```
To:
```typescript
const COMMENT_RE = /^- `(.+?):(\d+)(?:-(\d+))?( \(deleted\))?` — (.+)$/;
```

3. Update the return object in the match branch (lines 22-29) to include `deleted` and shift the text capture group from `match[4]` to `match[5]`:

```typescript
    return {
      type: "comment",
      fullPath,
      fileName: parts[parts.length - 1],
      startLine: parseInt(match[2], 10),
      endLine: match[3] ? parseInt(match[3], 10) : null,
      deleted: !!match[4],
      text: match[5],
    };
```

**Step 4: Update existing tests for the new `deleted` field**

Update every existing test assertion that uses `toEqual` on comment objects to include `deleted: false`. There are 4 tests that need updating:

- "should parse a single-line comment" — add `deleted: false`
- "should parse a multi-line range comment" — add `deleted: false`
- "should parse a full prompt with context header and comments" — add `deleted: false` to both comment assertions (result[5] and result[6])

**Step 5: Run tests to verify they pass**

Run: `pnpm test:run src/lib/promptParser.test.ts`
Expected: All 10 tests PASS

**Step 6: Commit**

```bash
git add src/lib/promptParser.ts src/lib/promptParser.test.ts
git commit -m "feat: parse (deleted) marker in prompt lines"
```

---

### Task 3: Update PromptPreview chip styling + deleted indicator

**Files:**
- Modify: `src/components/PromptPreview.tsx:100-108`

**Step 1: Update the chip styling and add deleted indicator**

In `src/components/PromptPreview.tsx`, replace lines 99-108 (the comment rendering block inside the rich view) from:

```tsx
                : (
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
```

To:

```tsx
                : (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 bg-gray-600 text-gray-300 rounded px-2 py-0.5 text-xs font-mono flex-shrink-0">
                      {line.fileName}
                      <span className="text-gray-400">
                        ({line.endLine ? `L${line.startLine}-${line.endLine}` : `L${line.startLine}`})
                      </span>
                    </span>
                    {line.deleted && (
                      <span className="text-orange-400 text-xs">deleted</span>
                    )}
                    <span className="text-gray-200">{line.text}</span>
                  </div>
                )
```

Changes:
- `bg-gray-700` → `bg-gray-600` (match CommentOverview)
- `text-gray-200` → `text-gray-300` (match CommentOverview)
- `rounded-full` → `rounded` (match CommentOverview)
- `px-2.5` → `px-2` (match CommentOverview)
- Added `{line.deleted && ...}` indicator in `text-orange-400`

**Step 2: Verify build**

Run: `pnpm build`
Expected: No errors

**Step 3: Run all tests**

Run: `pnpm test:run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/components/PromptPreview.tsx
git commit -m "fix: match chip styling to CommentOverview and show deleted indicator"
```

---

### Task 4: Show old-side indicator in CommentOverview

**Files:**
- Modify: `src/components/CommentOverview.tsx:84-90`

**Step 1: Add old-side indicator**

In `src/components/CommentOverview.tsx`, after the line number badge `</span>` (line 89) and before the closing `</div>` of `flex-shrink-0` (line 90), add a second badge when `comment.side === "old"`:

Replace lines 84-90 from:

```tsx
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono bg-gray-600 text-gray-300">
                            {comment.startLine === comment.endLine
                              ? `L${comment.startLine}`
                              : `L${comment.startLine}-${comment.endLine}`}
                          </span>
                        </div>
```

To:

```tsx
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono bg-gray-600 text-gray-300">
                            {comment.startLine === comment.endLine
                              ? `L${comment.startLine}`
                              : `L${comment.startLine}-${comment.endLine}`}
                          </span>
                          {comment.side === "old" && (
                            <span className="text-orange-400 text-xs">deleted</span>
                          )}
                        </div>
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: No errors

**Step 3: Run all tests**

Run: `pnpm test:run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/components/CommentOverview.tsx
git commit -m "feat: show deleted indicator for old-side comments in review overview"
```
