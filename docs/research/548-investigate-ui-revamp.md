---
task_id: 548
title: Investigate ui revamp
date: 2026-04-26
project: ai-review
---

# Investigate UI Revamp

## Summary

Scout investigated how ai-review could adapt visual and workflow ideas from Rudu, a GitHub-oriented code review app, while preserving ai-review's local-first review model and current orange/peach accent identity. The strongest opportunity is not to copy Rudu's product surface wholesale, but to adopt its calmer workspace composition: neutral surfaces, denser controls, a persistent file/comment rail, and review navigation that keeps users oriented while moving through diffs.

The recommended direction is a staged UI/UX roadmap. Start with visual tokens and app chrome, then introduce a right-side review rail using existing data, then improve file-tree navigation and persistent comments. Diff rendering internals, GitHub PR tracking, and large-diff virtualization should stay out of the initial revamp unless later performance evidence justifies them.

## Evidence Reviewed

- Rudu repository and README screenshot: https://github.com/tanvesh01/rudu
- Local Rudu source snapshot cloned by Scout from `tanvesh01/rudu`, version `0.1.5`
- Local ai-review repository at `/Volumes/Ambrosio/repos/ai-review`
- Existing Scout research note: `docs/research/548-ui-revamp-rudu-inspiration.md`

## Current ai-review Baseline

ai-review is already a capable local desktop code review tool. It supports Git diff modes, file preview, LFS preview, inline comments, prompt generation, search, theme toggling, and a resizable changed-files sidebar. The frontend is a React/Tauri app, with most application state coordinated in `src/App.tsx`. Styling currently combines Tailwind v4 inline theme variables, Catppuccin/One Dark style tokens, and diff-specific CSS.

The current UI differs from Rudu in four important ways:

- The main layout is top-heavy, with a top app header, secondary toolbar, optional left changed-files sidebar, and central diff content.
- Changed files are grouped by directory but presented as a custom flat list rather than a collapsible tree.
- Comments are mostly inline in the diff, with an overview modal rather than a persistent review panel.
- The visual language is more saturated and theme-specific, while Rudu reads as a quieter neutral workspace with small controls and subtle separators.

The existing orange/peach accent, currently represented by tokens such as `--ctp-peach`, is worth preserving as ai-review's primary review/action accent.

## What To Adapt From Rudu

### Visual Direction

Rudu's strongest visual lesson is its full-height, focused workspace. It uses soft neutral surfaces, low-contrast dividers, compact controls, restrained radius, and a three-zone working layout. The app feels utilitarian rather than promotional, which fits ai-review's purpose.

High-fit adaptations for ai-review:

- Introduce neutral semantic tokens for canvas, surface, hover states, dividers, and text hierarchy.
- Keep orange/peach as the active review/action accent instead of adopting Rudu's palette exactly.
- Reduce top-header visual weight and consolidate toolbar controls where possible.
- Move toward icon-first controls with accessible labels/tooltips, replacing decorative or emoji-like affordances.
- Use thinner borders, quieter panel backgrounds, tighter spacing, and consistent surface treatment across sidebars, modals, and file headers.

Medium-fit adaptation:

- A scenic or image-backed empty state could be attractive when no repository or diff is selected, but it should not compete with active review work.

Low-fit adaptation:

- Rudu's GitHub PR tracking model should not be copied directly. ai-review is local-first and prompt-generation oriented, so the product structure should remain centered on local diffs, file previews, comments, and generated review prompts.

### Functional Direction

The most useful functional pattern from Rudu is a persistent review rail. For ai-review, this could become a right-side rail with changed files at the top and comments below. That would keep navigation and draft feedback visible throughout a review, reducing dependence on modal summaries.

Strong candidates:

- Right rail combining changed files and comments.
- Changed-files tree with directory expansion, file stats, status indicators, and active-file state.
- Scroll-sync from a file row to the corresponding diff section.
- Persistent comment cards with file path and line/range labels.
- Click-to-scroll behavior from comment cards back to the relevant diff location.
- File-level comments as first-class review artifacts, building on the whole-file comment behavior already used around LFS/file preview flows.

Candidates to defer:

- Replacing `react-diff-view` or the syntax highlighting stack.
- Virtualized diff rendering or background parsing without a measured large-diff performance problem.
- GitHub-specific PR navigation, `gh` CLI checks, repo avatars, or remote thread mutation.

## Proposed Roadmap

### Phase 1: Visual Foundation

Goal: make ai-review feel calmer and closer to Rudu without changing workflows.

Scope:

- Add neutral semantic design tokens alongside existing Catppuccin tokens.
- Alias the current orange/peach accent as the review accent.
- Reduce header and toolbar visual weight.
- Normalize panel, button, divider, and hover styles.
- Keep insert/delete diff colors readable and semantically clear.

Acceptance criteria:

- Existing behavior remains unchanged.
- Light and dark themes both pass visual smoke testing.
- Orange/peach remains the primary active/action accent.
- No backend or data-model changes are introduced.

Key risk: `App.tsx` currently contains many inline Tailwind classes, so visual changes can become noisy unless shared token and component patterns are introduced early.

