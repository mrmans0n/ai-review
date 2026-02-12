#!/usr/bin/env bash
# Install script for aid CLI

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Determine install location
INSTALL_DIR="${HOME}/.local/bin"

# Create install directory if it doesn't exist
mkdir -p "$INSTALL_DIR"

# Copy the aid script
cp "$SCRIPT_DIR/aid" "$INSTALL_DIR/aid"
chmod +x "$INSTALL_DIR/aid"

# Create aidiff alias (symlink)
ln -sf "$INSTALL_DIR/aid" "$INSTALL_DIR/aidiff"

echo "✅ Installed aid to $INSTALL_DIR"
echo "✅ Created aidiff alias"
echo ""
echo "Make sure $INSTALL_DIR is in your PATH."
echo "Add this to your ~/.zshrc or ~/.bashrc if not already present:"
echo ""
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Then reload your shell with: source ~/.zshrc"
echo ""
echo "Usage:"
echo "  aid           # Open ai-diff in current directory"
echo "  aid /path     # Open ai-diff in specified directory"
echo "  aidiff        # Same as aid"
