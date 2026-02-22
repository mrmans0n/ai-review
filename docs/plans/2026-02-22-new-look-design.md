# ai-review: New Look Design

**Date:** 2026-02-22
**Branch:** nacho/new-look
**Status:** Approved — ready for implementation

---

## Overview

Full visual overhaul of ai-review. The goal is a clean, polished, production-grade UI with a distinctive character inspired by Aperture Science (Portal series) and the Catppuccin color system, with full light/dark mode support.

**Inspirations:** Graphite, Plannotator
**Theme:** Catppuccin Mocha (dark) + Catppuccin Latte (light), structured with Aperture Science geometry
**Typography:** Geist (UI) + Geist Mono (code)
**Shape language:** Soft + modern — 4–6px buttons, 6–8px panels

---

## 1. Token System & Architecture

### CSS Custom Properties

All color decisions flow through CSS custom properties on `:root` (light, Catppuccin Latte) and `[data-theme="dark"]` (Catppuccin Mocha). No more raw `gray-*` Tailwind values in components.

```css
:root {
  /* Catppuccin Latte */
  --ctp-base:     #eff1f5;
  --ctp-mantle:   #e6e9ef;
  --ctp-surface0: #ccd0da;
  --ctp-surface1: #bcc0cc;
  --ctp-overlay0: #9ca0b0;
  --ctp-text:     #4c4f69;
  --ctp-subtext:  #6c6f85;
  --ctp-blue:     #1e66f5;
  --ctp-mauve:    #8839ef;
  --ctp-peach:    #fe640b;   /* Aperture orange */
  --ctp-green:    #40a02b;
  --ctp-red:      #d20f39;
  --ctp-yellow:   #df8e1d;
  --ctp-teal:     #179299;
}

[data-theme="dark"] {
  /* Catppuccin Mocha */
  --ctp-base:     #1e1e2e;
  --ctp-mantle:   #181825;
  --ctp-surface0: #313244;
  --ctp-surface1: #45475a;
  --ctp-overlay0: #6c7086;
  --ctp-text:     #cdd6f4;
  --ctp-subtext:  #a6adc8;
  --ctp-blue:     #89b4fa;
  --ctp-mauve:    #cba6f7;
  --ctp-peach:    #fab387;   /* Aperture orange */
  --ctp-green:    #a6e3a1;
  --ctp-red:      #f38ba8;
  --ctp-yellow:   #f9e2af;
  --ctp-teal:     #94e2d5;
}
```

### Tailwind Config Extension

`tailwind.config.js` extended to expose tokens as utility classes:

```js
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
      sans: ['Geist', 'system-ui', 'sans-serif'],
      mono: ['Geist Mono', 'ui-monospace', 'monospace'],
    },
    borderRadius: {
      sm:      '4px',
      DEFAULT: '6px',
      md:      '8px',
      lg:      '12px',
    },
  },
}
```

### Theme Switching

- `data-theme` attribute on `<html>` element
- Defaults to OS preference via `prefers-color-scheme` media query
- Persisted in `localStorage` under key `"theme"`
- Toggle button in the header (sun/moon icon, no label)
- Logic lives in a small `useTheme` hook

### Fonts

Install `@fontsource/geist` and `@fontsource/geist-mono` as npm packages. Imported in `index.css`. Bundled with the app — no CDN dependency (important for Tauri offline use).

```css
@import '@fontsource/geist/400.css';
@import '@fontsource/geist/500.css';
@import '@fontsource/geist/600.css';
@import '@fontsource/geist-mono/400.css';
```

---

## 2. Header + Controls Bar

### Header Bar

- Background: `bg-ctp-mantle` (slightly recessed from page background)
- Bottom border: `1px solid var(--ctp-surface1)` + Aperture orange glow:
  `box-shadow: 0 1px 0 var(--ctp-surface1), 0 4px 16px -4px rgba(var(--ctp-peach-rgb), 0.18)`
- App name: "ai-review" in Geist 600, tracked slightly, with a small `●` orange dot prefix
- Optional flavor text under name: `text-[9px] tracking-[0.3em] text-ctp-overlay0 uppercase` — "APERTURE SCIENCE"
- Repo switcher: `bg-ctp-surface0 border border-ctp-surface1 rounded` pill with chevron
- Theme toggle: icon-only (sun/moon), `text-ctp-subtext hover:text-ctp-text`, far right

### Controls Bar

Organized into three logical groups separated by `1px` vertical dividers:

1. `[Split / Unified]` — view mode toggles
2. `[Unstaged / Staged / Browse Commits]` — diff target selector
3. `[Search / Comments / Prompt / Settings]` — tools

