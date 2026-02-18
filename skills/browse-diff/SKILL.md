---
name: browse-diff
description: Open the ai-review desktop app to visually browse a diff. Use when the user wants to see changes in a visual diff viewer without a review feedback loop — just for viewing.
---

Open the ai-review desktop app (`air`) to let the human visually explore a diff. No feedback loop — the app opens and you continue working.

## Steps

1. **Determine what to show.** Check the state of changes to pick the right `air` invocation:

   a. **Uncommitted changes exist** (staged or unstaged, check via `git status --porcelain`):
      Run `air` with no flags. This shows the working directory diff.

   b. **On a feature branch** (not main/master):
      Determine the base branch (`main` or `master`, whichever exists). Run:
      ```
      air --branch <base-branch>
      ```

   c. **Specific commit or range requested:**
      Run `air --commit <hash>` or `air --commits <range>`.

   d. **On main/master with unpushed commits:**
      Run `git log origin/main..HEAD --oneline --reverse` (or `origin/master`) and take the first commit hash. Run:
      ```
      air --commit <first-unpushed-commit-hash>
      ```

2. **Inform the human.** Tell them you've opened ai-review so they can browse the diff. Continue working without waiting.

## Notes

- Do NOT use `--wait`. This skill is fire-and-forget.
- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the diff is empty, inform the user there are no changes to view.
