class QuantumSynth {
  private backendConnected: boolean = false;
  private ws: WebSocket | null = null;

  async init() {
    // Try to connect to backend first (optional)
    await this.tryConnectBackend();
    
    // Initialize audio capture
    await this.initAudio();
    
    // Initialize visualization
    this.initWebGL();
  }

  private async tryConnectBackend() {
    try {
      this.ws = new WebSocket('wss://' + window.location.host + '/ws');
      this.ws.onopen = () => {
        this.backendConnected = true;
        console.log("Connected to enhanced backend features");
      };
      this.ws.onerror = () => {
        console.log("Running in pure frontend mode");
      };
    } catch (error) {
      console.log("Backend not available, using frontend-only mode");
    }
  }

  private async initAudio() {
    // Pure frontend audio capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
        channelCount: 2
      }
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    // Process audio and visualize
    this.processAudio(analyser);
  }

  private processAudio(analyser: AnalyserNode) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const process = () => {
      analyser.getByteFrequencyData(data);
      
      // Send to backend if connected
      if (this.backendConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'audio', data: Array.from(data) }));
      }
      
      // Update visualization
      this.updateVisualization(data);
      requestAnimationFrame(process);
    };
    process();
  }

  private initWebGL() {
    // WebGL initialization
    console.log("WebGL visualizer ready");
  }

  private updateVisualization(data: Uint8Array) {
    // Update visualization based on audio data
  }
}

// Initialize
new QuantumSynth().init();
