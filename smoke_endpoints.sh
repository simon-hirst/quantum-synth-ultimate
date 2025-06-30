#!/usr/bin/env bash
set -euo pipefail

: "${FQDN:=quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io}"

echo "GET /api/health"
curl -sS "https://${FQDN}/api/health" | jq . || curl -sS "https://${FQDN}/api/health" || true
echo
echo "GET /api/shader/next"
curl -sS "https://${FQDN}/api/shader/next" | jq . || curl -sS "https://${FQDN}/api/shader/next" || true
echo
