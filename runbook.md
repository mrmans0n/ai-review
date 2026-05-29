# OpenClaw Gateway Runbook — mini.lan (Mac mini, macOS arm64)

## 2026-05-28: openai-codex OAuth token expired
Fix: Not yet repaired — requires interactive `openclaw models auth login --provider openai-codex` (browser OAuth flow). Secondary profile `openai-codex:nacho@nlopez.io` still has ~52min as backup.
Prevention: Set a cron job to alert 4h before OAuth expiry. Consider a longer-lived token or scheduled weekly re-auth window.