**Button states:**
- Default: `bg-transparent border border-ctp-surface1 text-ctp-subtext rounded-sm px-3 py-1.5 text-sm`
- Hover: `border-ctp-surface0 text-ctp-text bg-ctp-surface0/50`
- Active/selected: `bg-ctp-surface0 border-ctp-mauve text-ctp-text`

**File stats chip** (e.g. "3 files · +120 −45"): non-interactive, `text-xs text-ctp-subtext`.

---

## 3. Sidebar

- Background: `bg-ctp-mantle`
- Right border: `1px solid var(--ctp-surface1)`
- Resize handle: becomes a subtle hover-only affordance, `hover:bg-ctp-peach/40`

### Section Headers

```
CHANGED FILES          text-[10px] font-semibold tracking-widest text-ctp-overlay0 uppercase
```

Left Aperture rail: `border-l-2 border-ctp-peach pl-2` on the label container.

### File List Items

- Default: `text-sm text-ctp-subtext rounded-sm`
- Hover: `bg-ctp-surface0 text-ctp-text`
- Selected: `bg-ctp-surface0 border-l-2 border-ctp-peach text-ctp-text` (orange rail = selected, replaces blue)
- File status icon colors (semantic):
  - Added: `text-ctp-green`
  - Deleted: `text-ctp-red`
  - Modified: `text-ctp-blue`
  - Renamed: `text-ctp-yellow`

---

## 4. Diff Viewer

### diff.css Rewrite

All values replaced with CSS variable references:

| Token | Usage |
|---|---|
| `--diff-background-color` | `var(--ctp-base)` |
| `--diff-gutter-background-color` | `var(--ctp-mantle)` |
| `--diff-gutter-insert-background-color` | Latte: `rgba(64,160,43,0.2)` / Mocha: `rgba(166,227,161,0.15)` |
| `--diff-gutter-delete-background-color` | Latte: `rgba(210,15,57,0.18)` / Mocha: `rgba(243,139,168,0.15)` |
| `--diff-code-insert-background-color` | Latte: `rgba(64,160,43,0.12)` / Mocha: `rgba(166,227,161,0.10)` |
| `--diff-code-delete-background-color` | Latte: `rgba(210,15,57,0.10)` / Mocha: `rgba(243,139,168,0.10)` |
| `--diff-code-insert-edit-background-color` | Slightly more opaque version of insert |
| `--diff-code-delete-edit-background-color` | Slightly more opaque version of delete |
| Line number text | `var(--ctp-overlay0)` |
| Line number selected | `var(--ctp-subtext)` |

### Aperture Gutter Detail

A `1px solid var(--ctp-surface1)` vertical line between the line number column and the code column. The "track" motif — structural precision. Implemented via CSS on `.diff-gutter` after-pseudo or column border.

### Syntax Highlighting

Swap `highlight.js/styles/github-dark.css` for Catppuccin highlight.js themes:
- Light: `highlight.js/styles/catppuccin-latte.css`
- Dark: `highlight.js/styles/catppuccin-mocha.css`

Theme swapped dynamically on mode toggle (remove/add `<link>` or import both and toggle a class).

---

## 5. Comments + Widgets

### Color Language

| Rail color | Meaning |
|---|---|
| `border-ctp-peach` (orange) | Existing annotation — "marked by Aperture" |
| `border-ctp-mauve` (mauve) | Active input — "you are here" |
| `border-ctp-red` (red) | Danger/destructive action |

### CommentWidget

- Left rail: `border-l-2 border-ctp-peach`
- Background: `bg-ctp-surface0` (clean, replaces muddy `yellow-900/30`)
- Text: `text-ctp-text`
- Author/timestamp: `text-xs text-ctp-subtext`
- Edit button: `text-ctp-mauve hover:text-ctp-blue`
- Delete button: `text-ctp-subtext hover:text-ctp-red`

### AddCommentForm

- Left rail: `border-l-2 border-ctp-mauve`
- Background: `bg-ctp-surface0`
- Textarea: `bg-ctp-mantle border border-ctp-surface1 rounded-sm focus:border-ctp-mauve focus:outline-none text-ctp-text`
- Submit button: `bg-ctp-mauve text-ctp-base rounded-sm px-3 py-1.5`
- Cancel button: `text-ctp-subtext hover:text-ctp-text`

---

## 6. Modals + Overlays

- Backdrop: `bg-ctp-base/60 backdrop-blur-sm`
- Modal card: `bg-ctp-mantle border border-ctp-surface1 rounded-md shadow-2xl`
- Modal header: section title with `border-l-2 border-ctp-peach pl-3` Aperture rail
- Close button: `text-ctp-subtext hover:text-ctp-text`
- Confirm (danger) modal: rail becomes `border-ctp-red`, destructive action button uses `bg-ctp-red text-ctp-base`

---

## 7. Aperture Science Motifs

These five details give the app its character:

