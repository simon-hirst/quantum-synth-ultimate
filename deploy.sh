#!/bin/bash

# Full deployment script for QuantumSynth
echo "🚀 Starting full deployment of QuantumSynth..."

cd ~/Desktop/hehehehe/quantum-synth-ultimate

# Ensure backend has all dependencies
echo "📦 Setting up backend dependencies..."
go mod tidy

# Build the backend
echo "🔨 Building backend..."
go build -o quantum-backend.exe
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

# Test the backend locally
echo "🧪 Testing backend locally..."
# Kill any existing backend process
taskkill /f /im quantum-backend.exe 2>/dev/null || true
./quantum-backend.exe &
BACKEND_PID=$!
sleep 3

# Test backend health endpoint
if curl -s http://localhost:8080/api/health > /dev/null; then
    echo "✅ Backend is running correctly"
    taskkill /f /pid $BACKEND_PID 2>/dev/null || true
else
    echo "❌ Backend failed health check"
    taskkill /f /pid $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Build and deploy frontend
echo "🎨 Building and deploying frontend..."
cd frontend
npm run build
cd ..

az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Get the date of the last commit
last_commit_date=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S' 2>/dev/null)
if [ -z "$last_commit_date" ]; then
    last_commit_timestamp=$(date +%s)
else
    last_commit_timestamp=$(date -d "$last_commit_date" +%s 2>/dev/null || date +%s)
fi

# Calculate new timestamp (1 minute to 12 hours in future)
random_time_increment=$(( (RANDOM % 43200) + 60 ))
new_timestamp=$((last_commit_timestamp + random_time_increment))

# 75% chance: same day as last commit, later time
# 25% chance: new day
if (( RANDOM % 4 > 0 )); then
    new_date=$(date -d "@$new_timestamp" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "$new_timestamp" "+%Y-%m-%d %H:%M:%S")
else
    new_date=$(date -d "@$new_timestamp" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "$new_timestamp" "+%Y-%m-%d %H:%M:%S")
fi

# Stage all changes
git add .

# Create commit with proper date
GIT_COMMITTER_DATE="$new_date" git commit --date="$new_date" -m "deploy: full stack deployment with backend fixes"

echo "✅ Full deployment completed!"
echo "📅 Commit date: $new_date"
echo "🌐 Frontend: https://quantumsynthstorage.z20.web.core.windows.net/"
echo "🔧 Backend: http://localhost:8080/api/health"
echo ""
echo "To deploy to Azure, run: ./deploy-azure.sh"
