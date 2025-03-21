#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# ADD SCREEN SHARING HELPER COMPONENT
cat > src/screen-sharing-helper.ts << 'EOF'
export class ScreenSharingHelper {
  private helperElement: HTMLDivElement | null = null;

  showHelper() {
    // Create helper element if it doesn't exist
    if (!this.helperElement) {
      this.helperElement = this.createHelperElement();
      document.body.appendChild(this.helperElement);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        this.hideHelper();
      }, 10000);
    }
  }

  hideHelper() {
    if (this.helperElement && this.helperElement.parentElement) {
      document.body.removeChild(this.helperElement);
      this.helperElement = null;
    }
  }

  private createHelperElement(): HTMLDivElement {
    const helper = document.createElement('div');
    helper.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #00ffaa;
        padding: 12px 20px;
        border-radius: 25px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 255, 170, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <span>💡 Click "Hide" on the Chrome screen sharing indicator to clean up your view</span>
        <button style="
          background: rgba(0, 255, 170, 0.2);
          border: 1px solid rgba(0, 255, 170, 0.5);
          color: #00ffaa;
          border-radius: 15px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
        " onclick="this.parentElement.parentElement.style.display='none'">
          Got it
        </button>
      </div>
    `;
    return helper;
  }
}
EOF

# UPDATE MAIN.TS TO INCLUDE THE SCREEN SHARING HELPER
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.ts';
import { AudioSetupUI } from './audio-setup-ui.ts';
import { ScreenSharingHelper } from './screen-sharing-helper.ts';

class QuantumSynth {
  private visualizer: Visualizer | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSetupUI: AudioSetupUI | null = null;
  private screenHelper: ScreenSharingHelper;

  constructor() {
    console.log('QuantumSynth constructor called');
    this.screenHelper = new ScreenSharingHelper();
    
    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => this.initialize(), 100);
  }

  private async initialize() {
    try {
      this.visualizer = new Visualizer();
      console.log('Visualizer initialized successfully');
      
      // Show setup UI instead of immediately requesting permissions
      this.showSetupUI();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('Failed to initialize visualizer');
    }
  }

  private showSetupUI() {
    // Only show UI if we don't already have audio access
    if (!this.analyser) {
      this.audioSetupUI = new AudioSetupUI((stream) => {
        this.handleAudioStream(stream);
      });
      this.audioSetupUI.show();
    }
  }

  private async handleAudioStream(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      this.processAudio();
      this.showSuccess('Audio visualization active! Play some music 🎵');
      
      // Show the screen sharing helper after a brief delay
      setTimeout(() => {
        this.screenHelper.showHelper();
      }, 2000);
      
    } catch (error) {
      console.error('Audio processing failed:', error);
      this.showError('Failed to process audio stream');
      
      // Re-show the setup UI if audio processing fails
      this.showSetupUI();
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

  private showSuccess(message: string) {
    this.updateStatus(message, '#00ffaa');
  }

  private showError(message: string) {
    this.updateStatus(message, '#ff6b6b');
  }

  private updateStatus(message: string, color: string) {
    let statusElement = document.getElementById('status');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'status';
      statusElement.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid ${color}33;
      `;
      document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.color = color;
    statusElement.style.borderColor = `${color}33`;
  }
}

// Initialize only when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new QuantumSynth();
});
EOF

# COMMIT THE SCREEN SHARING HELPER
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-21T14:29:00" GIT_COMMITTER_DATE="2025-03-21T14:29:00" \
git commit -m "feat: add screen sharing helper prompt to guide users on hiding Chrome's indicator"