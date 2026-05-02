# Electron Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tauri shell with Electron, keeping the Rust backend as a sidecar process talking JSON-RPC over stdio.

**Architecture:** Three processes — Electron main (window/menu/dialogs/argv), Electron renderer (unchanged React), and a Rust sidecar (`core-sidecar`) speaking newline-delimited JSON-RPC 2.0 on stdio. A second Rust binary (`core-launcher`) is the `air` CLI. All current Tauri command names are preserved as RPC method names so the rename surface is zero.

**Tech Stack:** Electron 33+, electron-builder, TypeScript, Vite, React 19, Rust 2021 (Cargo workspace), pnpm.

**Spec:** [`docs/superpowers/specs/2026-05-02-electron-migration-design.md`](../specs/2026-05-02-electron-migration-design.md)

**Working branch:** `nacho/electron`

---

## Tasks Overview

1. **Bridge abstraction** — introduce `src/lib/bridge.ts` wrapping all `@tauri-apps/api/*` usage (renderer changes only; Tauri still works).
2. **Cargo workspace + `core-lib`** — move `git.rs`/`files.rs`/`config.rs` into a pure library crate; Tauri imports from it.
3. **`core-sidecar` binary** — JSON-RPC 2.0 dispatch over stdio; tests for happy path, error path, unknown method, malformed input.
4. **`core-launcher` binary** — replaces `cli/air` shell script; spawns the installed app; handles `--wait` and `--json` via temp-file feedback.
5. **Electron shell** — `electron/main.ts`, preload, sidecar manager, native menu, argv parsing, window setup, electron-builder config, new pnpm scripts. Both shells run in parallel.
6. **Bridge cutover** — switch `bridge.ts` from Tauri to `window.electronAPI`. Update `cli/build-install-macos.sh`. Run smoke checklist.
7. **Delete Tauri** — remove `src-tauri/`, Tauri deps from `package.json`, remove `pnpm tauri` script.
8. **Version bump + docs** — bump version, update `README.md` and `CLAUDE.md`.

---

## Task 1: Bridge abstraction

**Files:**
- Create: `src/lib/bridge.ts`
- Create: `src/lib/bridge.test.ts`
- Modify: `src/App.tsx` (lines 3-5)
- Modify: `src/components/PromptPreview.tsx` (line 3)
- Modify: `src/hooks/useRepoManager.ts` (lines 2-3)
- Modify: `src/hooks/useHunkExpansion.ts` (line 3)
- Modify: `src/hooks/useCommitSelector.ts` (line 2)
- Modify: `src/hooks/useGit.ts` (lines 2-3)
- Modify: `src/hooks/useFileExplorer.ts` (line 2)
- Modify: `src/App.test.tsx`, `src/hooks/useGit.test.ts`, `src/hooks/useRepoManager.test.ts`, `src/hooks/useHunkExpansion.test.ts`, `src/hooks/useFileExplorer.test.ts` (mocks)

The bridge is a thin facade that today re-exports Tauri's APIs verbatim. In Task 6 it will swap to call `window.electronAPI`. After this task, Tauri still works and all tests still pass.

- [ ] **Step 1: Write the bridge unit test**

Create `src/lib/bridge.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (name: string, args: unknown) => ({ name, args, result: "ok" })),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({ setTitle: vi.fn() })),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/some/path"),
}));

import { invoke, listen, getCurrentWindow, openDirectoryDialog } from "./bridge";

describe("bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards invoke to the underlying transport", async () => {
    const out = await invoke<{ result: string }>("foo", { a: 1 });
    expect(out.result).toBe("ok");
  });

  it("forwards listen and returns an unlisten function", async () => {
    const unlisten = await listen("evt", () => {});
    expect(typeof unlisten).toBe("function");
  });

  it("exposes a window with setTitle", () => {
    const w = getCurrentWindow();
    w.setTitle("hi");
    expect(w.setTitle).toHaveBeenCalledWith("hi");
  });

  it("exposes a directory open dialog", async () => {
    const path = await openDirectoryDialog();
    expect(path).toBe("/some/path");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:run src/lib/bridge.test.ts`
Expected: FAIL — `Cannot find module './bridge'`.

- [ ] **Step 3: Implement the bridge (Tauri-backed)**

Create `src/lib/bridge.ts`:

```ts
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type EventCallback } from "@tauri-apps/api/event";
import { getCurrentWindow as tauriGetCurrentWindow } from "@tauri-apps/api/window";
import { open as tauriOpenDialog } from "@tauri-apps/plugin-dialog";

export async function invoke<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(method, args);
}

export async function listen<T = unknown>(
  event: string,
  cb: EventCallback<T>,
): Promise<() => void> {
  return tauriListen<T>(event, cb);
}

export interface BridgeWindow {
  setTitle: (title: string) => void;
}

export function getCurrentWindow(): BridgeWindow {
  const w = tauriGetCurrentWindow();
  return {
    setTitle: (title: string) => {
      void w.setTitle(title);
    },
  };
}

export async function openDirectoryDialog(): Promise<string | null> {
  const result = await tauriOpenDialog({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}
```

- [ ] **Step 4: Run the bridge test to verify it passes**

Run: `pnpm test:run src/lib/bridge.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Update `src/App.tsx` to import from the bridge**

Replace lines 3-5:

```ts
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
```

with:

```ts
import { invoke, getCurrentWindow, listen } from "./lib/bridge";
```

- [ ] **Step 6: Update `src/components/PromptPreview.tsx`**

Replace line 3:

```ts
import { invoke } from "@tauri-apps/api/core";
```

with:

```ts
import { invoke } from "../lib/bridge";
```

- [ ] **Step 7: Update `src/hooks/useGit.ts`**

Replace lines 2-3:

```ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
```

with:

```ts
import { invoke, listen } from "../lib/bridge";
```

Also update the `listen("tauri://focus", ...)` call on line 51 to listen for the new event name `app:focus` — but **not yet**. Keep `tauri://focus` here; the event-name swap happens in Task 5/6 when Electron main starts emitting the new name. Add a TODO comment:

```ts
// TODO(electron-migration): rename to "app:focus" when Electron shell is wired
const unlistenPromise = listen("tauri://focus", () => {
```

- [ ] **Step 8: Update remaining renderer files**

`src/hooks/useRepoManager.ts` — replace lines 2-3:

```ts
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
```

with:

```ts
import { invoke, openDirectoryDialog } from "../lib/bridge";
```

Then replace any `await open({ directory: true, ... })` calls in this file with `await openDirectoryDialog()`. Inspect the file and update call sites accordingly (the bridge returns `string | null`, matching the existing single-selection semantics).

`src/hooks/useHunkExpansion.ts` line 3, `src/hooks/useCommitSelector.ts` line 2, `src/hooks/useFileExplorer.ts` line 2 — same pattern, replace `import { invoke } from "@tauri-apps/api/core";` with `import { invoke } from "../lib/bridge";`.

- [ ] **Step 9: Update test mocks**

In each of `src/App.test.tsx`, `src/hooks/useGit.test.ts`, `src/hooks/useRepoManager.test.ts`, `src/hooks/useHunkExpansion.test.ts`, `src/hooks/useFileExplorer.test.ts`:

Replace any `vi.mock("@tauri-apps/api/core", ...)` with `vi.mock("../lib/bridge", ...)` (path adjusted relative to test file). Replace any `vi.mock("@tauri-apps/api/event", ...)` with the same `vi.mock("../lib/bridge", ...)` block (merging the `listen` mock into it). Drop `vi.mock("@tauri-apps/plugin-dialog", ...)`; mock `openDirectoryDialog` from the bridge instead.

Example for `src/hooks/useGit.test.ts` — replace:

```ts
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));
```

with:

```ts
vi.mock("../lib/bridge", () => ({
  invoke: vi.fn(),
  listen: vi.fn(async () => () => {}),
}));
```

And update the `import { invoke } from "@tauri-apps/api/core";` in test setup to `import { invoke, listen } from "../lib/bridge";`.

