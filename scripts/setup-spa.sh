#!/usr/bin/env bash
# Copy the original Lantern index.html into public/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  echo "Usage: $0 /path/to/index.html"
  echo "Example: $0 ~/Downloads/index.html"
  exit 1
fi
if [[ ! -f "$SRC" ]]; then
  echo "File not found: $SRC"
  exit 1
fi
mkdir -p "$ROOT/public"
cp "$SRC" "$ROOT/public/index.html"
echo "Installed SPA → $ROOT/public/index.html ($(wc -c < "$ROOT/public/index.html") bytes)"
echo "Run: npm install && npm run dev"
echo "Open: http://localhost:3000/app"
