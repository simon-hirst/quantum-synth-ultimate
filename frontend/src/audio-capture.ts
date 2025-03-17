export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  async captureAudio(): Promise<AnalyserNode> {
    try {
      console.log('Requesting audio capture permissions...');
      
      // First try screen capture with audio (most reliable for desktop audio)
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'window',
            width: 1,
            height: 1,
            cursor: 'never'
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 44100,
            channelCount: 2
          } as any
        });
        
        return this.setupAudioContext(stream);
      } catch (screenError) {
        console.log('Screen capture failed, trying microphone...');
        
        // Fallback to microphone capture
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1
          }
        });
        
        return this.setupAudioContext(stream);
      }
    } catch (error) {
      console.error('All audio capture methods failed:', error);
      throw new Error('Please allow audio permissions to use the visualizer');
    }
  }

  private setupAudioContext(stream: MediaStream): AnalyserNode {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    console.log('Audio context setup complete');
    return this.analyser;
  }

  stopCapture() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