- [ ] **Step 10: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS — same number of tests as before, no regressions.

- [ ] **Step 11: Smoke-test the Tauri app**

Run: `pnpm tauri dev`
Expected: app launches, can browse a repo, view diffs. (No behavior change.)
Stop the dev server with Ctrl-C.

- [ ] **Step 12: Commit**

```bash
git add src/lib/bridge.ts src/lib/bridge.test.ts \
  src/App.tsx src/App.test.tsx \
  src/components/PromptPreview.tsx \
  src/hooks/useRepoManager.ts src/hooks/useRepoManager.test.ts \
  src/hooks/useHunkExpansion.ts src/hooks/useHunkExpansion.test.ts \
  src/hooks/useCommitSelector.ts \
  src/hooks/useGit.ts src/hooks/useGit.test.ts \
  src/hooks/useFileExplorer.ts src/hooks/useFileExplorer.test.ts
git commit -m "refactor: introduce src/lib/bridge.ts wrapping @tauri-apps/api"
```

---

## Task 2: Cargo workspace + `core-lib`

**Files:**
- Create: `core/Cargo.toml`
- Create: `core/core-lib/Cargo.toml`
- Create: `core/core-lib/src/lib.rs`
- Move: `src-tauri/src/git.rs` → `core/core-lib/src/git.rs`
- Move: `src-tauri/src/files.rs` → `core/core-lib/src/files.rs`
- Move: `src-tauri/src/config.rs` → `core/core-lib/src/config.rs`
- Modify: `src-tauri/Cargo.toml` (depend on `core-lib`)
- Modify: `src-tauri/src/lib.rs` (replace `mod git/files/config` with `use core_lib::*`)

After this task, the Rust backend code lives in a Tauri-free library crate. Tauri still wraps it. `pnpm tauri dev` still works.

- [ ] **Step 1: Create the Cargo workspace**

Create `core/Cargo.toml`:

```toml
[workspace]
resolver = "2"
members = [
    "core-lib",
]

[workspace.package]
version = "0.4.0"
edition = "2021"
authors = ["Nacho Lopez"]

[workspace.dependencies]
serde = { version = "1.0.228", features = ["derive"] }
serde_json = "1.0.149"
base64 = "0.22.1"
```

- [ ] **Step 2: Create the `core-lib` crate manifest**

Create `core/core-lib/Cargo.toml`:

```toml
[package]
name = "core-lib"
version.workspace = true
edition.workspace = true
authors.workspace = true

[dependencies]
serde = { workspace = true }
serde_json = { workspace = true }
base64 = { workspace = true }
```

- [ ] **Step 3: Move the Rust source files**

Run from repo root:

```bash
mkdir -p core/core-lib/src
git mv src-tauri/src/git.rs core/core-lib/src/git.rs
git mv src-tauri/src/files.rs core/core-lib/src/files.rs
git mv src-tauri/src/config.rs core/core-lib/src/config.rs
```

- [ ] **Step 4: Create `core/core-lib/src/lib.rs`**

```rust
pub mod config;
pub mod files;
pub mod git;
```

- [ ] **Step 5: Verify `core-lib` builds standalone**

Run: `cd core && cargo build -p core-lib`
Expected: builds cleanly with no errors.

- [ ] **Step 6: Update `src-tauri/Cargo.toml` to depend on `core-lib`**

Open `src-tauri/Cargo.toml`. After the existing `[dependencies]` block, ensure it includes:

```toml
[dependencies]
tauri = { version = "2.11.0", features = [] }
tauri-plugin-opener = "2.5.3"
tauri-plugin-dialog = "2.7.0"
serde = { version = "1.0.228", features = ["derive"] }
serde_json = "1.0.149"
base64 = "0.22.1"
core-lib = { path = "../core/core-lib" }
```

- [ ] **Step 7: Update `src-tauri/src/lib.rs` to use `core-lib`**

Open `src-tauri/src/lib.rs`. Replace lines 6-8:

```rust
mod config;
mod files;
mod git;
```

with:

```rust
use core_lib::{config, files, git};
```

- [ ] **Step 8: Verify Tauri still builds**

Run: `cd src-tauri && cargo build`
Expected: builds cleanly. No code changes required in `lib.rs` body — `git::`, `files::`, `config::` paths still resolve via the `use` statement.

- [ ] **Step 9: Run the Tauri dev shell to confirm runtime parity**

Run from repo root: `pnpm tauri dev`
Expected: app launches, browses repo, shows diffs. Stop with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add core/ src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "refactor: move git/files/config into core/core-lib crate"
```

---

## Task 3: `core-sidecar` binary

**Files:**
- Create: `core/core-sidecar/Cargo.toml`
- Create: `core/core-sidecar/src/main.rs`
- Create: `core/core-sidecar/tests/jsonrpc.rs`
- Modify: `core/Cargo.toml` (add `core-sidecar` to workspace members)

The sidecar reads JSON-RPC 2.0 requests on stdin (one per line), dispatches to `core-lib`, writes one-line responses to stdout. Stderr is reserved for log messages.

The sidecar handles **all** RPC methods that take a `path` argument (everything in `core-lib`). The four launch-context methods (`get_working_directory`, `is_wait_mode`, `is_json_output`, `get_initial_diff_mode`) are **not** in the sidecar — they're served by Electron main in Task 5.

- [ ] **Step 1: Add `core-sidecar` to the workspace**

Edit `core/Cargo.toml` `members` array:

```toml
members = [
    "core-lib",
    "core-sidecar",
]
```

- [ ] **Step 2: Create `core-sidecar/Cargo.toml`**

```toml
[package]
name = "core-sidecar"
version.workspace = true
edition.workspace = true
authors.workspace = true

[[bin]]
name = "core-sidecar"
path = "src/main.rs"

[dependencies]
core-lib = { path = "../core-lib" }
serde = { workspace = true }
serde_json = { workspace = true }
```

- [ ] **Step 3: Write the failing integration test**

Create `core/core-sidecar/tests/jsonrpc.rs`:

```rust
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

fn send(child_stdin: &mut std::process::ChildStdin, line: &str) {
    writeln!(child_stdin, "{}", line).unwrap();
    child_stdin.flush().unwrap();
}

fn recv(reader: &mut BufReader<std::process::ChildStdout>) -> serde_json::Value {
    let mut line = String::new();
    reader.read_line(&mut line).unwrap();
    serde_json::from_str(&line).unwrap()
}

fn spawn() -> (std::process::Child, BufReader<std::process::ChildStdout>) {
    let bin = env!("CARGO_BIN_EXE_core-sidecar");
    let mut child = Command::new(bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let stdout = child.stdout.take().unwrap();
    (child, BufReader::new(stdout))
}

#[test]
fn responds_to_is_git_repo_with_false_for_nonrepo() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":1,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["jsonrpc"], "2.0");
    assert_eq!(resp["id"], 1);
    assert!(resp["result"].is_boolean());
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn returns_error_for_unknown_method() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":2,"method":"no_such_method","params":{}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["id"], 2);
    assert_eq!(resp["error"]["code"], -32601);
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn returns_error_for_malformed_json() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(&mut stdin, r#"this is not json"#);
    let resp = recv(&mut reader);
    assert_eq!(resp["error"]["code"], -32700);
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn surfaces_core_lib_errors_in_error_field() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":3,"method":"get_unstaged_diff","params":{"path":"/definitely/not/a/repo"}}"#,
    );
    let resp = recv(&mut reader);
    assert_eq!(resp["id"], 3);
    assert!(resp["error"]["message"].is_string());
    drop(stdin);
    let _ = child.wait();
}

