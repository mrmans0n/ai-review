# Lazy Diff File Mounting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defer mounting of each file's `<Diff>` block until it's near the viewport, so opening a large diff is fast and scrolling no longer shows blank rectangles.

**Architecture:** Introduce two new components — `LazyDiffFile` (an `IntersectionObserver`-gated wrapper with `content-visibility: auto` and `contain-intrinsic-size`) and `DiffFileBody` (a per-file child that owns `useMemo`-cached syntax tokens and renders the existing `<Diff>` from `react-diff-view`). `App.tsx`'s `renderFile` keeps the always-rendered file-level chrome (sticky header, `data-diff-file` wrapper, whole-file comments) and wraps `<DiffFileBody>` in `<LazyDiffFile>`. Three force-mount triggers (`scrollToDiffFile`, `goToComment`, search-open) bypass the observer when needed.

**Tech Stack:** React 19 + TypeScript, `react-diff-view`, Vitest + jsdom + `@testing-library/react`. Existing `IntersectionObserver` mock pattern from `src/hooks/useVisibleDiffFile.test.ts`.

**Spec:** `docs/superpowers/specs/2026-05-02-lazy-diff-mounting-design.md`

---

## File Structure

**New files:**

- `src/lib/diffMetrics.ts` — layout constants (`DIFF_LINE_HEIGHT`, `DIFF_FILE_HEADER_HEIGHT`, `DIFF_HUNK_SEPARATOR_HEIGHT`) + `estimateFileHeight(file)` function.
- `src/lib/diffMetrics.test.ts` — unit tests for `estimateFileHeight`.
- `src/components/LazyDiffFile.tsx` — `IntersectionObserver`-gated wrapper. Pending placeholder vs. mounted children.
- `src/components/LazyDiffFile.test.tsx` — gate behavior tests.
- `src/components/DiffFileBody.tsx` — per-file inner component. Memoizes tokens, renders `<Diff>`. Holds all the renderGutter/gutterEvents plumbing currently inlined in `App.tsx`.

**Modified files:**

- `src/App.tsx` — `renderFile` swaps the inline `<Diff>` block for `<LazyDiffFile><DiffFileBody/></LazyDiffFile>`. Adds `forceMountedPaths` ref/state. `scrollToDiffFile`, `goToComment`, and search-open handler force-mount as needed.

**Touch but verify:**

- `src/hooks/useSearch.ts` — no code changes required; the MutationObserver inside it will pick up newly mounted files automatically once they enter the DOM.

---

## Task 1: `diffMetrics` module

**Files:**
- Create: `src/lib/diffMetrics.ts`
- Test: `src/lib/diffMetrics.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `src/lib/diffMetrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DIFF_FILE_HEADER_HEIGHT,
  DIFF_HUNK_SEPARATOR_HEIGHT,
  DIFF_LINE_HEIGHT,
  estimateFileHeight,
} from "./diffMetrics";

