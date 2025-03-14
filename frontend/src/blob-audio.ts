export class BlobAudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private iframe: HTMLIFrameElement | null = null;

  async captureAudio(): Promise<AnalyserNode> {
    try {
      // Create a blob URL with audio MIME type
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
        <body>
          <audio id="audioEl" controls style="display:none">
            <source src="https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1705ab737.mp3?filename=soft-silence-23074.mp3" type="audio/mpeg">
          </audio>
          <script>
            document.getElementById('audioEl').play();
            setInterval(() => {}, 1000);
          </script>
        </body>
        </html>
      `], { type: 'text/html' });

      const blobUrl = URL.createObjectURL(blob);

      // Create hidden iframe
      this.iframe = document.createElement('iframe');
      this.iframe.style.display = 'none';
      this.iframe.src = blobUrl;
      document.body.appendChild(this.iframe);

      // Wait for iframe to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture stream from iframe
      this.mediaStream = (this.iframe.contentWindow as any).captureStream();
      
      // Set up audio context
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      audioSource.connect(this.analyser);

      console.log('Blob audio capture activated!');
      return this.analyser;

    } catch (error) {
      console.error('Blob capture failed:', error);
      throw new Error('Audio capture unavailable. Please ensure audio is playing.');
    }
  }

  stopCapture() {
    if (this.iframe) {
      document.body.removeChild(this.iframe);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