#[test]
fn handles_pipelined_requests_in_order() {
    let (mut child, mut reader) = spawn();
    let mut stdin = child.stdin.take().unwrap();
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":10,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    send(
        &mut stdin,
        r#"{"jsonrpc":"2.0","id":11,"method":"is_git_repo","params":{"path":"/tmp"}}"#,
    );
    let r1 = recv(&mut reader);
    let r2 = recv(&mut reader);
    assert_eq!(r1["id"], 10);
    assert_eq!(r2["id"], 11);
    drop(stdin);
    let _ = child.wait();
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd core && cargo test -p core-sidecar`
Expected: FAIL — binary not yet implemented (compile error in `main.rs`).

- [ ] **Step 5: Implement the sidecar dispatch loop**

Create `core/core-sidecar/src/main.rs`:

```rust
use core_lib::{config, files, git};
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

#[derive(Deserialize)]
struct Request {
    jsonrpc: String,
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

fn err(id: Value, code: i32, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message },
    })
}

fn ok(id: Value, result: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result,
    })
}

fn param_str(params: &Value, key: &str) -> Result<String, String> {
    params
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("missing or non-string param: {}", key))
}

fn param_u32(params: &Value, key: &str) -> Result<u32, String> {
    params
        .get(key)
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .ok_or_else(|| format!("missing or non-numeric param: {}", key))
}

fn dispatch(method: &str, params: &Value) -> Result<Value, String> {
    match method {
        "is_git_repo" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::is_git_repo(&path)))
        }
        "get_unstaged_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_unstaged_diff(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_staged_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_staged_diff(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_git_change_status" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::get_git_change_status(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_commit_ref_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let commit = param_str(params, "commit")?;
            let r = if commit == "HEAD" {
                git::get_head_diff(&path, 0)
            } else if let Some(num_str) = commit.strip_prefix("HEAD~") {
                let n = num_str.parse::<u32>().unwrap_or(1);
                git::get_head_diff(&path, n)
            } else {
                git::get_commit_diff(&path, &commit)
            };
            r.map(|v| serde_json::to_value(v).unwrap())
        }
        "get_range_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let range = param_str(params, "range")?;
            git::get_range_diff(&path, &range).map(|v| serde_json::to_value(v).unwrap())
        }
        "list_files" => {
            let path = PathBuf::from(param_str(params, "path")?);
            files::list_files(&path, 10).map(|v| serde_json::to_value(v).unwrap())
        }
        "read_file_content" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let file_path = param_str(params, "filePath")?;
            let full = path.join(file_path);
            files::read_file(&full.to_string_lossy()).map(|v| json!(v))
        }
        "read_file_content_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let file_path = param_str(params, "filePath")?;
            let full = path.join(file_path);
            files::read_file_base64(&full.to_string_lossy()).map(|v| json!(v))
        }
        "get_file_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_file_at_ref(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_file_at_ref_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_file_at_ref_base64(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_lfs_file_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_lfs_file_at_ref(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "get_lfs_file_at_ref_base64" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            let file_path = param_str(params, "filePath")?;
            git::get_lfs_file_at_ref_base64(&path, &git_ref, &file_path).map(|v| json!(v))
        }
        "list_commits" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let limit = param_u32(params, "limit")?;
            git::list_commits(&path, limit).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_commit_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let hash = param_str(params, "hash")?;
            git::get_commit_diff(&path, &hash).map(|v| serde_json::to_value(v).unwrap())
        }
        "list_branches" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_branches(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_branch_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let branch = param_str(params, "branch")?;
            git::get_branch_diff(&path, &branch).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_branch_base" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let branch = param_str(params, "branch")?;
            git::get_branch_base(&path, &branch).map(|v| json!(v))
        }
        "list_files_at_ref" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let git_ref = param_str(params, "gitRef")?;
            git::list_files_at_ref(&path, &git_ref).map(|v| serde_json::to_value(v).unwrap())
        }
        "has_gg_stacks" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::has_gg_stacks(&path)))
        }
        "list_worktrees" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_worktrees(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "has_worktrees" => {
            let path = PathBuf::from(param_str(params, "path")?);
            Ok(json!(git::has_worktrees(&path)))
        }
        "list_gg_stacks" => {
            let path = PathBuf::from(param_str(params, "path")?);
            git::list_gg_stacks(&path).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_gg_stack_entries" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_entries(&path, &stack_name)
                .map(|v| serde_json::to_value(v).unwrap())
        }
        "get_merge_base_refs" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let ref1 = param_str(params, "ref1")?;
            let ref2 = param_str(params, "ref2")?;
            git::get_merge_base_refs(&path, &ref1, &ref2).map(|v| json!(v))
        }
        "get_gg_stack_base" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_base(&path, &stack_name).map(|v| serde_json::to_value(v).unwrap())
        }
        "get_gg_stack_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            git::get_gg_stack_diff(&path, &stack_name).map(|v| json!(v))
        }
        "get_gg_entry_diff" => {
            let path = PathBuf::from(param_str(params, "path")?);
            let stack_name = param_str(params, "stackName")?;
            let hash = param_str(params, "hash")?;
            git::get_gg_entry_diff(&path, &stack_name, &hash).map(|v| json!(v))
        }
        "list_repos" => {
            let repos = config::list_repos()?;
            let mut result: Vec<serde_json::Value> = repos
                .into_iter()
                .map(|(name, path)| {
                    let ts = git::last_commit_timestamp(&PathBuf::from(&path));
                    json!({ "name": name, "path": path, "last_activity": ts })
                })
                .collect();
            result.sort_by(|a, b| {
                b["last_activity"]
                    .as_i64()
                    .unwrap_or(0)
                    .cmp(&a["last_activity"].as_i64().unwrap_or(0))
            });
            Ok(json!(result))
        }
        "add_repo" => {
            let path = param_str(params, "path")?;
            let dir = PathBuf::from(&path);
            if !git::is_git_repo(&dir) {
                return Err("Not a git repository".to_string());
            }
            config::add_repo(&path)?;
            let name = dir
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone());
            Ok(json!({
                "name": name,
                "path": path,
                "last_activity": git::last_commit_timestamp(&dir),
            }))
        }
        "remove_repo" => {
            let path = param_str(params, "path")?;
            config::remove_repo(&path)?;
            Ok(Value::Null)
        }
        "switch_repo" => {
            // Sidecar is stateless; main owns working_dir. Sidecar just validates and returns
            // the unstaged diff for the new path. Main updates its own state.
            let path = param_str(params, "path")?;
            let dir = PathBuf::from(&path);
            if !git::is_git_repo(&dir) {
                return Err("Not a git repository".to_string());
            }
            git::get_unstaged_diff(&dir).map(|v| serde_json::to_value(v).unwrap())
        }
        _ => Err(format!("__UNKNOWN_METHOD__:{}", method)),
    }
}

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: Result<Request, _> = serde_json::from_str(&line);
        let response = match parsed {
            Err(e) => err(Value::Null, -32700, &format!("parse error: {}", e)),
            Ok(req) if req.jsonrpc != "2.0" => {
                err(req.id, -32600, "jsonrpc version must be 2.0")
            }
            Ok(req) => match dispatch(&req.method, &req.params) {
                Ok(result) => ok(req.id, result),
                Err(e) if e.starts_with("__UNKNOWN_METHOD__:") => {
                    err(req.id, -32601, &format!("method not found: {}", &e[19..]))
                }
                Err(message) => err(req.id, -32000, &message),
            },
        };

        let line = serde_json::to_string(&response).unwrap_or_else(|_| {
            r#"{"jsonrpc":"2.0","id":null,"error":{"code":-32603,"message":"internal"}}"#
                .to_string()
        });
        if writeln!(out, "{}", line).is_err() {
            break;
        }
        let _ = out.flush();
    }
}
```

- [ ] **Step 6: Run the sidecar tests**

Run: `cd core && cargo test -p core-sidecar`
Expected: PASS — 5 tests passing.

- [ ] **Step 7: Build a release binary and smoke-test by hand**

Run:

```bash
cd core && cargo build --release -p core-sidecar
echo '{"jsonrpc":"2.0","id":1,"method":"is_git_repo","params":{"path":"/tmp"}}' | ./target/release/core-sidecar
```

Expected: a single line of JSON containing `"jsonrpc":"2.0","id":1,"result":false`.

- [ ] **Step 8: Confirm Tauri still works**

Run: `pnpm tauri dev`
Expected: app launches normally (sidecar binary exists but is unused; Tauri commands still resolve in `src-tauri/src/lib.rs`). Stop with Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add core/Cargo.toml core/core-sidecar/
git commit -m "feat: add core-sidecar JSON-RPC binary"
```

