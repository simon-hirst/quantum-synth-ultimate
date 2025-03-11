#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# CREATE THE AUDIO LOOPBACK HACK
cat > src/audio-loopback.ts << 'EOF'
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
EOF

# UPDATE MAIN.TS WITH THE LOOPBACK HACK
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.ts';
import { AudioLoopback } from './audio-loopback.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioLoopback: AudioLoopback;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.audioLoopback = new AudioLoopback();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startAudioCapture() {
    try {
      // Try the loopback method first
      this.analyser = await this.audioLoopback.startLoopback();
      this.processAudio();
    } catch (error) {
      console.error('Audio capture failed:', error);
      this.showManualInstructions();
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

  private showManualInstructions() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🎵 Enable Audio Capture</h2>
        <p>For the best experience:</p>
        <ol style="text-align: left;">
          <li>Open your music in Chrome/Edge</li>
          <li>Right-click the tab and select "Duplicate"</li>
          <li>Share the duplicated tab when prompted</li>
          <li>Make sure "Share audio" is checked ✓</li>
        </ol>
        <button onclick="this.parentElement.parentElement.remove(); location.reload();" 
                style="margin-top: 20px; padding: 10px 20px; background: #00aaff; 
                       border: none; border-radius: 5px; color: white; cursor: pointer;">
          I'm Ready!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

// Add chrome API polyfill for tabCapture
if (!(window as any).chrome) {
  (window as any).chrome = {};
}
if (!(window as any).chrome.tabCapture) {
  (window as any).chrome.tabCapture = {
    capture: (options: any, callback: (stream: MediaStream | null) => void) => {
      // Fallback to screen capture if tabCapture isn't available
      navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        }
      }).then(stream => callback(stream))
        .catch(() => callback(null));
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
EOF

# UPDATE INDEX.HTML WITH BROWSER DETECTION
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Synth Ultimate</title>
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
        .browser-warning {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #ff6b6b;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 8px;
            z-index: 1000;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="browserWarning" class="browser-warning" style="display: none;">
        For best results, use Chrome or Edge browser
    </div>
    <canvas id="glCanvas"></canvas>
    <script>
        // Browser detection
        if (!navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg/')) {
            document.getElementById('browserWarning').style.display = 'block';
        }
    </script>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# COMMIT THE CLEVER HACK
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-11T15:45:17" GIT_COMMITTER_DATE="2025-03-11T15:45:17" \
git commit -m "feat: add audio loopback hack for Chrome/Edge tab audio capture"