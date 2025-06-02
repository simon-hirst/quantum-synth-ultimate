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
  private ws: WebSocket | null = null;
  private currentShader: string = '';
  private nextShader: string = '';
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private pipContainer: HTMLDivElement | null = null;
  private isPipMode: boolean = false;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualizationElement = visualizationElement;
    this.setupCanvas();
    this.createPipContainer();
    this.connectToBackend();
  }

  private setupCanvas() {
    this.canvas.width = this.canvas.offsetWidth * 2;
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  private createPipContainer() {
    this.pipContainer = document.createElement('div');
    this.pipContainer.className = 'pip-container hidden';
    this.pipContainer.innerHTML = `
      <div class="pip-header">
        <span>QuantumSynth Visualization</span>
        <div class="pip-controls">
          <button class="pip-btn" id="pipClose">✕</button>
        </div>
      </div>
      <div class="pip-content">
        <canvas id="pipCanvas"></canvas>
      </div>
    `;
    document.body.appendChild(this.pipContainer);

    const pipClose = document.getElementById('pipClose')!;
    pipClose.addEventListener('click', () => this.togglePipMode());
  }

  togglePipMode() {
    this.isPipMode = !this.isPipMode;
    
    if (this.isPipMode) {
      // Move canvas to PiP container
      const pipCanvas = document.getElementById('pipCanvas') as HTMLCanvasElement;
      const mainCanvas = this.canvas;
      
      // Copy canvas properties
      pipCanvas.width = mainCanvas.width;
      pipCanvas.height = mainCanvas.height;
      const pipCtx = pipCanvas.getContext('2d')!;
      
      // Update reference
      this.canvas = pipCanvas;
      this.ctx = pipCtx;
      
      // Show PiP container
      this.pipContainer!.classList.remove('hidden');
    } else {
      // Move canvas back to main container
      const mainCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
      const pipCanvas = this.canvas;
      
      // Copy canvas properties
      mainCanvas.width = pipCanvas.width;
      mainCanvas.height = pipCanvas.height;
      const mainCtx = mainCanvas.getContext('2d')!;
      
      // Update reference
      this.canvas = mainCanvas;
      this.ctx = mainCtx;
      
      // Hide PiP container
      this.pipContainer!.classList.add('hidden');
    }
  }

  private connectToBackend() {
    try {
      this.ws = new WebSocket('wss://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/ws');
      
      this.ws.onopen = () => {
        console.log('Connected to visualization server');
        this.requestNewShader();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'shader') {
            this.nextShader = data.code;
            this.startTransition();
          } else if (data.type === 'visualization') {
            this.visualizationElement.textContent = data.name;
          }
        } catch (error) {
          console.error('Error parsing shader data:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from visualization server');
      };
    } catch (error) {
      console.error('Failed to connect to backend:', error);
    }
  }

  private requestNewShader() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'request_shader' }));
    }
  }

  private startTransition() {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    
    // Complete transition after 3 seconds
    const transitionDuration = 3000;
    const startTime = Date.now();
    
    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      this.transitionProgress = elapsed / transitionDuration;
      
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentShader = this.nextShader;
        this.isTransitioning = false;
        this.requestNewShader();
      } else {
        requestAnimationFrame(animateTransition);
      }
    };
    
    animateTransition();
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
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Draw visualization based on current mode
    if (this.isTransitioning) {
      this.drawTransitionVisualization();
    } else if (this.currentShader) {
      this.drawShaderVisualization();
    } else {
      this.drawFallbackVisualization();
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private drawTransitionVisualization() {
    // Create a morphing effect between shaders
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const time = Date.now() / 1000;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    // Apply transition effects
    const scale = 0.9 + 0.2 * Math.sin(this.transitionProgress * Math.PI);
    const rotation = this.transitionProgress * Math.PI * 2;
    this.ctx.scale(scale, scale);
    this.ctx.rotate(rotation);
    
    // Draw a hybrid visualization
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      const distance = amplitude * 150;
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const size = 2 + amplitude * 8;
      
      const hue = (i * 360 / this.dataArray!.length + time * 50) % 360;
      const alpha = 0.7 - this.transitionProgress * 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawShaderVisualization() {
    // This would execute the GLSL shader received from the backend
    // For now, we'll create a visualization based on the shader concept
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const time = Date.now() / 1000;
    
    // Simulate shader-like behavior
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      const distance = amplitude * 200;
      
      // Create complex patterns based on the audio data
      const patternX = Math.cos(angle * 3 + time) * distance;
      const patternY = Math.sin(angle * 2 + time) * distance;
      
      const x = centerX + patternX;
      const y = centerY + patternY;
      const size = 3 + amplitude * 10;
      
      // Use a color palette based on the shader concept
      const hue = (i * 360 / this.dataArray!.length + time * 60) % 360;
      const saturation = 80 + amplitude * 20;
      const lightness = 50 + amplitude * 30;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.fill();
      
      // Draw connecting lines for a neural network effect
      if (i > 0 && amplitude > 0.3) {
        const prevAmplitude = this.dataArray![(i-1) % this.dataArray!.length] / 255;
        const prevAngle = ((i-1) * 2 * Math.PI) / this.dataArray!.length;
        const prevDistance = prevAmplitude * 200;
        const prevPatternX = Math.cos(prevAngle * 3 + time) * prevDistance;
        const prevPatternY = Math.sin(prevAngle * 2 + time) * prevDistance;
        const prevX = centerX + prevPatternX;
        const prevY = centerY + prevPatternY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.3 + amplitude * 0.4})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  private drawFallbackVisualization() {
    // Fallback visualization when no shader is available
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    const time = Date.now() / 1000;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(time * 0.5);
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * radius * 0.7);
      const y2 = Math.sin(angle) * (radius + amplitude * radius * 0.7);
      
      const hue = (i * 360 / this.dataArray!.length + time * 50) % 360;
      this.ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
      this.ctx.lineWidth = 2 + amplitude * 5;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
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

            <button id="pipButton" class="quantum-btn" style="display: none; margin-top: 10px;">
              <span class="btn-icon">🔲</span>
              Toggle Picture-in-Picture
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
        <p>QuantumSynth Infinite v2.1.0 - Endless AI Generation</p>
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
  const pipButton = document.getElementById('pipButton')!;
  const statusDot = document.querySelector('.status-dot')!;
  const statusText = document.querySelector('.status-text')!;

  startButton.addEventListener('click', initializeScreenShare);
  stopButton.addEventListener('click', stopScreenShare);
  pipButton.addEventListener('click', () => quantumSynth.togglePipMode());

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
        pipButton.style.display = 'block';
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
    pipButton.style.display = 'none';
    startButton.style.display = 'block';
    startButton.disabled = false;
    startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
});