---

## Task 4: `core-launcher` binary

**Files:**
- Create: `core/core-launcher/Cargo.toml`
- Create: `core/core-launcher/src/main.rs`
- Create: `core/core-launcher/tests/argv.rs`
- Modify: `core/Cargo.toml` (add `core-launcher` member)
- Delete (later, in this task): `cli/air` (replaced by binary)

The launcher locates the installed `AI Review.app`, resolves CLI flags, then spawns the app via `open -a "AI Review.app" --args ...`. With `--wait`, it uses `open -W` and reads feedback from a temp file path it passes to the app.

For Task 4 the launcher targets the **still-Tauri** app — the .app name is `AI Review.app` either way, so this works. The temp-pipe handshake won't fire under Tauri (the Tauri command writes to its own stdout and exits), but that's fine: the launcher gracefully handles the temp-file-not-found case.

- [ ] **Step 1: Add `core-launcher` to the workspace**

Edit `core/Cargo.toml` `members`:

```toml
members = [
    "core-lib",
    "core-sidecar",
    "core-launcher",
]
```

- [ ] **Step 2: Create `core-launcher/Cargo.toml`**

```toml
[package]
name = "core-launcher"
version.workspace = true
edition.workspace = true
authors.workspace = true

[[bin]]
name = "core-launcher"
path = "src/main.rs"
```

- [ ] **Step 3: Write the failing argv-parsing test**

Create `core/core-launcher/tests/argv.rs`:

```rust
use core_launcher::{parse_args, ParsedArgs};

#[test]
fn parses_wait_and_json_flags() {
    let args = vec!["air".into(), "--wait".into(), "--json".into()];
    let parsed = parse_args(&args, "/home/me");
    assert!(parsed.wait_mode);
    assert!(parsed.json_output);
    assert_eq!(parsed.working_dir, "/home/me");
}

#[test]
fn parses_commit_flag_into_diff_args() {
    let args = vec!["air".into(), "--commit".into(), "HEAD~3".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-commit".to_string(), "HEAD~3".to_string()]);
}

#[test]
fn parses_branch_flag() {
    let args = vec!["air".into(), "--branch".into(), "main".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-branch".to_string(), "main".to_string()]);
}

#[test]
fn parses_commits_range() {
    let args = vec!["air".into(), "--commits".into(), "abc..def".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.diff_args, vec!["--diff-range".to_string(), "abc..def".to_string()]);
}

#[test]
fn positional_arg_overrides_default_dir() {
    let args = vec!["air".into(), "/repos/foo".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.working_dir, "/repos/foo");
}

#[test]
fn defaults_to_provided_cwd_when_no_positional() {
    let args = vec!["air".into()];
    let parsed = parse_args(&args, "/home/me");
    assert_eq!(parsed.working_dir, "/home/me");
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd core && cargo test -p core-launcher`
Expected: FAIL — crate not implemented.

- [ ] **Step 5: Implement the launcher**

Create `core/core-launcher/src/main.rs`:

```rust
use std::path::PathBuf;
use std::process::{Command, ExitCode};

#[derive(Debug, Default, PartialEq, Eq)]
pub struct ParsedArgs {
    pub wait_mode: bool,
    pub json_output: bool,
    pub working_dir: String,
    pub diff_args: Vec<String>,
}

pub fn parse_args(args: &[String], default_dir: &str) -> ParsedArgs {
    let mut out = ParsedArgs {
        working_dir: default_dir.to_string(),
        ..Default::default()
    };

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--wait" => {
                out.wait_mode = true;
                i += 1;
            }
            "--json" => {
                out.json_output = true;
                i += 1;
            }
            "--commit" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-commit".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commit requires a value");
                    std::process::exit(1);
                }
            }
            "--commits" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-range".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commits requires a value");
                    std::process::exit(1);
                }
            }
            "--branch" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-branch".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --branch requires a value");
                    std::process::exit(1);
                }
            }
            arg if !arg.starts_with("--") => {
                out.working_dir = arg.to_string();
                i += 1;
            }
            other => {
                eprintln!("Error: unknown option '{}'", other);
                std::process::exit(1);
            }
        }
    }

    out
}

fn locate_app() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("/Applications/AI Review.app"),
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join("Applications").join("AI Review.app"))
            .unwrap_or_default(),
    ];
    candidates.into_iter().find(|p| p.exists())
}

fn run() -> ExitCode {
    let raw_args: Vec<String> = std::env::args().collect();
    let cwd = std::env::current_dir()
        .ok()
        .and_then(|p| p.canonicalize().ok())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());
    let parsed = parse_args(&raw_args, &cwd);

    // Canonicalize whatever the user gave us as a working dir.
    let working_dir = match std::fs::canonicalize(&parsed.working_dir) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => parsed.working_dir.clone(),
    };

    let Some(app_path) = locate_app() else {
        eprintln!("Error: AI Review.app not found in /Applications or ~/Applications.");
        eprintln!("Build the app first with: pnpm electron:build");
        return ExitCode::from(1);
    };

    // For --wait/--json, set up a temp file the app can write feedback to.
    let feedback_path = if parsed.wait_mode {
        let pid = std::process::id();
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        Some(std::env::temp_dir().join(format!("ai-review-feedback-{}-{}.txt", pid, ts)))
    } else {
        None
    };

    let mut app_args: Vec<String> = vec![working_dir];
    app_args.extend(parsed.diff_args.iter().cloned());
    if parsed.json_output {
        app_args.push("--json-output".into());
    }
    if parsed.wait_mode {
        app_args.push("--wait-mode".into());
        if let Some(p) = &feedback_path {
            app_args.push("--feedback-pipe".into());
            app_args.push(p.to_string_lossy().to_string());
        }
    }

    if parsed.wait_mode {
        // -W blocks until the app exits.
        let status = Command::new("open")
            .arg("-W")
            .arg("-a")
            .arg(&app_path)
            .arg("--args")
            .args(&app_args)
            .status();

        match status {
            Ok(s) if s.success() => {
                if let Some(p) = &feedback_path {
                    if let Ok(contents) = std::fs::read_to_string(p) {
                        print!("{}", contents);
                        let _ = std::fs::remove_file(p);
                        return ExitCode::from(0);
                    }
                }
                // App exited cleanly but no feedback was submitted.
                ExitCode::from(1)
            }
            Ok(_) => ExitCode::from(1),
            Err(e) => {
                eprintln!("Error launching app: {}", e);
                ExitCode::from(1)
            }
        }
    } else {
        // Non-wait: spawn detached and exit immediately.
        let _ = Command::new("open")
            .arg("-a")
            .arg(&app_path)
            .arg("--args")
            .args(&app_args)
            .spawn();
        ExitCode::from(0)
    }
}

fn main() -> ExitCode {
    run()
}
```

Then create `core/core-launcher/src/lib.rs` so the test crate can import `parse_args`:

```rust
pub use crate::parse_args_impl::*;

mod parse_args_impl {
    include!("parse_args.rs");
}
```

Wait — simpler: instead of the lib/main split, expose `parse_args` from a `lib.rs` and call it from `main.rs`. Restructure:

`core/core-launcher/src/lib.rs`:

