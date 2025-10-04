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
  console.log("Connected to AI Visual Processor");
  // Do NOT auto-start capture here. We'll start it from a user gesture (buttons in UI).
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
