---
name: human-review
description: Request human code review via the ai-review desktop app. Use when code changes are complete and ready for a final human review before committing or merging. Opens an interactive diff viewer where the human can leave inline comments, then returns their feedback.
---

You have finished writing code and need the human to review it before proceeding. Use the `air` CLI tool to open an interactive code review session, then address every piece of feedback.

## Steps

1. **Determine what to review.** Check the state of changes to pick the right `air` invocation:

   a. **Uncommitted changes exist** (staged or unstaged, check via `git status --porcelain`):
      Run `air --wait` with no branch/commit flags. This reviews the working directory diff.

   b. **All changes are committed, on a feature branch** (not main/master):
      Determine the base branch (`main` or `master`, whichever exists). Run:
      ```
      air --wait --branch <base-branch>
      ```

   c. **All changes are committed, on main/master itself:**
      Identify the first commit you made during this session. If you can determine the exact commit (e.g., you created it earlier in this conversation), use that hash directly. Otherwise, fall back to the first unpushed commit: run `git log origin/main..HEAD --oneline --reverse` (or `origin/master`) and take the first commit hash. Run:
      ```
      air --wait --commit <first-relevant-commit-hash>
      ```

   The `air` command opens the ai-review desktop app showing the relevant diff. The human will review the code, add comments, and submit. The command blocks until submission and prints the review feedback to stdout.

2. **Parse the feedback.** The output is a structured prompt listing review comments, each in the format:

   - `file/path.ts:123` — comment text
   - `file/path.ts:45-50` — comment text
   - `file/path.ts:10 (deleted)` — comment about removed code

3. **Address every comment.** For each review comment:
   - Read the referenced file and lines
   - Make the requested change
   - If a comment is unclear, use your best judgment based on the surrounding code context

4. **Summarize.** After all changes are made, provide a concise summary listing each comment and what you did to address it.

## Notes

- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the diff is empty (current branch is identical to base), inform the user there are no changes to review.
- Do NOT commit after making changes — let the user decide when to commit.
