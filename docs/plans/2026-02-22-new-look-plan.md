# New Look Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full visual overhaul of ai-review with Catppuccin Mocha/Latte palette, Aperture Science structural motifs, Geist typography, and dark/light mode toggle.

**Architecture:** CSS custom property token system on `:root` (Latte) and `[data-theme="dark"]` (Mocha), exposed as Tailwind utilities. `useTheme` hook manages the toggle and injects the appropriate highlight.js CSS. All component `gray-*` Tailwind classes migrated to `ctp-*` tokens.

**Tech Stack:** React 19, Tailwind CSS 3, CSS custom properties, `@fontsource/geist`, `@fontsource/geist-mono`, highlight.js Catppuccin themes, Vite `?inline` CSS imports.

**Design doc:** `docs/plans/2026-02-22-new-look-design.md`

**Run the app:** `pnpm tauri dev` — most tasks are visual and verified by looking at the app. Unit tests only where there is logic to test.

---

### Task 1: Install Fonts

**Files:**
- Modify: `package.json`
- Modify: `src/index.css`

**Step 1: Install font packages**

```bash
pnpm add @fontsource/geist @fontsource/geist-mono
```

Expected: packages appear in `node_modules/@fontsource/`.

**Step 2: Import fonts at the top of `src/index.css`**

Add these four lines at the very top, before the `@tailwind` directives:

```css
@import '@fontsource/geist/400.css';
@import '@fontsource/geist/500.css';
@import '@fontsource/geist/600.css';
@import '@fontsource/geist-mono/400.css';
```

**Step 3: Verify fonts load**

```bash
pnpm dev
```

Open `http://localhost:1420`. Open DevTools → Elements → `<body>`. Computed font-family should still show system fonts (Tailwind's base hasn't changed yet). No console errors about missing stylesheets.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/index.css
git commit -m "feat: install Geist and Geist Mono fonts"
```

---

### Task 2: CSS Token System

Replace all hardcoded colors in `src/index.css` with Catppuccin tokens. This is the foundation — every subsequent task depends on these variables being present.

**Files:**
- Modify: `src/index.css`

**Step 1: Replace the entire contents of `src/index.css`**

Replace everything after the font `@import` lines (keep those at the top) with:

```css
@import '@fontsource/geist/400.css';
@import '@fontsource/geist/500.css';
@import '@fontsource/geist/600.css';
@import '@fontsource/geist-mono/400.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Catppuccin Latte (light mode) ─── */
:root {
  --ctp-base:     #eff1f5;
  --ctp-mantle:   #e6e9ef;
  --ctp-surface0: #ccd0da;
  --ctp-surface1: #bcc0cc;
  --ctp-overlay0: #9ca0b0;
  --ctp-text:     #4c4f69;
  --ctp-subtext:  #6c6f85;
  --ctp-blue:     #1e66f5;
  --ctp-mauve:    #8839ef;
  --ctp-peach:    #fe640b;
  --ctp-green:    #40a02b;
  --ctp-red:      #d20f39;
  --ctp-yellow:   #df8e1d;
  --ctp-teal:     #179299;

  /* Diff semantic tokens — Latte values */
  --diff-bg:               var(--ctp-base);
  --diff-gutter-bg:        var(--ctp-mantle);
  --diff-text:             var(--ctp-text);
  --diff-insert-bg:        rgba(64, 160, 43, 0.12);
  --diff-insert-gutter:    rgba(64, 160, 43, 0.20);
  --diff-delete-bg:        rgba(210, 15, 57, 0.10);
  --diff-delete-gutter:    rgba(210, 15, 57, 0.18);
  --diff-insert-edit-bg:   rgba(64, 160, 43, 0.22);
  --diff-delete-edit-bg:   rgba(210, 15, 57, 0.18);
  --diff-selection-bg:     rgba(136, 57, 239, 0.20);
  --diff-gutter-selected:  rgba(136, 57, 239, 0.15);
}

/* ─── Catppuccin Mocha (dark mode) ─── */
[data-theme="dark"] {
  --ctp-base:     #1e1e2e;
  --ctp-mantle:   #181825;
  --ctp-surface0: #313244;
  --ctp-surface1: #45475a;
  --ctp-overlay0: #6c7086;
  --ctp-text:     #cdd6f4;
  --ctp-subtext:  #a6adc8;
  --ctp-blue:     #89b4fa;
  --ctp-mauve:    #cba6f7;
  --ctp-peach:    #fab387;
  --ctp-green:    #a6e3a1;
  --ctp-red:      #f38ba8;
  --ctp-yellow:   #f9e2af;
  --ctp-teal:     #94e2d5;

  /* Diff semantic tokens — Mocha values */
  --diff-bg:               var(--ctp-base);
  --diff-gutter-bg:        var(--ctp-mantle);
  --diff-text:             var(--ctp-text);
  --diff-insert-bg:        rgba(166, 227, 161, 0.10);
  --diff-insert-gutter:    rgba(166, 227, 161, 0.15);
  --diff-delete-bg:        rgba(243, 139, 168, 0.10);
  --diff-delete-gutter:    rgba(243, 139, 168, 0.15);
  --diff-insert-edit-bg:   rgba(166, 227, 161, 0.20);
  --diff-delete-edit-bg:   rgba(243, 139, 168, 0.20);
  --diff-selection-bg:     rgba(203, 166, 247, 0.20);
  --diff-gutter-selected:  rgba(203, 166, 247, 0.15);
}

