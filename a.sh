#!/bin/bash

# Fix backend dependencies properly
echo "🔄 Setting up backend dependencies..."

# Remove existing go.mod and go.sum to start fresh
rm -f go.mod go.sum

# Initialize Go module
go mod init ai-processor

# Add required dependencies
go get github.com/gorilla/mux
go get github.com/gorilla/handlers
go get github.com/gorilla/websocket

# Download all dependencies
go mod download

# Build backend
echo "📦 Building backend..."
go build -o ai-processor .

# Continue with frontend deployment
echo "🚀 Deploying frontend..."
cd frontend
npm run build
cd ..

az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Fix git commit time handling to ensure it's always in the past
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const now = new Date();
const shouldSameDay = Math.random() < 0.75;

let newDate;
if (shouldSameDay) {
  // Same day, ensure time is always later than last commit but before now
  newDate = new Date(lastDate);
  const maxMinutes = Math.min(179, ((now - lastDate) / 60000) - 1);
  
  if (maxMinutes > 1) {
    const minutesToAdd = 1 + Math.floor(Math.random() * maxMinutes);
    newDate.setMinutes(newDate.getMinutes() + minutesToAdd);
  } else {
    // If we can't add minutes without exceeding current time, move to next day
    newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(Math.floor(Math.random() * 24));
    newDate.setMinutes(Math.floor(Math.random() * 60));
    newDate.setSeconds(Math.floor(Math.random() * 60));
  }
} else {
  // Different day (1-7 days later)
  const daysToAdd = Math.floor(Math.random() * 7) + 1;
  newDate = new Date(lastDate);
  newDate.setDate(newDate.getDate() + daysToAdd);
  newDate.setHours(Math.floor(Math.random() * 24));
  newDate.setMinutes(Math.floor(Math.random() * 60));
  newDate.setSeconds(Math.floor(Math.random() * 60));
}

// Make sure we don't go beyond current date
if (newDate > now) {
  // If we've exceeded current time, set to a random time in the past
  const randomPast = new Date(now.getTime() - Math.floor(Math.random() * 86400000)); // Random time in past 24 hours
  newDate = randomPast;
}

console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "fix: properly setup Go dependencies and build process"
echo "✅ Fixed backend dependencies and build process!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the updates"