# Multi-Repository Management

Add the ability to manage multiple git repositories and switch between them. Replaces the current "no repo" experience (example diff) with a full-screen repo picker, and adds a compact top bar dropdown for switching repos once one is active.

## Approach

Backend-managed repo list persisted to a config file. Native OS folder picker via `tauri-plugin-dialog`. Auto-add repos launched via CLI. Warning dialog when switching with unsaved comments.

## Backend

### Config file

`~/.config/ai-review/config.json`:

```json
{
  "repos": [
    "/Users/mrm/workspace/ai-review",
    "/Users/mrm/workspace/other-project"
  ]
}
```

### New module: `src-tauri/src/config.rs`

Handles reading/writing the config file. Creates the file and parent directories on first access.

### New Tauri commands

| Command | Signature | Description |
|---------|-----------|-------------|
| `list_repos` | `() -> Vec<RepoInfo>` | Returns saved repos (name + path), filtering out paths that no longer exist on disk |
| `add_repo` | `(path: String) -> Result<RepoInfo, String>` | Validates path is a git repo, adds to config, idempotent |
| `remove_repo` | `(path: String) -> Result<(), String>` | Removes from config |
| `switch_repo` | `(path: String) -> Result<GitDiffResult, String>` | Updates `AppState.working_dir`, validates git repo, loads unstaged diff |

`RepoInfo` is a struct with `name: String` (last path segment) and `path: String`.

### Folder picker

Add `tauri-plugin-dialog` dependency. Frontend calls `open({ directory: true })` from `@tauri-apps/plugin-dialog` to open a native OS folder selection dialog.

### Auto-add on launch

When the app starts inside a git repo, the backend automatically adds that path to the config if not already present.

## Frontend

### Full-screen repo picker

Shown when no repo is active (launched outside a git repo, or no repos saved). Centered layout with:

- App title/logo
- List of saved repos (if any), each clickable to select
- "Add Repository" button that opens the native folder picker
- Each repo entry has a remove (`x`) button

Once a repo is selected, transitions to the normal diff view.

### Top bar dropdown

Always visible when a repo is active. Replaces the current path text display.

- Trigger: shows current repo name (folder name, e.g. "ai-review"), clickable
- Dropdown contents:
  - Saved repos list (name + truncated path), current one highlighted
  - "Add Repository..." entry at the bottom, opens folder picker
  - Each repo has a small `x` to remove from list
- Clicking a different repo triggers the switch flow

### Comment guard modal

When switching repos while comments exist:

- Modal: "You have N comments that will be lost. Switch anyway?"
- "Discard & Switch" button (destructive, red)
- "Cancel" button
- On discard: clears all comments, resets state, switches

### Switching behavior

On repo switch, reset:
- `diffText`, `diffMode` (back to unstaged)
- `selectedCommit`, `selectedBranch` (to null)
- `expandedHunksMap`, `sourceCache`
- All comments (after user confirmation if any exist)
- `viewMode` back to "diff"

The file list sidebar, commit selector, and other state naturally update since they depend on `workingDir`.

## Edge Cases

- **Repo deleted from disk**: `list_repos` filters out non-existent paths. If the current repo disappears, show the full-screen picker.
- **Path is not a git repo**: `add_repo` validates with `is_git_repo` before accepting.
- **Duplicate adds**: idempotent, adding the same path twice is a no-op.
- **Config file doesn't exist**: first `list_repos` call creates it with `repos: []`.
- **Switching to same repo**: no-op, skip the comment guard.

## Testing

- Unit tests for config read/write/add/remove (Rust)
- Frontend tests for comment guard logic (show modal when comments > 0, skip when 0)
- Test that switch resets all relevant state
