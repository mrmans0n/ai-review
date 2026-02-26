#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APP_NAME="AI Review.app"
SOURCE_APP="$REPO_ROOT/src-tauri/target/release/bundle/macos/$APP_NAME"
DEST_DIR="/Applications"

cd "$REPO_ROOT"
pnpm tauri build

if [ ! -w "$DEST_DIR" ]; then
  DEST_DIR="$HOME/Applications"
  mkdir -p "$DEST_DIR"
fi

DEST_APP="$DEST_DIR/$APP_NAME"
rm -rf "$DEST_APP"
cp -R "$SOURCE_APP" "$DEST_APP"

echo "Installed $APP_NAME to $DEST_DIR"