/* ─── Base styles ─── */
html {
  background-color: var(--ctp-base);
  color: var(--ctp-text);
}

body {
  background-color: var(--ctp-base);
  color: var(--ctp-text);
  font-family: 'Geist', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre, .font-mono {
  font-family: 'Geist Mono', ui-monospace, 'Fira Code', monospace;
}

/* ─── Scrollbars ─── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: var(--ctp-mantle);
}
::-webkit-scrollbar-thumb {
  background: var(--ctp-surface1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--ctp-overlay0);
}
```

**Step 2: Verify it compiles**

```bash
pnpm build
```

Expected: TypeScript check passes, Vite bundles without errors.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add Catppuccin token system to index.css"
```

---

### Task 3: Tailwind Config Extension

Expose the CSS tokens as Tailwind utility classes, add font families, and set the border radius scale.

**Files:**
- Modify: `tailwind.config.js`

**Step 1: Replace `tailwind.config.js` contents**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['attribute', 'data-theme'],
  theme: {
    extend: {
      colors: {
        'ctp-base':     'var(--ctp-base)',
        'ctp-mantle':   'var(--ctp-mantle)',
        'ctp-surface0': 'var(--ctp-surface0)',
        'ctp-surface1': 'var(--ctp-surface1)',
        'ctp-overlay0': 'var(--ctp-overlay0)',
        'ctp-text':     'var(--ctp-text)',
        'ctp-subtext':  'var(--ctp-subtext)',
        'ctp-blue':     'var(--ctp-blue)',
        'ctp-mauve':    'var(--ctp-mauve)',
        'ctp-peach':    'var(--ctp-peach)',
        'ctp-green':    'var(--ctp-green)',
        'ctp-red':      'var(--ctp-red)',
        'ctp-yellow':   'var(--ctp-yellow)',
        'ctp-teal':     'var(--ctp-teal)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
      },
    },
  },
  plugins: [],
}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: builds cleanly. The new `bg-ctp-base`, `text-ctp-text`, etc. classes are now available.

**Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: extend Tailwind config with Catppuccin tokens and Geist fonts"
```

---

### Task 4: `useTheme` Hook

Create the hook that manages dark/light mode state, applies `data-theme` to `<html>`, persists to localStorage, and injects the correct highlight.js stylesheet.

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/hooks/useTheme.test.ts`

**Step 1: Write the failing tests**

Create `src/hooks/useTheme.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark when OS prefers dark', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults to light when OS prefers light', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('respects stored localStorage preference', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');
  });

  it('toggle switches theme and persists', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    act(() => { result.current.toggle(); });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).not.toBe('dark');

    act(() => { result.current.toggle(); });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

**Step 2: Run tests — verify they fail**

```bash
pnpm test:run src/hooks/useTheme.test.ts
```

Expected: FAIL — `useTheme` does not exist yet.

**Step 3: Implement `src/hooks/useTheme.ts`**

```typescript
import { useEffect, useState } from 'react';
import catppuccinMochaCss from 'highlight.js/styles/catppuccin-mocha.css?inline';
import catppuccinLatteCss from 'highlight.js/styles/catppuccin-latte.css?inline';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);

    // Inject highlight.js theme stylesheet
    let styleEl = document.getElementById('hljs-theme') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'hljs-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme === 'dark' ? catppuccinMochaCss : catppuccinLatteCss;
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
```

**Step 4: Remove the old static hljs import from `src/App.tsx`**

Find and delete line 6 in `App.tsx`:
```typescript
import "highlight.js/styles/github-dark.css";
```

**Step 5: Run tests — verify they pass**

```bash
pnpm test:run src/hooks/useTheme.test.ts
```

Expected: all 4 tests PASS.

**Step 6: Commit**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.ts src/App.tsx
git commit -m "feat: add useTheme hook with dark/light toggle and Catppuccin hljs themes"
```

---

### Task 5: Rewrite `diff.css`

Replace all hardcoded hex/rgba values with the diff semantic token variables defined in Task 2. Keep all structural rules (layout, widths, split view) intact — only colors change.

**Files:**
- Modify: `src/diff.css`

**Step 1: Replace the entire contents of `src/diff.css`**

```css
/* react-diff-view default styles */
@import 'react-diff-view/style/index.css';

/* ─── react-diff-view CSS variable overrides ─── */
:root {
  --diff-background-color:             var(--diff-bg);
  --diff-text-color:                   var(--diff-text);
  --diff-selection-background-color:   var(--diff-selection-bg);
  --diff-gutter-insert-background-color: var(--diff-insert-gutter);
  --diff-gutter-delete-background-color: var(--diff-delete-gutter);
  --diff-code-insert-background-color:   var(--diff-insert-bg);
  --diff-code-delete-background-color:   var(--diff-delete-bg);
  --diff-code-insert-edit-background-color: var(--diff-insert-edit-bg);
  --diff-code-delete-edit-background-color: var(--diff-delete-edit-bg);
  --diff-gutter-selected-background-color: var(--diff-gutter-selected);
  --diff-code-selected-background-color:   var(--diff-selection-bg);
}

/* ─── Diff viewer base ─── */
.diff-view {
  background-color: var(--diff-bg);
  color: var(--diff-text);
  font-family: 'Geist Mono', ui-monospace, 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
}

/* ─── Gutter ─── */
.diff-gutter {
  background-color: var(--diff-gutter-bg);
  color: var(--ctp-overlay0);
  border-right: 1px solid var(--ctp-surface1);
  min-width: 50px;
  padding: 0 8px;
  text-align: right;
  user-select: none;
  cursor: pointer;
  position: relative;
  overflow: visible;
  transition: background-color 0.15s, color 0.15s;
}

.diff-gutter:hover {
  background-color: color-mix(in srgb, var(--ctp-peach) 12%, var(--diff-gutter-bg));
  color: var(--ctp-peach);
}

.diff-gutter-col {
  background-color: var(--diff-gutter-bg);
}

/* Aperture track line — vertical separator between gutter and code */
.diff-gutter::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: var(--ctp-surface1);
  opacity: 0.6;
}

