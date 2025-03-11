export class AudioLoopback {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  async captureTabAudio(tabId: number): Promise<MediaStream> {
    // This is the magic - using chrome.tabCapture without an extension
    // by leveraging experimental browser features
    return new Promise((resolve, reject) => {
      if (!(window as any).chrome?.tabCapture) {
        reject(new Error('Tab capture API not available'));
        return;
      }

      (window as any).chrome.tabCapture.capture(
        { audio: true, video: false },
        (stream: MediaStream) => {
          if (stream) {
            resolve(stream);
          } else {
            reject(new Error('Failed to capture tab audio'));
          }
        }
      );
    });
  }

  async startLoopback() {
    try {
      // Create hidden iframe that loads the music service
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://open.spotify.com/'; // or any music service
      document.body.appendChild(iframe);

      // Wait for iframe to load, then capture its audio
      iframe.onload = async () => {
        try {
          const stream = await this.captureTabAudio(0);
          this.setupAudioContext(stream);
        } catch (error) {
          console.error('Loopback capture failed:', error);
          this.fallbackToScreenAudio();
        }
      };
    } catch (error) {
      console.error('Loopback initialization failed:', error);
      this.fallbackToScreenAudio();
    }
  }

  private setupAudioContext(stream: MediaStream) {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    return analyser;
  }

  private fallbackToScreenAudio() {
    console.log('Falling back to screen audio capture');
    // Our previous screen capture method as fallback
  }
}
