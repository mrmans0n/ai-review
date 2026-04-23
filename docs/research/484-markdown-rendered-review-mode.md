---
task_id: 484
title: ai-review — rendered Markdown review mode with rich-text comments
date: 2026-04-23
project: ai-review
phase: closed (duplicate of #485)
implemented_by:
  - "PR #157 (commit 9ca811a)"
prior_art:
  - src/components/MarkdownPreview.tsx
  - src/hooks/useMarkdownRenderer.ts
  - src/lib/remarkSourceLines.ts
  - src/App.tsx
  - src/styles/markdown.css
---

## TL;DR

**Duplicate — already implemented by task #485.** PR #157 delivered the complete feature:

- **Source/Preview toggle** per `.md` file in split diff mode
- **Rendered rich-text** via remark/rehype pipeline (GFM, frontmatter, sanitized)
- **Click-to-comment on rendered blocks** with source-line anchoring
- **Bidirectional comments** — same `Comment` model, no schema changes
- **Source-to-rendered mapping** via custom `remarkSourceLines` remark plugin

No implementation work remains. Close #484 as duplicate of #485.

## What was built (by #485)

### Components

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| `MarkdownPreview` | `src/components/MarkdownPreview.tsx` | ~228 | Rendered view with interleaved comments, click-to-comment, keyboard a11y, orphaned-comment fallback |
| `useMarkdownRenderer` | `src/hooks/useMarkdownRenderer.ts` | ~46 | Memoized unified pipeline returning `{ content, sourceMap }` |
| `remarkSourceLines` | `src/lib/remarkSourceLines.ts` | ~57 | Custom remark plugin injecting `data-source-start/end` on block nodes |
| Toggle logic | `src/App.tsx` | — | Per-file toggle via `mdPreviewFiles: Set<string>`, guarded by markdown + split view |

### Pipeline

```
remark-parse → remarkSourceLines → remark-gfm → remark-frontmatter
  → remark-rehype → rehype-sanitize → rehype-react
```

### Design decisions

1. **Block-level granularity** — comments anchor to paragraphs/headings/code blocks, not inline spans. Sub-block anchoring deferred.
2. **New-side only** — rendered view shows the new version, not a rendered diff. Avoids DOM-level diffing complexity.
3. **Split view only** — toggle hidden in unified mode (ambiguous which version to render).
4. **No Comment model changes** — existing `file`/`startLine`/`endLine`/`side` fields work for both modes.
5. **XSS protection** — `rehype-sanitize` with default schema, allowlisting only `data-source-start` and `data-source-end`.

## Enhancement candidates (separate tasks)

| # | Enhancement | Effort | Value |
|---|-------------|--------|-------|
| 1 | Syntax highlighting in rendered code blocks | Low | High |
| 2 | Repo-relative image rendering | Low-Med | High |
| 3 | Math/LaTeX rendering (`remark-math` + `rehype-katex`) | Low | Med |
| 4 | Unified view mode support | Med | Med |
| 5 | Mermaid/diagram rendering | Med | Med |
| 6 | Inline/sub-block comment anchoring | Med | Med |
| 7 | Rendered diff (old vs new) | High | High |
