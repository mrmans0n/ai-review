#!/usr/bin/env bash
set -euo pipefail
# telegram-send.sh — Send an AI zeitgeist briefing to a Telegram target
# Usage: ./telegram-send.sh [target] [message-file]
#  target: Telegram @username or chat id (default: @nacho)
#  message-file: path to message text file (default: reads from stdin)

TARGET="${1:-@nacho}"
MSG_FILE="${2:--}"

if [ "$MSG_FILE" = "-" ]; then
  MESSAGE=$(cat)
else
  MESSAGE=$(cat "$MSG_FILE")
fi

openclaw message send \
  --channel telegram \
  --target "$TARGET" \
  --message "$MESSAGE"

echo "Sent telegram message to $TARGET"
