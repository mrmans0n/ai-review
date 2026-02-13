# Expandable Hunk Context

Expand collapsed lines between diff hunks, at the top of a file, and at the bottom of a file. Matches GitHub/GitLab behavior where users can reveal surrounding context without leaving the diff view.

## Approach

Use react-diff-view's built-in expansion utilities (`expandFromRawCode`, `getCollapsedLinesCountBetween`, `Decoration` component). Fetch full file source once per file, then expand locally without additional backend calls.

## Backend

**New Tauri command:** `get_file_at_ref(path, ref, file_path) -> String`

Runs `git show <ref>:<file_path>`. Used to fetch the file source needed for expansion.

Which ref to use depends on the diff mode:

| Diff mode | Source ref |
|-----------|-----------|
| Unstaged  | Working tree (`read_file_content`) |
| Staged    | Index (`:0`) |
| Commit    | Commit hash |
| Branch    | Branch tip |

Between-hunk regions are unchanged, so the old and new sides are identical there. We only need one side's source.

**New Rust function in git.rs:** `get_file_at_ref(dir, ref, file_path) -> Result<String, String>` shells out to `git show <ref>:<file_path>`.

## Frontend State

```typescript
// Per-file source cache: file path -> full source lines
const [fileSources, setFileSources] = useState<Record<string, string[]>>({});

// Per-file expanded hunks: file path -> expanded HunkData[]
const [expandedHunks, setExpandedHunks] = useState<Record<string, HunkData[]>>({});
```

When the diff changes (mode switch, new commit selected), both caches are cleared.

## Data Flow

1. Diff loads. Each file renders with its original `file.hunks`.
2. User clicks an expand button on a file.
3. If `fileSources[filePath]` is empty, fetch the source via `get_file_at_ref` (or `read_file_content` for unstaged working tree) and cache it.
4. Call `expandFromRawCode(currentHunks, source, start, end)` to produce expanded hunks.
5. Store result in `expandedHunks[filePath]`.
6. `renderFile()` uses `expandedHunks[filePath] ?? file.hunks`.
7. Re-tokenize (syntax highlight) the expanded hunks.

Comments survive expansion because they're keyed by file + line number + side, which doesn't change when context lines are added.

## UI — Expand Controls

Three locations, rendered via react-diff-view's `Decoration` component:

### Between hunks (gap > 0 collapsed lines)

Shows the number of collapsed lines and up to three buttons:
- **Expand up 15** — adds 15 lines from the bottom of the preceding hunk
- **Expand down 15** — adds 15 lines from the top of the following hunk
- **Expand all** — reveals all collapsed lines

If the gap is 15 lines or fewer, show only "Expand all N lines".

### Top of file (first hunk doesn't start at line 1)

Single button: **Expand 15 lines** (or "Expand all N lines" if fewer than 15 are hidden).

### Bottom of file (lines exist after the last hunk)

Single button: **Expand 15 lines** (or "Expand all N lines" if fewer than 15 are hidden).

### Visual style

A subtle bar with `bg-gray-800 border-gray-700` styling, small text buttons with hover states, matching the dark theme. The Decoration component renders as a `<tbody>` with class `diff-decoration` containing a full-width row.

### Rendering

The `<Diff>` children function interleaves `<Decoration>` elements between `<Hunk>` elements:

```tsx
{(hunks) => {
  const elements = [];
  if (hunks[0]?.oldStart > 1) elements.push(<Decoration>/* top expand */</Decoration>);
  hunks.forEach((hunk, i) => {
    if (i > 0) {
      const collapsed = getCollapsedLinesCountBetween(hunks[i-1], hunk);
      if (collapsed > 0) elements.push(<Decoration>/* between expand */</Decoration>);
    }
    elements.push(<Hunk key={hunk.content} hunk={hunk} />);
  });
  elements.push(<Decoration>/* bottom expand */</Decoration>);
  return elements;
}}
```

## Edge Cases

- **Deleted files** — Use old side source (`git show HEAD:<path>`)
- **Added files** — Skip expand controls (entire file is already shown as inserts)
- **Binary files** — No expansion
- **Renamed files** — Use the new path to fetch source
- **File not found at ref** — Catch error, hide expand controls for that file
- **Repeated expansion** — Each expand uses current `expandedHunks` state; successive expansions accumulate
- **Syntax highlighting** — Re-tokenize after expanding since new lines need highlighting

## Testing

- Unit tests for expand handler: given hunks + source, verify expanded output
- Test `getCollapsedLinesCountBetween` returns correct counts
- Edge case tests: first hunk at line 1, single-hunk files, fully expanded state
