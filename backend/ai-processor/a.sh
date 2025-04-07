#!/bin/bash

# NAVIGATE TO THE CORRECT DIRECTORY
cd ~/Desktop/hehehehe/quantum-synth-ultimate/backend/ai-processor

# SET VARIABLES
ACR_NAME="quantumsynthacr1757219498"
RESOURCE_GROUP="quantum-synth-rg"

# CHECK AND REGISTER PROVIDER IF NEEDED
PROVIDER_STATUS=$(az provider show --namespace Microsoft.ContainerInstance --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")
if [ "$PROVIDER_STATUS" != "Registered" ]; then
    echo "Registering Microsoft.ContainerInstance provider..."
    az provider register --namespace Microsoft.ContainerInstance --wait
    sleep 10 # WAIT FOR REGISTRATION TO PROPAGATE
fi

# CHECK IF ACR EXISTS
if ! az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
    echo "❌ ACR $ACR_NAME not found in resource group $RESOURCE_GROUP"
    exit 1
fi

# GET ACR LOGIN SERVER
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
if [ -z "$ACR_LOGIN_SERVER" ]; then
    echo "❌ Failed to get ACR login server"
    exit 1
fi

# GET ACR CREDENTIALS WITH PROPER ERROR HANDLING
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv 2>/dev/null)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv 2>/dev/null)

# CHECK IF CREDENTIALS WERE OBTAINED
if [ -z "$ACR_USERNAME" ] || [ -z "$ACR_PASSWORD" ]; then
    echo "❌ Failed to get ACR credentials automatically"
    echo "Enabling admin user on ACR..."
    az acr update --name $ACR_NAME --admin-enabled true
    sleep 5
    ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
    if [ -z "$ACR_USERNAME" ] || [ -z "$ACR_PASSWORD" ]; then
        echo "❌ Still failed to get credentials. Please check ACR settings."
        exit 1
    fi
fi

echo "Using ACR: $ACR_LOGIN_SERVER"
echo "Username: $ACR_USERNAME"

# BUILD DOCKER IMAGE WITH PROPER TAGGING
docker build -t $ACR_LOGIN_SERVER/ai-processor:latest .

# PUSH TO ACR
docker push $ACR_LOGIN_SERVER/ai-processor:latest

# DEPLOY TO CONTAINER INSTANCES
az container create \
  --resource-group $RESOURCE_GROUP \
  --name quantum-ai-backend \
  --image $ACR_LOGIN_SERVER/ai-processor:latest \
  --cpu 1 \
  --memory 2 \
  --ports 8080 \
  --ip-address Public \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD"

# GET THE PUBLIC IP
echo "Public IP:"
az container show --name quantum-ai-backend --resource-group $RESOURCE_GROUP --query "ipAddress.ip" -o tsv