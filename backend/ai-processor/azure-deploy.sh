#!/bin/bash

# Azure deployment script for Quantum Synth AI backend
RESOURCE_GROUP="quantum-synth-rg"
LOCATION="eastus"
CONTAINER_REGISTRY="quantumsynthacr"
CONTAINER_APP="quantum-ai-processor"
IMAGE_NAME="ai-processor:latest"

# Login to Azure (uncomment if needed)
# az login

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create container registry
az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic --admin-enabled true

# Build and push image
az acr build --registry $CONTAINER_REGISTRY --image $IMAGE_NAME .

# Create container app environment
az containerapp env create \
  --name "quantum-synth-env" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Deploy container app
az containerapp create \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --environment "quantum-synth-env" \
  --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME \
  --target-port 8080 \
  --ingress 'external' \
  --transport 'http2' \
  --env-vars "ENVIRONMENT=production" \
  --cpu 2 \
  --memory 4Gi \
  --min-replicas 1 \
  --max-replicas 10

# Get the public URL
echo "Deployment complete! Your AI backend is running at:"
az containerapp show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --query "configuration.ingress.fqdn"
