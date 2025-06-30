#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "main.go" ]; then
  echo "❌ Run from the backend repo root (main.go not found)"; exit 1
fi

echo "🧹 go mod tidy..."
go mod tidy

echo "🛠️ go build..."
go build -o ./bin/quantum-ai-backend .

echo "🏃 Running on :8080 (Ctrl+C to stop)"
PORT=8080 ./bin/quantum-ai-backend
