---
name: browse-diff
description: Open the ai-review desktop app to visually browse a diff. Use when the user wants to see changes in a visual diff viewer without a review feedback loop — just for viewing.
---

Open the ai-review desktop app (`air`) to let the human visually explore a diff. No feedback loop — the app opens and you continue working.

## Steps

1. **Determine what to show.** Check these in priority order to pick the right `air` invocation:

   a. **Specific commit or range requested by the user:**
      Run `air --commit <hash>` or `air --commits <range>`.

   b. **Uncommitted changes exist** (staged or unstaged, check via `git status --porcelain`):
      Run `air` with no flags. This shows the working directory diff.

   c. **Clean tree, on a gg stack branch** — the current branch matches the `user/name` pattern (no `--` in the name part) and `.git/gg/config.json` exists:
      Read the gg base branch from config (parse `defaults.base`, fall back to `main`). Run:
      ```
      air --commits <gg-base>..HEAD
      ```
      This shows the full stack diff, matching what ai-review displays when opening a gg stack.

   d. **Clean tree, on a feature branch** (not main/master):
      Determine the base branch (`main` or `master`, whichever exists). Run:
      ```
      air --branch <base-branch>
      ```

   e. **Clean tree, on main/master with unpushed commits:**
      Run `git log origin/main..HEAD --oneline --reverse` (or `origin/master`) and take the first commit hash. Run:
      ```
      air --commit <first-unpushed-commit-hash>
      ```

   f. **None of the above:** Run `air` with no flags (empty diff — the app handles it).

2. **Inform the human.** Tell them you've opened ai-review so they can browse the diff. Continue working without waiting.

## Notes

- Do NOT use `--wait`. This skill is fire-and-forget.
- If `air` is not found, tell the user to install via `brew install --cask mrmans0n/tap/ai-review` (macOS) or build from source at https://github.com/mrmans0n/ai-review.
- If the diff is empty, inform the user there are no changes to view.
