---
task_id: 418
title: ai-review — eliminate first-launch Tauri startup flash
date: 2026-04-16
project: ai-review
phase: backlog-grooming (ready for design)
prior_art:
  - src-tauri/tauri.conf.json
  - index.html
  - src/main.tsx
  - src/index.css
  - src/hooks/useTheme.ts
  - src/hooks/useTheme.test.ts
  - .github/workflows/ci.yml
---

## TL;DR

Small, surgical fix — verdict: **ready for design, no splitting needed**. All three hypotheses in the task description are confirmed by the current code:

1. The main window has neither `visible: false` nor `backgroundColor` set, so Tauri shows it immediately with the OS default (white on macOS).
2. The theme is applied inside React's `useEffect` (`useTheme.ts:16-32`), i.e. strictly after first paint. The CSS `:root` palette is the light (Catppuccin Latte) one, so **every cold launch paints light first**, then snaps to dark for dark-mode users — a guaranteed flash.
3. Fonts are imported via `@fontsource/geist` through `index.css`; they load with the bundle's CSS and rely on `font-display: swap`, yielding a small FOUT. Minor relative to the theme jump.

The fix is a ~4-file change: inline theme bootstrap in `index.html`, `visible: false` + a neutral `backgroundColor` in `tauri.conf.json`, call `getCurrentWindow().show()` once React has committed its first paint, and a tiny reconcile in `useTheme` so it doesn't re-thrash the attribute that the inline script already set. Font preload is optional polish.

## Scope confirmation

**In scope (v1):**
- Tauri window starts hidden; shown after React's first paint.
- Native window `backgroundColor` set to a neutral value that won't jar either theme if ever briefly visible.
- Synchronous theme bootstrap in `index.html` that sets `data-theme` on `<html>` from `localStorage.theme` → falling back to `prefers-color-scheme` — using the *same* key and attribute as `useTheme.ts` to avoid divergence.
- `useTheme` updated so its initial render does not pointlessly re-apply the attribute that the inline script already wrote (still honors toggles and persistence).
- Unit coverage extension in `useTheme.test.ts` for the pre-set `data-theme` case.
- Manual smoke test on cold launch in both system dark and light mode.

**Out of scope (v1):**
- Full font preload pipeline / swapping `@fontsource` for self-hosted woff2 with `<link rel="preload">` — task calls this "optional polish" and doing it properly means resolving Vite's hashed asset URL; defer unless a visible font flash remains after the window/theme fix. *Reasoning:* task explicitly flags this as optional and the flash is minor compared to the theme jump.
- Theme system refactor (moving away from `data-theme` attribute, introducing a context, etc.). *Reasoning:* task says "small and robust, not a heavy refactor".
- Per-platform tuning (Windows/Linux backgroundColor). *Reasoning:* primary user platform is macOS; a single neutral color that looks OK in both themes is sufficient.
- Splash screen / loading indicator. *Reasoning:* hidden-window-until-ready already solves the UX problem without extra surface area.

## Architectural alignment

**Current failure sequence on cold launch (dark-mode user):**

1. `src-tauri/src/lib.rs:478-548` — `tauri::Builder::default()...run(tauri::generate_context!())`. No call to `window.hide()` and no `visible: false` in the config, so the window becomes visible as soon as Tauri creates it.
2. `src-tauri/tauri.conf.json:13-21` — main window spec has only `title`/`width`/`height`/`minWidth`/`minHeight`. No `visible`, no `backgroundColor`. → native window paints white.
3. `index.html:1-14` — no inline theme script; `<html>` has no `data-theme` attribute at parse time.
4. `src/index.css:36-64` — `:root { --ctp-base: rgb(239 241 245); ... }` (Latte/light). The `html`/`body` background at lines 98-111 resolves via `var(--ctp-base)` → light color. → first paint = light.
5. `src/main.tsx:1-10` — `ReactDOM.createRoot(...).render(<App/>)`.
6. `src/App.tsx:106` — `const { theme, toggle: toggleTheme } = useTheme();`
7. `src/hooks/useTheme.ts:7-11` — `getInitialTheme()` reads `localStorage.theme` then `prefers-color-scheme`. Returns `'dark'`.
8. `src/hooks/useTheme.ts:16-22` — `useEffect` runs after commit, sets `document.documentElement.setAttribute('data-theme','dark')`. → paint switches to dark. **That is the flash.**

**Reuse points the implementer will touch (verified against code at HEAD = 7ed7d3d on `task-410-exec-2-rebuild`):**

