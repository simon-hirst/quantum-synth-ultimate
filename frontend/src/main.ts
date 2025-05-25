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
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  initialize(stream: MediaStream) {
    console.log('Initializing audio processing...');
    
    try {
      // Setup audio context and analyser
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw audio visualization
    const barWidth = (this.canvas.width / this.dataArray.length) * 2;
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      barHeight = this.dataArray[i] / 2;
      
      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#00b4db');
      gradient.addColorStop(1, '#0083b0');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
    
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
        <button id="stopButton" style="display: none; background: #ff4757;">Stop Sharing</button>
      </div>
      <canvas id="visualizer"></canvas>
    </div>
  `;

  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  const quantumSynth = new QuantumSynth(canvas);
  let mediaStream: MediaStream | null = null;

  const startButton = document.getElementById('startButton')!;
  const stopButton = document.getElementById('stopButton')!;

  startButton.addEventListener('click', initializeScreenShare);
  stopButton.addEventListener('click', stopScreenShare);

  function initializeScreenShare() {
    startButton.disabled = true;
    startButton.textContent = 'Starting...';

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
        startButton.textContent = 'Try Again';
      });
    } else {
      alert('Screen sharing not supported in this browser');
      startButton.disabled = false;
      startButton.textContent = 'Start Screen Sharing';
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
    startButton.textContent = 'Start Screen Sharing';
  }
});
