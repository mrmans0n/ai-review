# Setup Notes

## What Was Done

✅ **Initialized Tauri v2 + React + Vite + TypeScript project**
- Used official Tauri template with React-TypeScript
- Configured for desktop app development

✅ **Installed All Required Dependencies**

Frontend packages:
- `react` + `react-dom` (v19.1.0)
- `react-diff-view` (v3.3.2) - for split/unified diff rendering
- `unidiff` (v1.0.4) - diff parsing utilities
- `tailwindcss` (v3.4.19) - styling framework
- `highlight.js` (v11.11.1) - syntax highlighting
- `uuid` (v13.0.0) - for generating IDs
- `@tauri-apps/api` (v2) - Tauri IPC bindings

✅ **Created Working Diff Viewer App**

Key features implemented:
- **Text input panel** - Left sidebar with textarea to paste unified diffs
- **Diff viewer panel** - Right panel with react-diff-view rendering
- **Split/Unified toggle** - Switch between side-by-side and unified views
- **Syntax highlighting** - Integrated highlight.js for code coloring
- **Dark theme** - Professional dark UI with proper contrast
- **Example diff** - Hardcoded TypeScript example that loads on startup
- **Responsive layout** - Flexbox layout with proper spacing

✅ **Project Configuration**
- Updated package.json with correct name (`ai-review`)
- Configured Tailwind CSS v3 with dark theme defaults
- Set up PostCSS for Tailwind processing
- Updated Tauri config with proper app name and larger window size (1400x900)
- Updated Cargo.toml with project metadata
- Created comprehensive README.md

✅ **Code Organization**
```
src/
├── App.tsx          # Main app component with diff viewer
├── highlight.ts     # Syntax highlighting integration
├── index.css        # Tailwind directives + global styles
├── diff.css         # Custom dark theme for react-diff-view
└── main.tsx         # React entry point
```

## How to Use

### Development
```bash
# Web-only dev server (faster for UI work)
npm run dev

# Full Tauri desktop app with hot reload
npm run tauri dev
```

### Build
```bash
# Build web assets
npm run build

# Build desktop app (creates native executable)
npm run tauri build
```

## Current State

The app is **fully functional** for basic diff viewing:
1. Opens with an example TypeScript diff pre-loaded
2. Paste any unified diff in the left panel
3. Toggle between split and unified views
4. Syntax highlighting works for common languages
5. Dark theme optimized for code review

## Next Steps (per PLAN.md)

The scaffold is complete. Ready to implement:
- [ ] Inline comments (Gerrit-style)
- [ ] Comment storage and management
- [ ] Prompt generation from comments
- [ ] Session persistence (save/load)
- [ ] Git integration (run `git diff` on local repos)

## Verified

✅ Build passes with no TypeScript errors
✅ All dependencies installed correctly
✅ Tailwind CSS configured and working
✅ react-diff-view rendering properly
✅ Syntax highlighting functional
✅ Code committed and pushed to `main`

---

**Commit**: `056b018` - "Initial Tauri v2 + React + TypeScript scaffold"
**Remote**: mrmans0n/ai-review (private)
**Branch**: main
