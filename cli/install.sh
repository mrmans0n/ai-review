#!/usr/bin/env bash
# Install script for air CLI

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Determine install location
INSTALL_DIR="${HOME}/.local/bin"

# Create install directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Copy the air script
cp "$SCRIPT_DIR/air" "$INSTALL_DIR/air"
chmod +x "$INSTALL_DIR/air"

echo "✅ Installed air to $INSTALL_DIR"
echo ""
echo "Make sure $INSTALL_DIR is in your PATH."
echo "Add this to your ~/.zshrc or ~/.bashrc if not already present:"
echo ""
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Then reload your shell with: source ~/.zshrc"
echo ""
echo "Usage:"
echo "  air           # Open ai-review in current directory"
echo "  air /path     # Open ai-review in specified directory"
