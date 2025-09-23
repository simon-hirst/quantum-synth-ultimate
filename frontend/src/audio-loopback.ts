export class AudioLoopback {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  async captureTabAudio(tabId: number): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      if (!(window as any).chrome?.tabCapture) {
        reject(new Error("Tab capture API not available"));
        return;
      }

      (window as any).chrome.tabCapture.capture(
        { audio: true, video: false },
        (stream: MediaStream) => {
          if (stream) {
            resolve(stream);
          } else {
            reject(new Error("Failed to capture tab audio"));
          }
        },
      );
    });
  }

  async startLoopback() {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "https://open.spotify.com/";
      document.body.appendChild(iframe);

      iframe.onload = async () => {
        try {
          const stream = await this.captureTabAudio(0);
          this.setupAudioContext(stream);
        } catch (error) {
          console.error("Loopback capture failed:", error);
          this.fallbackToScreenAudio();
        }
      };
    } catch (error) {
      console.error("Loopback initialization failed:", error);
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
    console.log("Falling back to screen audio capture");
  }
}
