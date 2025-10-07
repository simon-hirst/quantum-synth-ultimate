#!/usr/bin/env bash
set -euo pipefail
PORT=${1:-5173}
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install with:"
  echo "macOS: brew install cloudflare/cloudflare/cloudflared"
  echo "Debian/Ubuntu: sudo apt-get install cloudflared"
  exit 1
fi
cloudflared tunnel --url "http://localhost:${PORT}"
