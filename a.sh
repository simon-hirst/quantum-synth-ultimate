#!/bin/bash

# Create three different visualizations with random transitions
cat > frontend/src/main.ts << 'EOF'
import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private currentVisualization: number = 0;
  private visualizationTimer: number | null = null;
  private visualizationNames = ['Quantum Resonance', 'Neural Particles', 'Temporal Waveforms'];
  private visualizationElement: HTMLElement;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualizationElement = visualizationElement;
    this.setupCanvas();
  }

  private setupCanvas() {
    this.canvas.width = this.canvas.offsetWidth * 2;
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  initialize(stream: MediaStream) {
    console.log('Initializing quantum audio processing...');
    
    try {
      // Setup audio context and analyser
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start visualization and switching
      this.startVisualizationSwitching();
      this.visualize();
    } catch (error) {
      console.error('Quantum audio initialization failed:', error);
    }
  }

  private startVisualizationSwitching() {
    // Switch visualizations every 10-15 seconds
    const switchVisualization = () => {
      this.currentVisualization = (this.currentVisualization + 1) % 3;
      this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
      this.visualizationTimer = setTimeout(switchVisualization, 10000 + Math.random() * 5000);
    };
    
    this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
    this.visualizationTimer = setTimeout(switchVisualization, 10000 + Math.random() * 5000);
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(5, 8, 17, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Call appropriate visualization based on current mode
    switch (this.currentVisualization) {
      case 0:
        this.drawQuantumResonance();
        break;
      case 1:
        this.drawNeuralParticles();
        break;
      case 2:
        this.drawTemporalWaveforms();
        break;
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private drawQuantumResonance() {
    // Circular quantum resonance visualization
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    // Draw circular waveform
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * radius * 0.5);
      const y2 = Math.sin(angle) * (radius + amplitude * radius * 0.5);
      
      // Create gradient for each segment
      const segmentGradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
      segmentGradient.addColorStop(0, `hsl(${i * 360 / this.dataArray!.length}, 100%, 70%)`);
      segmentGradient.addColorStop(1, `hsl(${(i * 360 / this.dataArray!.length + 60) % 360}, 100%, 50%)`);
      
      this.ctx.strokeStyle = segmentGradient;
      this.ctx.lineWidth = 2 + amplitude * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    // Draw central quantum core
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.2);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    coreGradient.addColorStop(1, 'rgba(100, 200, 255, 0.5)');
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.2, 0, 2 * Math.PI);
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawNeuralParticles() {
    // Neural particle system visualization
    const particleCount = 100;
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    
    for (let i = 0; i < particleCount; i++) {
      const amplitude = this.dataArray![i % this.dataArray!.length] / 255;
      const angle = (i * 2 * Math.PI) / particleCount;
      const distance = amplitude * 150;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 2 + amplitude * 8;
      
      // Create gradient for particle
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsla(${i * 360 / particleCount}, 100%, 70%, 0.8)`);
      gradient.addColorStop(1, `hsla(${(i * 360 / particleCount + 60) % 360}, 100%, 50%, 0.2)`);
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Draw connecting lines between particles
      if (i > 0 && amplitude > 0.3) {
        const prevAmplitude = this.dataArray![(i-1) % this.dataArray!.length] / 255;
        const prevAngle = ((i-1) * 2 * Math.PI) / particleCount;
        const prevDistance = prevAmplitude * 150;
        const prevX = centerX + Math.cos(prevAngle) * prevDistance;
        const prevY = centerY + Math.sin(prevAngle) * prevDistance;
        
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = `hsla(${i * 360 / particleCount}, 100%, 60%, ${0.2 + amplitude * 0.6})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  private drawTemporalWaveforms() {
    // Temporal waveform visualization
    const centerY = this.canvas.height / 4;
    const width = this.canvas.width / 2;
    const height = this.canvas.height / 2;
    
    // Draw background gradient
    const bgGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    bgGradient.addColorStop(0, 'rgba(0, 20, 40, 0.3)');
    bgGradient.addColorStop(1, 'rgba(0, 40, 80, 0.3)');
    
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, centerY - height/2, width, height);
    
    // Draw waveform
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const x = (i / this.dataArray!.length) * width;
      const y = centerY - (amplitude - 0.5) * height;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    // Create waveform gradient
    const waveformGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    waveformGradient.addColorStop(0, '#00f3ff');
    waveformGradient.addColorStop(0.5, '#ff00d6');
    waveformGradient.addColorStop(1, '#00ff9d');
    
    this.ctx.strokeStyle = waveformGradient;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Fill waveform
    this.ctx.lineTo(width, centerY);
    this.ctx.lineTo(0, centerY);
    this.ctx.closePath();
    
    const fillGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    fillGradient.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
    fillGradient.addColorStop(0.5, 'rgba(255, 0, 214, 0.2)');
    fillGradient.addColorStop(1, 'rgba(0, 255, 157, 0.2)');
    
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.visualizationTimer) {
      clearTimeout(this.visualizationTimer);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth Neural Edition...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth <span class="neural-edition">Neural Edition</span></h1>
        <p class="quantum-subtitle">Real-time audio visualization with quantum-inspired algorithms</p>
      </div>
      
      <div class="quantum-content">
        <div class="quantum-card">
          <div class="card-header">
            <h2>Quantum Capture Setup</h2>
            <div class="pulse-dot"></div>
          </div>
          
          <div class="card-body">
            <div class="instructions">
              <div class="instruction-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Initiate Quantum Capture</h3>
                  <p>Click the button below to begin screen sharing</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Select Entire Screen</h3>
                  <p>Choose your complete display for optimal results</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio Resonance</h3>
                  <p>Check "Share audio" to capture sound frequencies</p>
                </div>
              </div>
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">⚡</span>
              Initiate Quantum Capture
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹️</span>
              Terminate Connection
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Quantum Resonance Visualization</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Active Mode:</span>
            <span id="currentVisualization">Quantum Resonance</span>
          </div>
          <canvas id="visualizer"></canvas>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>Powered by Quantum Audio Processing • v1.0.0</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;

  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  const visualizationElement = document.getElementById('currentVisualization')!;
  const quantumSynth = new QuantumSynth(canvas, visualizationElement);
  let mediaStream: MediaStream | null = null;

  const startButton = document.getElementById('startButton')!;
  const stopButton = document.getElementById('stopButton')!;
  const statusDot = document.querySelector('.status-dot')!;
  const statusText = document.querySelector('.status-text')!;

  startButton.addEventListener('click', initializeScreenShare);
  stopButton.addEventListener('click', stopScreenShare);

  function initializeScreenShare() {
    startButton.disabled = true;
    startButton.innerHTML = '<span class="btn-icon">⏳</span> Initializing...';
    statusDot.classList.add('pending');
    statusText.textContent = 'Initializing';

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      })
      .then(stream => {
        console.log('Quantum capture established');
        mediaStream = stream;
        startButton.style.display = 'none';
        stopButton.style.display = 'block';
        statusDot.classList.remove('pending');
        statusDot.classList.add('active');
        statusText.textContent = 'Active';
        quantumSynth.initialize(stream);
        
        // Handle when user stops sharing from browser UI
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = stopScreenShare;
        }
      })
      .catch(error => {
        console.error('Quantum capture failed:', error);
        startButton.disabled = false;
        startButton.innerHTML = '<span class="btn-icon">⚡</span> Retry Quantum Capture';
        statusDot.classList.remove('pending');
        statusText.textContent = 'Error';
      });
    } else {
      alert('Quantum capture not supported in this browser');
      startButton.disabled = false;
      startButton.innerHTML = '<span class="btn-icon">⚡</span> Initiate Quantum Capture';
      statusText.textContent = 'Unsupported';
    }
  }

  function stopScreenShare() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    quantumSynth.stop();
    stopButton.style.display = 'none';
    startButton.style.display = 'block';
    startButton.disabled = false;
    startButton.innerHTML = '<span class="btn-icon">⚡</span> Initiate Quantum Capture';
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
});
EOF

