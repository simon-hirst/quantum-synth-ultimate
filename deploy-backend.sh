#!/bin/bash

echo "🚀 Deploying QuantumSynth backend to Azure..."

cd ~/Desktop/hehehehe/quantum-synth-ultimate

# Login to Azure (if not already logged in)
az account show > /dev/null 2>&1 || az login

# Set variables
RESOURCE_GROUP="quantum-synth-rg"
CONTAINER_APP_NAME="quantum-ai-backend"
REGISTRY_NAME="quantumsynthacr1757219498"
IMAGE_TAG="latest"

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t $REGISTRY_NAME.azurecr.io/$CONTAINER_APP_NAME:$IMAGE_TAG .

# Push to Azure Container Registry
echo "📤 Pushing image to Azure Container Registry..."
az acr login --name $REGISTRY_NAME
docker push $REGISTRY_NAME.azurecr.io/$CONTAINER_APP_NAME:$IMAGE_TAG

# Deploy to Container App
echo "🚀 Deploying to Azure Container Apps..."
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $REGISTRY_NAME.azurecr.io/$CONTAINER_APP_NAME:$IMAGE_TAG \
  --set-env-vars PORT=8080

echo "✅ Backend deployed successfully!"
echo "🌐 Your backend should be available at: https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/health"