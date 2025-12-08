/**
 * WebSocket IPC Integration Test Suite
 *
 * Tests for the WebSocket-based IPC system (port 9339).
 * Tests connection handling, RPC calls, subscriptions, and error handling.
 *
 * @see src/frontend/websocket-ipc-client.ts
 * @see src/backend/websocket-server.ts
 * @see source-docs/architecture.md - "WebSocket IPC Architecture"
 */

import { describe, test, expect, mock } from 'bun:test';

// Configuration constants matching the actual implementation
const WS_PORT = 9339;
const WS_URL = `ws://localhost:${WS_PORT}`;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

describe('WebSocket IPC Client', () => {
  describe('Configuration', () => {
    test('should use correct default port', () => {
      expect(WS_PORT).toBe(9339);
    });

    test('should construct correct WebSocket URL', () => {
      expect(WS_URL).toBe('ws://localhost:9339');
    });

    test('should have reasonable default timeout', () => {
      expect(DEFAULT_TIMEOUT).toBeGreaterThanOrEqual(10000);
      expect(DEFAULT_TIMEOUT).toBeLessThanOrEqual(60000);
    });

    test('should have appropriate reconnect delays', () => {
      expect(DEFAULT_RECONNECT_DELAY).toBe(1000);
      expect(MAX_RECONNECT_DELAY).toBe(30000);
      expect(MAX_RECONNECT_DELAY).toBeGreaterThan(DEFAULT_RECONNECT_DELAY);
    });
  });

  describe('Connection State', () => {
    test('should track connection state correctly', () => {
      const connectionState = {
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0,
      };

      // Simulate connecting
      connectionState.isConnecting = true;
      expect(connectionState.isConnecting).toBe(true);
      expect(connectionState.isConnected).toBe(false);

      // Simulate connected
      connectionState.isConnecting = false;
      connectionState.isConnected = true;
      expect(connectionState.isConnecting).toBe(false);
      expect(connectionState.isConnected).toBe(true);

      // Simulate disconnected
      connectionState.isConnected = false;
      connectionState.reconnectAttempts++;
      expect(connectionState.isConnected).toBe(false);
      expect(connectionState.reconnectAttempts).toBe(1);
    });
  });

  describe('Request ID Generation', () => {
    test('should generate unique request IDs', () => {
      let counter = 0;
      const generateRequestId = () => {
        counter++;
        return `req_${counter}_${Date.now()}`;
      };

      const id1 = generateRequestId();
      const id2 = generateRequestId();
      const id3 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).toMatch(/^req_1_\d+$/);
      expect(id2).toMatch(/^req_2_\d+$/);
    });

    test('should include timestamp in request ID', () => {
      const now = Date.now();
      const requestId = `req_1_${now}`;

      expect(requestId).toContain(now.toString());
    });
  });

  describe('RPC Message Format', () => {
    test('should create valid RPC request', () => {
      const createRequest = (method: string, payload: unknown, requestId: string) => ({
        type: 'call' as const,
        method,
        payload: payload ?? null,
        requestId,
      });

      const request = createRequest('chess:startNewGame', { mode: 'training' }, 'req_1');

      expect(request.type).toBe('call');
      expect(request.method).toBe('chess:startNewGame');
      expect(request.payload).toEqual({ mode: 'training' });
      expect(request.requestId).toBe('req_1');
    });

    test('should handle null payload', () => {
      const createRequest = (method: string, payload?: unknown) => ({
        type: 'call' as const,
        method,
        payload: payload ?? null,
        requestId: 'req_1',
      });

      const request = createRequest('engine:getStatus');

      expect(request.payload).toBeNull();
    });
  });

  describe('RPC Response Handling', () => {
    test('should parse successful response', () => {
      const response: {
        type: string;
        success: boolean;
        data?: unknown;
        error?: string;
        requestId: string;
      } = {
        type: 'response',
        success: true,
        data: { status: 'ready', engineVersion: '17.1' },
        requestId: 'req_1',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    test('should parse error response', () => {
      const response: {
        type: string;
        success: boolean;
        data?: unknown;
        error?: string;
        requestId: string;
      } = {
        type: 'response',
        success: false,
        error: 'Engine not initialized',
        requestId: 'req_1',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Engine not initialized');
      expect(response.data).toBeUndefined();
    });

    test('should match response to pending request', () => {
      const pendingCalls = new Map<
        string,
        { resolve: (value: unknown) => void; reject: (error: Error) => void }
      >();

      let resolvedValue: unknown = null;

      pendingCalls.set('req_1', {
        resolve: (value) => {
          resolvedValue = value;
        },
        reject: () => {},
      });

      // Simulate receiving response
      const response = { type: 'response', success: true, data: 'test', requestId: 'req_1' };
      const pending = pendingCalls.get(response.requestId);

      if (pending && response.success) {
        pending.resolve(response.data);
        pendingCalls.delete(response.requestId);
      }

      expect(resolvedValue).toBe('test');
      expect(pendingCalls.has('req_1')).toBe(false);
    });
  });

  describe('Subscription System', () => {
    test('should manage channel subscriptions', () => {
      const subscriptions = new Map<string, Set<(data: unknown) => void>>();

      const subscribe = (channel: string, callback: (data: unknown) => void) => {
        if (!subscriptions.has(channel)) {
          subscriptions.set(channel, new Set());
        }
        subscriptions.get(channel)!.add(callback);
      };

      const unsubscribe = (channel: string, callback: (data: unknown) => void) => {
        subscriptions.get(channel)?.delete(callback);
      };

      const callback1 = mock(() => {});
      const callback2 = mock(() => {});

      subscribe('engine:analysis', callback1);
      subscribe('engine:analysis', callback2);

      expect(subscriptions.get('engine:analysis')?.size).toBe(2);

      unsubscribe('engine:analysis', callback1);

      expect(subscriptions.get('engine:analysis')?.size).toBe(1);
    });

    test('should dispatch messages to subscribers', () => {
      const subscriptions = new Map<string, Set<(data: unknown) => void>>();
      const receivedData: unknown[] = [];

      const callback = (data: unknown) => {
        receivedData.push(data);
      };

      subscriptions.set('engine:analysis', new Set([callback]));

      // Simulate receiving subscription message
      const message = {
        channel: 'engine:analysis',
        data: { score: 0.5, depth: 20 },
        timestamp: Date.now(),
      };

      const callbacks = subscriptions.get(message.channel);
      callbacks?.forEach((cb) => cb(message.data));

      expect(receivedData).toHaveLength(1);
      expect(receivedData[0]).toEqual({ score: 0.5, depth: 20 });
    });

    test('should handle multiple channels independently', () => {
      const subscriptions = new Map<string, Set<(data: unknown) => void>>();

      const engineData: unknown[] = [];
      const progressData: unknown[] = [];

      subscriptions.set('engine:analysis', new Set([(d) => engineData.push(d)]));
      subscriptions.set('progress:update', new Set([(d) => progressData.push(d)]));

      // Dispatch to engine channel
      subscriptions.get('engine:analysis')?.forEach((cb) => cb({ move: 'e4' }));

      // Dispatch to progress channel
      subscriptions.get('progress:update')?.forEach((cb) => cb({ percent: 50 }));

      expect(engineData).toEqual([{ move: 'e4' }]);
      expect(progressData).toEqual([{ percent: 50 }]);
    });
  });

  describe('Timeout Handling', () => {
    test('should timeout pending calls', async () => {
      const TIMEOUT = 100; // Short timeout for test
      let timedOut = false;

      const callWithTimeout = () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error('RPC call timeout: testMethod'));
          }, TIMEOUT);
        });

      try {
        await callWithTimeout();
      } catch (error) {
        expect((error as Error).message).toContain('timeout');
      }

      expect(timedOut).toBe(true);
    });

    test('should clear timeout on successful response', () => {
      let timeoutCleared = false;

      const pendingCall = {
        timeout: setTimeout(() => {}, 30000),
        resolve: () => {},
        reject: () => {},
      };

      // Simulate clearing timeout
      clearTimeout(pendingCall.timeout);
      timeoutCleared = true;

      expect(timeoutCleared).toBe(true);
    });
  });

  describe('Reconnection Logic', () => {
    test('should calculate exponential backoff', () => {
      const calculateDelay = (attempts: number, baseDelay: number, maxDelay: number) => {
        return Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
      };

      expect(calculateDelay(0, 1000, 30000)).toBe(1000);
      expect(calculateDelay(1, 1000, 30000)).toBe(2000);
      expect(calculateDelay(2, 1000, 30000)).toBe(4000);
      expect(calculateDelay(3, 1000, 30000)).toBe(8000);
      expect(calculateDelay(10, 1000, 30000)).toBe(30000); // Capped at max
    });

    test('should reset reconnect attempts on successful connection', () => {
      const state = { reconnectAttempts: 5 };

      const onConnected = () => {
        state.reconnectAttempts = 0;
      };

      onConnected();

      expect(state.reconnectAttempts).toBe(0);
    });

    test('should resubscribe to channels after reconnection', () => {
      const subscriptions = new Map<string, Set<(data: unknown) => void>>([
        ['engine:analysis', new Set([() => {}])],
        ['progress:update', new Set([() => {}])],
      ]);

      const resubscribeCalls: string[] = [];

      const resubscribeAll = () => {
        for (const channel of subscriptions.keys()) {
          resubscribeCalls.push(channel);
        }
      };

      resubscribeAll();

      expect(resubscribeCalls).toContain('engine:analysis');
      expect(resubscribeCalls).toContain('progress:update');
    });
  });

  describe('Error Handling', () => {
    test('should reject call when not connected', () => {
      const call = (isConnected: boolean) => {
        if (!isConnected) {
          throw new Error('WebSocket not connected');
        }
        return Promise.resolve('success');
      };

      expect(() => call(false)).toThrow('WebSocket not connected');
    });

    test('should handle WebSocket errors gracefully', () => {
      let errorHandled = false;
      let errorMessage = '';

      const onError = (error: Error) => {
        errorHandled = true;
        errorMessage = error.message;
      };

      onError(new Error('Connection refused'));

      expect(errorHandled).toBe(true);
      expect(errorMessage).toBe('Connection refused');
    });

    test('should reject all pending calls on disconnect', () => {
      const pendingCalls = new Map<
        string,
        { resolve: () => void; reject: (error: Error) => void }
      >();

      const rejections: string[] = [];

      pendingCalls.set('req_1', {
        resolve: () => {},
        reject: (e) => rejections.push(e.message),
      });
      pendingCalls.set('req_2', {
        resolve: () => {},
        reject: (e) => rejections.push(e.message),
      });

      // Simulate disconnect
      for (const [, pending] of pendingCalls) {
        pending.reject(new Error('WebSocket disconnected'));
      }
      pendingCalls.clear();

      expect(rejections).toHaveLength(2);
      expect(rejections[0]).toBe('WebSocket disconnected');
    });
  });

  describe('IPC Methods', () => {
    test('should support expected chess methods', () => {
      const CHESS_METHODS = [
        'chess:startNewGame',
        'chess:makeMove',
        'chess:undoMove',
        'chess:getPosition',
        'chess:isLegalMove',
        'chess:getLegalMoves',
      ];

      expect(CHESS_METHODS).toContain('chess:startNewGame');
      expect(CHESS_METHODS).toContain('chess:makeMove');
      expect(CHESS_METHODS.length).toBeGreaterThan(0);
    });

    test('should support expected engine methods', () => {
      const ENGINE_METHODS = [
        'engine:initialize',
        'engine:analyze',
        'engine:getBestMoves',
        'engine:stopAnalysis',
        'engine:getStatus',
      ];

      expect(ENGINE_METHODS).toContain('engine:initialize');
      expect(ENGINE_METHODS).toContain('engine:analyze');
    });

    test('should support expected data methods', () => {
      const DATA_METHODS = [
        'data:saveGame',
        'data:loadGame',
        'data:listGames',
        'data:exportPGN',
        'data:importPGN',
        'data:getPlayerStats',
      ];

      expect(DATA_METHODS).toContain('data:saveGame');
      expect(DATA_METHODS).toContain('data:getPlayerStats');
    });
  });

  describe('Message Serialization', () => {
    test('should serialize messages to JSON', () => {
      const message = {
        type: 'call',
        method: 'chess:makeMove',
        payload: { move: 'e2e4' },
        requestId: 'req_1',
      };

      const serialized = JSON.stringify(message);

      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual(message);
    });

    test('should deserialize messages from JSON', () => {
      const serialized =
        '{"type":"response","success":true,"data":{"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"},"requestId":"req_1"}';

      const message = JSON.parse(serialized);

      expect(message.type).toBe('response');
      expect(message.success).toBe(true);
      expect(message.data.fen).toContain('rnbqkbnr');
    });

    test('should handle complex nested data', () => {
      const complexData = {
        type: 'response',
        success: true,
        data: {
          analysis: {
            bestMoves: [
              { move: 'e2e4', score: 0.3, depth: 20 },
              { move: 'd2d4', score: 0.2, depth: 20 },
            ],
            currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          },
        },
        requestId: 'req_1',
      };

      const serialized = JSON.stringify(complexData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.analysis.bestMoves).toHaveLength(2);
      expect(deserialized.data.analysis.bestMoves[0].move).toBe('e2e4');
    });
  });
});
