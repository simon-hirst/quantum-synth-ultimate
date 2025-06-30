#!/usr/bin/env bash
set -euo pipefail

# Defaults from your az output; override via env if needed
: "${RG:=quantum-synth-rg}"
: "${APP:=quantum-ai-backend}"
: "${ACR_NAME:=quantumsynthacr1757219498}"
: "${IMAGE_NAME:=quantum-ai-backend}"

ACR_FQDN="${ACR_NAME}.azurecr.io"
TAG="v$(date +%Y%m%d%H%M%S)"
IMAGE="${ACR_FQDN}/${IMAGE_NAME}:${TAG}"

if ! command -v az >/dev/null 2>&1; then
  echo "❌ Azure CLI not found"; exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found"; exit 1
fi

echo "🔐 Logging in to ACR: ${ACR_NAME}"
az acr login -n "${ACR_NAME}"

echo "🐳 Building image: ${IMAGE}"
docker build -t "${IMAGE}" .

echo "📤 Pushing image..."
docker push "${IMAGE}"

echo "🚀 Updating Container App ${APP} to ${IMAGE}"
az containerapp update -n "${APP}" -g "${RG}" --image "${IMAGE}" --output table

echo "🔎 Getting FQDN + quick smoke:"
FQDN=$(az containerapp show -n "${APP}" -g "${RG}" --query "properties.configuration.ingress.fqdn" -o tsv)
echo "FQDN: https://${FQDN}"
sleep 5
curl -sS "https://${FQDN}/api/health" || true
echo

echo "✅ Deploy complete."
