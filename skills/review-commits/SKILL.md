---
name: review-commits
description: Open existing commits in the ai-review desktop app for review. Use when you need to review, understand, or get feedback on specific commits, a commit range, or a branch diff — not your own recent work, but existing history.
---

Open specific commits or a commit range in ai-review so the human can review existing changes. Useful for understanding history, reviewing someone else's work, or getting context on past changes.

## Steps

1. **Determine what to review.** Based on what was requested, pick the right `air` invocation:

   a. **A specific commit:**
      ```
      air --wait --json --commit <commit-hash>
      ```

   b. **A range of commits** (e.g., "last 3 commits", "commits since Tuesday"):
      Determine the range. For the last N commits, find the Nth parent: `git rev-parse HEAD~N`. Run:
      ```
      air --wait --json --commits <start-hash>..<end-hash>
      ```

   c. **A branch diff** (e.g., "what changed on feature-x"):
      ```
      air --wait --json --branch <base-branch>
      ```

   The `air --wait --json` command opens the ai-review desktop app and blocks until the human submits. The output is structured JSON.

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

     Present the comments to the user. If the comments suggest code changes and the commits are on the current branch, offer to make the changes.

   - **If the human submitted with no comments:** (empty `comments` array) Acknowledge and move on.

## Notes

- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the specified commit or range doesn't exist, inform the user and suggest alternatives (e.g., `git log --oneline -10`).