### 1. Header Orange Glow
Low-opacity orange glow along the bottom of the header bar. Like the light strips in Aperture test chambers. Only visible on dark mode (Mocha's peach is warm enough; Latte uses just a border).

### 2. Empty State Crosshair Grid
On the repo landing page and no-diff state: faint SVG `background-image` with a 24px crosshair dot grid in `--ctp-surface1` at 40% opacity. Implemented as an inline SVG data URI in CSS. Like the targeting reticles on Aperture equipment.

```css
background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1' fill='currentColor' opacity='0.4'/%3E%3C/svg%3E");
background-size: 24px 24px;
```

### 3. Section Rails
All section/panel header labels have a `border-l-2 border-ctp-peach pl-2` left accent rail. Reads like the orange warning markings on Aperture facility walls.

### 4. Progress Bar
`ScrollProgressBar` becomes `bg-ctp-peach`. Orange — like Aperture's power conduits running along ceilings.

### 5. "APERTURE SCIENCE" Caption
Optional small caption under "ai-review" in the header:
`text-[9px] tracking-[0.3em] text-ctp-overlay0 uppercase` — just flavor text, can be a subtle easter egg.

---

## 8. Input + Interactive Patterns

### Buttons (summary)

| Variant | Classes |
|---|---|
| Primary | `bg-ctp-mauve text-ctp-base rounded-sm px-3 py-1.5 text-sm font-medium hover:opacity-90` |
| Secondary | `bg-transparent border border-ctp-surface1 text-ctp-subtext rounded-sm px-3 py-1.5 text-sm hover:bg-ctp-surface0 hover:text-ctp-text` |
| Danger | `bg-ctp-red text-ctp-base rounded-sm px-3 py-1.5 text-sm` |
| Ghost | `text-ctp-subtext hover:text-ctp-text px-2 py-1 rounded-sm` |

### Inputs + Textareas

```
bg-ctp-mantle border border-ctp-surface1 rounded-sm text-ctp-text
placeholder:text-ctp-overlay0
focus:border-ctp-mauve focus:outline-none focus:ring-1 focus:ring-ctp-mauve/30
```

### Scrollbars

Thin scrollbars using webkit styling:
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--ctp-mantle); }
::-webkit-scrollbar-thumb { background: var(--ctp-surface1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--ctp-overlay0); }
```

---

## 9. Migration Strategy

The migration touches many files. Recommended order:

1. **Foundation first**: install fonts, set up token CSS, extend Tailwind config, add `useTheme` hook
2. **Global styles**: `index.css` and `diff.css` full rewrite
3. **Header + Controls**: `App.tsx` header section, theme toggle button
4. **Sidebar**: `FileList.tsx`, sidebar section in `App.tsx`
5. **Comments**: `CommentWidget.tsx`, `AddCommentForm.tsx`
6. **Modals**: `PromptPreview.tsx`, `CommitSelector.tsx`, `FileExplorer.tsx`, `ConfirmModal.tsx`, `CommentOverview.tsx`
7. **Diff viewer**: `diff.css` variables, highlight.js theme swap logic
8. **Aperture motifs**: empty states, progress bar, header glow
9. **Remaining components**: `RepoLandingPage.tsx`, `SearchBar.tsx`, `HunkExpandControl.tsx`, `FileViewer.tsx`, `RepoSwitcher.tsx`

---

## Files Changed

| File | Change type |
|---|---|
| `package.json` | Add `@fontsource/geist`, `@fontsource/geist-mono` |
| `tailwind.config.js` | Extend colors, fontFamily, borderRadius |
| `src/index.css` | Font imports, CSS token system, scrollbar styles, global resets |
| `src/diff.css` | Full rewrite to CSS variable-based theming |
| `src/hooks/useTheme.ts` | New hook for dark/light mode toggle |
| `src/App.tsx` | Header, controls bar, sidebar sections, theme toggle |
| `src/components/FileList.tsx` | File item styles |
| `src/components/CommentWidget.tsx` | Rail colors, surface backgrounds |
| `src/components/AddCommentForm.tsx` | Rail colors, input styles |
| `src/components/PromptPreview.tsx` | Modal styles |
| `src/components/CommitSelector.tsx` | Modal styles |
| `src/components/FileExplorer.tsx` | Modal styles |
| `src/components/ConfirmModal.tsx` | Modal styles + danger rail |
| `src/components/CommentOverview.tsx` | Panel styles |
| `src/components/RepoLandingPage.tsx` | Empty state + crosshair grid |
| `src/components/SearchBar.tsx` | Input + result styles |
| `src/components/HunkExpandControl.tsx` | Button styles |
| `src/components/FileViewer.tsx` | Surface + text styles |
| `src/components/RepoSwitcher.tsx` | Dropdown styles |
| `src/components/ScrollProgressBar.tsx` | Peach color |
