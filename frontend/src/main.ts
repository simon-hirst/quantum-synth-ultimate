import { Visualizer } from './visualizer.ts';
import { AudioCapture } from './audio-capture.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioCapture: AudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.audioCapture = new AudioCapture();
    
    // Wait for DOM to be fully ready :cite[6]
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      setTimeout(() => this.initialize(), 100);
    }
  }

  private async initialize() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      
      await this.startAudioCapture();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize: ' + error.message);
    }
  }

  private async startAudioCapture() {
    try {
      this.showInstructions();
      
      this.analyser = await this.audioCapture.captureAudio();
      this.processAudio();
      this.updateUI('Audio capture active! Play some music 🎵');
      
    } catch (error) {
      console.error('Audio capture failed:', error);
      this.showError('Audio access denied. Please allow permissions and reload.');
    }
  }

  private processAudio() {
    if (!this.analyser) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    
    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);
      
      if (this.visualizer) {
        this.visualizer.update(data);
      }
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }

  private showInstructions() {
    const instructions = document.getElementById('instructions') || this.createInstructionsElement();
    instructions.innerHTML = `
      <h3>🔊 Enable Audio Sharing</h3>
      <p>For the best experience:</p>
      <ol>
        <li>Click "Share" when prompted</li>
        <li>Select <strong>"Chrome Window"</strong> or any window</li>
        <li>Check <strong>"Share audio"</strong> ✓</li>
        <li>Play your music (Spotify, YouTube, etc.)</li>
      </ol>
      <p><em>No audio data is stored or transmitted. Processing happens locally.</em></p>
    `;
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
    
    // Hide instructions when successful
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
  }

  private showError(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.innerHTML = `
      <div style="color: #ff6b6b; margin-bottom: 10px;">${message}</div>
      <button onclick="location.reload()" style="
        padding: 10px 20px;
        background: #00aaff;
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
      ">Try Again</button>
    `;
  }

  private createStatusElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'status';
    element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 30px;
      border-radius: 15px;
      color: #00ffaa;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    document.body.appendChild(element);
    return element;
  }

  private createInstructionsElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'instructions';
    element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 30px;
      border-radius: 15px;
      color: #00ffaa;
      z-index: 1000;
      max-width: 500px;
    `;
    document.body.appendChild(element);
    return element;
  }
}

// Initialize application
new QuantumSynth();
