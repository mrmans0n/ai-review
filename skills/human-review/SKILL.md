---
name: human-review
description: Request human code review via the ai-review desktop app. Use when code changes are complete and ready for a final human review before committing or merging. Opens an interactive diff viewer where the human can leave inline comments, then returns their feedback.
---

You have finished writing code and need the human to review it before proceeding. Use the `air` CLI tool to open an interactive code review session, then address every piece of feedback.

## Steps

1. **Determine what to review.** Check the state of changes to pick the right `air` invocation:

   a. **Uncommitted changes exist** (staged or unstaged, check via `git status --porcelain`):
      Run `air --wait --json` with no branch/commit flags. This reviews the working directory diff.

   b. **All changes are committed, on a feature branch** (not main/master):
      Determine the base branch (`main` or `master`, whichever exists). Find the merge-base commit and use `--commit`:
      ```
      air --wait --json --commit $(git merge-base <base-branch> HEAD)
      ```

   c. **All changes are committed, on main/master itself:**
      Identify the first commit you made during this session. If you can determine the exact commit (e.g., you created it earlier in this conversation), use that hash directly. Otherwise, fall back to the first unpushed commit: run `git log origin/main..HEAD --oneline --reverse` (or `origin/master`) and take the first commit hash. Run:
      ```
      air --wait --json --commit <first-relevant-commit-hash>
      ```

   The `air` command opens the ai-review desktop app showing the relevant diff. The human will review the code, add comments, and submit. The command blocks until submission and prints structured JSON feedback to stdout.

2. **Parse the feedback.** The output is a JSON object with the following shape:

   ```json
   {
     "format": "ai-review.feedback/v1",
     "context": {
       "mode": "unstaged|staged|commit|range|branch",
       "commitRef": "...",
       "selectedCommit": { "hash": "...", "short_hash": "...", "message": "...", ... } | null,
       "selectedBranch": { "name": "...", "short_hash": "...", ... } | null
     },
     "comments": [
       {
         "id": "...",
         "file": "src/App.tsx",
         "startLine": 10,
         "endLine": 12,
         "side": "old|new",
         "text": "...",
         "createdAt": "..."
       }
     ]
   }
   ```

   Parse the JSON and iterate over the `comments` array. Each comment has a `file`, `startLine`/`endLine`, `side` (`"old"` = deleted code, `"new"` = added/current code), and `text`.

3. **Address every comment.** For each review comment:
   - Read the referenced file and lines
   - Make the requested change
   - If a comment is unclear, use your best judgment based on the surrounding code context

4. **Summarize.** After all changes are made, provide a concise summary listing each comment and what you did to address it.

## Notes

- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the diff is empty (current branch is identical to base), inform the user there are no changes to review.
- Do NOT commit after making changes — let the user decide when to commit.
