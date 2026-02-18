---
name: review-commits
description: Open existing commits in the ai-review desktop app for review. Use when you need to review, understand, or get feedback on specific commits, a commit range, or a branch diff — not your own recent work, but existing history.
---

Open specific commits or a commit range in ai-review so the human can review existing changes. Useful for understanding history, reviewing someone else's work, or getting context on past changes.

## Steps

1. **Determine what to review.** Based on what was requested, pick the right `air` invocation:

   a. **A specific commit:**
      ```
      air --wait --commit <commit-hash>
      ```

   b. **A range of commits** (e.g., "last 3 commits", "commits since Tuesday"):
      Determine the range. For the last N commits, find the Nth parent: `git rev-parse HEAD~N`. Run:
      ```
      air --wait --commits <start-hash>..<end-hash>
      ```

   c. **A branch diff** (e.g., "what changed on feature-x"):
      ```
      air --wait --branch <base-branch>
      ```

   The `air --wait` command opens the ai-review desktop app and blocks until the human submits.

2. **Handle the response.**

   - **If the human submitted comments:** Parse the feedback. The output lists review comments in the format:
     - `file/path.ts:123` — comment text
     - `file/path.ts:45-50` — comment text
     - `file/path.ts:10 (deleted)` — comment about removed code

     Present the comments to the user. If the comments suggest code changes and the commits are on the current branch, offer to make the changes.

   - **If the human submitted with no comments:** Acknowledge and move on.

## Notes

- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the specified commit or range doesn't exist, inform the user and suggest alternatives (e.g., `git log --oneline -10`).
