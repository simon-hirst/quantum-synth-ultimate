import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private currentVisualization: number = 0;
  private nextVisualization: number = 0;
  private visualizationTimer: number | null = null;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
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
    // Switch visualizations every 15-20 seconds
    const switchVisualization = () => {
      this.nextVisualization = (this.currentVisualization + 1 + Math.floor(Math.random() * 2)) % 3;
      this.isTransitioning = true;
      this.transitionProgress = 0;
      
      // Update UI to show next visualization
      this.visualizationElement.textContent = 
        `${this.visualizationNames[this.currentVisualization]} → ${this.visualizationNames[this.nextVisualization]}`;
      
      // Complete transition after 2 seconds
      setTimeout(() => {
        this.currentVisualization = this.nextVisualization;
        this.isTransitioning = false;
        this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
      }, 2000);
      
      this.visualizationTimer = setTimeout(switchVisualization, 15000 + Math.random() * 5000);
    };
    
    this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
    this.visualizationTimer = setTimeout(switchVisualization, 15000 + Math.random() * 5000);
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Clear canvas with a subtle dark background
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Handle transitions
    if (this.isTransitioning) {
      this.transitionProgress += 0.02;
      if (this.transitionProgress > 1) this.transitionProgress = 1;
      
      // Draw both visualizations during transition
      this.ctx.globalAlpha = 1 - this.transitionProgress;
      this.drawVisualization(this.currentVisualization);
      
      this.ctx.globalAlpha = this.transitionProgress;
      this.drawVisualization(this.nextVisualization);
      
      this.ctx.globalAlpha = 1;
    } else {
      // Draw single visualization
      this.drawVisualization(this.currentVisualization);
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private drawVisualization(visualization: number) {
    switch (visualization) {
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
      const hue = (i * 360 / this.dataArray!.length + Date.now() / 50) % 360;
      const segmentGradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
      segmentGradient.addColorStop(0, `hsl(${hue}, 80%, 65%)`);
      segmentGradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 80%, 45%)`);
      
      this.ctx.strokeStyle = segmentGradient;
      this.ctx.lineWidth = 2 + amplitude * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    // Draw central quantum core
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.2);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(1, 'rgba(120, 150, 255, 0.5)');
    
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
      const hue = (i * 360 / particleCount + Date.now() / 40) % 360;
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.9)`);
      gradient.addColorStop(1, `hsla(${(hue + 30) % 360}, 80%, 50%, 0.2)`);
      
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
        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.2 + amplitude * 0.6})`;
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
    bgGradient.addColorStop(0, 'rgba(15, 20, 30, 0.4)');
    bgGradient.addColorStop(1, 'rgba(20, 25, 35, 0.4)');
    
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
    const timeOffset = Date.now() / 100;
    const waveformGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    waveformGradient.addColorStop(0, `hsl(${(timeOffset) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(0.5, `hsl(${(timeOffset + 120) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(1, `hsl(${(timeOffset + 240) % 360}, 70%, 65%)`);
    
    this.ctx.strokeStyle = waveformGradient;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Fill waveform
    this.ctx.lineTo(width, centerY);
    this.ctx.lineTo(0, centerY);
    this.ctx.closePath();
    
    const fillGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    fillGradient.addColorStop(0, `hsla(${(timeOffset) % 360}, 70%, 65%, 0.2)`);
    fillGradient.addColorStop(0.5, `hsla(${(timeOffset + 120) % 360}, 70%, 65%, 0.2)`);
    fillGradient.addColorStop(1, `hsla(${(timeOffset + 240) % 360}, 70%, 65%, 0.2)`);
    
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
        <h1 class="quantum-title">QuantumSynth</h1>
        <p class="quantum-subtitle">Advanced audio-reactive visualizations</p>
      </div>
      
      <div class="quantum-content">
        <div class="quantum-card">
          <div class="card-header">
            <h2>Setup</h2>
          </div>
          
          <div class="card-body">
            <div class="instructions">
              <div class="instruction-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Start Capture</h3>
                  <p>Click the button below to begin screen sharing</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Select Source</h3>
                  <p>Share your entire screen or just the window with your music player</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio</h3>
                  <p>Check "Share audio" to capture sound for visualization</p>
                </div>
              </div>
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">▶</span>
              Start Screen Sharing
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹</span>
              Stop Sharing
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Visualization</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Mode:</span>
            <span id="currentVisualization">Quantum Resonance</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Visualizations will automatically transition every 15-20 seconds</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth v1.1.0</p>
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
        console.log('Screen sharing started');
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
        console.error('Error starting screen share:', error);
        startButton.disabled = false;
        startButton.innerHTML = '<span class="btn-icon">▶</span> Try Again';
        statusDot.classList.remove('pending');
        statusText.textContent = 'Error';
      });
    } else {
      alert('Screen sharing not supported in this browser');
      startButton.disabled = false;
      startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
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
    startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
});
