export class StealthAudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;

  async captureDesktopAudio(): Promise<AnalyserNode> {
    try {
      // Create a tiny, transparent window to "capture"
      const dummyWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000');
      if (!dummyWindow) {
        throw new Error('Could not create dummy window');
      }

      // Write minimal HTML to the dummy window
      dummyWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audio Capture Helper</title>
          <style>
            body { margin: 0; background: transparent; }
            #audioHelper { 
              width: 1px; height: 1px; 
              background: transparent; 
              border: none;
            }
          </style>
        </head>
        <body>
          <div id="audioHelper"></div>
          <script>
            // Keep the window alive for audio capture
            setInterval(() => {}, 1000);
          </script>
        </body>
        </html>
      `);

      // Wait for the window to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the dummy window with system audio
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          logicalSurface: true,
          cursor: 'never',
          width: 1,
          height: 1
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2,
          autoGainControl: false
        } as any
      });

      // Close the dummy window immediately
      dummyWindow.close();

      // Set up audio context
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      audioSource.connect(this.analyser);

      console.log('Stealth audio capture activated!');
      return this.analyser;

    } catch (error) {
      console.error('Stealth capture failed:', error);
      throw new Error('Desktop audio capture unavailable. Please ensure system audio is playing.');
    }
  }

  stopCapture() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