/* ─── Lines ─── */
.diff-line {
  background-color: var(--diff-bg);
}

.diff-line-insert {
  background-color: var(--diff-insert-bg);
}

.diff-line-delete {
  background-color: var(--diff-delete-bg);
}

/* ─── Code cells ─── */
.diff-code {
  padding-left: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-code-insert {
  background-color: var(--diff-insert-bg);
}

.diff-code-delete {
  background-color: var(--diff-delete-bg);
}

/* ─── Hunk header ─── */
.diff-hunk-header {
  background-color: var(--ctp-surface0);
  color: var(--ctp-subtext);
  padding: 4px 12px;
  font-weight: 600;
  border-top: 1px solid var(--ctp-surface1);
  border-bottom: 1px solid var(--ctp-surface1);
}

/* ─── Selection ─── */
.diff td.diff-gutter-selected {
  background-color: var(--diff-gutter-selected) !important;
}

.diff td.diff-code-selected {
  background-color: var(--diff-selection-bg) !important;
}

/* ─── Split view ─── */
.diff-view-split .diff-gutter {
  min-width: 45px;
}

.diff-view-split .diff-table {
  width: 100%;
  table-layout: fixed;
}

.diff-view-split .diff-table td {
  width: 50%;
}

.diff-split {
  table-layout: fixed;
}

/* Constrain text selection to one column in split view */
table.diff-split[data-selecting="old"] td:nth-child(n+3) {
  user-select: none !important;
  -webkit-user-select: none !important;
}
table.diff-split[data-selecting="new"] td:nth-child(-n+2) {
  user-select: none !important;
  -webkit-user-select: none !important;
}

/* ─── Widget rows ─── */
.diff-widget {
  background-color: transparent;
}

.diff-widget-content .split-widget-old,
.diff-widget-content .split-widget-new {
  width: 100%;
}

td[colspan="4"].diff-widget-content .split-widget-old {
  width: 50%;
}

td[colspan="4"].diff-widget-content .split-widget-new {
  width: 50%;
  margin-left: 50%;
}

/* ─── Decoration rows (expand context) ─── */
.diff-decoration {
  background-color: transparent;
}

.diff-decoration-gutter {
  background-color: var(--diff-gutter-bg);
  border-right: 1px solid var(--ctp-surface1);
}

.diff-decoration-content {
  background-color: transparent;
}

/* ─── Search highlights ─── */
.search-match {
  background-color: color-mix(in srgb, var(--ctp-yellow) 35%, transparent);
  border-radius: 2px;
}

.search-match-current {
  background-color: color-mix(in srgb, var(--ctp-peach) 50%, transparent);
  border-radius: 2px;
  outline: 1px solid color-mix(in srgb, var(--ctp-peach) 70%, transparent);
}

.word-highlight {
  background-color: color-mix(in srgb, var(--ctp-yellow) 35%, transparent);
  border-radius: 2px;
}
```

**Step 2: Verify build and visual check**

```bash
pnpm build
pnpm tauri dev
```

Open a repo with a diff. Check that:
- Insert lines are green-tinted
- Delete lines are red-tinted
- Gutter is darker than code area
- Line numbers are muted
- Hover on gutter shows peach tint

**Step 3: Commit**

```bash
git add src/diff.css
git commit -m "feat: rewrite diff.css with Catppuccin token-based theming"
```

---

### Task 6: Header Redesign

Update the header bar in `App.tsx` to use the new token classes, add the theme toggle button, and add the Aperture glow effect. The header bar is at the top of the JSX return in `App.tsx` — search for `{/* Header */}` or the `bg-gray-800` div that contains the repo switcher.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Wire up `useTheme` in App.tsx**

Near the top of the `App` component function body, add:

```typescript
import { useTheme } from './hooks/useTheme';
// ... inside App():
const { theme, toggle: toggleTheme } = useTheme();
```

**Step 2: Replace the header bar JSX**

Find the header bar div (contains `RepoSwitcher` and keyboard hint text). Replace it with:

```tsx
{/* Header */}
<div
  className="flex items-center justify-between px-4 py-2.5 bg-ctp-mantle border-b border-ctp-surface1 flex-shrink-0"
  style={{ boxShadow: theme === 'dark' ? '0 4px 16px -4px rgba(250,179,135,0.15)' : 'none' }}
>
  <div className="flex items-center gap-3">
    <div className="flex flex-col leading-none">
      <span className="text-sm font-semibold text-ctp-text tracking-wide">
        <span className="text-ctp-peach mr-1">●</span>ai-review
      </span>
      <span className="text-[9px] tracking-[0.3em] text-ctp-overlay0 uppercase mt-0.5">
        Aperture Science
      </span>
    </div>
    <RepoSwitcher ... />  {/* keep existing RepoSwitcher props unchanged */}
  </div>
  <div className="flex items-center gap-2">
    {/* Existing keyboard hint — update text color only */}
    <span className="text-xs text-ctp-overlay0 hidden md:block">
      {/* keep existing keyboard hint content */}
    </span>
    {/* Theme toggle */}
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  </div>
</div>
```

> **Note:** When replacing the header JSX, keep all existing props on `RepoSwitcher` and any event handlers exactly as they are. Only the wrapping container div's classes and the new theme toggle button change.

**Step 3: Visual check**

```bash
pnpm tauri dev
```

- Header should show dark bg (mantle), orange dot + "ai-review", small "APERTURE SCIENCE" caption
- Sun/moon icon at right; clicking it should toggle `data-theme` on `<html>` and the whole app should switch palette

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: redesign header with Catppuccin tokens and theme toggle"
```

---

### Task 7: Controls Bar Redesign

Update the toolbar below the header. The controls bar contains view mode toggles, diff target selectors, and tool buttons. Find it below the header div — it contains "Split", "Unified", "Unstaged", "Staged", "Browse Commits" buttons.

**Files:**
- Modify: `src/App.tsx`

**Step 1: Define reusable button class strings near the top of App.tsx**

Add these constants inside the `App` component function, before the return:

```typescript
const btnBase = "px-3 py-1.5 text-sm rounded-sm transition-colors border";
const btnDefault = `${btnBase} bg-transparent border-ctp-surface1 text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text hover:border-ctp-surface0`;
const btnActive = `${btnBase} bg-ctp-surface0 border-ctp-mauve text-ctp-text`;
```

**Step 2: Replace controls bar outer container**

Find the controls bar outer div (the one directly below the header, contains all the tool buttons). Replace its `className` with:

```
className="flex items-center gap-1 px-3 py-2 bg-ctp-mantle border-b border-ctp-surface1 flex-shrink-0 flex-wrap"
```

**Step 3: Update each button group**

For each button in the controls bar, replace the existing conditional className pattern:

Before (example):
```tsx
className={`px-4 py-2 rounded transition-colors ${
  viewType === 'split' ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
}`}
```

After (using the constants from Step 1):
```tsx
className={viewType === 'split' ? btnActive : btnDefault}
```

Apply this pattern to:
- Split/Unified toggle buttons
- Unstaged/Staged/Commits buttons
- All icon-only tool buttons (search, comments, prompt, settings)

For icon-only buttons use a shorter variant:
```typescript
const btnIcon = "p-1.5 rounded-sm text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface0 transition-colors";
const btnIconActive = "p-1.5 rounded-sm text-ctp-text bg-ctp-surface0 border border-ctp-mauve";
```

**Step 4: Update group dividers**

Between logical button groups (view mode | diff target | tools), add:
```tsx
<div className="w-px h-5 bg-ctp-surface1 mx-1" />
```

**Step 5: Update the file stats chip**

Find the element showing file counts/line counts. Change its className to:
```
className="text-xs text-ctp-subtext px-2 py-1 bg-ctp-surface0 rounded-sm border border-ctp-surface1"
```

**Step 6: Visual check**

```bash
pnpm tauri dev
```

Controls bar should show grouped buttons with clean default/active states.

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: redesign controls bar with grouped token-based buttons"
```

---

### Task 8: Sidebar Redesign

Update the sidebar panel background, section headers (with Aperture rails), and file item states.

**Files:**
- Modify: `src/App.tsx` (sidebar container and section headers)
- Modify: `src/components/FileList.tsx`

**Step 1: Update sidebar container in App.tsx**

Find the sidebar outer div (the one with `bg-gray-900` or `bg-gray-800`, positioned left, contains the file list). Replace its className to include:

```
bg-ctp-mantle border-r border-ctp-surface1
```

Remove any `bg-gray-*` classes from it.

**Step 2: Update sidebar section headers in App.tsx**

Find section label elements like "CHANGED FILES", "COMMENTED FILES". Replace their className with:

```tsx
<div className="flex items-center gap-2 px-3 py-2 border-b border-ctp-surface1">
  <div className="w-0.5 h-3.5 bg-ctp-peach rounded-full" />
  <span className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase">
    Changed Files
  </span>
</div>
```

The `w-0.5 h-3.5 bg-ctp-peach` div is the Aperture orange rail.

**Step 3: Update `src/components/FileList.tsx`**

Replace all `bg-gray-*`, `text-gray-*`, and `border-blue-*` classes with token equivalents:

| Before | After |
|---|---|
| `bg-gray-900` | `bg-ctp-mantle` |
| `bg-gray-800` | `bg-ctp-surface0` |
| `hover:bg-gray-800` | `hover:bg-ctp-surface0` |
| `text-gray-100` | `text-ctp-text` |
| `text-gray-300` / `text-gray-400` | `text-ctp-subtext` |
| `border-blue-500` (selected indicator) | `border-ctp-peach` |
| `text-green-400` (added) | `text-ctp-green` |
| `text-red-400` (deleted) | `text-ctp-red` |
| `text-blue-400` (modified) | `text-ctp-blue` |
| `text-yellow-400` (renamed) | `text-ctp-yellow` |

For the selected file item, add `rounded-sm` to the item className.

**Step 4: Visual check**

```bash
pnpm tauri dev
```

- Sidebar should be slightly darker than main content
- Section headers should have the orange rail
- Selected file should have orange left border
- File status icons should use Catppuccin colors

**Step 5: Commit**

```bash
git add src/App.tsx src/components/FileList.tsx
git commit -m "feat: redesign sidebar with Catppuccin tokens and Aperture section rails"
```

---

### Task 9: Comment Components

Update `CommentWidget` and `AddCommentForm` with the new rail-based visual language.

**Files:**
- Modify: `src/components/CommentWidget.tsx`
- Modify: `src/components/AddCommentForm.tsx`

**Step 1: Update `src/components/CommentWidget.tsx`**

The comment widget's outer container currently uses `bg-yellow-900 bg-opacity-30 border-l-4 border-yellow-500`. Replace:

```tsx
// Outer container:
className="border-l-2 border-ctp-peach bg-ctp-surface0 p-3 text-sm"

// Author / metadata line:
className="text-xs text-ctp-subtext mb-1"

// Comment text:
className="text-ctp-text leading-relaxed"

// Edit button:
className="text-ctp-mauve hover:text-ctp-blue transition-colors text-xs"

// Delete button:
className="text-ctp-subtext hover:text-ctp-red transition-colors text-xs"
```

**Step 2: Update `src/components/AddCommentForm.tsx`**

The add-comment form container currently uses `bg-blue-900 bg-opacity-30 border-l-4 border-blue-500`. Replace:

```tsx
// Outer container:
className="border-l-2 border-ctp-mauve bg-ctp-surface0 p-3"

// Textarea:
className="w-full bg-ctp-mantle border border-ctp-surface1 rounded-sm text-ctp-text text-sm p-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none focus:ring-1 focus:ring-ctp-mauve/30 resize-none"

// Submit button:
className="px-3 py-1.5 bg-ctp-mauve text-ctp-base text-sm rounded-sm hover:opacity-90 transition-opacity font-medium"

// Cancel button:
className="px-3 py-1.5 text-ctp-subtext text-sm rounded-sm hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
```

**Step 3: Visual check**

```bash
pnpm tauri dev
```

Add a comment on a diff line. The widget should show orange left rail (existing), mauve rail (input form). Both on clean `bg-ctp-surface0` backgrounds.

**Step 4: Commit**

```bash
git add src/components/CommentWidget.tsx src/components/AddCommentForm.tsx
git commit -m "feat: update comment components with token-based rail styling"
```

---

### Task 10: Modals

Update all five modal components with the new design (backdrop blur, token backgrounds, Aperture section rails on headers).

**Files:**
- Modify: `src/components/ConfirmModal.tsx`
- Modify: `src/components/PromptPreview.tsx`
- Modify: `src/components/CommitSelector.tsx`
- Modify: `src/components/FileExplorer.tsx`
- Modify: `src/components/CommentOverview.tsx`

**Common pattern** — apply to all modals:

```tsx
// Backdrop:
className="fixed inset-0 bg-ctp-base/60 backdrop-blur-sm flex items-center justify-center z-50"

// Modal card:
className="bg-ctp-mantle border border-ctp-surface1 rounded-md shadow-2xl ..."

// Modal header with Aperture rail:
<div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
  <div className="w-0.5 h-5 bg-ctp-peach rounded-full" />
  <h2 className="text-base font-semibold text-ctp-text">Title</h2>
  {/* close button */}
  <button className="ml-auto text-ctp-subtext hover:text-ctp-text transition-colors">✕</button>
</div>

// Modal footer:
className="px-6 py-4 border-t border-ctp-surface1 flex justify-end gap-2"
```

**Step 1: Update `ConfirmModal.tsx`**

Apply the common pattern. The destructive variant (`destructive={true}`) should use `border-ctp-red` for the rail and `bg-ctp-red text-ctp-base` for the confirm button.

**Step 2: Update `PromptPreview.tsx`**

Apply the common pattern. The textarea/code preview area inside should be:
```tsx
className="bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text font-mono text-sm p-4"
```

**Step 3: Update `CommitSelector.tsx`**

Apply the common pattern. Search input inside the modal:
```tsx
className="w-full bg-ctp-base border border-ctp-surface1 rounded-sm text-ctp-text text-sm px-3 py-2 placeholder:text-ctp-overlay0 focus:border-ctp-mauve focus:outline-none"
```

Commit list items:
```tsx
// Default:
className="px-4 py-3 cursor-pointer hover:bg-ctp-surface0 border-b border-ctp-surface1/50 last:border-0"
// Selected:
className="px-4 py-3 bg-ctp-surface0 border-l-2 border-ctp-peach border-b border-ctp-surface1/50"
```

**Step 4: Update `FileExplorer.tsx`**

Same pattern as CommitSelector for the search input and result list.

**Step 5: Update `CommentOverview.tsx`**

Apply common modal pattern. Individual comment entries in the list use:
```tsx
className="px-4 py-3 border-b border-ctp-surface1/50 last:border-0 hover:bg-ctp-surface0 cursor-pointer"
```

**Step 6: Visual check**

```bash
pnpm tauri dev
```

Open each modal (Browse Commits, File Explorer with Shift+Shift, Prompt Preview, Comment Overview, trigger a delete). All should use the new backdrop blur and token colors.

**Step 7: Commit**

```bash
git add src/components/ConfirmModal.tsx src/components/PromptPreview.tsx src/components/CommitSelector.tsx src/components/FileExplorer.tsx src/components/CommentOverview.tsx
git commit -m "feat: redesign all modals with Catppuccin tokens and Aperture rails"
```

---

### Task 11: Remaining Components

Update all remaining components that still have hardcoded `gray-*` color classes.

**Files:**
- Modify: `src/components/RepoLandingPage.tsx`
- Modify: `src/components/ScrollProgressBar.tsx`
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/HunkExpandControl.tsx`
- Modify: `src/components/FileViewer.tsx`
- Modify: `src/components/RepoSwitcher.tsx`

**Step 1: `ScrollProgressBar.tsx` — simplest change**

Replace the `style` background with the Catppuccin peach:

```tsx
style={{
  width: `${progress}%`,
  backgroundColor: 'var(--ctp-peach)',
}}
```

Also update the track:
```tsx
className="w-full h-[2px] bg-ctp-surface1/30 pointer-events-none"
```

**Step 2: `HunkExpandControl.tsx`**

Replace `bg-gray-*` and `text-gray-*` with `bg-ctp-surface0 text-ctp-subtext hover:text-ctp-text hover:bg-ctp-surface1`. Apply `rounded-sm`.

**Step 3: `SearchBar.tsx`**

```tsx
// Container:
className="bg-ctp-mantle border-b border-ctp-surface1 px-3 py-2 flex items-center gap-2"

// Input:
className="flex-1 bg-transparent text-ctp-text text-sm placeholder:text-ctp-overlay0 focus:outline-none"

// Result counts, navigation buttons:
className="text-xs text-ctp-subtext"
```

**Step 4: `FileViewer.tsx`**

Replace `bg-gray-800/900` with `bg-ctp-base`, `text-gray-*` with `text-ctp-text/subtext`.

**Step 5: `RepoSwitcher.tsx`**

```tsx
// Trigger button:
className="flex items-center gap-2 bg-ctp-surface0 border border-ctp-surface1 rounded text-sm text-ctp-text px-3 py-1.5 hover:border-ctp-mauve transition-colors"

// Dropdown:
className="absolute top-full left-0 mt-1 bg-ctp-mantle border border-ctp-surface1 rounded-md shadow-2xl z-50 min-w-[200px]"

// Dropdown items:
className="px-3 py-2 text-sm text-ctp-subtext hover:bg-ctp-surface0 hover:text-ctp-text cursor-pointer transition-colors"
```

**Step 6: `RepoLandingPage.tsx`**

The landing page needs the Aperture crosshair grid background (see Task 12 for the motif). For now, update the color classes:

```tsx
// Outer wrapper:
className="min-h-screen bg-ctp-base flex items-center justify-center"

// Card:
className="w-full max-w-lg px-6"

// Heading:
className="text-3xl font-semibold text-ctp-text mb-2"

// Subheading:
className="text-ctp-subtext"

// Section labels:
className="text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase mb-3"
  // (add the Aperture rail here too, same as sidebar section headers)

// Repo list items:
className="flex items-center justify-between px-4 py-3 bg-ctp-mantle border border-ctp-surface1 rounded-md hover:border-ctp-mauve cursor-pointer transition-colors"

// Add repo button:
className="w-full px-4 py-3 border border-dashed border-ctp-surface1 rounded-md text-ctp-subtext hover:border-ctp-mauve hover:text-ctp-text transition-colors text-sm"
```

**Step 7: Visual check**

```bash
pnpm tauri dev
```

Check the landing page, search bar, file viewer, progress bar, and repo switcher. No more gray-* colors should be visible.

**Step 8: Commit**

```bash
git add src/components/RepoLandingPage.tsx src/components/ScrollProgressBar.tsx src/components/SearchBar.tsx src/components/HunkExpandControl.tsx src/components/FileViewer.tsx src/components/RepoSwitcher.tsx
git commit -m "feat: migrate remaining components to Catppuccin tokens"
```

---

### Task 12: Aperture Science Motifs

Add the five structural details that give the app its character.

**Files:**
- Modify: `src/components/RepoLandingPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Crosshair grid on landing page**

In `RepoLandingPage.tsx`, add a `backgroundImage` style to the outer wrapper div:

```tsx
<div
  className="min-h-screen bg-ctp-base flex items-center justify-center"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1' fill='%23${
      // Use a neutral overlay color — we'll hardcode both and use a CSS var trick
      '9ca0b0'
    }' opacity='0.3'/%3E%3C/svg%3E")`,
    backgroundSize: '24px 24px',
  }}
