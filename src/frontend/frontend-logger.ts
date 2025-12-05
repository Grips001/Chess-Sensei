/**
 * Frontend Logger for Chess-Sensei
 *
 * Sends detailed logs to the backend file logger when running in --dev mode.
 * Also logs to the browser console for immediate debugging.
 *
 * Usage:
 *   import { frontendLogger } from './frontend-logger';
 *   frontendLogger.info('MyComponent', 'Something happened', { details: 'here' });
 *
 * @see source-docs/development.md
 */

import * as buntralino from 'buntralino-client';
import { IPC_METHODS } from '../shared/ipc-types';
import type { LogLevel, LogRequest } from '../shared/logger-types';

/**
 * Frontend Logger class
 * Sends logs to backend via IPC when enabled
 */
class FrontendLogger {
  private enabled: boolean = false;
  private initialized: boolean = false;
  private pendingLogs: LogRequest[] = [];
  private logPath: string = '';

  /**
   * Initialize the logger by checking if backend logging is enabled
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Wait for buntralino connection
      await buntralino.ready;

      // Check if logging is enabled
      const response = (await buntralino.run(IPC_METHODS.IS_LOGGING_ENABLED)) as {
        enabled: boolean;
        success: true;
      };
      this.enabled = response.enabled;

      if (this.enabled) {
        // Get log file path
        const pathResponse = (await buntralino.run(IPC_METHODS.GET_LOG_PATH)) as {
          path: string;
          enabled: boolean;
          success: true;
        };
        this.logPath = pathResponse.path;
        console.log(`[FrontendLogger] Debug logging enabled, file: ${this.logPath}`);
      }

      this.initialized = true;

      // Flush any pending logs
      if (this.pendingLogs.length > 0) {
        for (const log of this.pendingLogs) {
          this.sendToBackend(log);
        }
        this.pendingLogs = [];
      }
    } catch (error) {
      console.warn('[FrontendLogger] Failed to initialize:', error);
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  /**
   * Log a debug message
   */
  debug(component: string, message: string, data?: unknown): void {
    this.log('debug', component, message, data);
  }

  /**
   * Log an info message
   */
  info(component: string, message: string, data?: unknown): void {
    this.log('info', component, message, data);
  }

  /**
   * Log a warning message
   */
  warn(component: string, message: string, data?: unknown): void {
    this.log('warn', component, message, data);
  }

  /**
   * Log an error message
   */
  error(component: string, message: string, error?: Error | unknown, data?: unknown): void {
    let stack: string | undefined;
    let errorData = data;

    if (error instanceof Error) {
      stack = error.stack;
      errorData = {
        ...((data as object) || {}),
        errorMessage: error.message,
        errorName: error.name,
      };
    } else if (error !== undefined) {
      errorData = {
        ...((data as object) || {}),
        error,
      };
    }

    this.log('error', component, message, errorData, stack);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: unknown,
    stack?: string
  ): void {
    // Always log to console
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    const prefix = `[${level.toUpperCase()}] [${component}]`;
    if (data !== undefined) {
      console[consoleMethod](prefix, message, data);
    } else {
      console[consoleMethod](prefix, message);
    }

    // Send to backend if enabled
    const logRequest: LogRequest = {
      level,
      component,
      message,
      data,
      stack,
    };

    if (!this.initialized) {
      // Queue logs until initialized
      this.pendingLogs.push(logRequest);
    } else if (this.enabled) {
      this.sendToBackend(logRequest);
    }
  }

  /**
   * Send log to backend via IPC
   */
  private sendToBackend(log: LogRequest): void {
    // Fire and forget - don't await to avoid blocking
    buntralino.run(IPC_METHODS.LOG_MESSAGE, log).catch((err) => {
      console.warn('[FrontendLogger] Failed to send log to backend:', err);
    });
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the log file path
   */
  getLogPath(): string {
    return this.logPath;
  }

  /**
   * Log a separator line (useful for marking sections)
   */
  separator(component: string, title?: string): void {
    const line = title
      ? `========== ${title} ==========`
      : '----------------------------------------';
    this.info(component, line);
  }

  /**
   * Log function entry with parameters
   */
  enter(component: string, functionName: string, params?: Record<string, unknown>): void {
    this.debug(component, `>> ${functionName}()`, params);
  }

  /**
   * Log function exit with result
   */
  exit(component: string, functionName: string, result?: unknown): void {
    this.debug(component, `<< ${functionName}()`, result !== undefined ? { result } : undefined);
  }

  /**
   * Log an IPC call
   */
  ipc(component: string, method: string, request?: unknown): void {
    this.debug(component, `IPC: ${method}`, request);
  }

  /**
   * Log an IPC response
   */
  ipcResponse(component: string, method: string, response: unknown): void {
    this.debug(component, `IPC Response: ${method}`, response);
  }

  /**
   * Log a state change
   */
  stateChange(component: string, stateName: string, oldValue: unknown, newValue: unknown): void {
    this.debug(component, `State: ${stateName}`, { from: oldValue, to: newValue });
  }

  /**
   * Log a user action
   */
  userAction(component: string, action: string, details?: unknown): void {
    this.info(component, `User: ${action}`, details);
  }
}

// Singleton instance
export const frontendLogger = new FrontendLogger();

// Export class for testing
export { FrontendLogger };
