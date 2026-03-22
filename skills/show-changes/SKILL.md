---
name: show-changes
description: Present completed work to the human for optional review via the ai-review desktop app. Use when you've finished a task and want the human to see what you did — they can optionally leave feedback.
---

You have completed a task and want to show the human what you did. Open ai-review so they can look over the changes and optionally leave feedback. This is less formal than a full code review — the framing is "here's what I did" rather than "please review my code."

## Steps

1. **Determine what to show.** Check the state of changes to pick the right `air` invocation:

   a. **Uncommitted changes exist** (staged or unstaged, check via `git status --porcelain`):
      Run `air --wait --json` with no branch/commit flags. This shows the working directory diff.

   b. **All changes are committed, on a feature branch** (not main/master):
      Determine the base branch (`main` or `master`, whichever exists). Run:
      ```
      air --wait --json --branch <base-branch>
      ```

   c. **All changes are committed, on main/master itself:**
      Identify the first commit you made during this session. If you can determine the exact commit, use that hash directly. Otherwise, fall back to the first unpushed commit: run `git log origin/main..HEAD --oneline --reverse` (or `origin/master`) and take the first commit hash. Run:
      ```
      air --wait --json --commit <first-relevant-commit-hash>
      ```

   The `air --wait --json` command opens the ai-review desktop app and blocks until the human submits. They may add comments or submit with no comments. The output is structured JSON.

2. **Handle the response.**

   - **If the human submitted comments:** Parse the JSON feedback. The output has the shape:

     ```json
     {
       "format": "ai-review.feedback/v1",
       "context": { "mode": "...", ... },
       "comments": [
         { "id": "...", "file": "...", "startLine": 10, "endLine": 12, "side": "old|new", "text": "...", "createdAt": "..." }
       ]
     }
     ```

     Address each comment: read the referenced file and lines, make the requested change. If a comment is unclear, use your best judgment.

   - **If the human submitted with no comments:** (empty `comments` array) Acknowledge that they've seen the changes and move on.

3. **Summarize.** If changes were made, provide a concise summary listing each comment and what you did to address it.

## Notes

- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the diff is empty, inform the user there are no changes to show.
- Do NOT commit after making changes — let the user decide when to commit.