```rust
#[derive(Debug, Default, PartialEq, Eq)]
pub struct ParsedArgs {
    pub wait_mode: bool,
    pub json_output: bool,
    pub working_dir: String,
    pub diff_args: Vec<String>,
}

pub fn parse_args(args: &[String], default_dir: &str) -> ParsedArgs {
    let mut out = ParsedArgs {
        working_dir: default_dir.to_string(),
        ..Default::default()
    };

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--wait" => { out.wait_mode = true; i += 1; }
            "--json" => { out.json_output = true; i += 1; }
            "--commit" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-commit".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commit requires a value");
                    std::process::exit(1);
                }
            }
            "--commits" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-range".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --commits requires a value");
                    std::process::exit(1);
                }
            }
            "--branch" => {
                if let Some(v) = args.get(i + 1) {
                    out.diff_args = vec!["--diff-branch".into(), v.clone()];
                    i += 2;
                } else {
                    eprintln!("Error: --branch requires a value");
                    std::process::exit(1);
                }
            }
            arg if !arg.starts_with("--") => {
                out.working_dir = arg.to_string();
                i += 1;
            }
            other => {
                eprintln!("Error: unknown option '{}'", other);
                std::process::exit(1);
            }
        }
    }

    out
}
```

Update `core/core-launcher/src/main.rs` to remove the `parse_args`/`ParsedArgs` definitions at the top and replace the line `use std::path::PathBuf;` block prelude with:

```rust
use core_launcher::{parse_args, ParsedArgs};
use std::path::PathBuf;
use std::process::{Command, ExitCode};
```

(All the remaining `locate_app`, `run`, `main` code stays.)

Update `core/core-launcher/Cargo.toml` to declare both targets:

```toml
[package]
name = "core-launcher"
version.workspace = true
edition.workspace = true
authors.workspace = true

[lib]
name = "core_launcher"
path = "src/lib.rs"

[[bin]]
name = "core-launcher"
path = "src/main.rs"
```

- [ ] **Step 6: Run the launcher tests**

Run: `cd core && cargo test -p core-launcher`
Expected: PASS — 6 tests.

- [ ] **Step 7: Build the release binary**

Run: `cd core && cargo build --release -p core-launcher`
Expected: produces `core/target/release/core-launcher`.

- [ ] **Step 8: Replace `cli/air` with a thin shim that calls the launcher**

The launcher binary will eventually be installed at `~/.local/bin/air` via `Install CLI…`. For dev (so `cli/air` continues to work from a checkout), replace `cli/air` with:

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER="$SCRIPT_DIR/../core/target/release/core-launcher"
if [ ! -f "$LAUNCHER" ]; then
    LAUNCHER="$SCRIPT_DIR/../core/target/debug/core-launcher"
fi
if [ ! -f "$LAUNCHER" ]; then
    echo "Error: core-launcher binary not found. Build with: pnpm electron:build" >&2
    exit 1
fi
exec "$LAUNCHER" "$@"
```

Make sure it's executable: `chmod +x cli/air`.

- [ ] **Step 9: Confirm Tauri still works (sanity check)**

Run: `pnpm tauri dev`
Expected: app launches normally. Stop with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add core/Cargo.toml core/core-launcher/ cli/air
git commit -m "feat: add core-launcher CLI binary"
```

---

## Task 5: Electron shell

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/sidecar.ts`
- Create: `electron/menu.ts`
- Create: `electron/argv.ts`
- Create: `electron/argv.test.ts` (vitest, runs in node env)
- Create: `electron/tsconfig.json`
- Create: `electron-builder.yml`
- Modify: `package.json` (scripts, deps)
- Modify: `vite.config.ts` (no change expected, but verify)

After this task both shells run. Tauri remains the default. The Electron shell can be launched with `pnpm electron:dev`.

- [ ] **Step 1: Add Electron dev dependencies**

Run from repo root:

```bash
pnpm add -D electron@33 electron-builder@25 concurrently@9 wait-on@8 cross-env@7
pnpm add -D @types/node@22
```

- [ ] **Step 2: Create `electron/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 3: Write the failing argv test**

Create `electron/argv.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseLaunchArgs } from "./argv";

describe("parseLaunchArgs", () => {
  it("returns defaults for an empty argv", () => {
    const out = parseLaunchArgs([], "/home/me");
    expect(out.workingDir).toBe("/home/me");
    expect(out.waitMode).toBe(false);
    expect(out.jsonOutput).toBe(false);
    expect(out.initialDiffMode).toBeNull();
    expect(out.feedbackPipe).toBeNull();
  });

  it("parses --wait-mode and --json-output", () => {
    const out = parseLaunchArgs(["--wait-mode", "--json-output"], "/home/me");
    expect(out.waitMode).toBe(true);
    expect(out.jsonOutput).toBe(true);
  });

  it("parses --diff-commit", () => {
    const out = parseLaunchArgs(["--diff-commit", "HEAD~2"], "/home/me");
    expect(out.initialDiffMode).toEqual({ type: "commit", value: "HEAD~2" });
  });

  it("parses --diff-range and --diff-branch", () => {
    const a = parseLaunchArgs(["--diff-range", "abc..def"], "/home/me");
    expect(a.initialDiffMode).toEqual({ type: "range", value: "abc..def" });
    const b = parseLaunchArgs(["--diff-branch", "main"], "/home/me");
    expect(b.initialDiffMode).toEqual({ type: "branch", value: "main" });
  });

  it("uses positional arg as working directory", () => {
    const out = parseLaunchArgs(["/repos/foo"], "/home/me");
    expect(out.workingDir).toBe("/repos/foo");
  });

  it("captures --feedback-pipe path", () => {
    const out = parseLaunchArgs(
      ["--wait-mode", "--feedback-pipe", "/tmp/x.txt"],
      "/home/me",
    );
    expect(out.feedbackPipe).toBe("/tmp/x.txt");
  });
});
```

- [ ] **Step 4: Implement `electron/argv.ts`**

```ts
export type InitialDiffMode =
  | { type: "commit"; value: string }
  | { type: "range"; value: string }
  | { type: "branch"; value: string };

export interface LaunchArgs {
  workingDir: string;
  waitMode: boolean;
  jsonOutput: boolean;
  initialDiffMode: InitialDiffMode | null;
  feedbackPipe: string | null;
}

export function parseLaunchArgs(argv: string[], defaultDir: string): LaunchArgs {
  const out: LaunchArgs = {
    workingDir: defaultDir,
    waitMode: false,
    jsonOutput: false,
    initialDiffMode: null,
    feedbackPipe: null,
  };

  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    switch (a) {
      case "--wait":
      case "--wait-mode":
        out.waitMode = true;
        i += 1;
        break;
      case "--json":
      case "--json-output":
        out.jsonOutput = true;
        i += 1;
        break;
      case "--diff-commit":
      case "--commit":
        out.initialDiffMode = { type: "commit", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--diff-range":
      case "--commits":
        out.initialDiffMode = { type: "range", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--diff-branch":
      case "--branch":
        out.initialDiffMode = { type: "branch", value: argv[i + 1] ?? "" };
        i += 2;
        break;
      case "--feedback-pipe":
        out.feedbackPipe = argv[i + 1] ?? null;
        i += 2;
        break;
      default:
        if (!a.startsWith("--")) {
          out.workingDir = a;
        }
        i += 1;
        break;
    }
  }

  return out;
}
```

- [ ] **Step 5: Run the argv test**

Run: `pnpm test:run electron/argv.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 6: Implement the sidecar manager**

Create `electron/sidecar.ts`:

```ts
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { app } from "electron";
import * as path from "node:path";
import * as readline from "node:readline";

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

export class Sidecar {
  private child: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();
  private buffer = "";

  start(): void {
    const binPath = this.resolveBinary();
    const child = spawn(binPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => this.handleLine(line));

    child.stderr.on("data", (data) => {
      console.error(`[sidecar] ${data.toString().trimEnd()}`);
    });

    child.on("exit", (code) => {
      console.error(`[sidecar] exited with code ${code}`);
      this.failPending(new Error("sidecar exited"));
      this.child = null;
    });

    this.child = child;
  }

