import { Visualizer } from './visualizer.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;

  constructor() {
    console.log('QuantumSynth constructor called');
    setTimeout(() => this.initialize(), 100);
  }

  private async initialize() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      
      // Create UI for audio source selection
      this.createSourceSelectionUI();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize visualizer');
    }
  }

  private createSourceSelectionUI() {
    const ui = document.createElement('div');
    ui.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  color: #00ffaa; text-align: center; z-index: 1000;">
        <h2>🎵 Quantum Synth Ultimate</h2>
        <p>Select your audio source:</p>
        <div style="margin: 20px 0;">
          <button id="micBtn" style="margin: 10px; padding: 15px 25px; background: #00aaff; 
                 border: none; border-radius: 8px; color: white; cursor: pointer;">
            🎤 Microphone (Speakers → Mic)
          </button>
          <button id="screenBtn" style="margin: 10px; padding: 15px 25px; background: #00aaff; 
                 border: none; border-radius: 8px; color: white; cursor: pointer;">
            🖥️ Screen Audio (Chrome/Edge only)
          </button>
        </div>
        <p><small>For best results: Use Chrome/Edge and play audio through speakers</small></p>
      </div>
    `;
    document.body.appendChild(ui);

    document.getElementById('micBtn')!.onclick = () => {
      ui.remove();
      this.startMicrophoneCapture();
    };

    document.getElementById('screenBtn')!.onclick = () => {
      ui.remove();
      this.startScreenCapture();
    };
  }

  private async startMicrophoneCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100
        }
      });
      this.setupAudioContext(stream);
      this.showStatus('Microphone active - Play audio through speakers');
    } catch (error) {
      console.error('Microphone access denied:', error);
      this.showError('Microphone access denied. Please allow audio permissions.');
    }
  }

  private async startScreenCapture() {
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
      this.setupAudioContext(stream);
      this.showStatus('Screen audio captured - Visualization active!');
    } catch (error) {
      console.error('Screen capture failed:', error);
      this.showError('Screen sharing cancelled or unavailable');
    }
  }

  private setupAudioContext(stream: MediaStream) {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    
    source.connect(analyser);
    this.processAudio(analyser);
  }

  private processAudio(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    
    const processFrame = () => {
      analyser.getByteFrequencyData(data);
      
      if (this.visualizer) {
        this.visualizer.update(data);
      }
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }

  private showStatus(message: string) {
    const status = document.getElementById('status') || this.createStatusElement();
    status.textContent = message;
    status.style.color = '#00ffaa';
  }

  private showError(message: string) {
    const status = document.getElementById('status') || this.createStatusElement();
    status.textContent = message;
    status.style.color = '#ff6b6b';
  }

  private createStatusElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'status';
    element.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      font-family: monospace;
      max-width: 300px;
    `;
    document.body.appendChild(element);
    return element;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