>
```

Better approach — define a CSS class in `index.css` at the bottom so the color respects the theme:

```css
/* ─── Aperture crosshair grid ─── */
.aperture-grid {
  background-image: radial-gradient(circle, var(--ctp-surface1) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

Then in `RepoLandingPage.tsx`:
```tsx
<div className="min-h-screen bg-ctp-base aperture-grid flex items-center justify-center">
```

**Step 2: No-diff empty state in App.tsx**

Find the "no file selected" / empty content state in `App.tsx` (inside the main content area, shown when `selectedFile` is null). Add `aperture-grid` to its className and update its text:

```tsx
<div className="flex-1 flex items-center justify-center aperture-grid">
  <div className="text-center">
    <div className="text-ctp-surface1 text-5xl mb-4 font-mono">⊕</div>
    <p className="text-ctp-subtext text-sm">Select a file to review</p>
  </div>
</div>
```

**Step 3: Verify motifs in both themes**

```bash
pnpm tauri dev
```

- Landing page: faint dot grid behind the repo list
- Empty state: dot grid behind the "select a file" message
- Grid dots should be lighter in light mode, barely visible in dark mode
- Toggle theme — grid should adapt

**Step 4: Commit**

```bash
git add src/index.css src/components/RepoLandingPage.tsx src/App.tsx
git commit -m "feat: add Aperture Science structural motifs (crosshair grid, orange rails)"
```

---

### Task 13: Final Polish + Audit

Do a full pass to catch any remaining hardcoded `gray-*` or `blue-*` color classes that were missed.

**Files:**
- Modify: `src/App.tsx` (status bars, file headers, misc)
- Any other files as needed

**Step 1: Search for remaining hardcoded colors**

```bash
grep -rn "bg-gray-\|text-gray-\|border-gray-\|bg-blue-\|text-blue-\|border-blue-\|bg-green-\|bg-red-\|bg-yellow-\|bg-purple-" src/ --include="*.tsx" --include="*.ts" | grep -v "\.test\." | grep -v "node_modules"
```

For each match, replace with the appropriate `ctp-*` token:

| Old | New |
|---|---|
| `bg-gray-900` / `bg-gray-800` | `bg-ctp-base` / `bg-ctp-mantle` |
| `bg-gray-700` | `bg-ctp-surface0` |
| `bg-gray-600` | `bg-ctp-surface1` |
| `text-gray-100` / `text-white` | `text-ctp-text` |
| `text-gray-300` / `text-gray-400` | `text-ctp-subtext` |
| `text-gray-500` | `text-ctp-overlay0` |
| `border-gray-700` / `border-gray-600` | `border-ctp-surface1` |
| `bg-blue-600` (primary action) | `bg-ctp-mauve` |
| `text-blue-400` | `text-ctp-blue` |
| `border-blue-500` | `border-ctp-mauve` |
| `bg-green-600` | `bg-ctp-green` |
| `text-green-400` | `text-ctp-green` |
| `text-red-400` | `text-ctp-red` |
| `bg-yellow-600` | `bg-ctp-yellow` |
| `text-yellow-400` | `text-ctp-yellow` |
| `bg-purple-900` | `bg-ctp-surface0` |

**Step 2: Update the status bar in App.tsx**

The blue "selected commit" bar and purple "selected branch" bar:

```tsx
// Commit info bar (was bg-blue-950 or similar):
className="flex items-center gap-2 px-4 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-xs"

// Branch info bar:
className="flex items-center gap-2 px-4 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-xs"
// Add a colored dot to differentiate: text-ctp-mauve for commit, text-ctp-teal for branch
```

**Step 3: Update file diff headers in App.tsx**

Find the file header rows (show filename, Added/Deleted/Modified badge, Viewed checkbox). Update to:

```tsx
// File header container:
className="px-4 py-2 font-medium border-b border-ctp-surface1 flex justify-between items-center bg-ctp-mantle text-ctp-text text-sm"

// Status badges:
// Add: text-ctp-green
// Delete: text-ctp-red
// Modify: text-ctp-blue
// Rename: text-ctp-yellow
```

**Step 4: Run full test suite**

```bash
pnpm test:run
```

Expected: all existing tests pass (no logic was changed, only classNames).

**Step 5: Final visual review — both themes**

```bash
pnpm tauri dev
```

Manually verify in both light and dark modes:
- [ ] Landing page — crosshair grid, repo list cards, add button
- [ ] Header — orange dot, app name, Aperture caption, theme toggle
- [ ] Controls bar — grouped buttons, active states
- [ ] Sidebar — mantle bg, orange rails on headers, file status colors
- [ ] Diff view — Catppuccin insert/delete colors, gutter, line numbers
- [ ] Comments — orange rail (existing), mauve rail (new form)
- [ ] All modals — backdrop blur, token colors, Aperture rails on headers
- [ ] Progress bar — peach/orange color
- [ ] No more gray-* colors anywhere

**Step 6: Final commit**

```bash
git add -p  # review and stage any remaining changes
git commit -m "feat: final polish and gray-* color audit"
```

---

## Summary

| Task | Commit message |
|---|---|
| 1 | `feat: install Geist and Geist Mono fonts` |
| 2 | `feat: add Catppuccin token system to index.css` |
| 3 | `feat: extend Tailwind config with Catppuccin tokens and Geist fonts` |
| 4 | `feat: add useTheme hook with dark/light toggle and Catppuccin hljs themes` |
| 5 | `feat: rewrite diff.css with Catppuccin token-based theming` |
| 6 | `feat: redesign header with Catppuccin tokens and theme toggle` |
| 7 | `feat: redesign controls bar with grouped token-based buttons` |
| 8 | `feat: redesign sidebar with Catppuccin tokens and Aperture section rails` |
| 9 | `feat: update comment components with token-based rail styling` |
| 10 | `feat: redesign all modals with Catppuccin tokens and Aperture rails` |
| 11 | `feat: migrate remaining components to Catppuccin tokens` |
| 12 | `feat: add Aperture Science structural motifs (crosshair grid, orange rails)` |
| 13 | `feat: final polish and gray-* color audit` |