  invoke<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.child) {
      return Promise.reject(new Error("sidecar not running"));
    }
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.child!.stdin.write(payload + "\n");
    });
  }

  shutdown(): void {
    if (this.child) {
      this.child.stdin.end();
      this.child.kill();
      this.child = null;
    }
  }

  private resolveBinary(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "bin", "core-sidecar");
    }
    return path.join(__dirname, "..", "core", "target", "debug", "core-sidecar");
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    let msg: { id?: number; result?: unknown; error?: { message: string } };
    try {
      msg = JSON.parse(line);
    } catch (e) {
      console.error("[sidecar] failed to parse response:", line);
      return;
    }
    if (typeof msg.id !== "number") return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (msg.error) {
      pending.reject(new Error(msg.error.message));
    } else {
      pending.resolve(msg.result);
    }
  }

  private failPending(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
```

- [ ] **Step 7: Implement the menu**

Create `electron/menu.ts`:

```ts
import { Menu, MenuItemConstructorOptions, BrowserWindow } from "electron";

export function buildMenu(getWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: "ai-review",
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Install CLI…",
          click: () => {
            const win = getWindow();
            win?.webContents.send("menu-install-cli");
          },
        },
        { type: "separator" },
        { role: isMac ? "close" : "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}
```

- [ ] **Step 8: Implement the preload script**

Create `electron/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (method: string, params?: Record<string, unknown>) =>
    ipcRenderer.invoke("bridge:invoke", method, params),
  on: (channel: string, cb: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  setTitle: (title: string) => ipcRenderer.invoke("window:setTitle", title),
  openDirectoryDialog: () => ipcRenderer.invoke("dialog:openDirectory"),
});
```

- [ ] **Step 9: Implement the main process**

Create `electron/main.ts`:

```ts
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { Sidecar } from "./sidecar";
import { buildMenu } from "./menu";
import { parseLaunchArgs, type LaunchArgs } from "./argv";

let mainWindow: BrowserWindow | null = null;
const sidecar = new Sidecar();
let launchArgs: LaunchArgs;

// Names of methods the sidecar handles. Anything else stays in main.
const SIDECAR_METHODS = new Set<string>([
  "is_git_repo",
  "get_unstaged_diff",
  "get_staged_diff",
  "get_git_change_status",
  "get_commit_ref_diff",
  "get_range_diff",
  "list_files",
  "read_file_content",
  "read_file_content_base64",
  "get_file_at_ref",
  "get_file_at_ref_base64",
  "get_lfs_file_at_ref",
  "get_lfs_file_at_ref_base64",
  "list_commits",
  "get_commit_diff",
  "list_branches",
  "get_branch_diff",
  "get_branch_base",
  "list_files_at_ref",
  "has_gg_stacks",
  "list_worktrees",
  "has_worktrees",
  "list_gg_stacks",
  "get_gg_stack_entries",
  "get_merge_base_refs",
  "get_gg_stack_base",
  "get_gg_stack_diff",
  "get_gg_entry_diff",
  "list_repos",
  "add_repo",
  "remove_repo",
  "switch_repo",
]);

function parseInitialArgs(): LaunchArgs {
  // Skip Electron's own argv entries: argv[0] is the binary, argv[1] in dev is
  // the path to main.js. In packaged form argv only contains the binary plus
  // user args. Strip anything starting with '--' that we don't recognize OR that
  // looks like an Electron internal flag by skipping until we find user args.
  const argv = process.argv.slice(app.isPackaged ? 1 : 2);
  const cwd = process.cwd();
  return parseLaunchArgs(argv, cwd);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#282c34",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 20 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.on("focus", () => {
    mainWindow?.webContents.send("app:focus");
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    void mainWindow.loadURL("http://localhost:1420");
  }
}

function registerIpc(): void {
  ipcMain.handle("bridge:invoke", async (_e, method: string, params: Record<string, unknown> = {}) => {
    switch (method) {
      case "get_working_directory":
        return launchArgs.workingDir;
      case "is_wait_mode":
        return launchArgs.waitMode;
      case "is_json_output":
        return launchArgs.jsonOutput;
      case "get_initial_diff_mode":
        return launchArgs.initialDiffMode;
      case "submit_feedback": {
        const feedback = String((params as { feedback?: string }).feedback ?? "");
        if (launchArgs.feedbackPipe) {
          await fs.promises.writeFile(launchArgs.feedbackPipe, feedback, "utf8");
        } else {
          process.stdout.write(feedback);
        }
        app.quit();
        return null;
      }
      case "check_cli_installed":
        return await checkCliInstalled();
      case "install_cli":
        return await installCli();
      default:
        if (SIDECAR_METHODS.has(method)) {
          return sidecar.invoke(method, params);
        }
        throw new Error(`unknown method: ${method}`);
    }
  });

  ipcMain.handle("window:setTitle", (_e, title: string) => {
    mainWindow?.setTitle(title);
  });

  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

async function checkCliInstalled(): Promise<boolean> {
  if (process.platform === "win32") return false;
  const home = os.homedir();
  const cliPath = path.join(home, ".local", "bin", "air");
  try {
    const stats = await fs.promises.lstat(cliPath);
    if (!stats.isSymbolicLink()) return false;
    const target = await fs.promises.readlink(cliPath);
    const expected = launcherBinaryPath();
    const targetReal = path.resolve(path.dirname(cliPath), target);
    return path.resolve(targetReal) === path.resolve(expected);
  } catch {
    return false;
  }
}

interface InstallCliResult {
  success: boolean;
  message: string;
  path_warning: boolean;
}

async function installCli(): Promise<InstallCliResult> {
  if (process.platform === "win32") {
    throw new Error("CLI installation is only supported on macOS and Linux");
  }
  const home = os.homedir();
  const localBin = path.join(home, ".local", "bin");
  const cliPath = path.join(localBin, "air");
  const launcher = launcherBinaryPath();

  await fs.promises.mkdir(localBin, { recursive: true });
  try {
    await fs.promises.unlink(cliPath);
  } catch {
    // not present, fine
  }
  await fs.promises.symlink(launcher, cliPath);

  const pathEnv = process.env.PATH ?? "";
  const inPath = pathEnv.split(path.delimiter).includes(localBin);
  const message = inPath
    ? "CLI installed successfully! You can now use 'air' from your terminal."
    : `CLI installed to ${localBin}. Add this directory to your PATH to use 'air' from anywhere.`;

  return { success: true, message, path_warning: !inPath };
}

function launcherBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", "core-launcher");
  }
  return path.join(__dirname, "..", "core", "target", "debug", "core-launcher");
}

app.whenReady().then(() => {
  launchArgs = parseInitialArgs();
  sidecar.start();
  registerIpc();
  Menu.setApplicationMenu(buildMenu(() => mainWindow));
  createWindow();
});

app.on("window-all-closed", () => {
  sidecar.shutdown();
  if (process.platform !== "darwin") {
    app.quit();
  } else {
    app.quit(); // we always quit; matches Tauri's wait-mode behavior
  }
});

app.on("before-quit", () => {
  sidecar.shutdown();
});

// Silence unused `shell` import lint while reserved for future opener use.
void shell;
```

- [ ] **Step 10: Add `package.json` scripts**

Open `package.json`, edit the `"scripts"` block. Add `electron:dev` and `electron:build` and `electron:tsc`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "tauri:build:install": "bash ./cli/build-install-macos.sh",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "electron:tsc": "tsc -p electron/tsconfig.json",
  "electron:dev": "concurrently -k \"vite\" \"wait-on http://localhost:1420 && pnpm electron:tsc && cd core && cargo build -p core-sidecar -p core-launcher && cd .. && electron dist-electron/main.js\"",
  "electron:build": "tsc && vite build && pnpm electron:tsc && cd core && cargo build --release -p core-sidecar -p core-launcher && cd .. && electron-builder"
},
"main": "dist-electron/main.js"
```

(The new `"main"` field tells Electron where the compiled main process entry is.)

- [ ] **Step 11: Create `electron-builder.yml`**

