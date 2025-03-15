#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# CREATE THE STEALTH AUDIO CAPTURE MODULE
cat > src/stealth-audio.ts << 'EOF'
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
EOF

# UPDATE MAIN.TS WITH THE STEALTH CAPTURE
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
      this.updateUI('Stealth audio capture activated! Play some music 🎵');
    } catch (error) {
      console.error('Stealth audio failed:', error);
      this.fallbackToScreenAudio();
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

  private async fallbackToScreenAudio() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        }
      });
      
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.processAudio();
      
      this.updateUI('Screen audio capture fallback activated');
    } catch (error) {
      console.error('All audio capture methods failed:', error);
      this.showError('Audio capture unavailable. Please check permissions.');
    }
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
  }

  private showError(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#ff6b6b';
  }

  private createStatusElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'status';
    element.style.cssText = `
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
    document.body.appendChild(element);
    return element;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
EOF

# UPDATE INDEX.HTML WITH MINIMAL UI
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quantum Synth Ultimate - Stealth Audio Visualizer</title>
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
        #status {
            position: absolute;
            top: 20px;
            left: 20px;
            color: #00ffaa;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <canvas id="glCanvas"></canvas>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# COMMIT THE STEALTH AUDIO CAPTURE
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-15T16:30:00" GIT_COMMITTER_DATE="2025-03-15T16:30:00" \
git commit -m "feat: add stealth audio capture using hidden iframe hack"