---
task_id: 418
title: ai-review — eliminate first-launch Tauri startup flash (design)
date: 2026-04-16
project: ai-review
phase: design
supersedes: none
upstream: docs/research/418-eliminate-startup-flash.md
---

# Eliminate First-Launch Startup Flash — Design

**Goal:** First cold launch paints the correct theme on the very first frame — no white flash, no light→dark jump.

**Approach:** Two independent gates composed serially.
1. **Color gate** — the native OS window never paints a wrong color. Achieved by starting the window hidden with a pre-set dark `backgroundColor`, and only revealing it after the webview has committed a first paint.
2. **Theme gate** — the webview's first paint already matches the final theme. Achieved by a synchronous inline bootstrap in `index.html` that sets `data-theme` on `<html>` before any stylesheet is applied and before React mounts.

Neither gate alone is sufficient. (1) without (2) produces a dark-window-then-light-webview flash for light-mode users. (2) without (1) fixes the webview flash but the native window still paints white on macOS before the webview is ready.

**Non-goals (explicitly deferred):**
- Font FOUT mitigation via preload of self-hosted woff2.
- Refactor of the theme system (context, provider, non-attribute mechanism).
- Per-platform (`windows`/`linux`) native background tuning.
- A splash screen.

---

## 1. Architecture decisions

### D1. Two-phase reveal: hidden native window + `.show()` after first paint

**Decision:** `tauri.conf.json` sets `"visible": false`; `main.tsx` calls `getCurrentWindow().show()` inside a `requestAnimationFrame` callback after `createRoot(...).render(...)` has kicked off React's first commit.

**Why:** On macOS, Tauri's default behavior is to create the OS window visible immediately. Any delay between OS window creation and the webview's first paint shows through as a white frame. Starting hidden and revealing after rAF gives the webview at least one laid-out, painted frame before the user sees anything. `rAF` (rather than a no-op microtask or a `setTimeout`) specifically fires *after* the browser has committed a frame, which is the guarantee we need.

**Alternatives considered:**
- *Splash screen window* — too much surface area for a startup flash.
- *Tauri's `onWebviewReady` event* — fires before React has committed; still allows a white frame.
- *`useLayoutEffect` in `App`* — couples `App.tsx` to window lifecycle; no gain over `main.tsx`.
- *`.show()` inside a React top-level effect* — works, but splits the reveal logic across two files.

### D2. Native `backgroundColor` = One Dark base `#282C34`

**Decision:** Set `"backgroundColor": "#282C34"` on the main window.

**Why:** The native color only matters in the micro-window between OS-window creation and `.show()` firing — in theory imperceptible, but chrome repaint glitches, window restoration, and any error path that leaves the window briefly visible before the reveal all benefit from a sensible default. The primary audience for a dev-oriented code-review tool skews toward dark mode; painting `#282C34` (the exact value of `--ctp-base` used by `index.css`'s One Dark palette) minimizes worst-case flash for dark users and is a tolerable gray for light users if ever briefly visible. Symmetry would require per-system-theme tuning, which is out of scope.

**Trade-off accepted:** A light-mode user on a misconfigured machine (e.g. `.show()` throws and safety timeout kicks in) would briefly see a dark frame. This is strictly better than the current white-flash-for-everyone baseline.

### D3. Synchronous inline theme bootstrap in `index.html`

**Decision:** Add a small, no-dependency `<script>` in `<head>` (before the module script that loads `main.tsx`) that reads `localStorage.theme` → falls back to `prefers-color-scheme` → sets `data-theme="dark"` on `<html>` if the resolved theme is dark.

**Why:** React's `useEffect` fires after commit, so any theme logic inside React runs *after* first paint — that is precisely the source of the light→dark jump. Inline `<script>` in `<head>` runs during HTML parsing, before the stylesheet link in the imported `index.css` is resolved and applied. By the time the CSSOM is built, `data-theme="dark"` is already an attribute on `<html>`, so the CSS cascade picks the dark palette on the first paint.

**Attribute convention (matches current code):** `data-theme="dark"` is present for dark mode; **absent** for light mode. Not `data-theme="light"`. This preserves the existing CSS contract in `index.css:36-64` where `:root` is the light palette and `[data-theme='dark']` overrides it. The inline script therefore *never sets* a `light` value — it either sets `dark` or does nothing.

**Alternatives considered:**
- *CSS `@media (prefers-color-scheme)` only* — can't honor the user's stored override.
- *Put a `style` block in `<head>` with both palettes and toggle via a class applied by inline script* — same structural problem, more code.
- *Use a framework like `next-themes`* — wildly out of scope for one flash.

### D4. `data-theme` attribute pre-check in `getInitialTheme`

**Decision:** `getInitialTheme()` checks `document.documentElement.getAttribute('data-theme')` first. If `'dark'`, return `'dark'` without re-reading `localStorage` or `matchMedia`. Otherwise fall through to the existing logic.

**Why:** The inline script is the authoritative source at mount time — it already resolved `localStorage` → `matchMedia` identically to what the hook would do. Re-running that resolution inside React creates two risks: (a) races against any code that might have already toggled the attribute, and (b) divergence if the fallback chain in the inline script and the hook ever drift apart. Reading the attribute the inline script just wrote is both cheaper and canonical.

**Why not remove the other paths entirely?** Because `pnpm dev` (browser preview, no Tauri) and jsdom-based tests don't run the inline script identically (jsdom parses the template but does not execute the `<script>` in Vitest's environment). Keeping the existing fallbacks makes the hook robust in all three environments (Tauri, `pnpm dev`, vitest).

