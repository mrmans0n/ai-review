# Usage Guide

## Quick Start

### 1. Install the CLI (one-time setup)

```bash
# Build the app first
pnpm install
pnpm tauri build

# Install CLI tools
cd cli
./install.sh

# Add to PATH if needed (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
source ~/.zshrc  # or ~/.bashrc
```

### 2. Use the CLI

```bash
# Navigate to any Git repository
cd /path/to/your/project

# Launch ai-diff in the current directory
aid

# Or specify a directory
aid /path/to/another/project

# aidiff is an alias
aidiff
```

## Features

### Viewing Git Diffs

When you open ai-diff in a Git repository:

1. **Auto-load**: Unstaged changes load automatically
2. **Switch modes**: Use the buttons at the top to switch between:
   - **Unstaged**: Current working directory changes
   - **Staged**: Changes ready to commit
   - **HEAD~1**: Changes in the last commit
3. **File sidebar**: Click any file to view its diff in isolation

### File Explorer

1. **Activate**: Press **Shift twice quickly** (within 300ms)
2. **Search**: Start typing to filter files (fuzzy matching)
3. **Navigate**: Use ↑/↓ arrow keys
4. **Select**: Press Enter or click to open
5. **Close**: Press Esc or click outside

### Adding Comments

#### Option 1: Button
1. Click "Add Comment" button at the top of any file diff
2. Type your comment
3. Press Cmd/Ctrl+Enter or click "Add Comment" button

#### Option 2: Keyboard (in development)
1. Press **C** key (when not in an input field)
2. Click a line to add a comment there
3. Type your comment
4. Submit with Cmd/Ctrl+Enter

### Managing Comments

- **Edit**: Click the "Edit" button on any comment
- **Delete**: Click the "Delete" button to remove
- **View**: Comments appear inline between diff lines with yellow background

### View Options

- **Split View**: Side-by-side comparison (default)
- **Unified View**: Single column with +/- indicators
- Toggle between views using the buttons at the top

## Tips

1. **Fuzzy search**: In the file explorer, you don't need to type the full path. For example, typing "appts" will match "src/App.tsx"

2. **Keyboard navigation**: Most actions have keyboard shortcuts:
   - Shift+Shift: Open file explorer
   - C: Add comment (coming soon)
   - Esc: Close dialogs
   - ↑/↓: Navigate lists
   - Enter: Select

3. **Syntax highlighting**: Code is automatically highlighted based on file extension

4. **Large repositories**: The file explorer uses `git ls-files` when available, which respects your .gitignore

## Troubleshooting

### CLI not found after install

```bash
# Check if ~/.local/bin is in your PATH
echo $PATH | grep ".local/bin"

# If not, add to your shell config:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### App doesn't open

```bash
# Make sure you built the app
cd /path/to/ai-diff
pnpm tauri build

# Check if the binary exists
ls -la src-tauri/target/release/ai-diff  # macOS/Linux
ls -la src-tauri/target/release/ai-diff.exe  # Windows
```

### No diffs showing

1. Make sure you're in a Git repository: `git status`
2. Make sure there are changes: `git diff`
3. Check the console for errors (View > Toggle Developer Tools)

### File explorer shows no files

1. The explorer uses `git ls-files` in Git repos - make sure files are tracked
2. For non-Git directories, it walks the file tree (may be slow for large directories)

## Examples

### Review unstaged changes before committing

```bash
cd ~/projects/my-app
aid

# Review changes, add comments
# Switch between files
# When done, close the app and commit
```

### Review someone's pull request

```bash
cd ~/projects/my-app
git fetch origin pull/123/head:pr-123
git checkout pr-123
aid

# Review all changes in the PR
# Add comments to discuss with the author
```

### Compare with an older commit

```bash
cd ~/projects/my-app
aid

# Click "HEAD~1" button to see last commit
# Or create a custom commit diff in the future
```

## Roadmap

See [PLAN.md](PLAN.md) for upcoming features including:
- Prompt generation from comments
- Session save/load
- Direct AI API integration
- More keyboard shortcuts
- Line click to add comments
- Range selection for multi-line comments
