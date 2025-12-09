/**
 * WebSocket IPC Client
 *
 * Direct WebSocket connection to the Bun backend on port 9339.
 * Handles both RPC-style method calls and real-time pub/sub subscriptions.
 *
 * Features:
 * - Promise-based RPC calls for backend method invocation
 * - Channel-based pub/sub for real-time updates (engine, progress, sync)
 * - Automatic reconnection with exponential backoff
 * - Request ID tracking for async operations
 * - TypeScript types for all operations
 */

/**
 * RPC request message format
 */
interface RPCRequest {
  type: 'call';
  method: string;
  payload: unknown;
  requestId: string;
}

/**
 * RPC response message format
 */
interface RPCResponse {
  type: 'response';
  success: boolean;
  data?: unknown;
  error?: string;
  requestId: string;
}

/**
 * Subscription message format
 */
interface SubscriptionMessage {
  channel: string;
  data: unknown;
  timestamp: number;
}

/**
 * Subscription callback type
 */
type SubscriptionCallback = (data: unknown) => void;

/**
 * Pending RPC call tracker
 */
interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket IPC Client Configuration
 */
interface WebSocketIPCClientConfig {
  /** WebSocket server URL */
  url: string;
  /** Automatic reconnection enabled */
  autoReconnect?: boolean;
  /** Initial reconnection delay (ms) */
  reconnectDelay?: number;
  /** Maximum reconnection delay (ms) */
  maxReconnectDelay?: number;
  /** RPC call timeout (ms) */
  callTimeout?: number;
  /** Debug logging enabled */
  debug?: boolean;
}

/**
 * WebSocket IPC Client
 *
 * Main IPC client for frontend-backend communication via WebSocket (port 9339).
 *
 * Usage:
 * ```typescript
 * const ipc = new WebSocketIPCClient({ url: 'ws://localhost:9339/ws' });
 * await ipc.connect();
 *
 * // RPC call
 * const result = await ipc.call('chess:startNewGame', { mode: 'training' });
 *
 * // Subscribe to real-time updates
 * ipc.subscribe('engine:analysis', (data) => {
 *   console.log('Engine update:', data);
 * });
 * ```
 */
export class WebSocketIPCClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketIPCClientConfig>;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // RPC tracking
  private pendingCalls: Map<string, PendingCall> = new Map();
  private requestCounter = 0;

  // Pub/sub tracking
  private subscriptions: Map<string, Set<SubscriptionCallback>> = new Map();

  constructor(config: WebSocketIPCClientConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      callTimeout: config.callTimeout ?? 30000,
      debug: config.debug ?? false,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      if (this.config.debug) {
        console.log('[IPC] Already connected');
      }
      return;
    }

    if (this.isConnecting) {
      if (this.config.debug) {
        console.log('[IPC] Connection already in progress');
      }
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          if (this.config.debug) {
            console.log('[IPC] Connected to', this.config.url);
          }

          // Resubscribe to all channels
          this.resubscribeAll();

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[IPC] WebSocket error:', error);
          this.isConnecting = false;
          reject(new Error('WebSocket connection failed'));
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;

    // Reject all pending calls
    for (const [requestId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WebSocket disconnected'));
      this.pendingCalls.delete(requestId);
    }

    if (this.config.debug) {
      console.log('[IPC] Disconnected');
    }
  }

  /**
   * Make an RPC call to the backend
   */
  async call<T = unknown>(method: string, payload?: unknown): Promise<T> {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Set timeout for the call
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(requestId);
        reject(new Error(`RPC call timeout: ${method}`));
      }, this.config.callTimeout);

      // Store pending call - cast resolve to unknown handler since PendingCall uses unknown
      this.pendingCalls.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      // Send RPC request
      const request: RPCRequest = {
        type: 'call',
        method,
        payload: payload ?? null,
        requestId,
      };

      if (this.config.debug) {
        console.log('[IPC] Calling:', method, payload);
      }

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  subscribe(channel: string, callback: SubscriptionCallback): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(callback);

    // Send subscription request if connected
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));

      if (this.config.debug) {
        console.log('[IPC] Subscribed to:', channel);
      }
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, callback?: SubscriptionCallback): void {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) return;

    if (callback) {
      // Remove specific callback
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(channel);
      }
    } else {
      // Remove all callbacks for channel
      this.subscriptions.delete(channel);
    }

    // Send unsubscription request if connected and no more callbacks
    if (this.isConnected && this.ws && !this.subscriptions.has(channel)) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));

      if (this.config.debug) {
        console.log('[IPC] Unsubscribed from:', channel);
      }
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle RPC response
      if (message.type === 'response') {
        this.handleRPCResponse(message as RPCResponse);
      }
      // Handle connection confirmation
      else if (message.type === 'connected') {
        if (this.config.debug) {
          console.log('[IPC] Connection confirmed');
        }
      }
      // Handle subscription confirmation
      else if (message.type === 'subscribed' || message.type === 'unsubscribed') {
        if (this.config.debug) {
          console.log(`[IPC] ${message.type}:`, message.channel);
        }
      }
      // Handle pub/sub message
      else if (message.channel && message.data !== undefined) {
        this.handleSubscriptionMessage(message as SubscriptionMessage);
      }
      // Handle pong (keep-alive)
      else if (message.type === 'pong') {
        // Ignore, just for keep-alive
      }
    } catch (error) {
      console.error('[IPC] Error parsing message:', error);
    }
  }

  /**
   * Handle RPC response
   */
  private handleRPCResponse(response: RPCResponse): void {
    const pending = this.pendingCalls.get(response.requestId);
    if (!pending) {
      console.warn('[IPC] Received response for unknown request:', response.requestId);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(response.requestId);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || 'RPC call failed'));
    }
  }

  /**
   * Handle subscription message
   */
  private handleSubscriptionMessage(message: SubscriptionMessage): void {
    const callbacks = this.subscriptions.get(message.channel);
    if (!callbacks || callbacks.size === 0) return;

    for (const callback of callbacks) {
      try {
        callback(message.data);
      } catch (error) {
        console.error(`[IPC] Error in subscription callback for ${message.channel}:`, error);
      }
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.isConnected = false;

    if (this.config.debug) {
      console.log('[IPC] Disconnected from server');
    }

    // Attempt reconnection if enabled
    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    if (this.config.debug) {
      console.log(`[IPC] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('[IPC] Reconnection failed:', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeAll(): void {
    if (!this.isConnected || !this.ws) return;

    for (const channel of this.subscriptions.keys()) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }

    if (this.config.debug && this.subscriptions.size > 0) {
      console.log('[IPC] Resubscribed to', this.subscriptions.size, 'channels');
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }
}

/**
 * Create and export singleton IPC client instance
 */
export const ipc = new WebSocketIPCClient({
  url: 'ws://localhost:9339/ws',
  autoReconnect: true,
  debug: false, // Set to true for debugging
});

/**
 * Initialize IPC client (call once on app startup)
 */
export async function initializeIPC(): Promise<void> {
  try {
    await ipc.connect();
    console.log('[IPC] Client initialized successfully');
  } catch (error) {
    console.error('[IPC] Failed to initialize client:', error);
    throw error;
  }
}

// Export types for use in other modules
export type { SubscriptionCallback };
