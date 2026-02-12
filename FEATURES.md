# AI-Diff Features

## Implemented Features

### 1. CLI Commands (`aid` / `aidiff`)
- **Location**: `cli/aid` (bash script)
- **Installation**: Run `cli/install.sh` to install to `~/.local/bin`
- **Usage**:
  ```bash
  aid              # Open ai-diff in current directory
  aid /path/to/dir # Open ai-diff in specified directory
  aidiff           # Alias for aid
  ```
- The CLI passes the working directory as a command-line argument to the Tauri app
- The Tauri backend reads this on startup and uses it as the base directory

### 2. Git Diff Integration
- **Auto-detection**: Automatically detects if the working directory is a Git repository
- **Default view**: Shows unstaged changes on startup
- **Diff modes**:
  - Unstaged changes (`git diff`)
  - Staged changes (`git diff --staged`)
  - Commit diffs (`git diff HEAD~N`)
- **Changed files sidebar**: Lists all modified files with status indicators (M/A/D/R)
- **File selection**: Click a file to view its diff in isolation

### 3. File Explorer (Double Shift)
- **Activation**: Press Shift twice quickly (within 300ms)
- **Fuzzy search**: Type to filter files using fuzzy matching
- **Navigation**: Use ↑/↓ arrow keys to navigate, Enter to select
- **Git-aware**: Uses `git ls-files` when in a Git repository (respects .gitignore)
- **Fallback**: Recursive directory walk when not in a Git repo
- **File viewing**: Opens selected file content in the diff viewer

### 4. Inline Comments
- **Add comment**:
  - Click "Add Comment" button at the top of each file diff
  - Keyboard shortcut: Press `C` (when not in input/textarea)
- **Comment UI**:
  - Comments appear inline between diff lines
  - Yellow background for visibility
  - Shows line range and side (old/new)
  - Timestamp display
- **Edit/Delete**: Each comment has Edit and Delete buttons
- **Comment form**:
  - Multi-line text input
  - Submit with button or Cmd/Ctrl+Enter
  - Cancel with button or Esc

### 5. Diff Viewer
- **View modes**: Split view (side-by-side) or Unified view
- **Syntax highlighting**: Automatically detects language from file extension
- **File types supported**: TypeScript, JavaScript, Python, Java, Kotlin, Rust, Go, Ruby, PHP, C/C++, C#, Swift, CSS, HTML, JSON, Markdown, YAML, and more
- **Collapsible hunks**: Each change hunk can be expanded/collapsed

## Backend (Rust/Tauri)

### Commands
- `get_working_directory()` - Returns the initial working directory
- `is_git_repo(path)` - Checks if a directory is a Git repository
- `get_unstaged_diff(path)` - Gets unstaged changes
- `get_staged_diff(path)` - Gets staged changes
- `get_commit_diff(path, commit)` - Gets diff for a specific commit (e.g., "HEAD~1")
- `list_files(path)` - Lists all files in the directory (Git-aware)
- `read_file_content(path, filePath)` - Reads file contents

### Git Integration
- Shell-out to `git` commands for maximum compatibility
- Parses `git status --porcelain` for changed files
- Parses unified diff format from `git diff`
- Respects Git configuration (.gitignore, etc.)

## Frontend (React + TypeScript)

### Hooks
- `useGit` - Manages Git operations and diff loading
- `useFileExplorer` - Handles double-shift detection and file search
- `useComments` - Manages comment state (add/edit/delete)

### Components
- `FileList` - Displays changed files sidebar
- `FileExplorer` - Modal file search dialog
- `AddCommentForm` - Form for adding/editing comments
- `CommentWidget` - Displays individual comments inline

### Libraries
- `react-diff-view` - Diff rendering with split/unified views
- `highlight.js` - Syntax highlighting
- `@tauri-apps/api` - Tauri IPC bindings

## Known Limitations

1. **Line click comments**: Not yet implemented - currently only button-based comment addition works
2. **Comment keyboard shortcut**: 'C' key logs to console but doesn't add a comment yet (needs line selection tracking)
3. **Range selection**: Can only comment on single lines, not line ranges yet
4. **Prompt generation**: Not implemented (planned for future)
5. **Session persistence**: Comments are not saved to disk yet (in-memory only)
6. **CLI binary path**: The `aid` script looks for the built binary in specific locations - may need adjustment based on build type
7. **Windows support**: CLI script is bash-based, may need adaptation for Windows

## Building

```bash
# Frontend build
pnpm build

# Full Tauri build (production)
pnpm tauri build

# Debug build (faster, for testing)
pnpm tauri build --debug

# Development with hot reload
pnpm tauri dev
```

## Installation

```bash
# Install CLI tools
cd cli
./install.sh

# Add to PATH (if not already)
export PATH="$HOME/.local/bin:$PATH"

# Build the app first
cd ..
pnpm tauri build

# Then use the CLI
aid
```
