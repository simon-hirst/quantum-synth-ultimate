#!/usr/bin/env bash
set -euo pipefail
PORT=${1:-5173}
command -v node >/dev/null 2>&1 || { echo "Node.js not found. Install from https://nodejs.org"; exit 1; }
node server.mjs "$PORT"
