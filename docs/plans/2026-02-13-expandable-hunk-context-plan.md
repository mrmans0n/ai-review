# Expandable Hunk Context — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub/GitLab-style expand controls to reveal hidden lines between, above, and below diff hunks.

**Architecture:** Use react-diff-view's built-in `expandFromRawCode`, `getCollapsedLinesCountBetween`, and `Decoration` component. A new Tauri command fetches file content at any git ref. Per-file source is cached on first expansion; subsequent expansions are local. Expand state resets when the diff changes.

**Tech Stack:** Rust (Tauri command), TypeScript/React (react-diff-view utilities), Tailwind CSS (styling)

---

### Task 1: Backend — `get_file_at_ref` Rust function

**Files:**
- Modify: `src-tauri/src/git.rs` (add function after line 273, after `get_file_diff`)
- Modify: `src-tauri/src/lib.rs` (add Tauri command + register it)

**Step 1: Add `get_file_at_ref` to git.rs**

Add this function to `src-tauri/src/git.rs` after the `get_file_diff` function (after line 273):

```rust
/// Get file content at a specific git ref (commit, branch, index, etc.)
/// Uses `git show <ref>:<file_path>` to retrieve the content.
pub fn get_file_at_ref(dir: &Path, git_ref: &str, file_path: &str) -> Result<String, String> {
    let ref_path = format!("{}:{}", git_ref, file_path);
    let output = Command::new("git")
        .arg("show")
        .arg(&ref_path)
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to execute git show: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

**Step 2: Add the Tauri command to lib.rs**

Add this command to `src-tauri/src/lib.rs` after the `read_file_content` command (after line 66):

```rust
#[tauri::command]
fn get_file_at_ref(path: String, git_ref: String, file_path: String) -> Result<String, String> {
    let dir = PathBuf::from(path);
    git::get_file_at_ref(&dir, &git_ref, &file_path)
}
```

**Step 3: Register the command in the invoke handler**

In `src-tauri/src/lib.rs`, add `get_file_at_ref` to the `tauri::generate_handler!` macro at line 275, after `read_file_content`:

```rust
get_file_at_ref,
```

**Step 4: Verify it compiles**

Run: `cd /Volumes/Workspace/ai-review && cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Compiles with no errors.

**Step 5: Commit**

```bash
git add src-tauri/src/git.rs src-tauri/src/lib.rs
git commit -m "feat: add get_file_at_ref Tauri command for hunk expansion"
```

---

### Task 2: Frontend — `useHunkExpansion` hook (tests first)

**Files:**
- Create: `src/hooks/useHunkExpansion.test.ts`
- Create: `src/hooks/useHunkExpansion.ts`

**Step 1: Write the failing tests**

Create `src/hooks/useHunkExpansion.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHunkExpansion } from "./useHunkExpansion";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

// Minimal hunk structure matching react-diff-view's HunkData
const makeHunk = (oldStart: number, oldLines: number, newStart: number, newLines: number) => ({
  content: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@`,
  oldStart,
  oldLines,
  newStart,
  newLines,
  changes: Array.from({ length: newLines }, (_, i) => ({
    type: "normal" as const,
    isNormal: true,
    oldLineNumber: oldStart + i,
    newLineNumber: newStart + i,
    content: `line ${newStart + i}`,
  })),
});