### D5. Single source of truth for theme key + attribute

**Decision:** Both the inline script and `useTheme.ts` use `localStorage` key `'theme'`, attribute `data-theme`, media query `(prefers-color-scheme: dark)`, and the "present = dark / absent = light" convention. A one-line comment in both spots flags the mirroring.

**Why:** Divergence here is silent — if one side uses `'theme'` and the other `'themePreference'`, the first paint is correct but the first re-render clobbers it (or vice versa). Cheap to prevent, expensive to detect.

### D6. Dev-hostile failure mode guard

**Decision:** The `.show()` call in `main.tsx` is wrapped in a `try/catch` (or `.catch(() => {})` on the returned promise). Additionally, a safety `setTimeout(() => getCurrentWindow().show().catch(() => {}), 2000)` ensures that if React never commits a first frame (e.g. a top-level render error before any `componentDidMount`), the window is not permanently hidden.

**Why:** A window that stays hidden forever on an error path is far worse than a brief flash — it looks like the app failed to launch. The 2-second ceiling is generous enough that it never fires on a healthy launch but short enough to feel like a launch failure rather than a hang.

---

## 2. Key components and their responsibilities

| Component | File | Responsibility after this change |
|---|---|---|
| Tauri window config | `src-tauri/tauri.conf.json` | Declare the main window as hidden at startup with a dark `backgroundColor`. **Does not** decide *when* to show — that's the frontend's job. |
| Inline theme bootstrap | `index.html` (`<head>`) | Synchronously resolve the effective theme (`localStorage` → `prefers-color-scheme`) and set `data-theme="dark"` on `<html>` before any stylesheet is applied. No dependencies, no imports, no async. |
| App entry + window reveal | `src/main.tsx` | Mount React, then reveal the Tauri window after the first rAF. Owns the try/catch and safety timeout. |
| `useTheme` hook | `src/hooks/useTheme.ts` | Own the *runtime* theme state: toggling, persistence, attribute mutation on change, hljs stylesheet injection. On first render, prefers the pre-set `data-theme` attribute over re-resolving sources. |
| `useTheme` test | `src/hooks/useTheme.test.ts` | Covers: pre-set dark attribute is preserved; pre-set-absent with dark system pref returns dark; pre-set-absent with stored `'light'` returns light; toggle persists and mutates attribute correctly. |

### Responsibility boundaries

- **The inline script only sets `data-theme`.** It does not touch `localStorage` (no writes), does not inject stylesheets, does not dispatch events. It is read-only against storage and append-only against the DOM.
- **`useTheme` owns all writes to `localStorage.theme`.** The inline script reads; the hook writes. This keeps the mental model simple: persistence happens in one place.
- **`main.tsx` owns window visibility.** `App.tsx` does not import `@tauri-apps/api/window`. Keeps App testable in jsdom and portable to the `pnpm dev` browser preview.
- **`tauri.conf.json` owns only the initial native-window state.** It never knows when to reveal.

---

