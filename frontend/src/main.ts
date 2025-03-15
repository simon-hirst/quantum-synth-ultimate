import { Visualizer } from './visualizer.ts';
import { StealthAudioCapture } from './stealth-audio.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private stealthCapture: StealthAudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.stealthCapture = new StealthAudioCapture();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startStealthAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startStealthAudioCapture() {
    try {
      this.analyser = await this.stealthCapture.captureDesktopAudio();
      this.processAudio();
      this.updateUI('Stealth audio capture activated! Play some music 🎵');
    } catch (error) {
      console.error('Stealth audio failed:', error);
      this.fallbackToScreenAudio();
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

  private async fallbackToScreenAudio() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        }
      });
      
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.processAudio();
      
      this.updateUI('Screen audio capture fallback activated');
    } catch (error) {
      console.error('All audio capture methods failed:', error);
      this.showError('Audio capture unavailable. Please check permissions.');
    }
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
  }

  private showError(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#ff6b6b';
  }

  private createStatusElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'status';
    element.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00ffaa;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      font-family: monospace;
    `;
    document.body.appendChild(element);
    return element;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
