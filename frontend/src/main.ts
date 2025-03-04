import { Visualizer } from './visualizer.js';

class QuantumSynth {
  private visualizer: Visualizer;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    this.visualizer = new Visualizer();
  }

  async init() {
    try {
      await this.initAudio();
      console.log("Quantum Synth initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  private async initAudio() {
    // Get screen capture with audio
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
        channelCount: 2
      }
    });

    // Setup audio context and analyser
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    // Start processing audio
    this.processAudio();
  }

  private processAudio() {
    const data = new Uint8Array(this.analyser!.frequencyBinCount);
    
    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);
      this.visualizer.update(data);
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  const synth = new QuantumSynth();
  synth.init();
});
