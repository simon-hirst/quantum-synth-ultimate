import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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
      
      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Quantum audio initialization failed:', error);
    }
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Clear canvas with a subtle gradient
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width/4, this.canvas.height/4, 0,
      this.canvas.width/4, this.canvas.height/4, this.canvas.width/2
    );
    gradient.addColorStop(0, 'rgba(10, 10, 40, 0.1)');
    gradient.addColorStop(1, 'rgba(5, 5, 20, 0.3)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Draw advanced audio visualization
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    // Draw circular waveform
    for (let i = 0; i < this.dataArray.length; i++) {
      const amplitude = this.dataArray[i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * radius * 0.5);
      const y2 = Math.sin(angle) * (radius + amplitude * radius * 0.5);
      
      // Create gradient for each segment
      const segmentGradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
      segmentGradient.addColorStop(0, `hsl(${i * 360 / this.dataArray.length}, 100%, 70%)`);
      segmentGradient.addColorStop(1, `hsl(${(i * 360 / this.dataArray.length + 60) % 360}, 100%, 50%)`);
      
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
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
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
  const quantumSynth = new QuantumSynth(canvas);
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
