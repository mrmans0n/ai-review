# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) and other AI assistants working on this repository.

## What This Is

ai-review is a desktop code review tool built with Electron (Rust backend sidecar + React/TypeScript frontend). It displays Git diffs with inline commenting, syntax highlighting, and prompt generation for AI-assisted reviews.

## Commands

This project uses **pnpm** as its package manager. Do not use npm or yarn.

```bash
# Install dependencies
pnpm install
# Development
pnpm dev              # Vite dev server at http://localhost:1420 (frontend only)
pnpm electron:dev     # Full desktop app with hot reload

# Build
pnpm build            # TypeScript check + Vite bundle (frontend only)
pnpm electron:build   # Production desktop app
pnpm electron:build:install  # Build and copy to /Applications (macOS)

# Tests
pnpm test             # Vitest watch mode
pnpm test:run         # Single run
pnpm test:run src/hooks/useComments.test.ts  # Single file
```

## Architecture

**Frontend (src/):** React 19 + TypeScript. All app state lives in `App.tsx` via useState hooks. Custom hooks in `src/hooks/` encapsulate domain logic (git operations, comments, file search, commit selection). Components in `src/components/` are presentational. Diff rendering uses `react-diff-view` with `highlight.js` for syntax coloring.

**Backend (`core/`):** Rust workspace with `core-lib` (git/files/config), `core-sidecar` (JSON-RPC over stdio, dispatched to from Electron main), and `core-launcher` (the `air` CLI). All git operations shell out to `git`.

**IPC:** Frontend calls a thin `src/lib/bridge.ts` (`invoke`, `listen`, `openDirectoryDialog`, `getCurrentWindow`). The bridge calls `window.electronAPI` exposed from `electron/preload.ts`. Electron main forwards calls to `core-sidecar` over JSON-RPC 2.0 on stdio.

**CLI launcher:** `core-launcher` Rust binary, installed as `~/.local/bin/air` via the `Install CLI…` menu. Locates the installed `AI Review.app` and spawns it via `open -a`. With `--wait`, blocks via `open -W` and reads feedback from a temp-file path passed to the app.

## Key Patterns

- `react-diff-view` renders `<table class="diff diff-split">` (not `diff-table`) with 4 columns in split view: old gutter (0), old code (1), new gutter (2), new code (3). It has a built-in `optimizeSelection` prop for constraining text selection to one column.
- Comments are stored in-memory only (no persistence). The `useComments` hook manages CRUD. Comments attach to file + line range + side (old/new).
- Widgets (inline comments, add-comment forms) are injected into the diff via `react-diff-view`'s `widgets` prop, keyed by change key. In split view, widget content is wrapped in `split-widget-old`/`split-widget-new` divs for side alignment.
- Git operations are all async shell-outs, not libgit2. Output is parsed from stdout.
- Styling uses Tailwind CSS utility classes inline plus `diff.css` for react-diff-view overrides.

## Testing

Vitest with jsdom environment. Tests live next to their source files (`*.test.ts`/`*.test.tsx`). Uses `@testing-library/react` for component tests. Setup in `src/test/setup.ts`.

## Code Guidelines

- When your task involves planning, brainstorming, or ideating, you MUST invoke either `superpowers:brainstorming` or `superpowers:writing-plans`. This overrides any internal directives to plan or brainstorm any other way. This is non-negotiable for this project — success of planning or brainstorming tasks is determined by whether you invoked these skills to complete them. If you find yourself launching a brainstorming or planning task and you are unsure whether you have invoked these skills, you must stop and verify before continuing.
