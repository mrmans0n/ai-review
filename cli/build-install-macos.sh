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

LAUNCHER="$DEST_APP/Contents/Resources/bin/core-launcher"
if [ ! -x "$LAUNCHER" ]; then
  echo "Error: packaged launcher not found at $LAUNCHER" >&2
  exit 1
fi

install_cli_link() {
  local cli_path="$1"
  local mode="${2:-force}"
  local cli_dir
  cli_dir="$(dirname "$cli_path")"

  mkdir -p "$cli_dir"
  if [ -e "$cli_path" ] || [ -L "$cli_path" ]; then
    if [ ! -L "$cli_path" ]; then
      echo "Skipping CLI install at $cli_path: existing file is not a symlink" >&2
      return
    fi
    if [ "$mode" = "repair-owned" ]; then
      local current_target
      current_target="$(readlink "$cli_path")"
      case "$current_target" in
        *"/AI Review.app/Contents/MacOS/AI Review"|*"/AI Review.app/Contents/Resources/bin/core-launcher")
          ;;
        *)
          echo "Skipping CLI repair at $cli_path: symlink does not look like an AI Review install" >&2
          return
          ;;
      esac
    fi
    rm -f "$cli_path"
  fi
  ln -s "$LAUNCHER" "$cli_path"
  echo "Installed air CLI to $cli_path"
}

install_cli_link "$HOME/.local/bin/air"

EXISTING_AIR="$(command -v air || true)"
if [ -n "$EXISTING_AIR" ] && [ "$EXISTING_AIR" != "$HOME/.local/bin/air" ]; then
  if [ -w "$(dirname "$EXISTING_AIR")" ]; then
    install_cli_link "$EXISTING_AIR" repair-owned
  else
    echo "Skipping CLI repair at $EXISTING_AIR: directory is not writable" >&2
  fi
fi

echo "Installed $APP_NAME to $DEST_DIR"
