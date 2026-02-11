# ai-diff

AI code review tool with diff UI, inline comments, and prompt generation.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (for Tauri backend)

## Setup

```bash
pnpm install
```

## Development

### Web only (no Tauri)
```bash
pnpm dev
```
Opens at http://localhost:1420/

### Desktop app (Tauri)
```bash
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Diff rendering**: react-diff-view
- **Desktop**: Tauri v2 (Rust backend)

See [PLAN.md](PLAN.md) for the full roadmap.
