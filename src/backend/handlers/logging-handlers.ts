/**
 * Debug Logging IPC Handlers
 * Handles frontend logging and log file management (--dev mode only)
 */

import { logger } from '../file-logger';
import type { LogRequest } from '../../shared/logger-types';

export function createLoggingHandlers() {
  return {
    /**
     * Log a message from frontend
     */
    logMessage: async (payload: LogRequest): Promise<{ success: true }> => {
      logger.logFromFrontend(payload);
      return { success: true };
    },

    /**
     * Get log file path
     */
    getLogPath: async (): Promise<{ path: string; enabled: boolean; success: true }> => {
      return {
        path: logger.getLogFilePath(),
        enabled: logger.isEnabled(),
        success: true,
      };
    },

    /**
     * Check if debug logging is enabled
     */
    isLoggingEnabled: async (): Promise<{ enabled: boolean; success: true }> => {
      return { enabled: logger.isEnabled(), success: true };
    },
  };
}

export type LoggingHandlers = ReturnType<typeof createLoggingHandlers>;