describe("useHunkExpansion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return original hunks when no expansion has occurred", () => {
    const hunks = [makeHunk(10, 5, 10, 5)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    expect(result.current.hunks).toBe(hunks);
  });

  it("should reset expanded state when file path changes", () => {
    const hunks = [makeHunk(10, 5, 10, 5)];
    const { result, rerender } = renderHook(
      ({ filePath }) => useHunkExpansion(filePath, hunks, "/repo", "unstaged", null),
      { initialProps: { filePath: "a.ts" } }
    );

    // Rerender with a different file path
    rerender({ filePath: "b.ts" });
    expect(result.current.hunks).toBe(hunks);
  });

  it("should fetch file source via read_file_content for unstaged mode", async () => {
    const fileContent = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\nline 11\nline 12\nline 13\nline 14\nline 15\nline 16\nline 17\nline 18\nline 19\nline 20";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(10, 3, 10, 3)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 5, 9);
    });

    expect(invoke).toHaveBeenCalledWith("read_file_content", {
      path: "/repo",
      filePath: "test.ts",
    });
  });

  it("should fetch file source via get_file_at_ref for commit mode", async () => {
    const fileContent = "line 1\nline 2\nline 3";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(2, 1, 2, 1)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "commit", "abc123")
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 1, 1);
    });

    expect(invoke).toHaveBeenCalledWith("get_file_at_ref", {
      path: "/repo",
      gitRef: "abc123",
      filePath: "test.ts",
    });
  });

  it("should fetch file source via get_file_at_ref with :0 for staged mode", async () => {
    const fileContent = "line 1\nline 2\nline 3";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(2, 1, 2, 1)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "staged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 1, 1);
    });

    expect(invoke).toHaveBeenCalledWith("get_file_at_ref", {
      path: "/repo",
      gitRef: ":0",
      filePath: "test.ts",
    });
  });

  it("should cache file source across multiple expansions", async () => {
    const fileContent = "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\nline 11\nline 12\nline 13\nline 14\nline 15\nline 16\nline 17\nline 18\nline 19\nline 20\nline 21\nline 22\nline 23\nline 24\nline 25\nline 26\nline 27\nline 28\nline 29\nline 30";
    vi.mocked(invoke).mockResolvedValue(fileContent);

    const hunks = [makeHunk(10, 3, 10, 3), makeHunk(20, 3, 20, 3)];
    const { result } = renderHook(() =>
      useHunkExpansion("test.ts", hunks, "/repo", "unstaged", null)
    );

    await act(async () => {
      await result.current.expandRange("test.ts", 5, 9);
    });

    await act(async () => {
      await result.current.expandRange("test.ts", 13, 19);
    });

    // Should only invoke once — second call uses cache
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test:run src/hooks/useHunkExpansion.test.ts`
Expected: FAIL — module `./useHunkExpansion` not found.

**Step 3: Write the hook implementation**

Create `src/hooks/useHunkExpansion.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from "react";
import { expandFromRawCode } from "react-diff-view";
import { invoke } from "@tauri-apps/api/core";
import type { DiffMode } from "../types";

type HunkData = any;

export function useHunkExpansion(
  filePath: string,
  originalHunks: HunkData[],
  workingDir: string | null,
  diffMode: DiffMode,
  commitRef: string | null
) {
  const [expandedHunksMap, setExpandedHunksMap] = useState<Record<string, HunkData[]>>({});
  const sourceCache = useRef<Record<string, string[]>>({});

  // Reset when file path or diff mode changes
  useEffect(() => {
    setExpandedHunksMap({});
    sourceCache.current = {};
  }, [diffMode, commitRef]);

  const fetchSource = useCallback(
    async (file: string): Promise<string[]> => {
      if (sourceCache.current[file]) {
        return sourceCache.current[file];
      }

      if (!workingDir) {
        throw new Error("No working directory");
      }

      let content: string;

      if (diffMode === "unstaged") {
        content = await invoke<string>("read_file_content", {
          path: workingDir,
          filePath: file,
        });
      } else if (diffMode === "staged") {
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ":0",
          filePath: file,
        });
      } else {
        // commit mode — use the commitRef
        const ref = commitRef || "HEAD";
        content = await invoke<string>("get_file_at_ref", {
          path: workingDir,
          gitRef: ref,
          filePath: file,
        });
      }

      const lines = content.split("\n");
      sourceCache.current[file] = lines;
      return lines;
    },
    [workingDir, diffMode, commitRef]
  );

  const expandRange = useCallback(
    async (file: string, start: number, end: number) => {
      const source = await fetchSource(file);
      const currentHunks = expandedHunksMap[file] || originalHunks;
      const expanded = expandFromRawCode(currentHunks, source, start, end);
      setExpandedHunksMap((prev) => ({ ...prev, [file]: expanded }));
    },
    [fetchSource, expandedHunksMap, originalHunks]
  );

  const hunks = expandedHunksMap[filePath] || originalHunks;

  return { hunks, expandRange };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test:run src/hooks/useHunkExpansion.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/hooks/useHunkExpansion.ts src/hooks/useHunkExpansion.test.ts
git commit -m "feat: add useHunkExpansion hook with tests"
```

---

### Task 3: Frontend — `HunkExpandControl` component

**Files:**
- Create: `src/components/HunkExpandControl.tsx`

**Step 1: Create the component**

Create `src/components/HunkExpandControl.tsx`:

```tsx
import { getCollapsedLinesCountBetween } from "react-diff-view";

const EXPAND_LINES = 15;

interface HunkExpandControlProps {
  /** Previous hunk (null if this is the top-of-file gap) */
  previousHunk: any | null;
  /** Next hunk (null if this is the bottom-of-file gap) */
  nextHunk: any | null;
  /** Total lines in the file (needed for bottom-of-file) */
  totalLines: number;
  /** Called with (start, end) line numbers to expand */
  onExpand: (start: number, end: number) => void;
}

export function HunkExpandControl({
  previousHunk,
  nextHunk,
  totalLines,
  onExpand,
}: HunkExpandControlProps) {
  // Calculate the gap boundaries
  let gapStart: number;
  let gapEnd: number;

  if (!previousHunk && nextHunk) {
    // Top of file — gap from line 1 to the start of the first hunk
    gapStart = 1;
    gapEnd = nextHunk.oldStart - 1;
  } else if (previousHunk && !nextHunk) {
    // Bottom of file — gap from end of last hunk to end of file
    gapStart = previousHunk.oldStart + previousHunk.oldLines;
    gapEnd = totalLines;
  } else if (previousHunk && nextHunk) {
    // Between hunks
    gapStart = previousHunk.oldStart + previousHunk.oldLines;
    gapEnd = nextHunk.oldStart - 1;
  } else {
    return null;
  }

  const collapsedCount = gapEnd - gapStart + 1;

  if (collapsedCount <= 0) {
    return null;
  }

  const showSplit = collapsedCount > EXPAND_LINES;

  const handleExpandUp = () => {
    // Expand EXPAND_LINES from the bottom of this gap (closer to previousHunk)
    const start = gapStart;
    const end = Math.min(gapStart + EXPAND_LINES - 1, gapEnd);
    onExpand(start, end);
  };

  const handleExpandDown = () => {
    // Expand EXPAND_LINES from the top of this gap (closer to nextHunk)
    const start = Math.max(gapEnd - EXPAND_LINES + 1, gapStart);
    const end = gapEnd;
    onExpand(start, end);
  };

  const handleExpandAll = () => {
    onExpand(gapStart, gapEnd);
  };

  return (
    <td colSpan={4} className="bg-gray-800/50 border-y border-gray-700/50 py-1 px-4">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {showSplit ? (
          <>
            {previousHunk && (
              <button
                onClick={handleExpandDown}
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
                title={`Show ${EXPAND_LINES} lines below`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M8 1a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 8 1ZM3.47 9.22a.75.75 0 0 1 1.06 0L8 12.69l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
                Expand {EXPAND_LINES} lines
              </button>
            )}
            {nextHunk && (
              <button
                onClick={handleExpandUp}
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
                title={`Show ${EXPAND_LINES} lines above`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.53 6.78a.75.75 0 0 1-1.06 0L8 3.31 4.53 6.78a.75.75 0 0 1-1.06-1.06l4-4a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06ZM8 15a.75.75 0 0 1-.75-.75v-6.5a.75.75 0 0 1 1.5 0v6.5A.75.75 0 0 1 8 15Z" clipRule="evenodd" />
                </svg>
                Expand {EXPAND_LINES} lines
              </button>
            )}
            <button
              onClick={handleExpandAll}
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
              title={`Show all ${collapsedCount} lines`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 0 1 0 1.06L8 9.06 3.47 4.53a.75.75 0 0 1 1.06-1.06L8 6.94l3.47-3.47a.75.75 0 0 1 1.06 0ZM12.53 9.47a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94l3.47-3.47a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
              Expand all ({collapsedCount} lines)
            </button>
          </>
        ) : (
          <button
            onClick={handleExpandAll}
            className="hover:text-blue-400 transition-colors flex items-center gap-1"
            title={`Show all ${collapsedCount} lines`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 0 1 0 1.06L8 9.06 3.47 4.53a.75.75 0 0 1 1.06-1.06L8 6.94l3.47-3.47a.75.75 0 0 1 1.06 0ZM12.53 9.47a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94l3.47-3.47a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Expand all ({collapsedCount} lines)
          </button>
        )}
      </div>
    </td>
  );
}
```

**Step 2: Verify it compiles**

Run: `pnpm build`
Expected: Compiles (component is not yet used, but should type-check).

**Step 3: Commit**

```bash
git add src/components/HunkExpandControl.tsx
git commit -m "feat: add HunkExpandControl component"
```

---

### Task 4: Frontend — CSS for decoration rows

**Files:**
- Modify: `src/diff.css` (append at end, after line 145)

**Step 1: Add decoration styles**

Append to `src/diff.css`:

```css
/* Expand context decoration rows */
.diff-decoration {
  background-color: transparent;
}

.diff-decoration-gutter {
  @apply bg-gray-900;
  border-right: 1px solid #374151;
}

.diff-decoration-content {
  background-color: transparent;
}
```

**Step 2: Commit**

```bash
git add src/diff.css
git commit -m "style: add CSS for diff decoration rows"
```

---

### Task 5: Frontend — Integrate expansion into App.tsx

This is the main integration task. It wires the hook and component into the diff rendering.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update imports**

At line 2 of `src/App.tsx`, change the react-diff-view import to include `Decoration` and `getCollapsedLinesCountBetween`:

```typescript
import { parseDiff, Diff, Hunk, Decoration, getChangeKey, getCollapsedLinesCountBetween } from "react-diff-view";
```

Add the new component and hook imports after line 19 (after CommentOverview import):

```typescript
import { HunkExpandControl } from "./components/HunkExpandControl";
import { useHunkExpansion } from "./hooks/useHunkExpansion";
```

**Step 2: Add the hook to `renderFile`**

This is the key change. The `renderFile` function at line 644 needs to:
1. Use the `useHunkExpansion` hook per file
2. Replace `file.hunks` with the expanded hunks
3. Interleave `Decoration` elements between `Hunk` elements

Because `renderFile` is a plain function (not a component), we cannot call hooks inside it. We need to either:
- (a) Extract it into a component, or
- (b) Lift the expansion state up to the App level

Option (b) is simpler and avoids a big refactor. Add state and a handler at the App level:

After the existing state declarations (around line 89), add:

```typescript
const [expandedHunksMap, setExpandedHunksMap] = useState<Record<string, any[]>>({});
const sourceCache = useRef<Record<string, string[]>>({});
```

Add a `useRef` to the imports at line 1 (it's likely already there — verify).

After the `handleModeChange` function (line 325), add:

```typescript
// Clear expansion state when diff changes
useEffect(() => {
  setExpandedHunksMap({});
  sourceCache.current = {};
}, [diffMode, selectedCommit, selectedBranch]);

const fetchFileSource = async (filePath: string): Promise<string[]> => {
  if (sourceCache.current[filePath]) {
    return sourceCache.current[filePath];
  }

  if (!workingDir) throw new Error("No working directory");

  let content: string;

  if (diffMode.mode === "unstaged") {
    content = await invoke<string>("read_file_content", {
      path: workingDir,
      filePath,
    });
  } else if (diffMode.mode === "staged") {
    content = await invoke<string>("get_file_at_ref", {
      path: workingDir,
      gitRef: ":0",
      filePath,
    });
  } else {
    const ref = diffMode.commitRef || "HEAD";
    content = await invoke<string>("get_file_at_ref", {
      path: workingDir,
      gitRef: ref,
      filePath,
    });
  }

  const lines = content.split("\n");
  sourceCache.current[filePath] = lines;
  return lines;
};

const handleExpandRange = async (filePath: string, hunks: any[], start: number, end: number) => {
  try {
    const source = await fetchFileSource(filePath);
    const currentHunks = expandedHunksMap[filePath] || hunks;
    const { expandFromRawCode } = await import("react-diff-view");
    const expanded = expandFromRawCode(currentHunks, source, start, end);
    setExpandedHunksMap((prev) => ({ ...prev, [filePath]: expanded }));
  } catch (err) {
    console.error("Failed to expand context:", err);
  }
};
```

Note: Instead of the dynamic import, you can add `expandFromRawCode` to the static import at line 2. Either approach works. The static import is cleaner:

```typescript
import { parseDiff, Diff, Hunk, Decoration, getChangeKey, getCollapsedLinesCountBetween, expandFromRawCode } from "react-diff-view";
```

Then in `handleExpandRange`, just use `expandFromRawCode` directly.

**Step 3: Update `renderFile` to use expanded hunks and render Decorations**

In the `renderFile` function:

1. At line 644, after `const renderFile = (file: any) => {`, add:

```typescript
    const fileName = file.newPath || file.oldPath;
    const fileHunks = expandedHunksMap[fileName] || file.hunks;
```

2. Change line 645 from:
```typescript
    const tokens = highlight(file.hunks, {
```
to:
```typescript
    const tokens = highlight(fileHunks, {
```

3. Remove the duplicate `const fileName = file.newPath || file.oldPath;` at line 649 (it's now at the top).

4. Change line 711 from:
```typescript
          hunks={file.hunks}
```
to:
```typescript
          hunks={fileHunks}
```

5. Replace the children function (lines 841-846) from:
```tsx
        {(hunks: any[]) =>
          hunks.map((hunk) => (
            <Hunk key={hunk.content} hunk={hunk} />
          ))
        }
```
to:
```tsx
        {(hunks: any[]) => {
          const elements: React.ReactNode[] = [];
          const totalLines = sourceCache.current[fileName]?.length ?? 0;

          // Top-of-file expand control
          if (hunks.length > 0 && hunks[0].oldStart > 1) {
            elements.push(
              <Decoration key="expand-top">
                <HunkExpandControl
                  previousHunk={null}
                  nextHunk={hunks[0]}
                  totalLines={totalLines}
                  onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                />
              </Decoration>
            );
          }

          hunks.forEach((hunk, i) => {
            // Between-hunk expand control
            if (i > 0) {
              const collapsed = getCollapsedLinesCountBetween(hunks[i - 1], hunk);
              if (collapsed > 0) {
                elements.push(
                  <Decoration key={`expand-${i}`}>
                    <HunkExpandControl
                      previousHunk={hunks[i - 1]}
                      nextHunk={hunk}
                      totalLines={totalLines}
                      onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                    />
                  </Decoration>
                );
              }
            }
            elements.push(<Hunk key={hunk.content} hunk={hunk} />);
          });

          // Bottom-of-file expand control
          if (hunks.length > 0 && totalLines > 0) {
            const lastHunk = hunks[hunks.length - 1];
            const lastHunkEnd = lastHunk.oldStart + lastHunk.oldLines - 1;
            if (lastHunkEnd < totalLines) {
              elements.push(
                <Decoration key="expand-bottom">
                  <HunkExpandControl
                    previousHunk={lastHunk}
                    nextHunk={null}
                    totalLines={totalLines}
                    onExpand={(start, end) => handleExpandRange(fileName, file.hunks, start, end)}
                  />
                </Decoration>
              );
            }
          }

          return elements;
        }}
```

**Step 4: Verify it compiles**

Run: `pnpm build`
Expected: Compiles with no errors.

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate hunk expansion into diff view"
```

---

### Task 6: Manual testing and edge case fixes

**Files:**
- Possibly modify: `src/App.tsx`, `src/components/HunkExpandControl.tsx`

**Step 1: Run the app and test**

Run: `pnpm tauri dev`

Test these scenarios:
1. Open a repo with unstaged changes — verify expand controls appear between hunks
2. Click "Expand all" between two hunks — verify lines appear with syntax highlighting
3. Click "Expand 15 lines" down from top of file — verify correct lines appear
4. Click "Expand 15 lines" up from bottom of file — verify correct lines appear
5. Switch to staged mode — verify expansion state resets
6. Add a comment on a visible line, then expand — verify comment survives
7. Test with a deleted file — verify no crash (expand controls may be hidden)
8. Test with an added file — verify expand controls don't appear

**Step 2: Fix any issues found**

Apply fixes as needed. Common issues to watch for:
- `Decoration` children format: may need `[gutterContent, mainContent]` tuple instead of single element
- Off-by-one errors in line numbering
- `totalLines` being 0 before first expansion (top/bottom controls won't show until after first between-hunk expansion fetches the source)

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: address edge cases in hunk expansion"
```

---

### Task 7: Handle `totalLines` bootstrapping

The bottom-of-file and top-of-file expand controls need `totalLines` to know if there are hidden lines. But `totalLines` comes from `sourceCache`, which is only populated after the first expansion.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Pre-compute totalLines from hunk data**

We can estimate totalLines without fetching the source. The last hunk tells us the minimum file length:

In the `renderFile` children function, change the `totalLines` calculation:

```typescript
// Estimate total lines from the last hunk (minimum known file length)
const lastHunk = hunks[hunks.length - 1];
const estimatedTotalLines = sourceCache.current[fileName]?.length
  ?? (lastHunk ? lastHunk.oldStart + lastHunk.oldLines + 20 : 0);
```

Use `estimatedTotalLines` instead of `totalLines`. The `+ 20` ensures the bottom-of-file control always shows (it will self-correct after the source is fetched). Once the source is fetched, `sourceCache.current[fileName]?.length` will be the authoritative value.

**Step 2: Verify**

Run: `pnpm tauri dev`
Verify that top and bottom expand controls appear without needing a prior expansion.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: show expand controls at file edges before source is fetched"
```

---

### Task 8: Run all tests

**Step 1: Run the full test suite**

Run: `pnpm test:run`
Expected: All tests pass.

**Step 2: Fix any failures**

If tests fail, fix them.

**Step 3: Commit if there are fixes**

```bash
git add -A
git commit -m "fix: resolve test failures after hunk expansion integration"
```