# Add styles for the visualization mode indicator
cat > frontend/src/style.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');

:root {
  --primary: #00f3ff;
  --primary-dark: #00a0ff;
  --secondary: #ff00d6;
  --accent: #00ff9d;
  --dark: #0a0e17;
  --darker: #050811;
  --light: #ccd6f6;
  --card-bg: rgba(15, 20, 35, 0.7);
  --card-border: rgba(0, 243, 255, 0.2);
  --glow: 0 0 10px var(--primary), 0 0 20px var(--primary);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: linear-gradient(135deg, var(--darker) 0%, var(--dark) 50%, var(--darker) 100%);
  color: var(--light);
  font-family: 'Exo 2', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

.quantum-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.quantum-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
  border-bottom: 1px solid rgba(0, 243, 255, 0.1);
}

.quantum-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 3.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
}

.neural-edition {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--accent);
}

.quantum-subtitle {
  font-size: 1.2rem;
  color: rgba(204, 214, 246, 0.7);
  font-weight: 300;
}

.quantum-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2rem;
  flex: 1;
}

.quantum-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 243, 255, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-header h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  color: var(--primary);
}

.pulse-dot {
  width: 12px;
  height: 12px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.instruction-step {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.step-number {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: var(--darker);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 1rem;
  flex-shrink: 0;
}

.step-content h3 {
  font-size: 1.1rem;
  margin-bottom: 0.3rem;
  color: var(--primary);
}

.step-content p {
  color: rgba(204, 214, 246, 0.8);
  font-size: 0.9rem;
}

.quantum-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-family: 'Exo 2', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
}

.quantum-btn.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: var(--darker);
  box-shadow: 0 5px 15px rgba(0, 243, 255, 0.3);
}

