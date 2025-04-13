#!/bin/bash
cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend
npm run build
az storage blob upload-batch -s dist -d $web --account-name quantumsynthstorage --overwrite
echo "Frontend deployed to: https://quantumsynthstorage.z20.web.core.windows.net"
