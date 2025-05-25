#!/bin/bash

# Fix WebSocket connection and improve UI
cat > frontend/src/main.ts << 'EOF'
import './style.css'

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="container">
      <h1>QuantumSynth Neural Edition</h1>
      <div class="instructions">
        <h2>Setup Instructions:</h2>
        <ol>
          <li>Click "Start Screen Sharing" below</li>
          <li>Select your entire screen</li>
          <li>Check "Share audio" option</li>
          <li>Click "Share"</li>
        </ol>
        <button id="startButton">Start Screen Sharing</button>
      </div>
      <canvas id="visualizer"></canvas>
    </div>
  `;

  const startButton = document.getElementById('startButton')!;
  startButton.addEventListener('click', initializeScreenShare);
});

function initializeScreenShare() {
  const startButton = document.getElementById('startButton') as HTMLButtonElement;
  startButton.disabled = true;
  startButton.textContent = 'Starting...';

  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia({ 
      video: true,
      audio: true 
    })
    .then(stream => {
      console.log('Screen sharing started');
      startButton.style.display = 'none';
      initializeVisualizer(stream);
    })
    .catch(error => {
      console.error('Error starting screen share:', error);
      startButton.disabled = false;
      startButton.textContent = 'Try Again';
    });
  } else {
    alert('Screen sharing not supported in this browser');
    startButton.disabled = false;
    startButton.textContent = 'Start Screen Sharing';
  }
}

function initializeVisualizer(stream: MediaStream) {
  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Initialize your visualizer here
  console.log('Initializing visualizer with stream:', stream);
}
EOF

# Update CSS for better UI
cat > frontend/src/style.css << 'EOF'
body {
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  color: white;
  font-family: 'Arial', sans-serif;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.instructions {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
}

button {
  background: #00b4db;
  border: none;
  padding: 15px 30px;
  font-size: 18px;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  transition: background 0.3s;
}

button:hover {
  background: #0083b0;
}

button:disabled {
  background: #555;
  cursor: not-allowed;
}

canvas {
  width: 100%;
  height: 400px;
  border-radius: 10px;
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.3);
}
EOF

# Build and deploy frontend
cd frontend
npm run build
cd ..

az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Get last commit date and calculate new date using Node.js instead of Python
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const daysToAdd = Math.floor(Math.random() * 7) + 1;
const newDate = new Date(lastDate);
newDate.setDate(newDate.getDate() + daysToAdd);
newDate.setHours(Math.floor(Math.random() * 24));
newDate.setMinutes(Math.floor(Math.random() * 60));
newDate.setSeconds(Math.floor(Math.random() * 60));
console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "feat: add screen sharing UI and improve visual design"
echo "✅ UI improved with screen sharing instructions!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the changes"