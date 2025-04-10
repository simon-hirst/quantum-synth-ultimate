#!/bin/bash

# MANUAL DEPLOYMENT SCRIPT
echo "🚀 DEPLOYING TO AZURE..."

# DEPLOY BACKEND
cd backend/ai-processor
./a.sh

# DEPLOY FRONTEND
cd ../../frontend
npm run build
az storage blob upload-batch --account-name quantumsynthstorage -d '$web' -s dist --overwrite

echo "✅ DEPLOYMENT COMPLETE!"
