#!/bin/bash
# Setup script to copy Stockfish engine files from node_modules to public/engine/
# This is needed because the .wasm file is too large for git (6.9MB)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_ENGINE_DIR="$WEB_DIR/public/engine"
NODE_MODULES_DIR="$WEB_DIR/node_modules/stockfish/src"

echo "Setting up Stockfish engine files..."

# Create public/engine directory if it doesn't exist
mkdir -p "$PUBLIC_ENGINE_DIR"

# Copy stockfish.js
if [ -f "$NODE_MODULES_DIR/stockfish-17.1-lite-single-03e3232.js" ]; then
  cp "$NODE_MODULES_DIR/stockfish-17.1-lite-single-03e3232.js" "$PUBLIC_ENGINE_DIR/stockfish.js"
  echo "✓ Copied stockfish.js"
else
  echo "✗ Error: stockfish.js not found in node_modules"
  exit 1
fi

# Copy stockfish.wasm
if [ -f "$NODE_MODULES_DIR/stockfish-17.1-lite-single-03e3232.wasm" ]; then
  cp "$NODE_MODULES_DIR/stockfish-17.1-lite-single-03e3232.wasm" "$PUBLIC_ENGINE_DIR/stockfish.wasm"
  echo "✓ Copied stockfish.wasm"
else
  echo "✗ Error: stockfish.wasm not found in node_modules"
  exit 1
fi

echo "Stockfish engine files setup complete!"
