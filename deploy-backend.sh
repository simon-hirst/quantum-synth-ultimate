#!/bin/bash

# Login to Azure
az login

# Set variables
RESOURCE_GROUP="quantum-synth-rg"
CONTAINER_APP_NAME="quantum-ai-backend"
REGISTRY_NAME="quantumsynthacr1757219498"
IMAGE_TAG="latest"

# Build and push image
az acr build --registry $REGISTRY_NAME --image $CONTAINER_APP_NAME:$IMAGE_TAG .

# Deploy to Container App
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $REGISTRY_NAME.azurecr.io/$CONTAINER_APP_NAME:$IMAGE_TAG \
  --set-env-vars PORT=8080

echo "Backend deployed successfully!"
