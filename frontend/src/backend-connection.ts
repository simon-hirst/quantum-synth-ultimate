// frontend/src/backend-connection.ts
import { wsUrl } from "./backend-config";

export class BackendConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const url = wsUrl("/ws", import.meta.env.VITE_BACKEND_BASE);
    console.log("Connecting to:", url);

    this.ws = new WebSocket(url); // <-- assign to this.ws

    this.ws.onopen = () => {
      console.log("✅ Connected to AI backend via", url.startsWith("wss:") ? "wss" : "ws");
      this.reconnectAttempts = 0;
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.handleReconnect();
    };

    return this.ws;
  }

  // ...rest unchanged...
}
