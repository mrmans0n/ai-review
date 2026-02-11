# AI Diff - Code Review Tool

A standalone desktop app for reviewing AI-generated code diffs.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Diff rendering**: [react-diff-view](https://github.com/nickel-xd/react-diff-view)
- **Desktop shell**: [Tauri v2](https://v2.tauri.app/)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v20+)
- Rust (for Tauri)

### Development

```bash
# Install dependencies
npm install

# Run web dev server
npm run dev

# Run Tauri desktop app
npm run tauri dev
```

### Build

```bash
# Build web assets
npm run build

# Build desktop app
npm run tauri build
```

## Features (MVP in progress)

- ✅ Paste unified diffs
- ✅ Split/unified view toggle
- ✅ Syntax highlighting
- ✅ Dark theme
- 🚧 Inline comments (Gerrit-style)
- 🚧 Prompt generation for AI feedback
- 🚧 Session management
- 🚧 Git integration

See [PLAN.md](./PLAN.md) for full roadmap and architecture.
