# Incident: openai-codex OAuth Token Expiring

**Date:** 2026-05-28 (Thursday)
**Severity:** Medium
**Detected by:** Scheduled maintainer health check (`openclaw models status --check`)

## Summary

The openai-codex OAuth token for profile `openai-codex:default` (nacho@nlopez.io) is expired (0min remaining). The secondary profile `openai-codex:nacho@nlopez.io` has 52 minutes remaining at time of detection. Codex is the runtime provider for GPT-5.5 (the default model) and the `codex` alias used by multiple cron jobs. If the secondary profile also expires, all cron sessions using the codex runtime will fail.

## Evidence

```
- openai-codex usage: 5h 98% left · Week 39% left
- openai-codex:default (nacho@nlopez.io) expired expires in 0m
- openai-codex:nacho@nlopez.io (nacho@nlopez.io) expiring expires in 52m
```

Affected cron jobs (use `codex` model):
- `e55d057a` mission-control-in-review (every 10m)
- `b412c7ae` local-services-health-check (every 8h)

Weekly usage remains at 39%, so this is not a rate-limit issue — it is a token expiry issue.

## Impact

- If both OAuth profiles expire, the default agent (ambrosio) will be unable to use GPT-5.5/Codex runtime
- Two cron jobs will fail silently
- Telegram DMs routed via the default session chain may degrade

## Repair Attempted

`openclaw doctor --fix` was run but does not handle OAuth token refresh. The profile `openai-codex:default` remains expired.

## Current Status

- Gateway: healthy, LaunchAgent running (pid 76377)
- Telegram channel: connected and polling
- All 13 cron jobs: `ok` status
- Secondary codex profile: ~52min remaining
- 0 critical security findings, 5 warnings (pre-existing config posture)

## Next Action (requires human)

Run interactive OAuth re-auth:
```
openclaw models auth login --provider openai-codex
```
This requires browser-based sign-in (OAuth flow) and cannot be performed headlessly from a cron or subagent session.
