# Electron Migration Design

**Date:** 2026-05-02
**Branch:** `nacho/electron`
**Status:** Approved (design)

## Motivation

The Tauri shell shows rendering jank on large diffs (slow scroll, syntax-highlight repaint). The cause is WebKit's behavior under heavy DOM updates from `react-diff-view`. Switching the shell from Tauri (WebKit) to Electron (Chromium) is expected to resolve the rendering pain at the cost of a larger bundle and slightly slower cold start. Both costs are explicitly accepted.

The Rust backend (git/file/config) has no Tauri-specific logic except attribute macros and is preserved.

## Goals

- Replace Tauri shell with Electron, retaining all current features and behavior.
- Keep the Rust backend code; run it as a sidecar process the Electron main process talks to over JSON-RPC on stdio.
- Preserve the `air` CLI UX, including `--wait`, `--json`, and the `--diff-commit` / `--diff-range` / `--diff-branch` flags.
- Preserve the existing test suite with minimal churn.

## Non-Goals

- Auto-update, code signing, notarization, DMG packaging.
- Windows/Linux first-class testing (best-effort only; macOS is primary).
- Any change to git/file behavior, the renderer UI, or comment model.
- Performance work beyond the shell swap.

## Architecture

Three processes (vs Tauri's two):

```
┌─────────────────────────────────────────────┐
│  Electron app  (com.nacholopez.ai-review)   │
│  ┌────────────┐    ┌──────────────────┐     │
│  │  Renderer  │◄──►│   Main process   │     │
│  │  (React)   │IPC │ • window mgmt    │     │
│  │            │    │ • native menu    │     │
│  │            │    │ • dialogs        │     │
│  │            │    │ • argv parsing   │     │
│  └────────────┘    └─────────┬────────┘     │
└─────────────────────────────┬┼──────────────┘
                              ││ stdio
                              ▼▼ (newline-delim JSON-RPC 2.0)
                    ┌──────────────────┐
                    │  Rust sidecar    │
                    │  core-sidecar    │
                    │  (git, files,    │
                    │   config)        │
                    └──────────────────┘

  separate process tree:
                    ┌──────────────────┐    spawn      ┌────────────┐
  user runs `air` ─►│  core-launcher   │ ─────────────►│  Electron  │
                    │  (~100 LoC Rust) │   (open -a)   │     app    │
                    └──────────────────┘               └────────────┘
                       waits + forwards stdio/exit when --wait
```

### Components

**Renderer.** Unchanged React/Vite app. Imports from a new `src/lib/bridge.ts` instead of `@tauri-apps/api/*`. No direct knowledge of the shell.

**Main process.** Owns window, native macOS menu (`Install CLI…`), dialogs, argv parsing, sidecar lifecycle, and the JSON-RPC pipe. Forwards renderer `bridge.invoke()` calls to the sidecar by `id` and routes responses back. Four launch-context calls (`get_working_directory`, `is_wait_mode`, `is_json_output`, `get_initial_diff_mode`) are served directly by main, not the sidecar, since they reflect the launch state.

**Rust sidecar (`core-sidecar`).** Reads stdin line-by-line, parses JSON-RPC 2.0, dispatches to `core-lib`, writes responses on stdout. Stderr is reserved for log output (forwarded to Electron's main-process console). Sequential dispatch is fine — the renderer pipelines on its end. ~200 LoC plus `core-lib`.

**Rust launcher (`core-launcher`).** Standalone CLI binary. Locates `AI Review.app` (checks `/Applications`, then `~/Applications`), spawns via `open -a "AI Review.app" --args "$PWD" "$@"`, and (when `--wait`) blocks via `open -W`, forwarding exit code. Replaces the current `cli/air` shell script and is the symlink target installed by `Install CLI…`.

## IPC Protocol

Newline-delimited JSON-RPC 2.0 between Electron main and the Rust sidecar. One request per line, one response per line:

```
→ {"jsonrpc":"2.0","id":42,"method":"get_unstaged_diff","params":{"path":"/repo"}}
← {"jsonrpc":"2.0","id":42,"result":{...}}
← {"jsonrpc":"2.0","id":42,"error":{"code":-32000,"message":"not a git repo"}}
```

- Method names match the current Tauri command names verbatim. Zero rename surface.
- Each request gets an incrementing `id`; responses route through a `Map<id, {resolve, reject}>` in the main process.
- Renderer ↔ main uses Electron's standard `ipcRenderer.invoke` / `ipcMain.handle`, exposed to the renderer via `contextBridge` from a preload script.
- Errors propagate as JS `Error` instances on the renderer side with `message` matching the sidecar's error string (preserving today's `Result<T, String>` shape).

## Frontend Bridge

`src/lib/bridge.ts`:

```ts
export async function invoke<T>(method: string, args?: object): Promise<T>
export function listen(event: string, cb: (e: any) => void): () => void
export function getCurrentWindow(): { /* minimal shim used by App.tsx */ }
```

Implementation calls `window.electronAPI.*` exposed via `contextBridge` from the preload script. Tests mock `bridge` directly. All ~12 source files importing `@tauri-apps/api/*` change one line each.

**Events kept:** `tauri://focus` is renamed to `app:focus`; `menu-install-cli` keeps its name. Both pumped from main → renderer via `webContents.send`.

## Rust Workspace Layout

```
core/
├── Cargo.toml             # workspace root
├── core-lib/              # current git.rs, files.rs, config.rs
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── git.rs
│       ├── files.rs
│       └── config.rs
├── core-sidecar/          # JSON-RPC binary
│   ├── Cargo.toml
│   └── src/main.rs
└── core-launcher/         # `air` CLI
    ├── Cargo.toml
    └── src/main.rs
```

`core-lib` is a pure library: no Tauri, no async, just the existing functions returning `Result<T, String>`. Removed Rust deps: `tauri`, `tauri-build`, `tauri-plugin-opener`, `tauri-plugin-dialog`. Added: `serde_json` (already present transitively).

## Argv & Launch Context

Electron main parses `process.argv` (skipping Electron's own flags) for: `--wait` / `--wait-mode`, `--json` / `--json-output`, `--diff-commit` / `--commit`, `--diff-range` / `--commits`, `--diff-branch` / `--branch`, and a positional working-directory argument. Same flags as today's Rust parsing in `src-tauri/src/lib.rs::run`.

Result is held in main and exposed via the four launch-context RPC methods. The renderer sees no behavior change.

## Submit-Feedback Path (`--wait` / `--json`)

Today's Tauri `submit_feedback` command writes the feedback string to stdout and exits the process. In the new design, the launcher owns stdout (the user's terminal sees `core-launcher`'s output, not Electron's), and macOS `open -W` does not forward the launched app's stdout.

**Approach:** the launcher creates a temp file path (e.g., `/tmp/ai-review-feedback-<pid>.txt`) and passes it to Electron via `--feedback-pipe <path>`. The renderer's `bridge.invoke("submit_feedback", {feedback})` causes main to write the feedback to that path, then `app.quit()`. The launcher reads the file (if present), forwards its contents to its own stdout, then exits with the appropriate code.

If the launcher detects no feedback file after Electron exits (user closed the window without submitting), it exits with code 1 — matching today's `wait_mode { std::process::exit(1) }` behavior.

**Fallback (recorded, not chosen):** if the temp-file approach proves fragile, replace it with a localhost HTTP loopback (Electron main listens on a random port, launcher passes the port via argv, Electron POSTs feedback to it before quitting).

## Window Chrome & Menu

`BrowserWindow` config:
- `titleBarStyle: 'hiddenInset'` (Electron equivalent of Tauri's `Overlay` + `hiddenTitle`)
- `trafficLightPosition: { x: 16, y: 20 }`
- `backgroundColor: '#282c34'`
- `width: 1400, height: 900, minWidth: 1000, minHeight: 700`
- `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, preload script

Menu via `Menu.buildFromTemplate`:
- App submenu: about / separator / quit (standard).
- File submenu: `Install CLI…` (fires `webContents.send('menu-install-cli')`), separator, `Close Window`.
- Edit submenu: standard undo/redo/cut/copy/paste/select-all roles.

## Build & Packaging

**Top-level `package.json` scripts:**
- `pnpm dev` — Vite dev server (unchanged).
- `pnpm electron:dev` — `concurrently` runs Vite + Electron with `wait-on http://localhost:1420`. Sidecar built in debug.
- `pnpm electron:build` — `tsc && vite build && cargo build --release -p core-sidecar -p core-launcher && electron-builder`.
- `pnpm test` / `pnpm test:run` — unchanged.

**`electron-builder.yml`:**
- `appId: com.nacholopez.ai-review`, `productName: AI Review`.
- `mac.target: [{ target: dir }]` (no DMG initially), `mac.identity: null` (no signing).
- `extraResources`:
  - `core/target/release/core-sidecar` → `Resources/bin/core-sidecar`
  - `core/target/release/core-launcher` → `Resources/bin/core-launcher`
- Icons: reuse `src-tauri/icons/icon.icns`.

**Sidecar resolution at runtime:** main resolves the binary at `path.join(process.resourcesPath, 'bin', 'core-sidecar')` in production, and at `core/target/debug/core-sidecar` in dev (via `app.isPackaged`).

**`Install CLI…` flow:** identical UX to today. The action symlinks `~/.local/bin/air` to `Resources/bin/core-launcher` inside the installed `.app`. `check_cli_installed` logic ports verbatim from `src-tauri/src/lib.rs`, just running in main instead of the Tauri command.

**`cli/build-install-macos.sh`:** updated to call `pnpm electron:build` and copy `release/mac/AI Review.app` (electron-builder's output path) to `/Applications` or `~/Applications`. Same UX as today.

## Testing

- Existing vitest tests: mocks change from `vi.mock("@tauri-apps/api/core", ...)` to `vi.mock("@/lib/bridge", ...)`. One-time mechanical update across the test files that mock `invoke`.
- New unit tests for `core-sidecar`: spawn the binary, write JSON-RPC requests on stdin, assert responses on stdout. ~5 tests covering one read happy path, one write happy path, one not-a-git-repo error, one unknown-method error, one malformed-input error.
- No Electron-level e2e tests added. Manual smoke checklist below.
- `pnpm test:run` remains the gate.

**Manual smoke checklist (run after step 6):**
- [ ] `pnpm electron:dev` opens the window, shows the diff for the current repo
- [ ] Repo switcher loads, switches repos, persists
- [ ] Commit selector lists commits, branch diff works, range diff works
- [ ] File explorer search works
- [ ] Add comment / edit comment / delete comment / overview
- [ ] LFS file preview, image preview, markdown preview
- [ ] Hunk expansion (top, bottom, both)
- [ ] Native menu: `Install CLI…` triggers the renderer modal
- [ ] `Install CLI…` symlinks `~/.local/bin/air`; `check_cli_installed` reports true
- [ ] `air` from terminal opens the app pointing at CWD
- [ ] `air --wait --commit HEAD` blocks, returns feedback on submit, exit 0
- [ ] `air --wait` returns exit 1 if window is closed without submitting

## Migration Order (commits on `nacho/electron`)

1. **Add the bridge.** Create `src/lib/bridge.ts` re-exporting Tauri's `invoke`/`listen`/`getCurrentWindow`. Update all imports. Update test mocks. Tauri still works; tests still pass.
2. **Carve out the Rust workspace.** Create `core/Cargo.toml` workspace with `core-lib`. Move `src-tauri/src/{git,files,config}.rs` into `core-lib/src/`. `src-tauri/` keeps its `lib.rs` but imports from `core-lib`. Verify `pnpm tauri dev` still works.
3. **Build the sidecar.** Add `core-sidecar` binary with JSON-RPC dispatch loop. Add sidecar tests. Tauri still primary.
4. **Build the launcher.** Add `core-launcher` binary. Replace `cli/air` shell script. Verify it can launch the still-Tauri app.
5. **Add the Electron shell.** New top-level `electron/` directory: `main.ts`, `preload.ts`, sidecar manager, menu, argv parsing, dialog/opener bindings. Add `electron-builder.yml`, new pnpm scripts, dev deps (`electron`, `electron-builder`, `concurrently`, `wait-on`). Both shells now run.
6. **Switch `bridge.ts` implementation** from Tauri's `invoke` to `window.electronAPI.invoke`. Update `cli/build-install-macos.sh` to call `pnpm electron:build`. Run the smoke checklist.
7. **Delete Tauri.** Remove `src-tauri/`, Tauri deps from `package.json` and Cargo, the `pnpm tauri` script, Tauri-specific docs.
8. **Bump version**, update `README.md` install instructions and `CLAUDE.md` references to Tauri.

## Risks

- **`open -W` stdout gap.** The temp-file workaround above adds complexity. If it proves fragile, fall back to localhost HTTP loopback. Both options recorded in the Submit-Feedback section.
- **Sidecar crash recovery.** If the sidecar dies, main rejects all in-flight RPCs and respawns it. Renderer surfaces errors normally; no automatic retries.
- **Cold start.** Electron is ~150–300ms slower than Tauri. Acceptable per problem statement.
- **Bundle size.** ~150 MB vs ~10 MB. Explicitly accepted.
- **Multi-platform regression.** Today's app builds on macOS / Linux / Windows via Tauri. Electron supports all three but the migration only smoke-tests macOS. Linux/Windows may need follow-up.

## File-Level Changes Summary

**New:**
- `src/lib/bridge.ts`
- `core/` Cargo workspace (`core-lib`, `core-sidecar`, `core-launcher`)
- `electron/` (`main.ts`, `preload.ts`, sidecar manager, menu)
- `electron-builder.yml`

**Modified:**
- `package.json` (scripts, deps)
- All `src/**/*.{ts,tsx}` files importing `@tauri-apps/api/*` (one-line import swap)
- All test files mocking `@tauri-apps/api/*` (one-line mock swap)
- `cli/air` (replaced by `core-launcher` binary)
- `cli/build-install-macos.sh` (calls `pnpm electron:build`)
- `README.md`, `CLAUDE.md` (remove Tauri references)

**Deleted:**
- `src-tauri/` (entirely)
- Tauri dev dependency in `package.json` (`@tauri-apps/cli`, `@tauri-apps/api`, plugins)