### Phase 2: Workspace Layout And Right Rail

Goal: move toward Rudu's working composition while preserving ai-review's workflow.

Scope:

- Replace or complement the optional left changed-files sidebar with a right rail.
- Put changed files in the rail's top section and comments in a lower persistent section.
- Preserve resizable width and localStorage persistence.
- Keep repo/diff target controls on the left/top instead of adopting a GitHub PR selector.
- Make split/unified diff controls available but less visually dominant.

Acceptance criteria:

- Changed files remain easy to access.
- Comments can be seen without opening the overview modal.
- File preview remains reachable for images, markdown, LFS content, and full-file reads.
- Keyboard shortcuts continue to work.

Key risk: ai-review currently uses `selectedFile` for file preview selection. Scroll navigation needs a separate active/visible file concept to avoid conflating preview selection with diff position.

### Phase 3: Scroll-Synced File Navigation

Goal: make changed-file navigation behave more like a review map.

Scope:

- Clicking a changed file scrolls to that file's diff section by default.
- Preserve file preview as a secondary row action or contextual action.
- Track the currently viewed diff file as the user scrolls.

Acceptance criteria:

- File selection visibly follows the user's position in the diff.
- Clicking a file row navigates predictably to the corresponding diff.
- Preview workflows are not removed.

### Phase 4: Collapsible File Tree

Goal: replace the grouped flat file list with a more scalable tree.

Scope:

- Build a collapsible directory tree from `ChangedFile[]`.
- Flatten empty directory chains where useful.
- Show file status, additions/deletions, viewed state, and comment count.
- Normalize mixed status values such as `added`/`modified`/`deleted` and `A`/`M`/`D` before rendering.

Acceptance criteria:

- Deep paths are easier to scan than in the current grouped list.
- Active, selected, and viewed states are visually distinct.
- Expansion state persists during the session.
- Tests cover grouping, selection, and path normalization.

Open tradeoff: evaluate a small internal tree implementation first. A dependency such as `@pierre/trees` should only be considered after checking bundle size and compatibility.

### Phase 5: Persistent Review Panel

Goal: make comments visible as an ongoing review artifact instead of mainly a modal overview.

Scope:

- Add slim comment cards to the right rail.
- Group active comments first; resolved/inactive groups can wait until those states exist.
- Support edit/delete through existing handlers.
- Add click-to-scroll/focus behavior from cards to diff locations.
- Consider generalizing file-level comments beyond LFS and file preview contexts.

Acceptance criteria:

- Users can see all draft comments while reviewing.
- Comment cards navigate to the matching file and line/range.
- Prompt generation uses the same comment collection as today.
- Existing inline comment behavior remains intact.

Key risk: comments are currently in-memory only. A persistent panel may make comments feel durable, so the UI should avoid implying persistence until persistence exists.

### Phase 6: Optional Empty-State Treatment

Goal: borrow Rudu's visual warmth only where it helps.

Scope:

- Consider an image-backed or richer empty state when no repository or diff is active.
- Keep active review screens purely functional.

Acceptance criteria:

- Empty states feel polished without turning the app into a landing page.
- The treatment does not obscure core repo/diff selection actions.

### Phase 7: Large Diff Ergonomics

Goal: investigate performance-oriented ideas only after the UX structure is stable.

Scope:

- Benchmark current large-diff behavior before changing the renderer.
- Evaluate virtualization or background parsing only with a concrete repro case.
- Add progress/loading affordances if parsing or rendering blocks the UI.

Acceptance criteria:

- No regression in inline comments, range selection, hunk expansion, markdown preview, LFS previews, or syntax highlighting.
- Diff renderer changes are handled as a separate high-blast-radius task.

## Recommended First Implementation Slice

The best first slice is Phase 1 plus a constrained version of Phase 2:

- Introduce neutral workspace tokens and a clear orange review accent alias.
- Refresh header, toolbar, panel, and button styling.
- Add a right rail using the existing flat changed-file list.
- Add a simple persistent comments section powered by existing in-memory comment data.
- Avoid backend changes, diff renderer changes, and full file-tree work in the first pass.

This delivers the clearest Rudu-inspired improvement with the lowest implementation risk.

## Open Questions

- Should ai-review keep Catppuccin as a visible identity, or reserve it mainly for syntax/diff colors while the app shell moves to neutral tokens?
- Should changed-file click default to scroll-to-diff, with preview as a secondary action?
- Should the comments rail eventually replace the overview modal, or should both coexist for at least one release?
- Should file-level comments become a general feature across all file types and preview modes?
- Is a tree dependency acceptable, or should ai-review keep the file tree internal and purpose-built?

## Conclusion

Rudu is most valuable as inspiration for structure and restraint: a calmer neutral workspace, a persistent review rail, better file navigation, and always-visible review context. ai-review should adapt those ideas without adopting Rudu's GitHub-centered product model. The safest roadmap is incremental: refresh tokens and chrome first, introduce the right rail with existing data, then evolve navigation, file tree behavior, and comment ergonomics in focused follow-up tasks.