```yaml
appId: com.nacholopez.ai-review
productName: AI Review
directories:
  output: release
files:
  - dist/**
  - dist-electron/**
  - package.json
extraResources:
  - from: core/target/release/core-sidecar
    to: bin/core-sidecar
  - from: core/target/release/core-launcher
    to: bin/core-launcher
mac:
  target:
    - target: dir
  identity: null
  category: public.app-category.developer-tools
  icon: src-tauri/icons/icon.icns
linux:
  target:
    - dir
  icon: src-tauri/icons/128x128.png
win:
  target:
    - dir
  icon: src-tauri/icons/icon.ico
```

- [ ] **Step 12: Update `.gitignore`**

Append to `.gitignore`:

```
dist-electron/
release/
core/target/
```

- [ ] **Step 13: Run vitest to confirm everything still passes**

Run: `pnpm test:run`
Expected: PASS — including the new `electron/argv.test.ts`.

- [ ] **Step 14: Compile Electron TypeScript**

Run: `pnpm electron:tsc`
Expected: produces `dist-electron/main.js`, `dist-electron/preload.js`, `dist-electron/sidecar.js`, `dist-electron/menu.js`, `dist-electron/argv.js`. No errors.

- [ ] **Step 15: Build the Rust binaries (debug)**

Run: `cd core && cargo build -p core-sidecar -p core-launcher`
Expected: produces `core/target/debug/core-sidecar` and `core/target/debug/core-launcher`.

- [ ] **Step 16: Smoke-test Electron dev**

Run from repo root: `pnpm electron:dev`
Expected: window opens, but **renderer is still using Tauri's `invoke`** (bridge has not been switched yet). The bridge's calls will fail with "window.__TAURI_INTERNALS__ is undefined" or similar. That is **expected** — Task 6 swaps the bridge.

You should still see: window opens with the right size/chrome, native menu shows ai-review/File/Edit, sidecar process is spawned (verify with `ps aux | grep core-sidecar`).

Stop with Ctrl-C.

- [ ] **Step 17: Confirm Tauri still builds**

Run: `pnpm tauri dev`
Expected: app launches normally. Stop with Ctrl-C.

- [ ] **Step 18: Commit**

```bash
git add electron/ electron-builder.yml package.json pnpm-lock.yaml .gitignore
git commit -m "feat: add Electron shell with Rust sidecar (parallel to Tauri)"
```

---

## Task 6: Bridge cutover

**Files:**
- Modify: `src/lib/bridge.ts` (swap implementation to `window.electronAPI`)
- Modify: `src/lib/bridge.test.ts` (update mocks)
- Modify: `src/hooks/useGit.ts` (rename `tauri://focus` → `app:focus`)
- Modify: `cli/build-install-macos.sh` (call `pnpm electron:build`)
- Create: `src/lib/types/electron.d.ts` (window typing)

After this task Electron is the live shell. Tauri still compiles but is no longer the primary path.

- [ ] **Step 1: Add a TypeScript declaration for `window.electronAPI`**

Create `src/lib/types/electron.d.ts`:

```ts
declare global {
  interface Window {
    electronAPI: {
      invoke<T>(method: string, params?: Record<string, unknown>): Promise<T>;
      on(channel: string, cb: (payload: unknown) => void): () => void;
      setTitle(title: string): Promise<void>;
      openDirectoryDialog(): Promise<string | null>;
    };
  }
}

export {};
```

Reference it from `src/vite-env.d.ts` by adding at the top:

```ts
/// <reference path="./lib/types/electron.d.ts" />
```

- [ ] **Step 2: Update bridge tests for the new transport**

Replace `src/lib/bridge.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn(async () => "ok");
const onMock = vi.fn(() => () => {});
const setTitleMock = vi.fn(async () => {});
const openDirMock = vi.fn(async () => "/some/path");

beforeEach(() => {
  invokeMock.mockClear();
  onMock.mockClear();
  setTitleMock.mockClear();
  openDirMock.mockClear();
  (globalThis as unknown as { window: Window }).window =
    (globalThis as unknown as { window: Window }).window ?? ({} as Window);
  window.electronAPI = {
    invoke: invokeMock as unknown as Window["electronAPI"]["invoke"],
    on: onMock,
    setTitle: setTitleMock,
    openDirectoryDialog: openDirMock,
  };
});

describe("bridge", () => {
  it("forwards invoke to electronAPI", async () => {
    const { invoke } = await import("./bridge");
    await invoke("foo", { a: 1 });
    expect(invokeMock).toHaveBeenCalledWith("foo", { a: 1 });
  });

  it("returns an unlisten function from listen", async () => {
    const { listen } = await import("./bridge");
    const off = await listen("evt", () => {});
    expect(typeof off).toBe("function");
    expect(onMock).toHaveBeenCalledWith("evt", expect.any(Function));
  });

  it("getCurrentWindow.setTitle calls electronAPI.setTitle", async () => {
    const { getCurrentWindow } = await import("./bridge");
    getCurrentWindow().setTitle("hi");
    expect(setTitleMock).toHaveBeenCalledWith("hi");
  });

  it("openDirectoryDialog forwards to electronAPI", async () => {
    const { openDirectoryDialog } = await import("./bridge");
    const result = await openDirectoryDialog();
    expect(result).toBe("/some/path");
    expect(openDirMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the bridge test (should fail)**

Run: `pnpm test:run src/lib/bridge.test.ts`
Expected: FAIL — bridge still imports from `@tauri-apps/api/*`.

- [ ] **Step 4: Reimplement `src/lib/bridge.ts` against `window.electronAPI`**

```ts
export async function invoke<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  return window.electronAPI.invoke<T>(method, args);
}

interface BridgeEvent<T> {
  payload: T;
}

export async function listen<T = unknown>(
  event: string,
  cb: (e: BridgeEvent<T>) => void,
): Promise<() => void> {
  return window.electronAPI.on(event, (payload) => cb({ payload: payload as T }));
}

export interface BridgeWindow {
  setTitle: (title: string) => void;
}

export function getCurrentWindow(): BridgeWindow {
  return {
    setTitle: (title: string) => {
      void window.electronAPI.setTitle(title);
    },
  };
}

export async function openDirectoryDialog(): Promise<string | null> {
  return window.electronAPI.openDirectoryDialog();
}
```

- [ ] **Step 5: Run the bridge test (should pass)**

Run: `pnpm test:run src/lib/bridge.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Rename `tauri://focus` to `app:focus`**

Open `src/hooks/useGit.ts`. Find the line:

```ts
const unlistenPromise = listen("tauri://focus", () => {
```

Replace with:

```ts
const unlistenPromise = listen("app:focus", () => {
```

Remove the `TODO(electron-migration)` comment added in Task 1.

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test:run`
Expected: PASS — same number of tests as before.

- [ ] **Step 8: Smoke-test Electron dev**

Run: `pnpm electron:dev`

Walk through the manual smoke checklist from the spec (`docs/superpowers/specs/2026-05-02-electron-migration-design.md`, section "Testing", "Manual smoke checklist"):

1. Window opens, default repo loads, diff shows.
2. Repo switcher works.
3. Commit selector, branch diff, range diff.
4. File explorer search.
5. Add/edit/delete comment, overview.
6. LFS file preview, image preview, markdown preview.
7. Hunk expansion top/bottom/both.
8. Native menu `Install CLI…` triggers the renderer modal.
9. After installing, `which air` resolves, `air` from terminal opens the app pointing at CWD.
10. `air --wait --commit HEAD` blocks; on submit, feedback prints and exit 0; on close-without-submit, exit 1.

Stop with Ctrl-C. **Do not proceed if any item fails.** File issues against the plan and fix.

- [ ] **Step 9: Update `cli/build-install-macos.sh`**

Replace the file:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_NAME="AI Review.app"
SOURCE_APP="$REPO_ROOT/release/mac-arm64/$APP_NAME"
if [ ! -d "$SOURCE_APP" ]; then
  SOURCE_APP="$REPO_ROOT/release/mac/$APP_NAME"
fi
DEST_DIR="/Applications"

cd "$REPO_ROOT"
pnpm electron:build

if [ ! -d "$SOURCE_APP" ]; then
  echo "Error: built app not found at expected paths under release/" >&2
  exit 1
fi

if [ ! -w "$DEST_DIR" ]; then
  DEST_DIR="$HOME/Applications"
  mkdir -p "$DEST_DIR"
fi

DEST_APP="$DEST_DIR/$APP_NAME"
rm -rf "$DEST_APP"
cp -R "$SOURCE_APP" "$DEST_APP"

echo "Installed $APP_NAME to $DEST_DIR"
```

- [ ] **Step 10: Production build smoke test**

Run: `pnpm electron:build`
Expected: produces `release/mac-arm64/AI Review.app` (or `release/mac/AI Review.app` on Intel). `release/mac*/AI Review.app/Contents/Resources/bin/core-sidecar` and `core-launcher` should exist.

Run: `pnpm tauri:build:install` (now wired to electron-builder via the updated script)
Expected: app installed to `/Applications/AI Review.app`. Open it from Spotlight. Walk the smoke checklist again against the installed app.

- [ ] **Step 11: Commit**

```bash
git add src/lib/bridge.ts src/lib/bridge.test.ts src/lib/types/electron.d.ts \
  src/vite-env.d.ts src/hooks/useGit.ts cli/build-install-macos.sh
