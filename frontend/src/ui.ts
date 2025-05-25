export class QuantumSynthUI {
    private container: HTMLDivElement;
    private statusElement: HTMLDivElement;
    private controlsElement: HTMLDivElement;

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

        this.statusElement = document.createElement('div');
        this.statusElement.innerHTML = `
            <h2 style="margin: 0 0 10px 0;">QuantumSynth Neural Edition</h2>
            <div id="status">Connecting to audio source...</div>
            <div id="connection">WebSocket: Disconnected</div>
            <div id="fps">FPS: 0</div>
        `;

        this.controlsElement = document.createElement('div');
        this.controlsElement.style.marginTop = '15px';
        this.controlsElement.innerHTML = `
            <button id="connectBtn" style="padding: 8px 16px; margin-right: 10px; background: #4ecdc4; border: none; border-radius: 5px; color: white; cursor: pointer;">
                Reconnect
            </button>
            <button id="demoBtn" style="padding: 8px 16px; background: #ff6b6b; border: none; border-radius: 5px; color: white; cursor: pointer;">
                Demo Mode
            </button>
        `;

        this.container.appendChild(this.statusElement);
        this.container.appendChild(this.controlsElement);
        document.body.appendChild(this.container);

        this.setupEventListeners();
    }

    private setupEventListeners() {
        document.getElementById('connectBtn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('reconnect'));
        });

        document.getElementById('demoBtn')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('demoMode'));
        });
    }

    updateStatus(status: string) {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = status;
    }

    updateConnectionStatus(connected: boolean) {
        const connectionEl = document.getElementById('connection');
        if (connectionEl) connectionEl.textContent = `WebSocket: ${connected ? 'Connected' : 'Disconnected'}`;
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
}
