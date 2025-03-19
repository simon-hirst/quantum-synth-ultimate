import { Visualizer } from './visualizer.ts';
import { AudioSetupUI } from './audio-setup-ui.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSetupUI: AudioSetupUI | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    
    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => this.initialize(), 100);
  }

  private async initialize() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      
      // Show setup UI instead of immediately requesting permissions
      this.showSetupUI();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize visualizer');
    }
  }

  private showSetupUI() {
    // Only show UI if we don't already have audio access
    if (!this.analyser) {
      this.audioSetupUI = new AudioSetupUI((stream) => {
        this.handleAudioStream(stream);
      });
      this.audioSetupUI.show();
    }
  }

  private async handleAudioStream(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      this.processAudio();
      this.showSuccess('Audio visualization active! Play some music 🎵');
      
    } catch (error) {
      console.error('Audio processing failed:', error);
      this.showError('Failed to process audio stream');
      
      // Re-show the setup UI if audio processing fails
      this.showSetupUI();
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

  private showSuccess(message: string) {
    this.updateStatus(message, '#00ffaa');
  }

  private showError(message: string) {
    this.updateStatus(message, '#ff6b6b');
  }

  private updateStatus(message: string, color: string) {
    let statusElement = document.getElementById('status');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'status';
      statusElement.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid ${color}33;
      `;
      document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.color = color;
    statusElement.style.borderColor = `${color}33`;
  }
}

// Initialize only when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