## 3. Data models and interfaces

### 3.1 Theme state

The domain model is unchanged:

```ts
type Theme = 'light' | 'dark';
```

### 3.2 Shared constants (conceptual contract)

Although we do not extract these into a shared module (YAGNI for three call sites), the inline script and `useTheme` MUST agree on:

| Constant | Value |
|---|---|
| Storage key | `"theme"` |
| Attribute name | `"data-theme"` |
| Attribute value for dark | `"dark"` |
| Attribute for light | *absent* (attribute removed) |
| System media query | `"(prefers-color-scheme: dark)"` |

### 3.3 Inline bootstrap interface

```html
<!-- runs in <head>, before index.css is loaded via main.tsx -->
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
      // light: leave attribute absent (CSS :root defaults to Latte).
    } catch (_) {
      // storage/matchMedia unavailable (e.g. private mode quirks).
      // Fall through — React bootstrap will resolve theme post-mount.
    }
  })();
</script>
```

Contract:
- Input: `localStorage`, `window.matchMedia`, `document.documentElement`.
- Output: optionally sets `data-theme="dark"` on `<html>`. No return value, no side effects elsewhere.
- Failure mode: silently no-ops on any throw. Legacy `useEffect` path still runs.

### 3.4 `getInitialTheme` updated contract

```ts
function getInitialTheme(): Theme {
  // Prefer the attribute already set by the inline bootstrap.
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    return 'dark';
  }
  // Fallbacks: storage → system. Kept for pnpm dev (browser) and vitest.
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
```

Invariants:
- Pure function of DOM + storage + media state at call time.
- Does not write anywhere.
- Returns a value from the `Theme` union; never throws for missing `localStorage` (already guarded by browser env).

### 3.5 Tauri window config delta

```json
{
  "title": "AI Review - Code Review Tool",
  "width": 1400,
  "height": 900,
  "minWidth": 1000,
  "minHeight": 700,
  "visible": false,
  "backgroundColor": "#282C34"
}
```

Two added keys. No removals. No renames.

### 3.6 `main.tsx` reveal interface

```ts
import { getCurrentWindow } from '@tauri-apps/api/window';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Reveal after React has queued its first commit; rAF runs post-paint.
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  getCurrentWindow().show().catch(() => {
    // non-Tauri preview (pnpm dev in browser): no-op.
  });
};
requestAnimationFrame(reveal);
// Safety net: if first paint never lands, don't leave window hidden forever.
setTimeout(reveal, 2000);
```

Contract:
- `reveal` is idempotent — it may be called from both `rAF` and the `setTimeout` without double-showing. Tauri's `.show()` is itself idempotent on an already-visible window, but we guard locally for clarity.
- Non-Tauri environments swallow the rejection silently.

---

## 4. Risks and trade-offs

### R1. Inline-script ↔ `useTheme` divergence
**Risk:** The two code sites duplicate the localStorage key, attribute name, and media query. If one is updated without the other (rename, new value, new fallback), the first paint is correct but the first React commit clobbers it, or vice versa.
**Mitigation:** A short comment in both places ("mirror of inline bootstrap in index.html" / "mirror of useTheme's getInitialTheme"). A unit test in `useTheme.test.ts` that seeds `data-theme="dark"` and asserts the hook honors it without overwriting.
**Accepted because:** Extracting into a shared JS module would require it to run in inline-script context (no ESM), which complicates the build. Three call sites, two files, small blast radius.

### R2. Dev-mode permanently hidden window
**Risk:** A top-level render error before React commits means `rAF` never fires a useful callback, and a silent failure in `.show()` leaves the window hidden forever. Looks like a failed launch.
**Mitigation:** 2-second `setTimeout` safety net calls `reveal` unconditionally. Idempotency guard ensures one actual `.show()` call.
**Accepted because:** 2s is short enough to feel like a slow launch, not a hang, but long enough to never fire on healthy hardware.

