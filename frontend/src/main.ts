import { Visualizer } from './visualizer.ts';
import { BlobAudioCapture } from './blob-audio.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private blobCapture: BlobAudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.blobCapture = new BlobAudioCapture();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startBlobAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startBlobAudioCapture() {
    try {
      this.analyser = await this.blobCapture.captureAudio();
      this.processAudio();
      this.updateUI('Audio capture activated! Play some music 🎵');
    } catch (error) {
      console.error('Blob audio failed:', error);
      this.fallbackToLegacyMethod();
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

  private fallbackToLegacyMethod() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🔊 Alternative Audio Setup</h2>
        <p>Try one of these methods:</p>
        <div style="text-align: left; margin: 15px 0;">
          <div style="margin: 10px 0;">
            <strong>Method 1:</strong> Play audio through speakers and use microphone input
          </div>
          <div style="margin: 10px 0;">
            <strong>Method 2:</strong> Use Chrome's built-in audio loopback (chrome://flags/#enable-audio-loopback)
          </div>
          <div style="margin: 10px 0;">
            <strong>Method 3:</strong> Share a browser tab with audio (no screen sharing)
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove(); location.reload();" 
                style="margin-top: 20px; padding: 10px 20px; background: #00aaff; 
                       border: none; border-radius: 5px; color: white; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
  }

  private createStatusElement(): HTMLElement {
    const statusElement = document.createElement('div');
    statusElement.id = 'status';
    statusElement.style.cssText = `
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
    document.body.appendChild(statusElement);
    return statusElement;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
