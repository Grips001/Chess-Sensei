/**
 * WebSocket Server for Real-Time Streaming
 *
 * Provides high-performance real-time communication between backend and frontend.
 * Uses Bun's native WebSocket implementation (7x faster than Node.js, 1M+ msgs/sec).
 *
 * Channels:
 * - engine:*    - Real-time engine analysis updates (depth, eval, PV)
 * - progress:*  - Player progress and achievement updates
 * - sync:*      - Data synchronization events
 *
 * @see source-docs/architecture.md - "WebSocket IPC Architecture"
 */

import { ServerWebSocket } from 'bun';

/**
 * WebSocket message structure for pub/sub
 */
interface WSMessage {
  channel: string;
  data: unknown;
  timestamp: number;
}

/**
 * RPC-style method call message
 */
interface RPCRequest {
  type: 'call';
  method: string;
  payload: unknown;
  requestId: string;
}

/**
 * RPC response message
 */
interface RPCResponse {
  type: 'response';
  success: boolean;
  data?: unknown;
  error?: string;
  requestId: string;
}

/**
 * Method handler function type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodHandler = (payload: any) => Promise<any>;

/**
 * Channel subscription tracker
 */
interface ChannelSubscriptions {
  [channel: string]: Set<ServerWebSocket<unknown>>;
}

/**
 * WebSocket Server Configuration
 */
interface WebSocketServerConfig {
  /** Port to listen on */
  port: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Hostname to bind to */
  hostname?: string;
}

/**
 * WebSocket Server for Real-Time Communication
 *
 * Features:
 * - Channel-based pub/sub (engine, progress, sync)
 * - Automatic connection management
 * - Broadcasting to all subscribers on a channel
 * - Zero external dependencies (uses Bun native WebSocket)
 */
export class WebSocketServer {
  private server: ReturnType<typeof Bun.serve> | null = null;
  private subscriptions: ChannelSubscriptions = {};
  private methods: Map<string, MethodHandler> = new Map();
  private config: WebSocketServerConfig;
  private isStarted = false;

  constructor(config: WebSocketServerConfig) {
    this.config = {
      hostname: '127.0.0.1',
      debug: false,
      ...config,
    };
  }

  /**
   * Register a method handler for RPC-style calls
   */
  registerMethod(name: string, handler: MethodHandler): void {
    if (this.methods.has(name)) {
      console.warn(`[WebSocket] Method '${name}' already registered, overwriting`);
    }
    this.methods.set(name, handler);
    if (this.config.debug) {
      console.log(`[WebSocket] Registered method: ${name}`);
    }
  }

  /**
   * Register multiple methods at once
   */
  registerMethodMap(methodMap: Record<string, MethodHandler>): void {
    for (const [name, handler] of Object.entries(methodMap)) {
      this.registerMethod(name, handler);
    }
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('[WebSocket] Server already started');
      return;
    }

