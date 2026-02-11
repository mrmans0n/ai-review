# ai-diff — AI Code Review Tool

## Vision

A standalone desktop app for reviewing AI-generated code diffs. Think GitHub PR review UI but focused on the human→AI feedback loop.

## Tech Stack

- **Frontend**: React + TypeScript
- **Diff rendering**: [react-diff-view](https://github.com/nickel-xd/react-diff-view) — battle-tested split/unified diff component with inline decoration support
- **Desktop shell**: [Tauri v2](https://v2.tauri.app/) — lightweight native wrapper (Rust backend)
- **Styling**: Tailwind CSS (fast prototyping, diff UIs need precise styling)

## Core Features (MVP)

### 1. Diff Input
- Paste a unified diff (text)
- Open a `.patch` / `.diff` file
- Run `git diff` on a local repo (via Tauri/Rust backend)
- Future: connect to an AI agent's output directly

### 2. Diff Viewer
- Side-by-side (split) view — two-column like GitHub
- Unified view toggle
- Syntax highlighting (via highlight.js or Prism)
- Line numbers on both sides
- Collapsible unchanged sections (context folding)

### 3. Inline Comments (Gerrit-style)
- Click a line → add comment on that line
- Select a range of lines (click start → click end, or drag) → add comment on range
- Comments display inline between diff lines
- Each comment stores:
  - `file`: filename
  - `startLine` / `endLine`: line range (in the new file side)
  - `side`: "old" | "new" (which side of the diff)
  - `text`: the review comment
- Edit / delete comments
- Comment counter badge

### 4. Prompt Generation
- "Generate Prompt" button
- Collects all comments and generates a structured prompt:
  ```
  I've reviewed the following code changes. Please address these comments:

  ## File: src/Foo.kt

  ### Lines 15-23 (new):
  ```kotlin
  // the code snippet from those lines
  ```
  **Comment**: This should use a sealed class instead of an enum because...

  ## File: src/Bar.kt

  ### Line 42 (new):
  ```kotlin
  // the code snippet
  ```
  **Comment**: Missing null check here.
  ```
- Copy to clipboard
- Future: send directly to AI API

### 5. Session Management
- Save/load review sessions (diff + comments) as JSON
- Recent sessions list
- Auto-save drafts

## Architecture

```
ai-diff/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── git.rs       # git diff execution
│   │   │   ├── files.rs     # file open/save
│   │   │   └── mod.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                # React frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── DiffViewer.tsx       # Main diff display (react-diff-view)
│   │   ├── CommentOverlay.tsx   # Inline comment bubbles
│   │   ├── CommentForm.tsx      # Comment input form
│   │   ├── DiffInput.tsx        # Paste/file/git input panel
│   │   ├── PromptPreview.tsx    # Generated prompt preview
│   │   ├── SessionList.tsx      # Recent sessions sidebar
│   │   └── Toolbar.tsx          # Top bar with actions
│   ├── hooks/
│   │   ├── useDiff.ts           # Diff parsing & state
│   │   ├── useComments.ts       # Comments CRUD & line anchoring
│   │   └── useSession.ts        # Session persistence
│   ├── lib/
│   │   ├── diffParser.ts        # Parse unified diffs
│   │   ├── promptGenerator.ts   # Comments → AI prompt
│   │   └── types.ts             # TypeScript types
│   ├── styles/
│   │   └── diff.css             # Custom diff styling
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── PLAN.md
```

## Data Model

```typescript
interface ReviewSession {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  diff: string;            // Raw unified diff text
  comments: Comment[];
}

interface Comment {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  side: "old" | "new";
  text: string;
  createdAt: string;
}
```

## Milestones

### M1: Basic diff viewer
- [x] Project scaffold (Tauri + React + Vite)
- [x] Paste a diff → render split view with react-diff-view
- [x] Syntax highlighting
- [ ] **Git repo detection from CWD** (HIGH PRIORITY)
  - Detect git repo when launched from a directory (`ai-diff` from CLI)
  - Show diffs from that repo: unstaged, staged, HEAD~1, branch vs branch
  - CLI args: `ai-diff` (interactive), `ai-diff --staged`, `ai-diff --diff HEAD~1`
  - List changed files in sidebar
- [ ] Line numbers

### M2: Inline comments
- [ ] Click line → add comment
- [ ] Select line range → add comment
- [ ] Display comments inline
- [ ] Edit/delete comments

### M3: Prompt generation
- [ ] Collect comments → structured prompt
- [ ] Include code snippets from the diff
- [ ] Copy to clipboard
- [ ] Prompt preview panel

### M4: Session management
- [ ] Save/load sessions as JSON (via Tauri fs)
- [ ] Recent sessions list
- [ ] Auto-save

### M5: Git integration
- [ ] Open repo folder → list branches/commits
- [ ] Generate diff from git (branch vs branch, commit vs commit)
- [ ] Watch for changes

### Future
- [ ] Direct AI API integration (send prompt, receive new diff)
- [ ] Multi-file tabs
- [ ] Dark/light theme
- [ ] Keyboard shortcuts (j/k navigation, c to comment)
- [ ] Export review as markdown

## Dependencies

### Frontend (npm)
- `react` + `react-dom`
- `react-diff-view` + `unidiff` (diff parsing)
- `tailwindcss`
- `@tauri-apps/api` (Tauri IPC)
- `highlight.js` or `prism-react-renderer` (syntax highlight)
- `uuid` (comment IDs)

### Backend (Cargo)
- `tauri`
- `serde` + `serde_json`
- (git2 if we want native git — or just shell out to `git`)

## Notes

- Start with paste-a-diff flow, it's the simplest to get the core UX right
- react-diff-view supports "widgets" — React components rendered between diff lines, perfect for inline comments
- Keep the Rust backend minimal at first; most logic lives in the frontend
