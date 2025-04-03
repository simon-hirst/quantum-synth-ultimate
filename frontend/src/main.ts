import { NeuralVisualizer } from './neural-visualizer.ts';
import { AudioSetupUI } from './audio-setup-ui.ts';
import { ScreenSharingHelper } from './screen-sharing-helper.ts';

class QuantumSynth {
  private visualizer: NeuralVisualizer | null = null;
  private audioSetupUI: AudioSetupUI | null = null;
  private screenHelper: ScreenSharingHelper;

  constructor() {
    console.log('QuantumSynth Neural Edition constructor called');
    this.screenHelper = new ScreenSharingHelper();
    
    setTimeout(() => this.initialize(), 100);
  }

  private async initialize() {
    try {
      const canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
      this.visualizer = new NeuralVisualizer(canvas);
      
      // Show setup UI
      this.showSetupUI();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize neural visualizer');
    }
  }

  private showSetupUI() {
    this.audioSetupUI = new AudioSetupUI((stream) => {
      this.handleAudioStream(stream);
    });
    this.audioSetupUI.show();
  }

  private handleAudioStream(stream: MediaStream) {
    this.showSuccess('Neural audio processing activated! AI is generating your visual universe...');
    
    // Show screen sharing helper
    setTimeout(() => {
      this.screenHelper.showHelper();
    }, 2000);
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
        font-family: monospace;
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

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