    try {
      this.server = Bun.serve({
        hostname: this.config.hostname,
        port: this.config.port,
        websocket: {
          message: (ws, message) => this.handleMessage(ws, message),
          open: (ws) => this.handleOpen(ws),
          close: (ws) => this.handleClose(ws),
          drain: (ws) => {
            if (this.config.debug) {
              console.log('[WebSocket] Drain event:', ws.remoteAddress);
            }
          },
        },
        fetch: (req, server) => {
          // Upgrade HTTP requests to WebSocket
          const url = new URL(req.url);
          if (url.pathname === '/ws') {
            const upgraded = server.upgrade(req);
            if (upgraded) {
              return undefined; // Return undefined when upgrade succeeds
            }
            return new Response('WebSocket upgrade failed', { status: 400 });
          }

          // Health check endpoint
          if (url.pathname === '/health') {
            return new Response('OK', { status: 200 });
          }

          return new Response('Not Found', { status: 404 });
        },
      });

      this.isStarted = true;
      console.log(`[WebSocket] Server started on ${this.config.hostname}:${this.config.port}`);
    } catch (error) {
      console.error('[WebSocket] Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.server) {
      return;
    }

    try {
      this.server.stop();
      this.server = null;
      this.isStarted = false;
      this.subscriptions = {};
      console.log('[WebSocket] Server stopped');
    } catch (error) {
      console.error('[WebSocket] Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleOpen(ws: ServerWebSocket<unknown>): void {
    if (this.config.debug) {
      console.log('[WebSocket] Client connected:', ws.remoteAddress);
    }

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'WebSocket connection established',
      })
    );
  }

  /**
   * Handle WebSocket message from client
   */
  private handleMessage(ws: ServerWebSocket<unknown>, message: string | Buffer): void {
    try {
      const msg = typeof message === 'string' ? message : message.toString();
      const parsed = JSON.parse(msg);

      if (this.config.debug) {
        console.log('[WebSocket] Received message:', parsed);
      }

      // Handle RPC method calls
      if (parsed.type === 'call' && parsed.method && parsed.requestId) {
        this.handleMethodCall(ws, parsed as RPCRequest).catch((error) => {
          console.error('[WebSocket] Error handling method call:', error);
        });
      }
      // Handle subscription requests
      else if (parsed.type === 'subscribe' && parsed.channel) {
        this.subscribe(ws, parsed.channel);
      } else if (parsed.type === 'unsubscribe' && parsed.channel) {
        this.unsubscribe(ws, parsed.channel);
      } else if (parsed.type === 'ping') {
        // Respond to ping with pong
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          timestamp: Date.now(),
        })
      );
    }
  }

  /**
   * Handle RPC-style method call
   */
  private async handleMethodCall(ws: ServerWebSocket<unknown>, request: RPCRequest): Promise<void> {
    const startTime = performance.now();

    try {
      const handler = this.methods.get(request.method);

      if (!handler) {
        const response: RPCResponse = {
          type: 'response',
          success: false,
          error: `Method '${request.method}' not found`,
          requestId: request.requestId,
        };
        ws.send(JSON.stringify(response));
        return;
      }

      if (this.config.debug) {
        console.log(`[WebSocket] Calling method: ${request.method}`);
      }

      // Execute the method handler
      const result = await handler(request.payload);

      const duration = (performance.now() - startTime).toFixed(2);
      if (this.config.debug) {
        console.log(`[WebSocket] Method ${request.method} completed in ${duration}ms`);
      }

      // Send success response
      const response: RPCResponse = {
        type: 'response',
        success: true,
        data: result,
        requestId: request.requestId,
      };
      ws.send(JSON.stringify(response));
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(
        `[WebSocket] Method ${request.method} failed after ${duration}ms:`,
        errorMessage
      );

      // Send error response
      const response: RPCResponse = {
        type: 'response',
        success: false,
        error: errorMessage,
        requestId: request.requestId,
      };
      ws.send(JSON.stringify(response));
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(ws: ServerWebSocket<unknown>): void {
    if (this.config.debug) {
      console.log('[WebSocket] Client disconnected:', ws.remoteAddress);
    }

    // Remove from all subscriptions
    for (const channel in this.subscriptions) {
      this.subscriptions[channel].delete(ws);
    }
  }

  /**
   * Subscribe a client to a channel
   */
  private subscribe(ws: ServerWebSocket<unknown>, channel: string): void {
    if (!this.subscriptions[channel]) {
      this.subscriptions[channel] = new Set();
    }

    this.subscriptions[channel].add(ws);

    if (this.config.debug) {
      console.log(
        `[WebSocket] Client subscribed to channel: ${channel} (${this.subscriptions[channel].size} subscribers)`
      );
    }

    // Send subscription confirmation
    ws.send(
      JSON.stringify({
        type: 'subscribed',
        channel,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Unsubscribe a client from a channel
   */
  private unsubscribe(ws: ServerWebSocket<unknown>, channel: string): void {
    if (this.subscriptions[channel]) {
      this.subscriptions[channel].delete(ws);

      if (this.config.debug) {
        console.log(
          `[WebSocket] Client unsubscribed from channel: ${channel} (${this.subscriptions[channel].size} subscribers)`
        );
      }
    }

    // Send unsubscription confirmation
    ws.send(
      JSON.stringify({
        type: 'unsubscribed',
        channel,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Publish a message to all subscribers of a channel
   */
  publish(channel: string, data: unknown): void {
    if (!this.subscriptions[channel] || this.subscriptions[channel].size === 0) {
      if (this.config.debug) {
        console.log(`[WebSocket] No subscribers for channel: ${channel}`);
      }
      return;
    }

    const message: WSMessage = {
      channel,
      data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    let failedCount = 0;

    for (const ws of this.subscriptions[channel]) {
      try {
        ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`[WebSocket] Error sending to client:`, error);
        failedCount++;
        // Remove failed connection
        this.subscriptions[channel].delete(ws);
      }
    }

    if (this.config.debug) {
      console.log(`[WebSocket] Published to ${channel}: ${sentCount} sent, ${failedCount} failed`);
    }
  }

  /**
   * Get number of subscribers for a channel
   */
  getSubscriberCount(channel: string): number {
    return this.subscriptions[channel]?.size ?? 0;
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Object.keys(this.subscriptions).filter(
      (channel) => this.subscriptions[channel].size > 0
    );
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.isStarted;
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.config.port;
  }
}

/**
 * Create and configure WebSocket server
 */
export function createWebSocketServer(
  port: number = 9339,
  debug: boolean = false
): WebSocketServer {
  return new WebSocketServer({
    port,
    debug,
    hostname: '127.0.0.1',
  });
}

/**
 * Publish functions for specific channels
 * These are convenience wrappers for common use cases
 */

/**
 * Publish engine analysis update
 */
export function publishEngineAnalysis(
  server: WebSocketServer,
  data: {
    depth: number;
    score: number;
    pv?: string[];
    nodes?: number;
    nps?: number;
    time?: number;
  }
): void {
  server.publish('engine:analysis', data);
}

/**
 * Publish engine status update
 */
export function publishEngineStatus(
  server: WebSocketServer,
  data: {
    status: 'ready' | 'thinking' | 'stopped' | 'error';
    message?: string;
  }
): void {
  server.publish('engine:status', data);
}

/**
 * Publish player progress update
 */
export function publishProgressUpdate(
  server: WebSocketServer,
  data: {
    type: 'game-completed' | 'achievement-unlocked' | 'stat-updated';
    payload: unknown;
  }
): void {
  server.publish('progress:update', data);
}

/**
 * Publish board state synchronization
 */
export function publishBoardSync(
  server: WebSocketServer,
  data: {
    fen: string;
    lastMove?: string;
    turn: 'w' | 'b';
  }
): void {
  server.publish('sync:board', data);
}

/**
 * Publish game state synchronization
 */
export function publishGameSync(
  server: WebSocketServer,
  data: {
    gameId: string;
    state: 'playing' | 'paused' | 'completed';
    timestamp: number;
  }
): void {
  server.publish('sync:game', data);
}
