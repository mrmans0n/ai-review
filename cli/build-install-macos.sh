#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_NAME="AI Review.app"
SOURCE_APP="$REPO_ROOT/release/mac-arm64/$APP_NAME"
if [ ! -d "$SOURCE_APP" ]; then
  SOURCE_APP="$REPO_ROOT/release/mac/$APP_NAME"
fi
DEST_DIR="/Applications"

cd "$REPO_ROOT"
pnpm electron:build

if [ ! -d "$SOURCE_APP" ]; then
  echo "Error: built app not found at expected paths under release/" >&2
  exit 1
fi

if [ ! -w "$DEST_DIR" ]; then
  DEST_DIR="$HOME/Applications"
  mkdir -p "$DEST_DIR"
fi

DEST_APP="$DEST_DIR/$APP_NAME"
rm -rf "$DEST_APP"
cp -R "$SOURCE_APP" "$DEST_APP"

echo "Installed $APP_NAME to $DEST_DIR"
