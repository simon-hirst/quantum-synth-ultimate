export class BackendConnection {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(private url: string) {}

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${this.url}/ws`;
        
        console.log('Connecting to:', wsUrl);
        this.ws = new WebSocket(`${(window.location.protocol === 'https:' ? 'wss:' : 'ws:')}//${this.url}/ws`);
        
        this.ws.onopen = () => {
            console.log('✅ Connected to AI backend via', protocol);
            this.reconnectAttempts = 0;
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.handleReconnect();
        };

        return this.ws;
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
    }

    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    close() {
        this.ws?.close();
    }
}


export const backendConnection = new BackendConnection(
  (import.meta as any).env?.VITE_BACKEND_HOST || window.location.host
);