git commit -m "feat: switch bridge to Electron and wire packaging script"
```

---

## Task 7: Delete Tauri

**Files:**
- Delete: `src-tauri/`
- Modify: `package.json` (remove Tauri deps and `tauri` script)
- Modify: `pnpm-lock.yaml` (regenerated by pnpm)

- [ ] **Step 1: Delete the Tauri crate**

Run: `git rm -r src-tauri`

- [ ] **Step 2: Remove Tauri deps from `package.json`**

Edit `package.json`. From `dependencies`, remove:
- `@tauri-apps/api`
- `@tauri-apps/plugin-dialog`
- `@tauri-apps/plugin-opener`

From `devDependencies`, remove:
- `@tauri-apps/cli`

From `scripts`, remove:
- `"tauri": "tauri"`

Verify with `cat package.json` that no `@tauri-apps/*` strings remain.

- [ ] **Step 3: Refresh the lockfile**

Run: `pnpm install`
Expected: lockfile updates; no errors.

- [ ] **Step 4: Run tests**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 5: Build for production**

Run: `pnpm electron:build`
Expected: PASS — produces the .app bundle.

- [ ] **Step 6: Smoke-test the installed app**

Run: `pnpm tauri:build:install` (despite the name, it now runs `pnpm electron:build` and installs the Electron app — Task 8 renames it).
Expected: installed app opens, smoke checklist passes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Tauri shell"
```

---

## Task 8: Version bump + docs

**Files:**
- Modify: `package.json` (rename script, optional version bump)
- Modify: `cli/build-install-macos.sh` (rename usage hint if any)
- Modify: `README.md`
- Modify: `CLAUDE.md` (a.k.a. `AGENTS.md` — same file)

- [ ] **Step 1: Rename the build-install script reference**

Edit `package.json` `scripts`:

```json
"electron:build:install": "bash ./cli/build-install-macos.sh"
```

(Remove the now-misnamed `"tauri:build:install"` key.)

- [ ] **Step 2: Update `README.md`**

Find the "Architecture" or "Setup" section in `README.md`. Replace any references to "Tauri" with "Electron". Update commands:

| Old | New |
| --- | --- |
| `pnpm tauri dev` | `pnpm electron:dev` |
| `pnpm tauri build` | `pnpm electron:build` |
| `pnpm tauri:build:install` | `pnpm electron:build:install` |

If the README lists the tech stack as "Tauri v2 + Rust + React/TypeScript", change to "Electron + Rust sidecar + React/TypeScript".

- [ ] **Step 3: Update `CLAUDE.md` / `AGENTS.md`**

Open `CLAUDE.md`. The "What This Is" section currently reads:

> ai-review is a desktop code review tool built with Tauri v2 (Rust backend + React/TypeScript frontend).

Change to:

> ai-review is a desktop code review tool built with Electron (Rust backend sidecar + React/TypeScript frontend).

In the "Commands" section, update the dev/build commands to reference `pnpm electron:dev` / `pnpm electron:build`. Remove `pnpm tauri dev` / `pnpm tauri build`.

In the "Architecture" section, replace:

> **Backend (src-tauri/src/):** Rust. `lib.rs` defines Tauri commands exposed to the frontend via `invoke()`. `git.rs` shells out to `git` CLI for all git operations. `files.rs` handles file listing (git-aware via `git ls-files` with recursive walk fallback).

with:

> **Backend (`core/`):** Rust workspace with `core-lib` (git/files/config), `core-sidecar` (JSON-RPC over stdio, dispatched to from Electron main), and `core-launcher` (the `air` CLI). All git operations shell out to `git`.

In the "IPC" section, replace:

> **IPC:** Frontend calls Rust functions via `invoke<T>("command_name", { args })` from `@tauri-apps/api/core`. All commands return `Result<T, String>`.

with:

> **IPC:** Frontend calls a thin `src/lib/bridge.ts` (`invoke`, `listen`, `openDirectoryDialog`, `getCurrentWindow`). The bridge calls `window.electronAPI` exposed from `electron/preload.ts`. Electron main forwards calls to `core-sidecar` over JSON-RPC 2.0 on stdio.

Remove any other lingering references to `react-diff-view`'s split classes — those are unchanged, so leave them. Update the **CLI launcher** paragraph if present:

> **CLI launcher (cli/):** `air` bash script that spawns the app as a detached background process, passing the working directory as an argument.

→

> **CLI launcher:** `core-launcher` Rust binary, installed as `~/.local/bin/air` via the `Install CLI…` menu. Locates the installed `AI Review.app` and spawns it via `open -a`. With `--wait`, blocks via `open -W` and reads feedback from a temp-file path passed to the app.

- [ ] **Step 4: Bump version**

Edit `package.json` and `core/Cargo.toml` workspace `[workspace.package]`:

```
"version": "0.5.0"  // package.json
version = "0.5.0"   // core/Cargo.toml
```

- [ ] **Step 5: Run final test + build**

Run: `pnpm test:run && pnpm electron:build`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json core/Cargo.toml README.md CLAUDE.md
git commit -m "chore: bump to 0.5.0; document Electron migration"
```

---

## Self-Review Notes

Spec coverage check:
- ✅ Three-process architecture (renderer / main / sidecar) — Tasks 5, 3
- ✅ Bridge abstraction — Tasks 1, 6
- ✅ JSON-RPC 2.0 over newline-delimited stdio — Task 3
- ✅ Method names match Tauri command names — Task 3 dispatch table
- ✅ Four launch-context methods served by main, not sidecar — Task 5 step 9
- ✅ `submit_feedback` via temp-file pipe — Task 4 launcher + Task 5 main
- ✅ Window chrome (`hiddenInset`, traffic-light position, 1400×900, `#282c34`) — Task 5 step 9
- ✅ Native menu (`Install CLI…`) — Task 5 step 7
- ✅ `check_cli_installed` / `install_cli` ported — Task 5 step 9
- ✅ Cargo workspace with three crates — Tasks 2, 3, 4
- ✅ electron-builder config with `extraResources` — Task 5 step 11
- ✅ Manual smoke checklist — Task 6 step 8
- ✅ Tauri removal as one commit after parity — Task 7
- ✅ Version bump + docs — Task 8

Placeholder scan: no "TBD" / "TODO" / "implement later" remain. Each step shows the actual code or command.

Type consistency: `LaunchArgs` in `electron/argv.ts` is referenced by `electron/main.ts` as `LaunchArgs`. `ParsedArgs` in `core-launcher` is consistently named. `BridgeWindow` matches between the Tauri-backed bridge in Task 1 and the Electron-backed bridge in Task 6 (`setTitle: (title: string) => void`).

The `"AI Review.app"` filename appears in the launcher (Task 4) and the install script (Task 6). It must match what `electron-builder` produces. `productName: AI Review` in `electron-builder.yml` (Task 5 step 11) yields `AI Review.app`. ✅
