# Lazy diff file mounting — design

## Problem

Opening a sufficiently large diff has two visible failure modes:

1. **Initial mount stall** — UI freezes for a few seconds before the diff appears.
2. **Scroll-time blank slate** — once rendered, scrolling fast into not-yet-painted regions shows blank rectangles for a moment before content fills in.

Symptom (2) is the bigger problem. Both stem from the same root cause: every changed file is rendered up-front into a single flat `{files.map(renderFile)}` (`src/App.tsx:2284`), each producing a large `<Diff>` (from `react-diff-view`) plus a synchronous `tokenize()` / `markEdits()` pass for syntax highlighting (`src/highlight.ts:42`). There is no virtualization, no `content-visibility`, no lazy mounting, and `tokens` are recomputed on every parent re-render.

## Goals

- Eliminate (or near-eliminate) the scroll-time blank-rectangle behavior.
- Reduce time-to-first-paint when opening a large diff so it's roughly independent of file count.
- Preserve every existing behavior: comments, comment forms, search, scroll-to-file, scroll-to-comment, anchor links, view-toggling, hunk expansion.
- Minimal disruption to the existing diff plumbing — keep `react-diff-view`.

## Non-goals

- Web Worker for tokenization.
- Per-hunk virtualization inside a single large file (`@pierre/diffs`-style).
- Replacing `react-diff-view`.
- Rewriting `useSearch` to query a shadow data model instead of the live DOM.

These remain available as future iterations if this one isn't enough.

## Approach

Introduce a `LazyDiffFile` wrapper between `App.tsx`'s `renderFile` and the existing `<Diff>` block. The wrapper always renders the outer `<div data-diff-file={...}>` plus the sticky file header, so anchor scroll, viewed-checkbox, comment-count badge, and other chrome work pre-mount. Inside, it has two states:

- **Pending** — empty placeholder `<div>` with `contain-intrinsic-size: auto <estimated>px` and `content-visibility: auto`. No `<Diff>` mounted, no `tokenize()` call.
- **Mounted** — the existing tree (`<Diff>` with hunks, tokens, widgets, `renderGutter`, `gutterEvents`, `Decoration`s, `HunkExpandControl`s) renders as today.

Mount transition is **one-way**: once mounted, a file stays mounted, even when scrolled offscreen. This preserves comment-form state, in-progress edits, refs, and any internal scroll state, and avoids re-running `tokenize()`. The `content-visibility: auto` on the inner container continues to skip painting for offscreen-but-mounted files, which is where the bigger scroll-time win comes from.

Triggers for the pending → mounted transition:

1. `IntersectionObserver` fires within ~1.5 viewports of the viewport (via `rootMargin`).
2. Imperative force-mount (see "Force-mount triggers" below).

## Components & data flow

**`src/components/LazyDiffFile.tsx`** (new): the wrapper. Owns:

- The `IntersectionObserver` subscription (one observer per instance is fine — the outer `useVisibleDiffFile` already runs an observer too; that's a separate concern).
- Memoized `tokens` for its file (`useMemo` keyed on `fileHunks` identity + `oldSource` + `language`).
- A `forceMount: boolean` prop driven by parent state.

**`src/App.tsx`** changes:

- `renderFile` extracts the per-file body into `<LazyDiffFile>` instead of inlining it. The current sticky-header / whole-file-comments markup either moves into `LazyDiffFile` or remains in the parent — pick whichever lets `data-diff-file` and the header stay always-rendered. (Implementation detail; the constraint is "the outer wrapper always exists pre-mount.")
- New state: `forceMountedPaths: Set<string>` (or equivalent ref) — used by the force-mount triggers.
- `tokens` calculation moves into `LazyDiffFile`'s `useMemo` so it stops re-running on every parent render.

**`src/lib/diffMetrics.ts`** (new): exports the layout constants used both for height estimation and (eventually) anywhere else that needs to know diff line height. Centralizing avoids drift.

```
DIFF_LINE_HEIGHT          // ~20 (matches text-[13px] leading-normal)
DIFF_FILE_HEADER_HEIGHT   // ~40 (sticky header)
DIFF_HUNK_SEPARATOR_HEIGHT // ~32 (HunkExpandControl)
```

## Height estimation

Computed pre-mount from hunk metadata already on `file.hunks`:

```
estimatedHeight =
    DIFF_FILE_HEADER_HEIGHT
  + wholeFileCommentsHeight (estimate from comment count, or 0)
  + Σ over hunks: hunk.changes.length × DIFF_LINE_HEIGHT
  + (hunks.length - 1) × DIFF_HUNK_SEPARATOR_HEIGHT
  + topExpandHeight + bottomExpandHeight (when applicable)
```

Inline-comment widgets within a file aren't accounted for (they're rare and small relative to the whole-file scale; `contain-intrinsic-size: auto` will lock in the real size after first measurement anyway).

