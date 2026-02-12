# ai-review

AI code review tool with Git integration, diff UI, inline comments, and fuzzy file search.

## Features

✅ **CLI launcher** (`air`) - Open from any directory  
✅ **Git integration** - Auto-detect repos, show unstaged/staged/commit diffs  
✅ **Sidebar** - Changed files with status indicators (M/A/D/R)  
✅ **Fuzzy file search** - Press Shift+Shift to search all files  
✅ **Inline comments** - Click line numbers or press 'C' to add comments  
✅ **Split/Unified views** - Toggle between diff view modes  
✅ **Syntax highlighting** - Auto-detect language from file extension  
✅ **Edit/delete comments** - Manage review feedback inline  

See [FEATURES.md](FEATURES.md) for detailed documentation.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (for Tauri backend)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build the app
pnpm tauri build

# 3. Install CLI launcher
cd cli && ./install.sh

# 4. Use it!
cd /path/to/your/git/repo
aid
```

## Development

### Web only (Vite dev server)
```bash
pnpm dev
```
Opens at http://localhost:1420/

### Desktop app (Tauri hot reload)
```bash
pnpm tauri dev
```

## Build

### Production build
```bash
pnpm tauri build
```

### Debug build (faster, for testing)
```bash
pnpm tauri build --debug
```

## Usage

### CLI Commands
```bash
air              # Open ai-review in current directory
air /path/to/dir # Open ai-review in specified directory
```

### Keyboard Shortcuts
- **Shift+Shift** - Open fuzzy file search
- **C** - Add comment on current file
- **Ctrl/Cmd+Enter** - Submit comment form
- **Esc** - Close modals / cancel forms

### Diff Modes
- **Unstaged** - Working directory changes (`git diff`)
- **Staged** - Staged changes (`git diff --staged`)
- **Commit** - Compare against commit (e.g., `HEAD~1`)

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Diff rendering**: react-diff-view
- **Syntax highlighting**: highlight.js
- **Desktop shell**: Tauri v2 (Rust backend)
- **Git integration**: Shell-out to `git` commands

## Project Structure

```
ai-review/
├── cli/              # CLI launcher scripts
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── hooks/        # React hooks
│   └── types.ts      # TypeScript types
├── src-tauri/        # Rust backend
│   └── src/
│       ├── git.rs    # Git operations
│       ├── files.rs  # File system operations
│       └── lib.rs    # Main Tauri app
└── FEATURES.md       # Detailed feature documentation
```

## Roadmap

See [PLAN.md](PLAN.md) for the full development plan and future features.

## License

Private project - Nacho Lopez
