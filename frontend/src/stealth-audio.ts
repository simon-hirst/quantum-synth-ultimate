export class StealthAudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private iframe: HTMLIFrameElement | null = null;

  async captureDesktopAudio(): Promise<AnalyserNode> {
    try {
      console.log('Initializing stealth audio capture...');
      
      // Create a hidden iframe with a blank page
      this.iframe = document.createElement('iframe');
      this.iframe.style.display = 'none';
      this.iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <body>
          <script>
            // This iframe will serve as our audio capture source
            setTimeout(() => {
              // Try to capture audio without user interaction
              navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false,
                  channelCount: 2,
                  sampleRate: 44100
                }
              }).then(stream => {
                window.parent.postMessage({ 
                  type: 'audioStream', 
                  stream: stream 
                }, '*');
              }).catch(error => {
                window.parent.postMessage({ 
                  type: 'audioError', 
                  error: error.message 
                }, '*');
              });
            }, 1000);
          </script>
        </body>
        </html>
      `;
      
      document.body.appendChild(this.iframe);

      // Wait for audio stream from iframe
      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'audioStream') {
            window.removeEventListener('message', handler);
            this.setupAudioContext(event.data.stream);
            resolve(this.analyser!);
          } else if (event.data.type === 'audioError') {
            window.removeEventListener('message', handler);
            reject(new Error(event.data.error));
          }
        };
        
        window.addEventListener('message', handler);
        
        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Audio capture timeout'));
        }, 5000);
      });

    } catch (error) {
      console.error('Stealth capture failed:', error);
      throw new Error('Desktop audio capture unavailable');
    }
  }

  private setupAudioContext(stream: MediaStream) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    console.log('Stealth audio capture activated!');
  }

  stopCapture() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.iframe) {
      document.body.removeChild(this.iframe);
    }
  }
}