.quantum-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 243, 255, 0.5);
}

.quantum-btn.secondary {
  background: rgba(255, 0, 214, 0.1);
  color: var(--secondary);
  border: 1px solid rgba(255, 0, 214, 0.3);
}

.quantum-btn.secondary:hover {
  background: rgba(255, 0, 214, 0.2);
  box-shadow: 0 0 15px rgba(255, 0, 214, 0.3);
}

.btn-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.visualization-container {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 243, 255, 0.1);
}

.viz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.viz-header h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  color: var(--primary);
}

.viz-mode {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 243, 255, 0.1);
}

.mode-label {
  font-weight: 600;
  margin-right: 0.5rem;
  color: var(--primary);
}

#currentVisualization {
  color: var(--accent);
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
  background: #666;
}

.status-dot.pending {
  background: #ffcc00;
  box-shadow: 0 0 10px #ffcc00;
  animation: pulse 1.5s infinite;
}

.status-dot.active {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.status-text {
  font-size: 0.9rem;
  color: rgba(204, 214, 246, 0.8);
}

#visualizer {
  width: 100%;
  height: 400px;
  border-radius: 12px;
  background: rgba(5, 8, 17, 0.5);
  border: 1px solid rgba(0, 243, 255, 0.1);
}

.quantum-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 243, 255, 0.1);
  text-align: center;
  color: rgba(204, 214, 246, 0.6);
  font-size: 0.9rem;
}

.github-attribution {
  margin-top: 0.5rem;
}

.github-attribution a {
  color: var(--primary);
  text-decoration: none;
  transition: all 0.3s ease;
}

.github-attribution a:hover {
  color: var(--accent);
  text-shadow: 0 0 8px rgba(0, 255, 157, 0.5);
}

@media (max-width: 968px) {
  .quantum-content {
    grid-template-columns: 1fr;
  }
  
  .quantum-title {
    font-size: 2.5rem;
  }
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

# Get last commit date and calculate new date
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const shouldSameDay = Math.random() < 0.75; // 75% chance same day

let newDate;
if (shouldSameDay) {
  // Same day, random time after last commit (at least 1 hour later)
  newDate = new Date(lastDate);
  const hours = lastDate.getHours() + Math.floor(Math.random() * 3) + 1; // 1-3 hours later
  const minutes = Math.floor(Math.random() * 60);
  const seconds = Math.floor(Math.random() * 60);
  newDate.setHours(hours, minutes, seconds);
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
const now = new Date();
if (newDate > now) newDate = now;

console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "feat: add three visualizations with auto-switching"
echo "✅ Added three awesome visualizations with auto-switching!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the new visualizations"