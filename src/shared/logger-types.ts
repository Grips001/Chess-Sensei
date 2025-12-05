/**
 * Logger Types for Chess-Sensei Debug Logging
 *
 * Shared type definitions for the logging system that writes detailed logs
 * to a file when running in --dev mode.
 *
 * @see CLAUDE.md - "Rule 7: Error handling"
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure
 */
export interface LogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Component/module name */
  component: string;
  /** Log message */
  message: string;
  /** Optional additional data (will be JSON stringified) */
  data?: unknown;
  /** Optional error stack trace */
  stack?: string;
}

/**
 * Request payload for frontend-to-backend log forwarding
 */
export interface LogRequest {
  /** Log level */
  level: LogLevel;
  /** Component name */
  component: string;
  /** Log message */
  message: string;
  /** Optional data */
  data?: unknown;
  /** Optional error stack */
  stack?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Whether logging to file is enabled */
  enabled: boolean;
  /** Minimum log level to write */
  minLevel: LogLevel;
  /** Log file path */
  logFilePath: string;
}

/**
 * Log level priority (higher = more severe)
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if a log level meets minimum threshold
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Format a log entry as a string for file output
 */
export function formatLogEntry(entry: LogEntry): string {
  const levelPadded = entry.level.toUpperCase().padEnd(5);
  const componentPadded = entry.component.padEnd(20);
  let line = `[${entry.timestamp}] ${levelPadded} [${componentPadded}] ${entry.message}`;

  if (entry.data !== undefined) {
    try {
      const dataStr = JSON.stringify(entry.data, null, 2);
      // Indent multi-line data
      const indentedData = dataStr
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n');
      line += '\n' + indentedData;
    } catch {
      line += '\n    [Data not serializable]';
    }
  }

  if (entry.stack) {
    const indentedStack = entry.stack
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n');
    line += '\n' + indentedStack;
  }

  return line;
}
