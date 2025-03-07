import { Visualizer } from './visualizer.js';

class QuantumSynth {
  private visualizer: Visualizer;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.visualizer = new Visualizer();
    console.log('QuantumSynth constructor called');
  }

  async init() {
    try {
      console.log('Initializing audio...');
      await this.initAudio();
      console.log("Quantum Synth initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  private async initAudio() {
    try {
      console.log('Requesting screen capture with audio...');
      
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

      console.log('Screen capture granted, setting up audio...');

      // Setup audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      // Listen for audio track events
      const audioTracks = stream.getAudioTracks();
      console.log('Audio tracks:', audioTracks.length);
      
      if (audioTracks.length > 0) {
        audioTracks[0].addEventListener('ended', () => {
          console.log('Audio track ended');
          this.isPlaying = false;
        });
      }
      
      // Start processing audio
      this.isPlaying = true;
      this.processAudio();
      
    } catch (error) {
      console.error('Audio initialization failed:', error);
      throw error;
    }
  }

  private processAudio() {
    if (!this.analyser) {
      console.log('No analyser available');
      return;
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    
    const processFrame = () => {
      if (!this.isPlaying) {
        console.log('Audio processing stopped');
        return;
      }

      this.analyser!.getByteFrequencyData(data);
      
      // Log some audio data for debugging
      if (Math.random() < 0.01) { // Only log occasionally
        console.log('Audio data sample:', data.slice(0, 5));
      }
      
      this.visualizer.update(data);
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }
}

// Initialize when page loads
console.log('Document loaded, initializing QuantumSynth...');
document.addEventListener('DOMContentLoaded', () => {
  const synth = new QuantumSynth();
  synth.init();
});
