export class QuantumSynthUI {
    private container: HTMLDivElement;
    private statusElement: HTMLDivElement;
    private controlsElement: HTMLDivElement;
    private screenshareBtn: HTMLButtonElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.container.style.zIndex = '1000';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.color = 'white';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.padding = '15px';
        this.container.style.borderRadius = '10px';
        this.container.style.backdropFilter = 'blur(10px)';
        this.container.style.maxWidth = '300px';

        this.statusElement = document.createElement('div');
        this.statusElement.innerHTML = `
            <h2 style="margin: 0 0 10px 0;">QuantumSynth Neural Edition</h2>
            <div id="status">Ready to start screen sharing</div>
            <div id="connection">Status: Waiting for user action</div>
            <div id="fps">FPS: 0</div>
            <div style="margin-top: 10px; font-size: 12px; color: #ccc;">
                <p>For best results:</p>
                <ul style="margin: 5px 0; padding-left: 15px;">
                    <li>Share your entire screen</li>
                    <li>Enable "Share audio" option</li>
                    <li>Use Chrome or Edge for best compatibility</li>
                </ul>
            </div>
        `;

        this.controlsElement = document.createElement('div');
        this.controlsElement.style.marginTop = '15px';
        this.controlsElement.innerHTML = `
            <button id="screenshareBtn" style="padding: 10px 16px; margin-right: 10px; background: #4ecdc4; border: none; border-radius: 5px; color: white; cursor: pointer; font-weight: bold;">
                Start Screen Sharing
            </button>
            <button id="demoBtn" style="padding: 8px 16px; background: #ff6b6b; border: none; border-radius: 5px; color: white; cursor: pointer;">
                Demo Mode
            </button>
        `;

        this.container.appendChild(this.statusElement);
        this.container.appendChild(this.controlsElement);
        document.body.appendChild(this.container);

        this.screenshareBtn = document.getElementById('screenshareBtn') as HTMLButtonElement;
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.screenshareBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('startScreenshare'));
        });

        document.getElementById('demoBtn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('demoMode'));
        });
    }

    updateStatus(status: string) {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = status;
    }

    updateConnectionStatus(connected: boolean, message?: string) {
        const connectionEl = document.getElementById('connection');
        if (connectionEl) {
            connectionEl.textContent = message || `Status: ${connected ? 'Connected' : 'Disconnected'}`;
        }
    }

    updateFPS(fps: number) {
        const fpsEl = document.getElementById('fps');
        if (fpsEl) fpsEl.textContent = `FPS: ${fps.toFixed(1)}`;
    }

    showNotification(message: string, duration: number = 3000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1001';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, duration);
    }

    setScreenshareButtonEnabled(enabled: boolean) {
        this.screenshareBtn.disabled = !enabled;
        this.screenshareBtn.style.opacity = enabled ? '1' : '0.5';
        this.screenshareBtn.textContent = enabled ? 'Start Screen Sharing' : 'Sharing...';
    }
}
