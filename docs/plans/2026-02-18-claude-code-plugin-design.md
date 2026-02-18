# Claude Code Plugin for ai-review

## Goal

Package ai-review as a Claude Code plugin so users can install it via `claude plugins install github.com/mrmans0n/ai-review` and get skills for interacting with the `air` CLI.

## Plugin Structure

```
ai-review/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── human-review/SKILL.md    (existing, minor updates)
│   ├── browse-diff/SKILL.md     (new)
│   ├── show-changes/SKILL.md    (new)
│   └── review-commits/SKILL.md  (new)
```

### plugin.json

```json
{
  "name": "ai-review",
  "description": "Skills for using ai-review (air) — a desktop code review tool for AI coding agents",
  "version": "0.1.3",
  "author": { "name": "Nacho Lopez" },
  "homepage": "https://github.com/mrmans0n/ai-review",
  "repository": "https://github.com/mrmans0n/ai-review",
  "license": "MIT",
  "keywords": ["code-review", "diff", "air", "ai-review", "human-review"]
}
```

## Skills

### 1. human-review (existing)

**Trigger:** Agent has finished writing code and wants the human to review before committing or merging.

**Behavior:** Determines diff type (working dir, branch, commit), runs `air --wait`, parses structured feedback, addresses every comment. Unchanged from current implementation — minor description update for plugin conventions.

### 2. browse-diff (new)

**Trigger:** Agent or human wants to visually explore a diff in the desktop app with no feedback loop.

**Behavior:**
- Determine diff type (working dir, branch, commit)
- Run `air` without `--wait` (fire and forget)
- Inform the human the app is open and continue without blocking

### 3. show-changes (new)

**Trigger:** Agent has completed work and wants to present changes to the human for optional review — less formal than human-review.

**Behavior:**
- Determine diff type
- Run `air --wait`
- If human submits comments: address them like human-review
- If human submits with no comments: acknowledge and move on

**Key difference from human-review:** Framing. "Here's what I did" vs. "Please review my code."

### 4. review-commits (new)

**Trigger:** Need to review or understand existing commits for context, history, or reviewing someone else's work.

**Behavior:**
- Accept a commit hash, range, or branch
- Run `air --wait --commit <hash>` or `air --wait --commits <range>` or `air --wait --branch <branch>`
- Parse any feedback if human adds comments

## Shared Error Handling

All skills handle these cases:
- **`air` not found:** Tell user to install via Homebrew or from source.
- **Empty diff:** Inform user, skip opening air.
- **Not a git repo:** Tell user and stop.

## Distribution

Installable directly from the GitHub repo URL. No marketplace listing initially.
