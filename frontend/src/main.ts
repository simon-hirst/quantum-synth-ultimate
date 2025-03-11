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
      this.updateUI('Desktop audio captured! Play some music 🎵');
    } catch (error) {
      console.error('Stealth audio failed:', error);
      this.fallbackToManualMethod();
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

  private fallbackToManualMethod() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🎵 Manual Audio Setup</h2>
        <p>For direct desktop audio capture:</p>
        <ol style="text-align: left;">
          <li>Play your music (Spotify, YouTube, etc.)</li>
          <li>When prompted to share, select <strong>"Chrome Window"</strong></li>
          <li>Choose any window (it won't actually be shown)</li>
          <li>Check <strong>"Share audio"</strong> ✓</li>
        </ol>
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
