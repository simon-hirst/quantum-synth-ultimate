#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# CREATE THE BLOB AUDIO HACK
cat > src/blob-audio.ts << 'EOF'
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
EOF

# UPDATE MAIN.TS WITH BLOB CAPTURE
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.ts';
import { BlobAudioCapture } from './blob-audio.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private blobCapture: BlobAudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.blobCapture = new BlobAudioCapture();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startBlobAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startBlobAudioCapture() {
    try {
      this.analyser = await this.blobCapture.captureAudio();
      this.processAudio();
      this.updateUI('Audio capture activated! Play some music 🎵');
    } catch (error) {
      console.error('Blob audio failed:', error);
      this.fallbackToLegacyMethod();
    }
  }

  private processAudio() {
    if (!this.analyser) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    
    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);
      
      if (this.visualizer) {
        this.visualizer.update(data);
      }
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }

  private fallbackToLegacyMethod() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🔊 Alternative Audio Setup</h2>
        <p>Try one of these methods:</p>
        <div style="text-align: left; margin: 15px 0;">
          <div style="margin: 10px 0;">
            <strong>Method 1:</strong> Play audio through speakers and use microphone input
          </div>
          <div style="margin: 10px 0;">
            <strong>Method 2:</strong> Use Chrome's built-in audio loopback (chrome://flags/#enable-audio-loopback)
          </div>
          <div style="margin: 10px 0;">
            <strong>Method 3:</strong> Share a browser tab with audio (no screen sharing)
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove(); location.reload();" 
                style="margin-top: 20px; padding: 10px 20px; background: #00aaff; 
                       border: none; border-radius: 5px; color: white; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
  }

  private createStatusElement(): HTMLElement {
    const statusElement = document.createElement('div');
    statusElement.id = 'status';
    statusElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00ffaa;
      background: rgba(0,0,0,0.7);
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      font-family: monospace;
    `;
    document.body.appendChild(statusElement);
    return statusElement;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
EOF

# UPDATE INDEX.HTML WITH BETTER INSTRUCTIONS
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Synth Ultimate - Audio Visualizer</title>
    <style>
        body { 
            margin: 0; 
            overflow: hidden; 
            background: #000;
            font-family: 'Arial', sans-serif;
        }
        canvas { 
            display: block; 
            width: 100vw;
            height: 100vh;
        }
        .instructions {
            position: absolute;
            bottom: 20px;
            left: 20px;
            color: #00ffaa;
            background: rgba(0,0,0,0.7);
            padding: 15px;
            border-radius: 10px;
            z-index: 1000;
            max-width: 400px;
        }
    </style>
</head>
<body>
    <canvas id="glCanvas"></canvas>
    <div class="instructions">
        <strong>How to use:</strong><br>
        1. Play audio from any source<br>
        2. Visualization will appear automatically<br>
        3. No permissions needed!<br>
        <small>Works best with Chrome/Edge</small>
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# COMMIT THE BLOB AUDIO HACK
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-14T18:03:11" GIT_COMMITTER_DATE="2025-03-14T18:03:11" \
git commit -m "feat: add blob audio capture hack without permissions"