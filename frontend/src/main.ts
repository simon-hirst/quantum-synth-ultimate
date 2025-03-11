import { Visualizer } from './visualizer.ts';
import { AudioLoopback } from './audio-loopback.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioLoopback: AudioLoopback;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.audioLoopback = new AudioLoopback();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startAudioCapture() {
    try {
      // Try the loopback method first
      this.analyser = await this.audioLoopback.startLoopback();
      this.processAudio();
    } catch (error) {
      console.error('Audio capture failed:', error);
      this.showManualInstructions();
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

  private showManualInstructions() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🎵 Enable Audio Capture</h2>
        <p>For the best experience:</p>
        <ol style="text-align: left;">
          <li>Open your music in Chrome/Edge</li>
          <li>Right-click the tab and select "Duplicate"</li>
          <li>Share the duplicated tab when prompted</li>
          <li>Make sure "Share audio" is checked ✓</li>
        </ol>
        <button onclick="this.parentElement.parentElement.remove(); location.reload();" 
                style="margin-top: 20px; padding: 10px 20px; background: #00aaff; 
                       border: none; border-radius: 5px; color: white; cursor: pointer;">
          I'm Ready!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

// Add chrome API polyfill for tabCapture
if (!(window as any).chrome) {
  (window as any).chrome = {};
}
if (!(window as any).chrome.tabCapture) {
  (window as any).chrome.tabCapture = {
    capture: (options: any, callback: (stream: MediaStream | null) => void) => {
      // Fallback to screen capture if tabCapture isn't available
      navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        }
      }).then(stream => callback(stream))
        .catch(() => callback(null));
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