describe("estimateFileHeight", () => {
  it("returns just header height for a file with no hunks", () => {
    const file = { hunks: [] };
    expect(estimateFileHeight(file)).toBe(DIFF_FILE_HEADER_HEIGHT);
  });

  it("sums change-line height across all hunks", () => {
    const file = {
      hunks: [
        { changes: new Array(10).fill({}) },
        { changes: new Array(5).fill({}) },
      ],
    };
    expect(estimateFileHeight(file)).toBe(
      DIFF_FILE_HEADER_HEIGHT + 15 * DIFF_LINE_HEIGHT + DIFF_HUNK_SEPARATOR_HEIGHT
    );
  });

  it("adds one separator between each pair of hunks (n-1 separators)", () => {
    const file = {
      hunks: [
        { changes: new Array(2).fill({}) },
        { changes: new Array(2).fill({}) },
        { changes: new Array(2).fill({}) },
      ],
    };
    expect(estimateFileHeight(file)).toBe(
      DIFF_FILE_HEADER_HEIGHT + 6 * DIFF_LINE_HEIGHT + 2 * DIFF_HUNK_SEPARATOR_HEIGHT
    );
  });

  it("falls back to header height when hunks is missing", () => {
    expect(estimateFileHeight({})).toBe(DIFF_FILE_HEADER_HEIGHT);
    expect(estimateFileHeight(null)).toBe(DIFF_FILE_HEADER_HEIGHT);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm test:run src/lib/diffMetrics.test.ts`
Expected: FAIL — `Cannot find module './diffMetrics'`.

- [ ] **Step 1.3: Implement `diffMetrics`**

Create `src/lib/diffMetrics.ts`:

```ts
export const DIFF_LINE_HEIGHT = 20;
export const DIFF_FILE_HEADER_HEIGHT = 40;
export const DIFF_HUNK_SEPARATOR_HEIGHT = 32;

type HunkLike = { changes?: unknown[] };
type FileLike = { hunks?: HunkLike[] | null } | null | undefined;

export function estimateFileHeight(file: FileLike): number {
  const hunks = file?.hunks;
  if (!hunks || hunks.length === 0) return DIFF_FILE_HEADER_HEIGHT;

  let lineCount = 0;
  for (const hunk of hunks) {
    lineCount += hunk.changes?.length ?? 0;
  }

  const separators = Math.max(0, hunks.length - 1);

  return (
    DIFF_FILE_HEADER_HEIGHT
    + lineCount * DIFF_LINE_HEIGHT
    + separators * DIFF_HUNK_SEPARATOR_HEIGHT
  );
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `pnpm test:run src/lib/diffMetrics.test.ts`
Expected: PASS — 4 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/diffMetrics.ts src/lib/diffMetrics.test.ts
git commit -m "feat(diff): add diffMetrics module for height estimation"
```

---

## Task 2: `LazyDiffFile` component

**Files:**
- Create: `src/components/LazyDiffFile.tsx`
- Test: `src/components/LazyDiffFile.test.tsx`

- [ ] **Step 2.1: Write failing tests**

Create `src/components/LazyDiffFile.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyDiffFile } from "./LazyDiffFile";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  options?: IntersectionObserverInit;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  trigger(entries: Pick<IntersectionObserverEntry, "isIntersecting" | "target">[]) {
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

describe("LazyDiffFile", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a placeholder (not children) before intersection", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).toBeNull();
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });

  it("mounts children when intersection fires", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    const observer = MockIntersectionObserver.instances[0];
    observer.trigger([{ isIntersecting: true, target: document.createElement("div") }]);
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("mounts children immediately when forceMount is true", () => {
    render(
      <LazyDiffFile estimatedHeight={1234} forceMount>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("transitions from pending to mounted when forceMount becomes true", () => {
    const { rerender } = render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).toBeNull();

    rerender(
      <LazyDiffFile estimatedHeight={1234} forceMount>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("stays mounted after intersection even if it later leaves the viewport", () => {
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    const observer = MockIntersectionObserver.instances[0];
    observer.trigger([{ isIntersecting: true, target: document.createElement("div") }]);
    expect(screen.queryByTestId("child")).not.toBeNull();
    observer.trigger([{ isIntersecting: false, target: document.createElement("div") }]);
    expect(screen.queryByTestId("child")).not.toBeNull();
  });

  it("mounts immediately when IntersectionObserver is unavailable (jsdom shim path)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    render(
      <LazyDiffFile estimatedHeight={1234}>
        <div data-testid="child">child</div>
      </LazyDiffFile>
    );
    expect(screen.queryByTestId("child")).not.toBeNull();
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `pnpm test:run src/components/LazyDiffFile.test.tsx`
Expected: FAIL — `Cannot find module './LazyDiffFile'`.

- [ ] **Step 2.3: Implement `LazyDiffFile`**

Create `src/components/LazyDiffFile.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type LazyDiffFileProps = {
  estimatedHeight: number;
  forceMount?: boolean;
  rootMargin?: string;
  children: ReactNode;
};

export function LazyDiffFile({
  estimatedHeight,
  forceMount = false,
  rootMargin = "150% 0px",
  children,
}: LazyDiffFileProps) {
  const supportsIO =
    typeof IntersectionObserver !== "undefined";
  const [mounted, setMounted] = useState(forceMount || !supportsIO);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceMount && !mounted) setMounted(true);
  }, [forceMount, mounted]);

  useEffect(() => {
    if (mounted) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  const style: CSSProperties = {
    contentVisibility: "auto",
    containIntrinsicSize: `auto ${estimatedHeight}px`,
  };

  return (
    <div ref={ref} style={style} data-lazy-diff-state={mounted ? "mounted" : "pending"}>
      {mounted ? children : null}
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `pnpm test:run src/components/LazyDiffFile.test.tsx`
Expected: PASS — all 6 tests pass.

- [ ] **Step 2.5: Run the full test suite to ensure nothing else broke**

Run: `pnpm test:run`
Expected: PASS — entire suite green.

- [ ] **Step 2.6: Commit**

```bash
git add src/components/LazyDiffFile.tsx src/components/LazyDiffFile.test.tsx
git commit -m "feat(diff): add LazyDiffFile wrapper for IntersectionObserver-gated mounting"
```

---

## Task 3: Extract `DiffFileBody` (pure refactor — no behavior change)

This task pulls the existing `<Diff>` JSX block out of `App.tsx`'s `renderFile` (currently lines ~1911–2111) into its own component. After this task, `App.tsx` still mounts every file eagerly — only the structure changes. Lazy mounting is wired in Task 4.

**Files:**
- Create: `src/components/DiffFileBody.tsx`
- Modify: `src/App.tsx` (replace `<Diff>...</Diff>` block in `renderFile` with `<DiffFileBody {...props}/>`)

- [ ] **Step 3.1: Inventory the prop surface**

Open `src/App.tsx` and read `renderFile` from the `<Diff>` opening (`<Diff viewType={viewType}` near line 1911) through its closing (`</Diff>` near line 2111). The component being extracted needs every closure variable referenced inside that block. Expected props:

```ts
type DiffFileBodyProps = {
  file: any;
  fileName: string;
  fileHunks: any[];
  language: string;
  oldSource: string | undefined;
  viewType: "split" | "unified";
  fileWidgets: Record<string, ReactNode>;
  highlightedChangeKeys: string[];
  estimatedTotalLines: number; // from sourceCache.current[fileName]?.length fallback logic
  // Callbacks:
  onExpandRange: (filePath: string, originalHunks: any[], start: number, end: number) => void;
  onLineClick: (file: string, line: number, side: "old" | "new") => void;
  onShiftClickRange: (file: string, startLine: number, endLine: number, side: "old" | "new") => void;
  onSelectingRangeChange: (range: { file: string; startLine: number; side: "old" | "new" } | null) => void;
  onSelectedRangeChange: (range: { file: string; startLine: number; endLine: number; side: "old" | "new" } | null) => void;
  onHoverLineChange: (line: { file: string; line: number; side: "old" | "new" } | null) => void;
  // Refs/state for click suppression and selection:
  selectingRange: { file: string; startLine: number; side: "old" | "new" } | null;
  lastFocusedLine: { file: string; line: number; side: "old" | "new" } | null;
  suppressNextClickRef: MutableRefObject<boolean>;
};
```

(If extraction reveals more closure variables than this, add them as props. Do not make `DiffFileBody` reach into App via context.)

- [ ] **Step 3.2: Create `DiffFileBody` with the extracted JSX**

Create `src/components/DiffFileBody.tsx`:

```tsx
import { useMemo } from "react";
import type { MutableRefObject, ReactNode } from "react";
import {
  Diff,
  Decoration,
  Hunk,
  getCollapsedLinesCountBetween,
} from "react-diff-view";
import { highlight } from "../highlight";
import { HunkExpandControl } from "./HunkExpandControl";

type Side = "old" | "new";

type DiffFileBodyProps = {
  file: any;
  fileName: string;
  fileHunks: any[];
  language: string;
  oldSource: string | undefined;
  viewType: "split" | "unified";
  fileWidgets: Record<string, ReactNode>;
  highlightedChangeKeys: string[];
  estimatedTotalLines: number;
  onExpandRange: (filePath: string, originalHunks: any[], start: number, end: number) => void;
  onLineClick: (file: string, line: number, side: Side) => void;
  onShiftClickRange: (file: string, startLine: number, endLine: number, side: Side) => void;
  onSelectingRangeChange: (range: { file: string; startLine: number; side: Side } | null) => void;
  onSelectedRangeChange: (range: { file: string; startLine: number; endLine: number; side: Side } | null) => void;
  onHoverLineChange: (line: { file: string; line: number; side: Side } | null) => void;
  selectingRange: { file: string; startLine: number; side: Side } | null;
  lastFocusedLine: { file: string; line: number; side: Side } | null;
  suppressNextClickRef: MutableRefObject<boolean>;
};

function getChangeSide(change: any): Side {
  if (change.isNormal) return "new";
  return change.type === "insert" ? "new" : "old";
}

function getChangeLineNumber(change: any, side: Side): number | undefined {
  return side === "new" ? change.newLineNumber : change.oldLineNumber;
}

export function DiffFileBody({
  file,
  fileName,
  fileHunks,
  language,
  oldSource,
  viewType,
  fileWidgets,
  highlightedChangeKeys,
  estimatedTotalLines,
  onExpandRange,
  onLineClick,
  onShiftClickRange,
  onSelectingRangeChange,
  onSelectedRangeChange,
  onHoverLineChange,
  selectingRange,
  lastFocusedLine,
  suppressNextClickRef,
}: DiffFileBodyProps) {
  const tokens = useMemo(
    () => highlight(fileHunks, { language, oldSource }),
    [fileHunks, language, oldSource]
  );

  // The full <Diff>...</Diff> block from App.tsx's renderFile is moved here verbatim,
  // with every closure reference replaced by the matching prop. The render-gutter
  // "add comment" button (which currently only sets selecting/selected range state)
  // is preserved.
  return (
    <Diff
      viewType={viewType}
      diffType={file.type}
      hunks={fileHunks}
      tokens={tokens}
      widgets={fileWidgets}
      selectedChanges={highlightedChangeKeys}
      renderGutter={({ change, side, inHoverState, renderDefault }: any) => {
        if (!change) return renderDefault();
        const changeSide = getChangeSide(change);
        const lineNumber = getChangeLineNumber(change, changeSide);
        const showButton = inHoverState && side === changeSide && lineNumber;
        return (
          <span className="relative inline-flex items-center w-full">
            {showButton && (
              <span
                className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-accent-review hover:opacity-90 cursor-pointer text-accent-review-text opacity-80 hover:opacity-100 transition-all"
                title="Add comment"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (lineNumber) {
                    onSelectingRangeChange({ file: fileName, startLine: lineNumber, side: changeSide });
                    onSelectedRangeChange({
                      file: fileName,
                      startLine: lineNumber,
                      endLine: lineNumber,
                      side: changeSide,
                    });
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M10 2c-4.418 0-8 2.91-8 6.5S5.582 15 10 15c.382 0 .757-.022 1.124-.063l3.33 2.152a.5.5 0 00.771-.42v-2.97C17.09 12.266 18 10.48 18 8.5 18 4.91 14.418 2 10 2z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            <span className="flex-1 text-right">{renderDefault()}</span>
          </span>
        );
      }}
      gutterEvents={{
        onClick: (event: any) => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          const { change } = event;
          if (!change) return;
          const side = getChangeSide(change);
          const lineNumber = getChangeLineNumber(change, side);
          if (!lineNumber) return;
          if (
            event.nativeEvent.shiftKey &&
            lastFocusedLine &&
            lastFocusedLine.file === fileName &&
            lastFocusedLine.side === side
          ) {
            const startLine = Math.min(lastFocusedLine.line, lineNumber);
            const endLine = Math.max(lastFocusedLine.line, lineNumber);
            onShiftClickRange(fileName, startLine, endLine, side);
          } else {
            onLineClick(fileName, lineNumber, side);
          }
        },
        onMouseDown: (event: any) => {
          const { change } = event;
          if (!change) return;
          const side = getChangeSide(change);
          const lineNumber = getChangeLineNumber(change, side);
          if (!lineNumber) return;
          onSelectingRangeChange({ file: fileName, startLine: lineNumber, side });
          onSelectedRangeChange({
            file: fileName,
            startLine: lineNumber,
            endLine: lineNumber,
            side,
          });
        },
        onMouseEnter: (event: any) => {
          const { change } = event;
          if (!change) return;
          const side = getChangeSide(change);
          const lineNumber = getChangeLineNumber(change, side);
          if (!lineNumber) return;
          onHoverLineChange({ file: fileName, line: lineNumber, side });
          if (selectingRange && selectingRange.file === fileName && selectingRange.side === side) {
            const startLine = Math.min(selectingRange.startLine, lineNumber);
            const endLine = Math.max(selectingRange.startLine, lineNumber);
            onSelectedRangeChange({ file: fileName, startLine, endLine, side });
          }
        },
      }}
    >
      {(hunks: any[]) => {
        const elements: React.ReactElement[] = [];
        const lastHunk = hunks[hunks.length - 1];

        if (
          hunks.length > 0 &&
          (hunks[0].oldStart > 1 || (hunks[0].oldStart === 0 && hunks[0].newStart > 1))
        ) {
          elements.push(
            <Decoration key="expand-top">
              <HunkExpandControl
                previousHunk={null}
                nextHunk={hunks[0]}
                totalLines={estimatedTotalLines}
                onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
              />
            </Decoration>
          );
        }

        hunks.forEach((hunk, i) => {
          if (i > 0) {
            const collapsed = getCollapsedLinesCountBetween(hunks[i - 1], hunk);
            if (collapsed > 0) {
              elements.push(
                <Decoration key={`expand-${i}`}>
                  <HunkExpandControl
                    previousHunk={hunks[i - 1]}
                    nextHunk={hunk}
                    totalLines={estimatedTotalLines}
                    onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
                  />
                </Decoration>
              );
            }
          }
          elements.push(<Hunk key={hunk.content} hunk={hunk} />);
        });

        if (hunks.length > 0 && estimatedTotalLines > 0) {
          const lastHunkEnd =
            lastHunk.oldLines === 0 && lastHunk.oldStart === 0
              ? lastHunk.newStart + lastHunk.newLines - 1
              : lastHunk.oldStart + lastHunk.oldLines - 1;
          if (lastHunkEnd < estimatedTotalLines) {
            elements.push(
              <Decoration key="expand-bottom">
                <HunkExpandControl
                  previousHunk={lastHunk}
                  nextHunk={null}
                  totalLines={estimatedTotalLines}
                  onExpand={(start, end) => onExpandRange(fileName, file.hunks, start, end)}
                />
              </Decoration>
            );
          }
        }

        return elements;
      }}
    </Diff>
  );
}
```

- [ ] **Step 3.3: Modify `App.tsx`'s `renderFile` to call `DiffFileBody`**

In `src/App.tsx`:

1. Add the import near the other component imports (next to `FileViewer`):

   ```tsx
   import { DiffFileBody } from "./components/DiffFileBody";
   ```

2. Remove the inline `const tokens = highlight(...)` line (~1767) — `DiffFileBody` owns it now.

3. Replace the entire `<Diff viewType={viewType} ... </Diff>` block (~lines 1911–2111) with a single `<DiffFileBody>` call. The branch wiring (markdown preview vs. diff vs. null) stays as-is; only the `<Diff>` arm changes:

   ```tsx
   ) : !isViewed ? (
     <DiffFileBody
       file={file}
       fileName={fileName}
       fileHunks={fileHunks}
       language={detectLanguage(fileName)}
       oldSource={oldSource}
       viewType={viewType}
       fileWidgets={fileWidgets}
       highlightedChangeKeys={highlightedChangeKeys}
       estimatedTotalLines={(() => {
         const cachedSource = sourceCache.current[fileName];
         const lastHunk = fileHunks[fileHunks.length - 1];
         return cachedSource?.length
           ?? (lastHunk
             ? (lastHunk.oldLines === 0 && lastHunk.oldStart === 0)
               ? lastHunk.newStart + lastHunk.newLines - 1
               : lastHunk.oldStart + lastHunk.oldLines + 20
             : 0);
       })()}
       onExpandRange={handleExpandRange}
       onLineClick={handleLineClick}
       onShiftClickRange={(file, startLine, endLine, side) =>
         setAddingCommentAt({ file, startLine, endLine, side })
       }
       onSelectingRangeChange={setSelectingRange}
       onSelectedRangeChange={setSelectedRange}
       onHoverLineChange={setHoveredLine}
       selectingRange={selectingRange}
       lastFocusedLine={lastFocusedLine}
       suppressNextClickRef={suppressNextClickRef}
     />
   ) : null}
   ```

   (The `estimatedTotalLines` IIFE preserves the exact fallback logic the inline version used. If you can refactor it into a small `computeEstimatedTotalLines(fileHunks, sourceCache.current[fileName])` helper inside `App.tsx`, that's cleaner — optional.)

- [ ] **Step 3.4: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS — every existing test still passes. This is a pure refactor; no behavior should change.

- [ ] **Step 3.5: Type-check and build**

Run: `pnpm build`
Expected: PASS — TypeScript clean, Vite bundles.

- [ ] **Step 3.6: Manually verify in dev**

Run: `pnpm electron:dev`
Verify: open a small diff. Files render normally. Line click, gutter hover, comment add, hunk expand all work as before.

- [ ] **Step 3.7: Commit**

```bash
git add src/components/DiffFileBody.tsx src/App.tsx
git commit -m "refactor(diff): extract DiffFileBody from renderFile with memoized tokens"
```

---

## Task 4: Wrap `DiffFileBody` in `LazyDiffFile`

This task introduces the actual lazy mounting.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 4.1: Add the import**

In `src/App.tsx`, alongside the other component imports:

```tsx
import { LazyDiffFile } from "./components/LazyDiffFile";
import { estimateFileHeight } from "./lib/diffMetrics";
```

- [ ] **Step 4.2: Wrap `<DiffFileBody>` in `<LazyDiffFile>`**

In the same JSX branch you edited in Task 3:

```tsx
) : !isViewed ? (
  <LazyDiffFile estimatedHeight={estimateFileHeight({ hunks: fileHunks })}>
    <DiffFileBody
      // ...same props as before
    />
  </LazyDiffFile>
) : null}
```

Do **not** add `forceMount` yet — Task 5 wires that.

- [ ] **Step 4.3: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS. Tests run in jsdom where `IntersectionObserver` is undefined; `LazyDiffFile`'s shim mounts immediately. No existing test should regress.

- [ ] **Step 4.4: Manually verify lazy mounting in dev**

Run: `pnpm electron:dev`. Open the largest diff you can find. Open the browser/Electron devtools, inspect the diff container, and confirm:

- Files outside the viewport have a wrapper with `data-lazy-diff-state="pending"` and an empty body sized via `contain-intrinsic-size`.
- Scrolling into a file flips the attribute to `data-lazy-diff-state="mounted"` and the file's `<Diff>` content appears.
- Initial paint is faster than before (subjective; just confirm it's not slower).

- [ ] **Step 4.5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(diff): lazy-mount file diffs via IntersectionObserver"
```

---

## Task 5: `forceMountedPaths` state + force-mount on scroll-to-file

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 5.1: Add `forceMountedPaths` state**

In `src/App.tsx`, near the other diff-related state declarations:

```tsx
const [forceMountedPaths, setForceMountedPaths] = useState<Set<string>>(() => new Set());

const forceMountPath = useCallback((path: string) => {
  setForceMountedPaths((current) => {
    if (current.has(path)) return current;
    const next = new Set(current);
    next.add(path);
    return next;
  });
}, []);
```

(Make sure `useState` and `useCallback` are imported.)

- [ ] **Step 5.2: Reset `forceMountedPaths` whenever the diff changes**

Find the spots that already reset transient diff state (e.g., the `setExpandedHunksMap({})` calls around lines ~715, ~767 in `App.tsx`) and add `setForceMountedPaths(new Set())` next to each.

- [ ] **Step 5.3: Pass `forceMount` into `LazyDiffFile`**

In `renderFile`:

```tsx
<LazyDiffFile
  estimatedHeight={estimateFileHeight({ hunks: fileHunks })}
  forceMount={forceMountedPaths.has(fileName)}
>
  <DiffFileBody ... />
</LazyDiffFile>
```

- [ ] **Step 5.4: Update `scrollToDiffFile` to force-mount before scrolling**

Current `scrollToDiffFile` (~line 1083 in `App.tsx`) calls `scrollIntoView` directly. Replace its body with:

```tsx
const scrollToDiffFile = (filePath: string) => {
  setActiveDiffFile(filePath);
  suppressVisibleDiffFileRef.current = true;
  forceMountPath(filePath);

  // Wait for React to commit the force-mount and layout to settle, then scroll.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const escapedFile = CSS.escape(filePath);
      const fileEl = document.querySelector(`[data-diff-file="${escapedFile}"]`);
      fileEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Restore suppressVisibleDiffFileRef after the scroll settles. Use the existing
      // pattern (whatever the original code did) — likely a setTimeout.
      setTimeout(() => {
        suppressVisibleDiffFileRef.current = false;
      }, 800);
    });
  });
};
```

(Keep the original suppress-ref restore mechanism — read the lines around the original implementation before rewriting; do not lose any behavior.)

- [ ] **Step 5.5: Run tests**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 5.6: Manually verify scroll-to-file**

Run: `pnpm electron:dev`. Open a large diff. Click a far-away file in the right rail. Verify:

- The file mounts before the scroll completes.
- The scroll lands on the file's sticky header (no overshoot/undershoot from estimate drift).
- Active-file highlighting in the rail updates correctly.

- [ ] **Step 5.7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(diff): force-mount target file before scrollToDiffFile"
```

---

## Task 6: Force-mount on `goToComment`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 6.1: Locate the comment-scroll path**

Find `goToComment` (or its inline equivalent) — search `App.tsx` for the block that uses `findChangeKey` (around line 1102+) and `scrollIntoView({ block: "center" })` (around line 1167).

- [ ] **Step 6.2: Force-mount before the inner DOM lookup**

At the start of `goToComment` (after determining `comment.file` is in the diff), call `forceMountPath(comment.file)` and wrap the existing `findChangeKey` + `scrollIntoView` logic in a double `requestAnimationFrame`:

```tsx
const goToComment = async (comment: Comment) => {
  // ...existing pre-scroll logic that determines we're staying in the diff...
  forceMountPath(comment.file);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  // ...existing findChangeKey + scrollIntoView logic, unchanged...
};
```

If `goToComment` is currently synchronous, convert it to `async` and update its callers (look at `onGoToComment={(comment) => void goToComment(comment)}` near line 2304 — that pattern already absorbs async).

- [ ] **Step 6.3: Run tests**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 6.4: Manually verify scroll-to-comment**

Run: `pnpm electron:dev`. On a large diff with a comment in a far file, open the comment overview and click a comment. Verify the diff scrolls and the comment widget is centered.

- [ ] **Step 6.5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(diff): force-mount target file before goToComment"
```

---

## Task 7: Force-mount-all on search open

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 7.1: Compute `forceMountAll` from search state**

In `src/App.tsx`, add a memoized union of `forceMountedPaths` ∪ (all paths when search is open):

```tsx
const effectiveForceMounted = useMemo(() => {
  if (!search.isOpen) return forceMountedPaths;
  return new Set(filePaths); // filePaths already exists (line ~322); it's all renderable files
}, [search.isOpen, forceMountedPaths, filePaths]);
```

(Verify the variable `filePaths` exists — it's the memo around line 322 that produces all renderable file paths. If it's named differently in your branch, adjust accordingly.)

- [ ] **Step 7.2: Use `effectiveForceMounted` for the `forceMount` prop**

```tsx
<LazyDiffFile
  estimatedHeight={estimateFileHeight({ hunks: fileHunks })}
  forceMount={effectiveForceMounted.has(fileName)}
>
```

- [ ] **Step 7.3: Run tests**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 7.4: Manually verify search-open behavior**

Run: `pnpm electron:dev`. Open a large diff (some files unmounted). Press Cmd-F, type a query that should match content in unmounted files. Verify:

- Search match count includes matches across the entire diff (because all files mount when search opens).
- Cmd-G / "next match" navigates into previously-unmounted files.
- Closing search (Esc) does **not** unmount files — once mounted, they stay mounted (this is per the design's one-way-mount rule).

- [ ] **Step 7.5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(diff): force-mount all files while search is open"
```

---

## Task 8: End-to-end manual verification

No code changes. The goal is to confirm the perf fix actually fixes the original symptom and no regressions slipped in.

- [ ] **Step 8.1: Pick a benchmark diff**

Use a real large diff in this repo. Suggested: the Electron migration commit `4a6147a` (`pnpm electron:dev`, then in the app load the commit via the commit selector). Or any monorepo dependency bump that touches many files.

- [ ] **Step 8.2: Compare behavior against `main`**

Open the same diff on `main` (current behavior) and on this branch. Note:

- Time to first paint after clicking the diff (subjective, but should be visibly faster on this branch).
- Scroll fast through the entire diff. On `main`: blank rectangles. On this branch: should be substantially reduced.
- Cmd-F find next that jumps into a far-away file: works on both.
- Click a file in the right rail to jump there: works on both, lands accurately.
- Click a comment in the comment overview: works on both.
- Add a comment, edit a comment, expand a hunk, toggle "Viewed": all work as before.
- Switch diff modes (unstaged → commit → branch): no stale `forceMountedPaths` causing extra files to render.

- [ ] **Step 8.3: Run the full test suite one more time**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 8.4: Run the production build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 8.5: Final commit (only if Step 8.1–8.4 surface anything to fix)**

If verification reveals issues, fix them and commit. Otherwise no commit needed — this task is verification-only.

---

## Self-Review Notes (post-write)

- **Spec coverage:** every section of the spec maps to a task — `diffMetrics` (Task 1), `LazyDiffFile` (Task 2), per-file extraction with memoized tokens (Task 3), wiring (Task 4), `forceMountedPaths` + scroll-to-file (Task 5), `goToComment` (Task 6), search-open force-mount-all (Task 7), manual verification (Task 8). The "incidental fixes" in spec §4 (token memoization, jsdom shim) live in Tasks 3 and 2 respectively.
- **Type consistency:** `forceMountPath`, `forceMountedPaths`, `effectiveForceMounted` referenced consistently across Tasks 5–7. `DiffFileBody` props match between definition (Task 3.2) and call site (Task 3.3).
- **Placeholders:** none. Where `App.tsx` line numbers might drift (e.g., line 1083), the plan tells the engineer how to find the right block by symbol/string rather than relying on the exact number.
