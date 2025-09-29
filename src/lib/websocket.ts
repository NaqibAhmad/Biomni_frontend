import { biomniAPI } from "./api";
import { WebSocketConfig, AgentQueryRequest } from "@/types/biomni";

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private messageQueue: string[] = [];

  constructor() {
    this.initializeSession();
  }

  private async initializeSession() {
    try {
      // Get available sessions and use the first one, or create a new one
      const sessionsResponse = await biomniAPI.getSessions();
      if (sessionsResponse.success && sessionsResponse.data?.sessions) {
        const sessionIds = Object.keys(sessionsResponse.data.sessions);
        if (sessionIds.length > 0) {
          this.sessionId = sessionIds[0];
          console.log("Using existing session:", this.sessionId);
        }
      }
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
  }

  public async connect(
    config: Omit<WebSocketConfig, "sessionId">
  ): Promise<WebSocket> {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }

    this.isConnecting = true;

    try {
      // If no session ID, get one from the sessions endpoint
      if (!this.sessionId) {
        await this.initializeSession();
      }

      if (!this.sessionId) {
        throw new Error("No session ID available");
      }

      const wsConfig: WebSocketConfig = {
        sessionId: this.sessionId,
        ...config,
      };

      this.ws = biomniAPI.createWebSocketConnection(wsConfig);

      this.ws.onopen = () => {
        console.log("WebSocket connected for session:", this.sessionId);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(message);
          }
        }
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        this.isConnecting = false;

        if (config.onClose) {
          config.onClose();
        }

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect(config);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnecting = false;
      };

      return this.ws;
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private async attemptReconnect(config: Omit<WebSocketConfig, "sessionId">) {
    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(async () => {
      try {
        await this.connect(config);
      } catch (error) {
        console.error("Reconnection failed:", error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectDelay *= 2; // Exponential backoff
          this.attemptReconnect(config);
        }
      }
    }, this.reconnectDelay);
  }

  public sendMessage(request: AgentQueryRequest): void {
    if (!this.ws) {
      throw new Error("WebSocket not connected");
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        message: request.prompt,
        self_critic: request.self_critic || false,
        use_tool_retriever: true,
      };
      this.ws.send(JSON.stringify(payload));
    } else if (this.ws.readyState === WebSocket.CONNECTING) {
      // Queue the message if still connecting
      const payload = {
        message: request.prompt,
        self_critic: request.self_critic || false,
        use_tool_retriever: true,
      };
      this.messageQueue.push(JSON.stringify(payload));
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public async refreshSession(): Promise<void> {
    this.sessionId = null;
    await this.initializeSession();
  }
}

// Export a singleton instance
export const websocketService = new WebSocketService();
