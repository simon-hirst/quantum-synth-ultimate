export class AudioSetupUI {
  private overlay: HTMLDivElement;
  private onSetupComplete: (stream: MediaStream) => void;

  constructor(onSetupComplete: (stream: MediaStream) => void) {
    this.onSetupComplete = onSetupComplete;
    this.overlay = this.createOverlay();
  }

  show() {
    document.body.appendChild(this.overlay);
  }

  hide() {
    if (this.overlay.parentElement) {
      document.body.removeChild(this.overlay);
    }
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
      ">
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 40px;
          border-radius: 20px;
          max-width: 600px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid #00ffaa33;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">🎵</div>
          <h2 style="margin: 0 0 16px 0; font-size: 28px; color: #00ffaa;">
            Enable Audio Visualization
          </h2>
          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #cccccc;">
            To visualize your system audio, we need to capture your screen with audio. 
            <strong>Please read the instructions below before proceeding.</strong>
          </p>
          
          <div style="
            background: rgba(0, 255, 170, 0.1);
            padding: 20px;
            border-radius: 12px;
            margin: 24px 0;
            text-align: left;
            border-left: 4px solid #00ffaa;
          ">
            <h4 style="margin: 0 0 12px 0; color: #00ffaa;">📋 Important Instructions:</h4>
            <ol style="margin: 0; padding-left: 20px; color: #cccccc;">
              <li><strong>First, play your music</strong> (Spotify, YouTube, etc.)</li>
              <li>Click "Start Visualization" below</li>
              <li>In the browser popup, select <strong>"Entire Screen"</strong> (works best!)</li>
              <li><strong style="color: #00ffaa;">CRITICAL:</strong> Check <strong>"Share audio"</strong> ✓</li>
              <li>Click "Share"</li>
            </ol>
            
            <div style="margin-top: 16px; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
              <strong>💡 Pro Tip:</strong> For the best experience, select "Entire Screen" instead of a specific window or tab.
            </div>
          </div>

          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="startBtn" style="
              padding: 16px 32px;
              background: linear-gradient(135deg, #00ffaa 0%, #00cc88 100%);
              color: black;
              border: none;
              border-radius: 50px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(0, 255, 170, 0.3);
            ">
              🎵 Start Visualization
            </button>
            <button id="cancelBtn" style="
              padding: 16px 32px;
              background: rgba(255, 255, 255, 0.1);
              color: #cccccc;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 50px;
              font-size: 16px;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              Not Now
            </button>
          </div>

          <p style="margin: 24px 0 0 0; font-size: 14px; color: #666;">
            🔒 Your audio is processed locally and never leaves your browser
          </p>
        </div>
      </div>
    `;

    // Add event listeners
    overlay.querySelector('#startBtn')!.addEventListener('click', () => {
      this.startAudioCapture();
    });

    overlay.querySelector('#cancelBtn')!.addEventListener('click', () => {
      this.hide();
    });

    return overlay;
  }

  private async startAudioCapture() {
    try {
      this.updateButtonState('Connecting...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'never',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        } as any
      });

      this.hide();
      this.onSetupComplete(stream);

    } catch (error) {
      console.error('Audio capture failed:', error);
      this.showError('Please allow screen sharing to continue. Remember to check "Share audio"!');
      this.updateButtonState('Try Again');
    }
  }

  private updateButtonState(text: string) {
    const button = this.overlay.querySelector('#startBtn') as HTMLButtonElement;
    button.textContent = text;
    button.disabled = text === 'Connecting...';
  }

  private showError(message: string) {
    // Remove any existing error message
    const existingError = this.overlay.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      color: #ff6b6b;
      margin: 16px 0;
      padding: 12px;
      background: rgba(255, 107, 107, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(255, 107, 107, 0.3);
    `;
    errorDiv.textContent = message;
    
    const buttonContainer = this.overlay.querySelector('div > div > div:last-child');
    buttonContainer?.parentNode?.insertBefore(errorDiv, buttonContainer);
  }
}