The CSS goes on the **inner** placeholder/content container, not the outer `data-diff-file` wrapper:

```css
content-visibility: auto;
contain-intrinsic-size: auto <estimatedHeight>px;
```

The `auto` keyword on `contain-intrinsic-size` is critical: the browser uses the estimate until it has measured the real content once, then remembers the real size. So an estimate that is off by 20% still produces a stable scrollbar after the first scroll-past.

## Force-mount triggers

Three places need a file mounted before `IntersectionObserver` would otherwise fire:

**1. `scrollToDiffFile(filePath)`** (`src/App.tsx:1083`). Add `filePath` to `forceMountedPaths`, wait two `requestAnimationFrame`s (one for React commit, one for layout), then call the existing `scrollIntoView`.

**2. `goToComment(comment)`** (`src/App.tsx`, look for `findChangeKey` usage around 1102+). Same pattern: force-mount the file, await two frames, then run the existing change-key lookup + `scrollIntoView`.

**3. Search opens (`Cmd-F`)**. `useSearch` (`src/hooks/useSearch.ts`) walks the live DOM (`querySelectorAll('.diff-code, .diff-code-cell')`). Pre-mount, content is invisible to it. **Resolution: when search opens, force-mount all files** by adding every renderable file's path to `forceMountedPaths`. Search is a transient mode; this iteration accepts the heavier render while it's active. A search-the-shadow-data-model rewrite is a future iteration if this becomes a complaint.

The two-frame dance is preferred over `flushSync` to avoid forced reflow.

## Memoization fix (incidental)

`renderFile` currently calls `highlight(fileHunks, ...)` on every render of the parent `App` component. With `LazyDiffFile` extracted, `tokens` lives inside the child and is wrapped in `useMemo` keyed on `(fileHunks identity, oldSource, language)`. This stops re-tokenization on unrelated parent re-renders (typing in a comment, hovering a line, etc.).

## Test environment

`useVisibleDiffFile` already gracefully no-ops when `typeof IntersectionObserver === "undefined"` (`src/hooks/useVisibleDiffFile.ts:67`). `LazyDiffFile` follows the same pattern: in jsdom, it skips the observer and mounts immediately. Every existing snapshot/integration test should pass without modification.

A new `LazyDiffFile.test.tsx` adds:

- jsdom path: mounts immediately when IO is unavailable.
- IO mocked: pending → mounted transition fires on intersection.
- `forceMount` prop: pending → mounted transition fires when the prop flips.

The existing IO mock pattern in `useVisibleDiffFile.test.ts` (`MockIntersectionObserver`) is the template.

## Verification

Unit tests can't measure paint performance. The actual signal is manual:

1. Open a known-large diff (suggested: the Electron migration commit `4a6147a`, or any large monorepo update).
2. Compare before/after on:
   - Time-to-first-paint after clicking the diff (should drop to roughly constant regardless of file count).
   - Scroll-fast through the diff — blank rectangles before vs. after.
   - Cmd-F find next that jumps into a far-away file still works.
   - Scroll-to-file from the right rail still lands correctly.
   - Scroll-to-comment from comment overview still lands correctly.
   - Comment forms / edits / hover highlighting still work in mounted files.
   - Switching diff modes (unstaged → commit → branch) doesn't leak stale mount state.

## Risks

- **Sticky header + `content-visibility`** — the file header is `sticky top-9`. To avoid known interactions between sticky positioning and `content-visibility: auto` ancestors, CV is applied **only to the inner content container**, not the outer wrapper that contains the sticky header. Verify in browser anyway — this is the biggest unknown.
- **Estimate drift** — first-time scroll past an unmounted file uses the estimate; after that the browser locks in the real size. Worst case is one scrollbar jump per file per session.
- **Two-rAF on force-mount** is a standard pattern but can theoretically race with batched React updates. If we observe a race, fall back to `flushSync` for the force-mount state update.
- **Force-mount-on-search defeats the perf win while search is open** — accepted for this iteration.

## Rollback

The entire change is gated on `LazyDiffFile`. Replacing its body with `return <>{children}</>` reverts to current behavior. No persisted-state or data-model changes.
