import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private currentVizType: string = 'quantum';
  private nextVizType: string = 'quantum';
  private visualizationTimer: number | null = null;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private visualizationElement: HTMLElement;
  private vizParams: any = {};
  private lastUpdate: number = 0;
  private ws: WebSocket | null = null;
  private vizQueue: any[] = [];
  private currentViz: any = null;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualizationElement = visualizationElement;
    this.setupCanvas();
    this.connectToBackend();
  }

  private setupCanvas() {
    this.canvas.width = this.canvas.offsetWidth * 2;
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  private connectToBackend() {
    try {
      this.ws = new WebSocket('wss://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/ws');
      
      this.ws.onopen = () => {
        console.log('Connected to visualization server');
        this.requestNewVisualization();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'visualization') {
            this.vizQueue.push(data);
            if (!this.currentViz) {
              this.startNextVisualization();
            }
          }
        } catch (error) {
          console.error('Error parsing visualization data:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Fallback to local generation if WebSocket fails
        this.generateLocalVisualization();
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from visualization server');
        // Fallback to local generation
        this.generateLocalVisualization();
      };
    } catch (error) {
      console.error('Failed to connect to backend, using local generation:', error);
      this.generateLocalVisualization();
    }
  }

  private requestNewVisualization() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'request_viz' }));
    }
  }

  private generateLocalVisualization() {
    // Fallback local visualization generator
    const types = ['quantum', 'neural', 'temporal'];
    const localViz = {
      type: types[Math.floor(Math.random() * types.length)],
      parameters: this.generateRandomParameters(),
      duration: 15 + Math.random() * 15
    };
    
    this.vizQueue.push(localViz);
    if (!this.currentViz) {
      this.startNextVisualization();
    }
    
    // Schedule next local visualization
    setTimeout(() => this.generateLocalVisualization(), 5000 + Math.random() * 10000);
  }

  private generateRandomParameters() {
    return {
      rotation: Math.random() * 2,
      particleSize: 2 + Math.random() * 4,
      waveHeight: 150 + Math.random() * 150,
      particleCount: 80 + Math.random() * 80,
      connectionThreshold: 0.2 + Math.random() * 0.4,
      maxDistance: 120 + Math.random() * 100,
      waveWidth: 0.5 + Math.random() * 2,
      fillOpacity: 0.1 + Math.random() * 0.3,
      colorPalette: Math.floor(Math.random() * 5),
      symmetry: Math.floor(Math.random() * 3),
      complexity: 0.5 + Math.random() * 0.5
    };
  }

  private startNextVisualization() {
    if (this.vizQueue.length === 0) return;
    
    this.currentViz = this.vizQueue.shift();
    this.nextVizType = this.currentViz.type;
    this.vizParams = this.currentViz.parameters;
    
    // Start transition
    this.isTransitioning = true;
    this.transitionProgress = 0;
    
    this.visualizationElement.textContent = 
      `Generating: ${this.nextVizType} #${Math.floor(Math.random() * 1000)}`;
    
    // Complete transition after 2 seconds
    setTimeout(() => {
      this.currentVizType = this.nextVizType;
      this.isTransitioning = false;
      this.visualizationElement.textContent = `${this.nextVizType} #${Math.floor(Math.random() * 1000)}`;
      
      // Schedule next visualization
      this.visualizationTimer = setTimeout(() => {
        this.startNextVisualization();
      }, this.currentViz.duration * 1000);
      
      // Request next visualization from server
      this.requestNewVisualization();
    }, 2000);
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
      this.lastUpdate = Date.now();
      
      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Quantum audio initialization failed:', error);
    }
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    // Clear canvas with a subtle dark background
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Handle transitions with morphing effect
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / 2; // 2 second transition
      if (this.transitionProgress > 1) this.transitionProgress = 1;
      
      // Draw morphing between visualizations
      this.drawMorphingVisualization(this.transitionProgress);
    } else {
      // Draw current visualization
      this.drawVisualization(this.currentVizType);
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private drawMorphingVisualization(progress: number) {
    // Create a hybrid visualization that morphs between the two
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    
    // Apply morphing transformation
    const scale = 0.9 + 0.2 * Math.sin(progress * Math.PI);
    const rotation = progress * Math.PI;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(scale, scale);
    this.ctx.rotate(rotation);
    this.ctx.translate(-centerX, -centerY);
    
    // Draw a hybrid visualization
    this.drawHybridVisualization(progress);
    
    this.ctx.restore();
  }

  private drawHybridVisualization(progress: number) {
    // Create a hybrid visualization that combines elements from both visualizations
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Draw particles that transform from one pattern to another
    const particleCount = 150;
    
    for (let i = 0; i < particleCount; i++) {
      const amplitude = this.dataArray![i % this.dataArray!.length] / 255;
      const angle = (i * 2 * Math.PI) / particleCount;
      
      // Calculate position based on progress
      const circleX = centerX + Math.cos(angle) * radius;
      const circleY = centerY + Math.sin(angle) * radius;
      const particleX = centerX + Math.cos(angle) * (amplitude * radius * 0.7);
      const particleY = centerY + Math.sin(angle) * (amplitude * radius * 0.7);
      
      const x = circleX + (particleX - circleX) * progress;
      const y = circleY + (particleY - circleY) * progress;
      
      const size = 2 + amplitude * 8;
      const hue = (i * 360 / particleCount + Date.now() / 40) % 360;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.7 - progress * 0.5})`;
      this.ctx.fill();
    }
  }

  private drawVisualization(vizType: string) {
    switch (vizType) {
      case 'quantum':
        this.drawQuantumResonance();
        break;
      case 'neural':
        this.drawNeuralParticles();
        break;
      case 'temporal':
        this.drawTemporalWaveforms();
        break;
      default:
        this.drawQuantumResonance();
    }
  }

  private drawQuantumResonance() {
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.vizParams.rotation || 0);
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * (this.vizParams.waveHeight || 150) * 0.5);
      const y2 = Math.sin(angle) * (radius + amplitude * (this.vizParams.waveHeight || 150) * 0.5);
      
      const hue = (i * 360 / this.dataArray!.length + Date.now() / 50) % 360;
      this.ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
      this.ctx.lineWidth = (this.vizParams.particleSize || 2) + amplitude * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
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
    const particleCount = this.vizParams.particleCount || 100;
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    
    const particles: {x: number, y: number, size: number, hue: number}[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const amplitude = this.dataArray![i % this.dataArray!.length] / 255;
      const angle = (i * 2 * Math.PI) / particleCount;
      const distance = amplitude * (this.vizParams.maxDistance || 150);
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = (this.vizParams.particleSize || 2) + amplitude * 8;
      const hue = (i * 360 / particleCount + Date.now() / 40) % 360;
      
      particles.push({x, y, size, hue});
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.9)`;
      this.ctx.fill();
    }
    
    // Draw connections
    const connectionThreshold = this.vizParams.connectionThreshold || 0.3;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (this.vizParams.maxDistance || 150) * connectionThreshold) {
          this.ctx.beginPath();
          this.ctx.moveTo(particles[i].x, particles[i].y);
          this.ctx.lineTo(particles[j].x, particles[j].y);
          this.ctx.strokeStyle = `hsla(${particles[i].hue}, 70%, 60%, ${0.3 - distance / ((this.vizParams.maxDistance || 150) * 2)})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }
  }

  private drawTemporalWaveforms() {
    const centerY = this.canvas.height / 4;
    const width = this.canvas.width / 2;
    const height = this.vizParams.waveHeight || 200;
    
    // Draw background gradient
    const bgGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    bgGradient.addColorStop(0, 'rgba(15, 20, 30, 0.4)');
    bgGradient.addColorStop(1, 'rgba(20, 25, 35, 0.4)');
    
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, centerY - height/2, width, height);
    
    // Draw waveform
    this.ctx.beginPath();
    
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
    
    const timeOffset = Date.now() / 100;
    const waveformGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    waveformGradient.addColorStop(0, `hsl(${(timeOffset) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(0.5, `hsl(${(timeOffset + 120) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(1, `hsl(${(timeOffset + 240) % 360}, 70%, 65%)`);
    
    this.ctx.strokeStyle = waveformGradient;
    this.ctx.lineWidth = this.vizParams.waveWidth || 3;
    this.ctx.stroke();
    
    // Fill waveform
    this.ctx.lineTo(width, centerY);
    this.ctx.lineTo(0, centerY);
    this.ctx.closePath();
    
    const fillGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    fillGradient.addColorStop(0, `hsla(${(timeOffset) % 360}, 70%, 65%, ${this.vizParams.fillOpacity || 0.2})`);
    fillGradient.addColorStop(0.5, `hsla(${(timeOffset + 120) % 360}, 70%, 65%, ${this.vizParams.fillOpacity || 0.2})`);
    fillGradient.addColorStop(1, `hsla(${(timeOffset + 240) % 360}, 70%, 65%, ${this.vizParams.fillOpacity || 0.2})`);
    
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
    if (this.ws) {
      this.ws.close();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth Infinite Edition...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth Infinite</h1>
        <p class="quantum-subtitle">AI-Generated Infinite Visualizations</p>
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
                  <p>Share your entire screen or just your music player window</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio</h3>
                  <p>Check "Share audio" to capture sound for visualization</p>
                </div>
              </div>

              <div class="instruction-step">
                <div class="step-number">💡</div>
                <div class="step-content">
                  <h3>Pro Tip</h3>
                  <p>After sharing, click "Hide" on the share dialog to remove it from your screen</p>
                </div>
              </div>

              <div class="drm-warning">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <h3>DRM Notice</h3>
                  <p>Some players like Spotify won't work due to DRM protection. You must share your entire screen for these applications.</p>
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
            <h3>Live Generation</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Visualization:</span>
            <span id="currentVisualization">Connecting to AI...</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Infinite AI-generated visualizations streaming live</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth Infinite v2.0.0 - Endless AI Generation</p>
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
