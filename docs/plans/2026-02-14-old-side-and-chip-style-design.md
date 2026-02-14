# Old-Side Comment Annotation + Chip Style Fix

## Summary

Two fixes: (1) annotate old-side comments in the generated prompt so LLMs know the comment refers to deleted code, and (2) change prompt preview chip styling to match the CommentOverview badge.

## Fix 1: Old-side annotation

**Problem:** Comments on the left (old) side in split view produce the same prompt output as new-side comments. LLMs will look for the referenced line in the current file and get confused.

**Solution:** Annotate inline. When `comment.side === "old"`, append ` (deleted)` to the location in the generated prompt text.

- New side: `` - `src/foo.ts:15` — comment text ``
- Old side: `` - `src/foo.ts:15 (deleted)` — comment text ``

Changes needed:
- `promptGenerator.ts`: append ` (deleted)` when `comment.side === "old"`
- `promptParser.ts`: update regex to optionally capture ` (deleted)`, add `deleted: boolean` to `ParsedCommentLine`
- `PromptPreview.tsx`: show a small "deleted" label in the rich view when `deleted` is true
- `CommentOverview.tsx`: show a small "old" indicator when `comment.side === "old"`

## Fix 2: Chip styling

**Problem:** Prompt preview uses `rounded-full` pill chips; user prefers the CommentOverview badge style.

**Solution:** Change from `bg-gray-700 text-gray-200 rounded-full px-2.5 py-0.5` to `bg-gray-600 text-gray-300 rounded px-2 py-0.5` to match CommentOverview.
