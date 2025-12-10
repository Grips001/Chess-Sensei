/**
 * Error Response Helper
 *
 * Centralizes error response creation for consistent IPC error handling.
 * Reduces code duplication across 27+ error handling blocks.
 */

/**
 * Standard error response interface for IPC operations
 */
export interface ErrorResponse {
  /** Human-readable error message */
  error: string;
  /** Error code for programmatic handling */
  code: string;
  /** Always false for error responses */
  success: false;
}

/**
 * Error codes used across the application
 */
export const ErrorCodes = {
  // Engine errors
  ENGINE_NOT_INITIALIZED: 'ENGINE_NOT_INITIALIZED',
  NEW_GAME_ERROR: 'NEW_GAME_ERROR',
  BEST_MOVES_ERROR: 'BEST_MOVES_ERROR',
  EVALUATION_ERROR: 'EVALUATION_ERROR',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  GUIDANCE_ERROR: 'GUIDANCE_ERROR',
  SKILL_LEVEL_ERROR: 'SKILL_LEVEL_ERROR',
  VALIDATE_MOVE_ERROR: 'VALIDATE_MOVE_ERROR',
  LEGAL_MOVES_ERROR: 'LEGAL_MOVES_ERROR',

  // Bot errors
  BOT_NOT_CONFIGURED: 'BOT_NOT_CONFIGURED',
  BOT_CONFIG_ERROR: 'BOT_CONFIG_ERROR',
  CONFIGURE_BOT_ERROR: 'CONFIGURE_BOT_ERROR',
  BOT_MOVE_ERROR: 'BOT_MOVE_ERROR',

  // Analysis errors
  GAME_ANALYSIS_ERROR: 'GAME_ANALYSIS_ERROR',
  METRICS_ERROR: 'METRICS_ERROR',
  ANALYSIS_CONFIG_ERROR: 'ANALYSIS_CONFIG_ERROR',

  // Storage errors
  STORAGE_INIT_ERROR: 'STORAGE_INIT_ERROR',
  SAVE_GAME_ERROR: 'SAVE_GAME_ERROR',
  LOAD_GAME_ERROR: 'LOAD_GAME_ERROR',
  DELETE_GAME_ERROR: 'DELETE_GAME_ERROR',
  GET_GAMES_ERROR: 'GET_GAMES_ERROR',
  GAMES_LIST_ERROR: 'GAMES_LIST_ERROR',
  SAVE_ANALYSIS_ERROR: 'SAVE_ANALYSIS_ERROR',
  LOAD_ANALYSIS_ERROR: 'LOAD_ANALYSIS_ERROR',
  STORAGE_PATH_ERROR: 'STORAGE_PATH_ERROR',

  // Not found errors
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  ANALYSIS_NOT_FOUND: 'ANALYSIS_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',

  // Profile errors
  LOAD_PROFILE_ERROR: 'LOAD_PROFILE_ERROR',
  SAVE_PROFILE_ERROR: 'SAVE_PROFILE_ERROR',
  LOAD_ACHIEVEMENTS_ERROR: 'LOAD_ACHIEVEMENTS_ERROR',
  ACHIEVEMENTS_ERROR: 'ACHIEVEMENTS_ERROR',
  UNLOCK_ACHIEVEMENT_ERROR: 'UNLOCK_ACHIEVEMENT_ERROR',
  INVALID_PROFILE: 'INVALID_PROFILE',
  MERGE_ERROR: 'MERGE_ERROR',

  // Export/Import errors
  EXPORT_ERROR: 'EXPORT_ERROR',
  EXPORT_ALL_ERROR: 'EXPORT_ALL_ERROR',
  EXPORT_PROFILE_ERROR: 'EXPORT_PROFILE_ERROR',
  IMPORT_ERROR: 'IMPORT_ERROR',
  BATCH_IMPORT_ERROR: 'BATCH_IMPORT_ERROR',
  MERGE_PROFILES_ERROR: 'MERGE_PROFILES_ERROR',

  // Backup errors
  BACKUP_ERROR: 'BACKUP_ERROR',
  BACKUP_SETTINGS_ERROR: 'BACKUP_SETTINGS_ERROR',
  BACKUP_CREATE_ERROR: 'BACKUP_CREATE_ERROR',
  BACKUP_VERIFY_ERROR: 'BACKUP_VERIFY_ERROR',
  BACKUP_LIST_ERROR: 'BACKUP_LIST_ERROR',
  BACKUP_EXPORT_ERROR: 'BACKUP_EXPORT_ERROR',
  BACKUP_IMPORT_ERROR: 'BACKUP_IMPORT_ERROR',

  // Logging errors
  LOG_ERROR: 'LOG_ERROR',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Creates a standardized error response for IPC operations.
 *
 * @param error - The caught error (can be Error instance or unknown)
 * @param code - Error code from ErrorCodes constant
 * @returns Standardized ErrorResponse object
 *
 * @example
 * ```typescript
 * catch (error) {
 *   return createErrorResponse(error, ErrorCodes.SAVE_GAME_ERROR);
 * }
 * ```
 */
export function createErrorResponse(error: unknown, code: ErrorCode): ErrorResponse {
  return {
    error: error instanceof Error ? error.message : 'Unknown error',
    code,
    success: false,
  };
}

/**
 * Creates an error response with a custom message.
 *
 * @param message - Custom error message
 * @param code - Error code from ErrorCodes constant
 * @returns Standardized ErrorResponse object
 *
 * @example
 * ```typescript
 * if (!dataStorage) {
 *   return createErrorResponseWithMessage('Data storage not initialized', ErrorCodes.STORAGE_PATH_ERROR);
 * }
 * ```
 */
export function createErrorResponseWithMessage(message: string, code: ErrorCode): ErrorResponse {
  return {
    error: message,
    code,
    success: false,
  };
}
