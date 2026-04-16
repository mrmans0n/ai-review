# Task #418 — Eliminate First-Launch Startup Flash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cold launch of ai-review paints the correct theme on the first frame — no white flash, no light→dark jump.

**Architecture:** Two serial gates. (1) *Color gate:* Tauri main window starts hidden with a dark `backgroundColor` and is revealed only after the webview commits a first paint. (2) *Theme gate:* a synchronous inline script in `index.html` sets `data-theme="dark"` on `<html>` before any stylesheet is applied or React mounts, so the first webview paint already matches the final theme. `useTheme` is updated to honor the pre-set attribute on first render so it does not thrash.

**Tech Stack:** React 19, Vite 8, Vitest 4, Tauri 2, `@tauri-apps/api@^2`, TypeScript 6, pnpm.

**Prior art in this repo:**
- Research: `docs/research/418-eliminate-startup-flash.md`
- Design: `docs/plans/2026-04-16-task-418-startup-flash-design.md`
- Plan template reference: `docs/plans/2026-04-08-update-react-to-19.2.5.md`

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `index.html` | modify | Inline synchronous theme bootstrap in `<head>` before the module script |
| `src/hooks/useTheme.ts` | modify | `getInitialTheme` honors pre-set `data-theme` attribute |
| `src/hooks/useTheme.test.ts` | modify | Add test: pre-set `data-theme="dark"` is respected by the hook |
| `src-tauri/tauri.conf.json` | modify | Main window starts hidden with `backgroundColor: "#282C34"` |
| `src/main.tsx` | modify | Reveal window after first rAF with 2s safety timeout + idempotency flag |

No new files. No deletions.

---

### Task 1: Create feature branch

**Files:** (no changes — branch creation only)

- [ ] **Step 1: Fetch latest main and create the feature branch**

```bash
cd /Volumes/Ambrosio/repos/ai-review
git fetch origin
git checkout -b task-418-startup-flash origin/main
```

Expected: new branch created from `origin/main`; working tree clean.

- [ ] **Step 2: Verify you're on the new branch with no pending changes**

```bash
git status
git branch --show-current
```

Expected:
```
nothing to commit, working tree clean
task-418-startup-flash
```

---

### Task 2: Add the failing test for pre-set `data-theme` attribute

**Files:**
- Modify: `src/hooks/useTheme.test.ts`

This is the TDD anchor for the hook change. The test seeds `data-theme="dark"` on `<html>` before the hook mounts (simulating what the inline bootstrap will do in `index.html`) and asserts the hook adopts it even when `localStorage` and `matchMedia` would otherwise say "light".

- [ ] **Step 1: Add the test block**

In `src/hooks/useTheme.test.ts`, add this test as the last `it(...)` inside the existing `describe('useTheme', ...)` block (after the existing `'toggle switches theme and persists'` test, before the closing `})` at line 68):

```ts
  it('honors pre-set data-theme="dark" attribute even when storage and matchMedia say light', () => {
    // Simulate the inline bootstrap in index.html having already set the attribute.
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'light');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // system prefers light
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
```

- [ ] **Step 2: Run the new test to verify it fails**

```bash
cd /Volumes/Ambrosio/repos/ai-review
pnpm test:run -- src/hooks/useTheme.test.ts
```

Expected: the new test fails. With the current `getInitialTheme`, `localStorage.getItem('theme')` returns `'light'`, so the hook returns `'light'` and removes the attribute via its `useEffect`. The assertion `toBe('dark')` will fail.

Do **not** proceed until you've seen this test fail for the right reason (hook returned `'light'` because it preferred `localStorage` over the pre-set attribute).

---

### Task 3: Update `getInitialTheme` to prefer the pre-set attribute

**Files:**
- Modify: `src/hooks/useTheme.ts`

- [ ] **Step 1: Update `getInitialTheme` in `src/hooks/useTheme.ts`**

Replace the existing function (lines 7–11):

