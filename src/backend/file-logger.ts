/**
 * File Logger for Chess-Sensei Backend
 *
 * Writes detailed logs to a file when running in --dev mode.
 * The log file is created in the executable directory.
 *
 * Usage:
 *   import { logger } from './file-logger';
 *   logger.info('MyComponent', 'Something happened', { details: 'here' });
 *
 * @see source-docs/development.md
 */

import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { LogLevel, LogEntry, LoggerConfig, LogRequest } from '../shared/logger-types';
import { shouldLog, formatLogEntry } from '../shared/logger-types';

/**
 * File Logger class for backend logging
 */
class FileLogger {
  private config: LoggerConfig;
  private writeQueue: string[] = [];
  private isWriting = false;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.config = {
      enabled: false,
      minLevel: 'debug',
      logFilePath: '',
    };
  }

  /**
   * Initialize the logger with dev mode flag
   * @param devMode Whether --dev flag was passed
   * @param executablePath Path to the executable (for log file location)
   */
  async initialize(devMode: boolean, executablePath?: string): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize(devMode, executablePath);
    return this.initPromise;
  }

  private async _doInitialize(devMode: boolean, executablePath?: string): Promise<void> {
    this.config.enabled = devMode;

    if (!devMode) {
      this.initialized = true;
      return;
    }

    // Determine log file path
    let logDir: string;

    if (executablePath) {
      // Production: use executable directory
      logDir = dirname(executablePath);
    } else {
      // Development: use project root
      logDir = process.cwd();
    }

    // Create logs directory
    const logsDir = join(logDir, 'logs');
    try {
      await mkdir(logsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.config.logFilePath = join(logsDir, `chess-sensei-${timestamp}.log`);

    // Write header to log file
    const header = [
      '================================================================================',
      `Chess-Sensei Debug Log`,
      `Started: ${new Date().toISOString()}`,
      `Platform: ${process.platform}`,
      `Node/Bun Version: ${process.version}`,
      `Executable: ${executablePath || 'development mode'}`,
      `Working Directory: ${process.cwd()}`,
      '================================================================================',
      '',
    ].join('\n');

    await writeFile(this.config.logFilePath, header, 'utf-8');

    this.initialized = true;
    console.log(`[FileLogger] Logging to: ${this.config.logFilePath}`);
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
   * Log a message from the frontend (forwarded via IPC)
   */
  logFromFrontend(request: LogRequest): void {
    this.log(
      request.level,
      `FE:${request.component}`,
      request.message,
      request.data,
      request.stack
    );
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
    // Always log to console in dev mode
    if (this.config.enabled) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      const prefix = `[${level.toUpperCase()}] [${component}]`;
      if (data !== undefined) {
        console[consoleMethod](prefix, message, data);
      } else {
        console[consoleMethod](prefix, message);
      }
    }

    // Check if we should log to file
    if (!this.config.enabled || !shouldLog(level, this.config.minLevel)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      stack,
    };

    const formatted = formatLogEntry(entry);
    this.queueWrite(formatted);
  }

  /**
   * Queue a write operation (batches writes for performance)
   */
  private queueWrite(line: string): void {
    this.writeQueue.push(line);
    this.processQueue();
  }

  /**
   * Process the write queue
   */
  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0 || !this.initialized) {
      return;
    }

    this.isWriting = true;

    try {
      // Grab all queued lines
      const lines = this.writeQueue.splice(0, this.writeQueue.length);
      const content = lines.join('\n') + '\n';

      await appendFile(this.config.logFilePath, content, 'utf-8');
    } catch (err) {
      console.error('[FileLogger] Failed to write to log file:', err);
    } finally {
      this.isWriting = false;

      // Check if more items were queued while writing
      if (this.writeQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string {
    return this.config.logFilePath;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Flush any pending writes (call before exit)
   */
  async flush(): Promise<void> {
    // Wait for any pending writes
    while (this.isWriting || this.writeQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Write a separator line (useful for marking sections)
   */
  separator(component: string, title?: string): void {
    if (!this.config.enabled) return;

    const line = title ? `\n${'='.repeat(80)}\n${title}\n${'='.repeat(80)}` : `\n${'-'.repeat(80)}`;

    this.queueWrite(`[${new Date().toISOString()}] ----- [${component.padEnd(20)}] ${line}`);
  }
}

// Singleton instance
export const logger = new FileLogger();

// Export class for testing
export { FileLogger };
