#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/backend/ai-processor

# SET VARIABLES
ACR_NAME="quantumsynthacr1757219498"
RESOURCE_GROUP="quantum-synth-rg"

# CHECK AND REGISTER PROVIDER IF NEEDED
PROVIDER_STATUS=$(az provider show --namespace Microsoft.ContainerInstance --query registrationState -o tsv)
if [ "$PROVIDER_STATUS" != "Registered" ]; then
    echo "Registering Microsoft.ContainerInstance provider..."
    az provider register --namespace Microsoft.ContainerInstance --wait
    sleep 10 # WAIT FOR REGISTRATION TO PROPAGATE
fi

# REST OF THE SCRIPT FROM BEFORE WITH CREDENTIAL FIXES
# ... [INSERT THE CREDENTIAL HANDLING PART FROM PREVIOUS RESPONSE] ...

# BUILD AND PUSH
docker build -t $ACR_LOGIN_SERVER/ai-processor:latest .
docker push $ACR_LOGIN_SERVER/ai-processor:latest

# DEPLOY
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

# GET IP
az container show --name quantum-ai-backend --resource-group $RESOURCE_GROUP --query "ipAddress.ip" -o tsv