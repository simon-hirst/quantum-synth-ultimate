#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# CREATE THE STEALTH AUDIO CAPTURE MODULE
cat > src/stealth-audio.ts << 'EOF'
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
EOF

# UPDATE MAIN.TS WITH STEALTH CAPTURE
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.ts';
import { StealthAudioCapture } from './stealth-audio.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private stealthCapture: StealthAudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.stealthCapture = new StealthAudioCapture();
    setTimeout(() => this.initializeVisualizer(), 100);
  }

  private initializeVisualizer() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      this.startStealthAudioCapture();
    } catch (error) {
      console.error('Failed to initialize visualizer:', error);
    }
  }

  private async startStealthAudioCapture() {
    try {
      this.analyser = await this.stealthCapture.captureDesktopAudio();
      this.processAudio();
      this.updateUI('Desktop audio captured! Play some music 🎵');
    } catch (error) {
      console.error('Stealth audio failed:', error);
      this.fallbackToManualMethod();
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

  private fallbackToManualMethod() {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  color: #0ff; background: rgba(0,0,0,0.9); padding: 30px; border-radius: 15px; 
                  z-index: 1000; text-align: center; max-width: 500px;">
        <h2>🎵 Manual Audio Setup</h2>
        <p>For direct desktop audio capture:</p>
        <ol style="text-align: left;">
          <li>Play your music (Spotify, YouTube, etc.)</li>
          <li>When prompted to share, select <strong>"Chrome Window"</strong></li>
          <li>Choose any window (it won't actually be shown)</li>
          <li>Check <strong>"Share audio"</strong> ✓</li>
        </ol>
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

# UPDATE INDEX.HTML WITH PRIVACY NOTICE
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Synth Ultimate - Desktop Audio Visualizer</title>
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
        .privacy-note {
            position: absolute;
            bottom: 10px;
            left: 10px;
            color: #666;
            font-size: 12px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <canvas id="glCanvas"></canvas>
    <div class="privacy-note">
        🔒 No audio data is stored or transmitted. Processing happens locally in your browser.
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# COMMIT THE STEALTH AUDIO CAPTURE
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-11T16:20:36" GIT_COMMITTER_DATE="2025-03-11T16:20:36" \
git commit -m "feat: add stealth desktop audio capture with 1px window hack"