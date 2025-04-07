#!/bin/bash

# NAVIGATE TO THE CORRECT DIRECTORY
cd ~/Desktop/hehehehe/quantum-synth-ultimate/backend/ai-processor

# SET VARIABLES
ACR_NAME="quantumsynthacr1757219498"
RESOURCE_GROUP="quantum-synth-rg"

# CHECK IF CONTAINER GROUP EXISTS AND DELETE IF IT DOES
EXISTING_GROUP=$(az container show --name quantum-ai-backend --resource-group $RESOURCE_GROUP --query name -o tsv 2>/dev/null)
if [ ! -z "$EXISTING_GROUP" ]; then
    echo "Deleting existing container group..."
    az container delete --name quantum-ai-backend --resource-group $RESOURCE_GROUP --yes
    sleep 10
fi

# GET ACR LOGIN SERVER
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

# GET ACR CREDENTIALS
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# DEPLOY TO CONTAINER INSTANCES WITH OS-TYPE SPECIFIED
az container create \
  --resource-group $RESOURCE_GROUP \
  --name quantum-ai-backend \
  --image $ACR_LOGIN_SERVER/ai-processor:latest \
  --cpu 1 \
  --memory 2 \
  --ports 8080 \
  --ip-address Public \
  --os-type Linux \
  --registry-login-server $ACR_LOGIN_SERVER \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD"

# GET THE PUBLIC IP
echo "Public IP:"
az container show --name quantum-ai-backend --resource-group $RESOURCE_GROUP --query "ipAddress.ip" -o tsv