- `src-tauri/tauri.conf.json:13-21`: extend the window object with `"visible": false` and `"backgroundColor": "#282C34"` (One Dark base) — or a mid-neutral like `"#1F2328"`; see Open Question 1.
- `index.html:2-10`: add a small `<script>` block inside `<head>` that:
  - reads `localStorage.getItem('theme')` (same key as `useTheme.ts:8`),
  - if `'dark'` sets `document.documentElement.setAttribute('data-theme','dark')`,
  - else if `'light'` does nothing,
  - else falls back to `window.matchMedia('(prefers-color-scheme: dark)').matches` (same query as `useTheme.ts:10`) and applies `'dark'` accordingly.
  Keep it synchronous and free of external dependencies — this runs before the `<script type="module">` that loads `main.tsx`.
- `src/main.tsx:6-10`: after `createRoot(...).render(...)`, schedule `await getCurrentWindow().show()` inside a `requestAnimationFrame` (or `queueMicrotask` + `rAF`) so the browser has produced at least one frame. Import from `@tauri-apps/api/window` (already in deps via `@tauri-apps/api@^2`). Wrap in a try/catch so non-Tauri dev previews (`pnpm dev` in a browser) don't crash.
- `src/hooks/useTheme.ts:14-32`: two small adjustments:
  1. In `getInitialTheme()`, prefer reading the pre-set `data-theme` attribute if present (it's the source of truth since the inline script ran first). This removes the re-read of `localStorage` on mount.
  2. In the `useEffect`, add an early-exit if the current attribute already matches — or just let React re-apply the same value; it's cheap, but still worth avoiding the `localStorage.setItem` on the very first render so we don't mutate storage on mere app launch. *(See Open Question 3.)*
- `src/hooks/useTheme.test.ts:5-68`: add one test that seeds `document.documentElement.setAttribute('data-theme','dark')` before `renderHook`, and verifies the hook picks it up without blowing it away.

**CI gates (from `.github/workflows/ci.yml`):**
- `pnpm test:run` (vitest, ubuntu-latest, Node 24)
- `pnpm build` (tsc + vite)
- `cd src-tauri && cargo fmt -- --check`
- `cd src-tauri && cargo check`
- `cd src-tauri && cargo test`
- `cd src-tauri && cargo clippy -- -D warnings`

The Rust-side changes here are config-only (`tauri.conf.json`), so all Rust gates should be no-op pass-through. Frontend gates need the new `useTheme.test.ts` case to land.

## Acceptance criteria

1. **No blank/white flash on cold launch** — measurable by launching `pnpm tauri build --debug` output on macOS with system in dark mode. The window must not show a light/white frame at any point before the dark UI.
2. **No visible light → dark jump** in dark-mode launch. Initial paint already dark.
3. **No regression in light-mode launch.** System light + no stored pref → first paint is light, no flicker.
4. **Stored preference wins over system.** `localStorage.theme = 'light'` on a dark-system machine → first paint is light.
5. **Theme toggle still works at runtime.** Clicking the theme toggle (App.tsx:1628) switches theme, persists to `localStorage`, and updates `data-theme` as before.
6. **Existing tests green.** `pnpm test:run` passes (current baseline is 195 tests per task-417 completion notes; expect +1 new test).
7. **CI gates green.** `pnpm build`, `cargo fmt --check`, `cargo check`, `cargo test`, `cargo clippy -- -D warnings` all pass.
8. **Dev mode still usable.** `pnpm tauri dev` launches the app and the window eventually appears (no permanent hidden window if the `.show()` call silently fails — hence the try/catch).
9. **Delivered via PR against `main`**, not pushed directly.

## Open questions

1. **What `backgroundColor` to set in `tauri.conf.json`?**
   - Recommendation: `"#282C34"` (exact One Dark `--ctp-base` from `index.css:68`). Rationale: since 80%+ of users launch in dark (typical dev-tool profile) and the window stays hidden until React paints, the native color only matters in the micro-window between Tauri creating the OS window and `show()` being called. A dark neutral minimizes worst-case flash for dark users and is tolerable for light users if ever visible. If the team prefers theme-agnostic, go with a mid-gray like `"#3A3F4B"`. *Implementer can take the One Dark `#282C34` value unilaterally.*

2. **Where to place the `.show()` call in the frontend lifecycle?**
   - Options: (a) after `createRoot(...).render(<App/>)` in `main.tsx` wrapped in `requestAnimationFrame`; (b) inside a top-level `useLayoutEffect` in `App.tsx`; (c) on Tauri's `onWebviewReady`.
   - Recommendation: (a) — simplest, and `rAF` guarantees the browser has laid out and painted at least once. (b) couples App.tsx to window lifecycle for no gain. (c) fires before React has painted.
   - *Implementer can take (a) unilaterally.*

3. **Should `useTheme`'s effect skip the initial `localStorage.setItem`?**
   - Current behavior on first launch persists the resolved theme to storage even without user action. This is pre-existing, not introduced by this task.
   - Recommendation: leave the persist-on-init behavior as-is to keep the diff minimal; only prevent the redundant `setAttribute` call if `data-theme` already equals the target. *Alternatively*: track a `didInit` ref and skip the write on first run. Either is acceptable — implementer's call. *Recommended default: leave persist-on-init alone.*

4. **Font flash: fix now or defer?**
   - Recommendation: **defer.** Manually verify after the theme/window fix whether any font flash is still perceptible. If yes, follow up in a tiny separate PR that adds `<link rel="preload" as="font" crossorigin href="...geist-400.woff2">` with the Vite-emitted hashed URL resolved via a plugin or a prebuilt copy. If imperceptible, close as no-op. *Implementer can take "defer" unilaterally.*

5. **Any Tauri v2 quirks on `visible: false` + `.show()` in dev mode?**
   - Best-effort answer: Tauri v2 honors `visible: false` in config, and `getCurrentWindow().show()` works identically in dev and release. The main risk is a JS error earlier in module init that prevents `.show()` from ever running — hence the try/catch wrapper and the suggestion to place it in `main.tsx` (few dependencies) rather than deep in `App.tsx`. *No action needed for implementer; just keep the show() call robust.*

## Implementation order

Sequenced so each step is independently verifiable:

1. **`index.html`** — add the inline theme bootstrap script inside `<head>`, above the existing module script. Smoke-test in `pnpm dev` (browser preview) that `data-theme` is set before React mounts.
2. **`src/hooks/useTheme.ts`** — update `getInitialTheme` to prefer the pre-set `data-theme` attribute; keep fallbacks intact.
3. **`src/hooks/useTheme.test.ts`** — add a test for the pre-set attribute case; re-run `pnpm test:run`.
4. **`src-tauri/tauri.conf.json`** — add `"visible": false` and `"backgroundColor": "#282C34"` to the main window entry.
5. **`src/main.tsx`** — after `createRoot(...).render(...)`, `requestAnimationFrame(() => getCurrentWindow().show().catch(() => {}))`. Add the `@tauri-apps/api/window` import.
6. **Manual smoke test matrix** — launch `pnpm tauri build --debug` cold in:
   - system dark + no stored pref (expect: dark, no flash)
   - system light + no stored pref (expect: light, no flash)
   - system dark + `localStorage.theme='light'` (expect: light, no flash)
   - system light + `localStorage.theme='dark'` (expect: dark, no flash)
   - Toggle theme at runtime (expect: switches and persists, like today).
7. **Run CI gates locally** — `pnpm test:run`, `pnpm build`, `cargo fmt --check`, `cargo check`, `cargo test`, `cargo clippy -- -D warnings`.
8. **Open PR** from a feature branch (e.g. `task-418-startup-flash`) against `main`.

## Risks / things to watch

- **Dev-mode deadlock risk.** If the `.show()` call is gated on React ever committing, a fatal error before render leaves the window permanently hidden — a dev-hostile failure mode. Mitigation: `try/catch` on `show()`, and consider a 2s safety timeout in `main.tsx` that forces-shows the window if first paint somehow never happens. *Optional, but cheap insurance.*
- **HMR in `pnpm tauri dev`.** If the `.show()` fires on every module reload, make sure it's idempotent (Tauri's `show()` is safe to call on an already-visible window). Confirm empirically during smoke test.
- **Inline script + CSP.** `tauri.conf.json:24` has `"csp": null`, so inline scripts are permitted. If CSP is tightened later, the inline bootstrap needs a nonce or hash. Call this out in the PR description so future CSP work doesn't silently break the flash fix.
- **Duplicated theme logic.** The inline script and `useTheme.ts` duplicate the localStorage key, attribute name, and matchMedia query. Divergence = silent regression. Keep both in sync and consider a terse comment in both places ("mirror of inline bootstrap in index.html").
- **Non-Tauri preview.** `pnpm dev` runs the React app in a browser without Tauri. Importing `@tauri-apps/api/window` is fine (it no-ops in non-Tauri contexts in v2), but `getCurrentWindow().show()` will throw — hence the `.catch()`.
- **Test env.** `useTheme.test.ts` runs under jsdom; `localStorage` and `matchMedia` are mocked in `beforeEach`. The new test must reset `data-theme` correctly between runs (existing `afterEach` at line 22 already does `removeAttribute('data-theme')`, so this is fine).

## Definition of done (handoff sign-off)

This groom is **ready for design/implementation**. A design agent or implementer can pick this up and:

- Write a plan following the `docs/plans/2026-04-08-update-react-to-19.2.5.md` template (or skip straight to implementation — this is small enough).
- Execute the implementation order above.
- Verify all acceptance criteria.
- Open a PR.

No further information-gathering is required. All architectural claims above were verified against the current code at commit `7ed7d3d` on branch `task-410-exec-2-rebuild` on 2026-04-16.