```ts
function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

With:

```ts
// NOTE: Mirrors the inline bootstrap in index.html. Keep key ('theme'),
// attribute ('data-theme'), dark value ('dark'), and media query in sync.
function getInitialTheme(): Theme {
  if (document.documentElement.getAttribute('data-theme') === 'dark') return 'dark';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

No other changes to this file — the `useEffect` and `toggle` stay as they are.

- [ ] **Step 2: Run the useTheme tests and verify all pass**

```bash
pnpm test:run -- src/hooks/useTheme.test.ts
```

Expected: all tests in `useTheme.test.ts` pass, including the new one. Existing tests remain green (the pre-test `beforeEach` at lines 6–18 already calls `document.documentElement.removeAttribute('data-theme')`, so they're unaffected).

- [ ] **Step 3: Run the full test suite to confirm no collateral breakage**

```bash
pnpm test:run
```

Expected: all tests pass (baseline was 195 tests per task-417 completion notes; expect 196 now).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.ts
git commit -m "feat(theme): honor pre-set data-theme attribute in useTheme

Prepares useTheme for a synchronous theme bootstrap added in a later
commit. getInitialTheme now reads the attribute first so the hook does
not overwrite what the inline script set."
```

---

### Task 4: Add the synchronous inline theme bootstrap in `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Insert the inline script inside `<head>`**

Replace the existing `<head>` block (lines 3–8):

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ai-review</title>
  </head>
```

With:

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ai-review</title>
    <!--
      Synchronous theme bootstrap. Runs during HTML parsing, before CSSOM is
      built, so first paint already matches the final theme and there is no
      light->dark flash. Mirrors src/hooks/useTheme.ts: same localStorage key
      ('theme'), same attribute ('data-theme'), same dark value ('dark'),
      same media query. Keep them in sync.
    -->
    <script>
      (function () {
        try {
          var stored = localStorage.getItem('theme');
          var isDark =
            stored === 'dark' ||
            (stored !== 'light' &&
              window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        } catch (_) { /* fall through to React bootstrap */ }
      })();
    </script>
  </head>
```

Key properties (do **not** deviate):

- Script is inline, non-`type="module"`, and placed **above** `<script type="module" src="/src/main.tsx">` so it runs first.
- Only ever *sets* `data-theme="dark"` — never writes `"light"`. Light mode is expressed as the attribute being absent (matches the CSS contract at `src/index.css:36-64`).
- Never writes to `localStorage` — the React hook remains the sole writer.
- Wrapped in `try/catch` so a sandboxed/private-mode `localStorage` throw cannot break boot.

- [ ] **Step 2: Sanity-check the module script still comes after the bootstrap**

Open `index.html` and confirm the tag order is:

1. `<script>…bootstrap…</script>` inside `<head>`
2. `<script type="module" src="/src/main.tsx"></script>` inside `<body>`

If both are present in that order, this step is done.

- [ ] **Step 3: Run the full test suite to confirm nothing regressed**

```bash
pnpm test:run
```

Expected: all 196 tests pass. jsdom does not execute `<script>` blocks from the HTML template, so no unit test covers the bootstrap directly — Task 2's test covers the *handoff* contract (hook respects pre-set attribute).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(theme): inline synchronous theme bootstrap in index.html

Sets data-theme='dark' on <html> before React mounts when storage or
prefers-color-scheme says dark. Eliminates the light->dark jump on cold
launch. Mirrors useTheme's key/attribute/query; comment flags the
coupling."
```

---

### Task 5: Hide the Tauri main window at startup and set a dark background

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Add `visible` and `backgroundColor` to the main window entry**

Replace lines 13–21:

```json
    "windows": [
      {
        "title": "AI Review - Code Review Tool",
        "width": 1400,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 700
      }
    ],
```

With:

```json
    "windows": [
      {
        "title": "AI Review - Code Review Tool",
        "width": 1400,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 700,
        "visible": false,
        "backgroundColor": "#282C34"
      }
    ],
```

Value rationale (from design doc D2):
- `"visible": false` — native OS window is created hidden; `main.tsx` reveals it in Task 6.
- `"backgroundColor": "#282C34"` — exact One Dark `--ctp-base` from `src/index.css:68`. Matches the dark-mode palette so dark users see no jarring color if the native window is ever briefly visible. Tolerable gray for light users in the worst-case micro-window.

- [ ] **Step 2: Validate the JSON is well-formed**

```bash
cd /Volumes/Ambrosio/repos/ai-review
node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'))" && echo OK
```

Expected: `OK`.

- [ ] **Step 3: Run `cargo check` to confirm Tauri accepts the schema**

```bash
cd src-tauri && cargo check
```

Expected: finishes with no errors. `tauri.conf.json` is validated at compile time against `schema.tauri.app/config/2`, so invalid keys/values would fail here.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/Ambrosio/repos/ai-review
git add src-tauri/tauri.conf.json
git commit -m "feat(tauri): start main window hidden with dark backgroundColor

visible:false + #282C34 (One Dark --ctp-base) prevents the OS-default
white frame on cold launch. Frontend will show() after first paint."
```

---

### Task 6: Reveal the Tauri window after React's first paint

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the current contents of `src/main.tsx` (10 lines):

```ts
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

With:

```ts
import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Reveal the Tauri window only after the first frame has been committed, so
// the user never sees an empty/white native frame. requestAnimationFrame fires
// after the browser has laid out and painted at least once.
//
// Safety: .catch swallows the rejection in non-Tauri contexts (pnpm dev in a
// plain browser); a 2s setTimeout safety net guarantees the window appears
// even if first paint never happens (e.g. a fatal render error). The revealed
// flag keeps .show() idempotent under HMR and across rAF + setTimeout.
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  getCurrentWindow()
    .show()
    .catch(() => {
      /* non-Tauri preview or already-shown window */
    });
};
requestAnimationFrame(reveal);
setTimeout(reveal, 2000);
```

Key properties (do **not** deviate):

- Import is `getCurrentWindow` from `@tauri-apps/api/window` — already in deps via `@tauri-apps/api@^2` (confirmed in `package.json`).
- `reveal` is idempotent: `revealed` flag plus Tauri's `.show()` being no-op on a visible window.
- `.catch(() => {})` is required — non-Tauri `pnpm dev` in a plain browser would otherwise reject and pollute the console.
- 2s `setTimeout` is the safety net against permanent-hidden-window on render errors.

- [ ] **Step 2: Type-check by running the build**

```bash
cd /Volumes/Ambrosio/repos/ai-review
pnpm build
```

Expected: exits 0. `tsc` should accept the `getCurrentWindow` import (the API exists in `@tauri-apps/api@^2`); Vite should bundle without errors.

If `tsc` reports the module/named export cannot be found, check `node_modules/@tauri-apps/api/window.d.ts` — on Tauri v2 the export is `getCurrentWindow`. Do not switch to `getCurrent` (the v1 name); confirm the installed version resolves to v2 in `pnpm-lock.yaml`.

- [ ] **Step 3: Run the full test suite**

```bash
pnpm test:run
```

Expected: all 196 tests pass. Vitest runs under jsdom, where `getCurrentWindow().show()` will reject; the `.catch()` swallows it so no test is affected.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat(startup): reveal Tauri window after first paint

main.tsx now calls getCurrentWindow().show() inside requestAnimationFrame
after React mounts, with a 2s setTimeout safety net and an idempotency
flag. Paired with visible:false in tauri.conf.json, this eliminates the
white native-window flash on cold launch."
```

---

### Task 7: Run all CI gates locally

**Files:** (no changes — validation only)

This mirrors `.github/workflows/ci.yml` so the PR passes on first push.

- [ ] **Step 1: Frontend tests**

```bash
cd /Volumes/Ambrosio/repos/ai-review
pnpm test:run
```

Expected: all 196 tests pass.

- [ ] **Step 2: Frontend build**

```bash
pnpm build
```

Expected: exits 0 with no type errors.

- [ ] **Step 3: Rust formatting**

```bash
cd src-tauri && cargo fmt -- --check
```

Expected: no output (formatter agrees with the tree).

- [ ] **Step 4: Rust compile check**

```bash
cargo check
```

Expected: finishes with no errors.

- [ ] **Step 5: Rust tests**

```bash
cargo test
```

Expected: all tests pass.

- [ ] **Step 6: Rust clippy with warnings-as-errors**

```bash
cargo clippy -- -D warnings
```

Expected: finishes with no warnings.

- [ ] **Step 7: Return to repo root**

```bash
cd /Volumes/Ambrosio/repos/ai-review
```

No commit — this task is pure validation.

---

### Task 8: Manual Tauri smoke test matrix

**Files:** (no changes — manual verification)

Automated tests cannot observe the absence of a visual flash. This matrix is the primary evidence for the acceptance criteria.

- [ ] **Step 1: Produce a debug build**

```bash
cd /Volumes/Ambrosio/repos/ai-review
pnpm tauri build --debug
```

Expected: a debug bundle is written to `src-tauri/target/debug/bundle/…`. Locate the `.app` (macOS) produced by Tauri.

- [ ] **Step 2: Cold-launch scenario A — system dark, no stored preference**

1. Set macOS system appearance to Dark (System Settings → Appearance → Dark).
2. Fully quit the app (`Cmd+Q`).
3. Clear any persisted preference: in the built-in DevTools next session or beforehand via a dev run, `localStorage.removeItem('theme')`. If no prior run has stored anything, skip.
4. Launch the `.app`.

**Expected:** the window appears already dark. No visible white frame. No flicker.

- [ ] **Step 3: Cold-launch scenario B — system light, no stored preference**

1. Set macOS system appearance to Light.
2. Clear `localStorage.theme` (via a prior dev run if needed).
3. Quit and cold-launch the `.app`.

**Expected:** the window appears already light. No flash. If a brief dark micro-frame is visible before the webview paints light, that is acceptable (strictly better than the current white flash, and an accepted trade-off per design R5).

- [ ] **Step 4: Cold-launch scenario C — stored `'light'` on dark system**

1. System appearance: Dark.
2. In a prior dev run, `localStorage.setItem('theme', 'light')`, then quit.
3. Cold-launch the `.app`.

**Expected:** the window appears light on first paint. Stored preference wins.

- [ ] **Step 5: Cold-launch scenario D — stored `'dark'` on light system**

1. System appearance: Light.
2. In a prior dev run, `localStorage.setItem('theme', 'dark')`, then quit.
3. Cold-launch the `.app`.

**Expected:** the window appears dark on first paint.

- [ ] **Step 6: Runtime toggle still works**

1. Launch the app.
2. Click the theme toggle button (rendered by `App.tsx`, line ~1627 per research doc).
3. Verify the UI switches theme live and the preference persists across a relaunch.

**Expected:** toggle switches the palette instantly, `localStorage.theme` is updated, and a subsequent cold launch honors the new value without flash.

- [ ] **Step 7: Record results**

If any scenario shows a visible flash or wrong first-paint color, stop and file a fix before opening the PR. Note any residual font FOUT — if perceptible, mention in the PR description as a follow-up candidate (deferred by design, per research §Open Question 4).

---

### Task 9: Open the pull request

**Files:** (no changes — git/PR only)

- [ ] **Step 1: Push the branch**

```bash
cd /Volumes/Ambrosio/repos/ai-review
git push -u origin task-418-startup-flash
```

Expected: branch pushed; GitHub prints the PR creation URL.

- [ ] **Step 2: Create the PR via `gh`**

```bash
gh pr create --base main --title "task #418: eliminate first-launch startup flash" --body "$(cat <<'EOF'
## Summary

- Tauri main window now starts hidden with `backgroundColor: "#282C34"` and is revealed only after React's first paint — no OS-default white frame.
- Inline synchronous theme bootstrap in `index.html` sets `data-theme="dark"` before CSSOM is built, eliminating the light→dark jump for dark-mode users.
- `useTheme.getInitialTheme` now honors the pre-set attribute so the hook does not overwrite the bootstrap's work on first render.

## Design & research

- `docs/research/418-eliminate-startup-flash.md`
- `docs/plans/2026-04-16-task-418-startup-flash-design.md`
- `docs/plans/2026-04-16-task-418-startup-flash-plan.md`

## Files touched

- `index.html` — inline `<script>` theme bootstrap in `<head>`
- `src/hooks/useTheme.ts` — `getInitialTheme` reads `data-theme` first
- `src/hooks/useTheme.test.ts` — new test for the pre-set attribute handoff
- `src-tauri/tauri.conf.json` — `visible: false` + `backgroundColor`
- `src/main.tsx` — `getCurrentWindow().show()` after rAF + 2s safety net

## Test plan

- [x] `pnpm test:run` — 196 tests pass (baseline 195 + 1 new)
- [x] `pnpm build` — exits 0
- [x] `cd src-tauri && cargo fmt -- --check`
- [x] `cd src-tauri && cargo check`
- [x] `cd src-tauri && cargo test`
- [x] `cd src-tauri && cargo clippy -- -D warnings`
- [x] Manual smoke: cold launch in system dark (no stored pref) — no flash
- [x] Manual smoke: cold launch in system light (no stored pref) — no flash
- [x] Manual smoke: stored `light` on dark system — first paint light
- [x] Manual smoke: stored `dark` on light system — first paint dark
- [x] Manual smoke: runtime theme toggle still works and persists

## Notes

- CSP is currently `null` in `tauri.conf.json`, so the inline bootstrap needs no nonce. If CSP is tightened later, the inline script will need a nonce or hash.
- Inline-script ↔ `useTheme.ts` duplicate the storage key, attribute, and media query. Both files carry mirror comments flagging the coupling.
- Font FOUT is deferred per task description and design doc §R6.
EOF
)"
```

Expected: `gh` prints the PR URL.

- [ ] **Step 3: Return the PR URL**

Paste the printed PR URL into the final status report.

---

## Self-review checklist

**Spec coverage:**
- Acceptance criterion 1 (no blank/white flash) — Tasks 5 + 6 (hidden window + dark bg + rAF reveal).
- Criterion 2 (no light→dark jump) — Task 4 (inline bootstrap) + Task 3 (hook honors attribute).
- Criterion 3 (light-mode launch works) — Task 4 only sets `dark`; absent attribute = light per CSS contract. Verified in Task 8 scenario B.
- Criterion 4 (stored pref wins) — inline script prefers `stored === 'dark' || 'light'` over `prefers-color-scheme`. Task 8 scenarios C/D.
- Criterion 5 (toggle still works) — `useTheme` `useEffect` and `toggle` unchanged. Task 8 step 6.
- Criterion 6 (existing tests green) — Tasks 3 step 3 + 4 step 3.
- Criterion 7 (CI gates green) — Task 7.
- Criterion 8 (dev mode still usable) — `.catch` + `setTimeout` safety net in Task 6.
- Criterion 9 (PR not direct push) — Tasks 1 + 9.

**Placeholder scan:** no TODO/TBD/"add error handling"/"similar to" placeholders. Every code step shows full code.

**Type consistency:** `Theme = 'light' | 'dark'`, storage key `'theme'`, attribute `'data-theme'`, dark value `'dark'`, media query `'(prefers-color-scheme: dark)'`, function `getCurrentWindow()` — all consistent across Tasks 2, 3, 4, 6.