### R3. CSP tightening breaks inline script
**Risk:** `tauri.conf.json` currently has `"csp": null`. If a future change adds a CSP, inline scripts become forbidden and the theme bootstrap silently fails — the startup flash returns without test coverage detecting it (the hook still works; jsdom doesn't execute the inline script anyway).
**Mitigation:** A comment in `tauri.conf.json`'s `security` block (or a line in the PR description) flagging that tightening CSP requires adding a nonce or hash for the inline script. Optionally, a manual smoke-test entry in the repo's release checklist.
**Accepted because:** CSP is not on the near-term roadmap. Preemptive work (nonce plumbing) is out of scope for this task.

### R4. `pnpm dev` (browser preview) behavior
**Risk:** `getCurrentWindow().show()` throws in non-Tauri contexts. An unhandled rejection would pollute the dev console.
**Mitigation:** `.catch(() => {})` on the `.show()` promise.
**Accepted because:** It's one extra line and preserves the browser preview as a first-class dev target.

### R5. Native background visible in edge cases
**Risk:** If `reveal` is delayed (very slow machine, large bundle, cold disk), the user may briefly see the dark `#282C34` window border instead of the webview. Light-mode users will see it as a brief dark frame.
**Mitigation:** Accepted. Strictly better than the current white flash for everyone. Could be mitigated further by reading the initial theme from disk in Rust and setting `backgroundColor` per-boot, but that requires a Tauri config or init-script hack that's disproportionate for a sub-50ms window.
**Accepted because:** The task explicitly calls for "small and robust, not a heavy refactor".

### R6. Font FOUT remains after this change
**Risk:** `@fontsource/geist` still loads through `index.css` with `font-display: swap`, so a subtle font substitution flash can remain.
**Mitigation:** Deferred by design (D-non-goals). Task description flags it as optional; measure after the window/theme fix and file a follow-up task if visible.
**Accepted because:** Ordering: eliminate the two guaranteed flashes first, then assess whether the optional one is worth solving.

### R7. HMR in `pnpm tauri dev`
**Risk:** A hot reload re-runs `main.tsx`, which would call `.show()` again. If Tauri's `.show()` has side effects on an already-visible window (refocus, bring-to-front, bounce dock icon on macOS), the dev loop becomes annoying.
**Mitigation:** Idempotency guard (`revealed` flag) in `main.tsx` prevents the second `.show()`. `revealed` is module-local, so HMR that replaces the module will reset it — but a reveal on HMR is no worse than today's behavior (the window is always visible in dev already).
**Accepted because:** Empirical confirmation during smoke test is sufficient; tweakable if annoying.

### R8. Test environment coverage gap
**Risk:** Vitest runs under jsdom, which parses the `index.html` template but does not execute inline `<script>` blocks during test setup. Therefore, the inline bootstrap itself is not covered by automated tests.
**Mitigation:** The hook test (R1 mitigation) covers the *handoff* — asserting that `useTheme` reads a pre-set attribute correctly. The bootstrap script itself is small (~10 lines), pure, and verifiable manually. Adding a dedicated test for it would require spinning up a jsdom with a real HTML parse + script exec, which is disproportionate.
**Accepted because:** The critical interface — "if `data-theme` is already set, the hook respects it" — is tested. The inline script's correctness is verifiable by eye and by smoke test.

---

## 5. Ordering (design-level, not task-level)

The design imposes no strict order between the three changes, but for bisect-friendliness:

1. Inline bootstrap first (`index.html` + `useTheme.ts` + test). This alone eliminates the theme jump once the webview paints.
2. Tauri window gate second (`tauri.conf.json` + `main.tsx`). This adds the hidden-then-reveal behavior.
3. Manual smoke test matrix (dark+no-pref, light+no-pref, dark+stored-light, light+stored-dark, toggle at runtime).

Two commits (or two review rounds) are natural — one frontend-only, one spanning Tauri config + `main.tsx`. A reviewer can evaluate them independently.

The full TDD task decomposition (with per-step commits, exact commands, and expected output) is the next phase's deliverable, not this one's.

---

## 6. Handoff

**Design complete.** Open questions from the research doc have all been resolved by explicit decisions (D1–D6). The implementer can now write a plan following the template in `docs/plans/2026-04-08-update-react-to-19.2.5.md` and proceed.

- Architecture locked: two gates, four files, no new modules.
- Interfaces locked: inline script contract, `getInitialTheme` contract, `main.tsx` reveal contract, `tauri.conf.json` delta.
- Risks enumerated with accepted trade-offs.
- Non-goals explicit (font FOUT, theme refactor, per-platform tuning, splash).

No further design work required. Delivery is via feature branch + PR against `main`.
