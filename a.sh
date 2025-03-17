#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# REPLACE WITH RELIABLE AUDIO CAPTURE
cat > src/audio-capture.ts << 'EOF'
export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  async captureAudio(): Promise<AnalyserNode> {
    try {
      console.log('Requesting audio capture permissions...');
      
      // First try screen capture with audio (most reliable for desktop audio)
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'window',
            width: 1,
            height: 1,
            cursor: 'never'
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 44100,
            channelCount: 2
          } as any
        });
        
        return this.setupAudioContext(stream);
      } catch (screenError) {
        console.log('Screen capture failed, trying microphone...');
        
        // Fallback to microphone capture
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
            channelCount: 1
          }
        });
        
        return this.setupAudioContext(stream);
      }
    } catch (error) {
      console.error('All audio capture methods failed:', error);
      throw new Error('Please allow audio permissions to use the visualizer');
    }
  }

  private setupAudioContext(stream: MediaStream): AnalyserNode {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    console.log('Audio context setup complete');
    return this.analyser;
  }

  stopCapture() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
EOF

# UPDATE MAIN.TS WITH PROPER ERROR HANDLING AND UI
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.ts';
import { AudioCapture } from './audio-capture.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioCapture: AudioCapture;
  private analyser: AnalyserNode | null = null;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.audioCapture = new AudioCapture();
    
    // Wait for DOM to be fully ready :cite[6]
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      setTimeout(() => this.initialize(), 100);
    }
  }

  private async initialize() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      
      await this.startAudioCapture();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize: ' + error.message);
    }
  }

  private async startAudioCapture() {
    try {
      this.showInstructions();
      
      this.analyser = await this.audioCapture.captureAudio();
      this.processAudio();
      this.updateUI('Audio capture active! Play some music 🎵');
      
    } catch (error) {
      console.error('Audio capture failed:', error);
      this.showError('Audio access denied. Please allow permissions and reload.');
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

  private showInstructions() {
    const instructions = document.getElementById('instructions') || this.createInstructionsElement();
    instructions.innerHTML = `
      <h3>🔊 Enable Audio Sharing</h3>
      <p>For the best experience:</p>
      <ol>
        <li>Click "Share" when prompted</li>
        <li>Select <strong>"Chrome Window"</strong> or any window</li>
        <li>Check <strong>"Share audio"</strong> ✓</li>
        <li>Play your music (Spotify, YouTube, etc.)</li>
      </ol>
      <p><em>No audio data is stored or transmitted. Processing happens locally.</em></p>
    `;
  }

  private updateUI(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.textContent = message;
    statusElement.style.color = '#00ffaa';
    
    // Hide instructions when successful
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
  }

  private showError(message: string) {
    const statusElement = document.getElementById('status') || this.createStatusElement();
    statusElement.innerHTML = `
      <div style="color: #ff6b6b; margin-bottom: 10px;">${message}</div>
      <button onclick="location.reload()" style="
        padding: 10px 20px;
        background: #00aaff;
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
      ">Try Again</button>
    `;
  }

  private createStatusElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'status';
    element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 30px;
      border-radius: 15px;
      color: #00ffaa;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    document.body.appendChild(element);
    return element;
  }

  private createInstructionsElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'instructions';
    element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 30px;
      border-radius: 15px;
      color: #00ffaa;
      z-index: 1000;
      max-width: 500px;
    `;
    document.body.appendChild(element);
    return element;
  }
}

// Initialize application
new QuantumSynth();
EOF

# UPDATE INDEX.HTML WITH BETTER STRUCTURE
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
        #status, #instructions {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            padding: 30px;
            border-radius: 15px;
            color: #00ffaa;
            text-align: center;
            z-index: 1000;
            max-width: 400px;
        }
    </style>
</head>
<body>
    <canvas id="glCanvas"></canvas>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
EOF

# COMMIT THE RELIABLE SOLUTION
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-17T11:30:00" GIT_COMMITTER_DATE="2025-03-17T11:30:00" \
git commit -m "feat: implement reliable audio capture with proper error handling and user guidance"