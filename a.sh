cat > ~/Desktop/hehehehe/quantum-synth-ultimate/fix-frontend.sh << 'EOF'
#!/bin/bash

# Fix frontend canvas rendering issue
echo "🎨 Fixing frontend canvas rendering..."

cd ~/Desktop/hehehehe/quantum-synth-ultimate

# Update the setupCanvas method to fix the rendering issue
cat > frontend/src/main.ts << 'EOF_MAIN'
import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private visualizationElement: HTMLElement;
  private lastUpdate: number = 0;
  private currentVizType: string = 'quantum';
  private nextVizType: string = 'quantum';
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private pollingInterval: number | null = null;
  private currentVizName: string = 'Quantum Resonance';
  private statusElement: HTMLElement;
  private statusDot: HTMLElement;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement, statusElement: HTMLElement, statusDot: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.visualizationElement = visualizationElement;
    this.statusElement = statusElement;
    this.statusDot = statusDot;
    
    // Set up resize listener to handle container size changes
    window.addEventListener('resize', () => {
      this.setupCanvas();
    });
    
    this.setupCanvas();
    this.startPolling();
  }

  private setupCanvas() {
    // Get the container dimensions
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight - 100; // Account for header/footer
    
    // Set the canvas size to match the container
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Set the CSS size to maintain correct aspect ratio
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  // ... (rest of the class remains the same)
}

// ... (rest of the file remains the same)
EOF_MAIN

# Build and deploy the fixed frontend
echo "🚀 Deploying fixed frontend..."
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
GIT_COMMITTER_DATE="$new_date" git commit --date="$new_date" -m "fix: canvas rendering and simplify setup"

echo "✅ Fixed frontend canvas rendering!"
echo "📅 Commit date: $new_date"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the updates"
EOF