/**
 * IPC Types for Frontend-Backend Communication
 *
 * Shared type definitions for WebSocket IPC calls (port 9339).
 * These types are used by both frontend and backend.
 */

import type { BestMove, PositionEvaluation, MoveAnalysis } from './engine-types';
import type { BotProfile, BotPersonality, AIPlayMode, DifficultyPreset } from './bot-types';

// Re-export engine types for convenience
export type { BestMove, PositionEvaluation, MoveAnalysis };
export {
  MoveClassification,
  MOVE_THRESHOLDS,
  CLASSIFICATION_ACCURACY,
  formatScore,
  classifyMove,
  STARTPOS_FEN,
} from './engine-types';

// Re-export bot types for convenience
export type { BotProfile, BotPersonality, AIPlayMode, DifficultyPreset };

/**
 * Request payload for position-based operations
 * Per Task 1.4.2: Define structured JSON payloads
 */
export interface PositionRequest {
  /** Position in FEN notation */
  fen: string;
  /** Optional moves from FEN position (UCI format) */
  moves?: string[];
  /** Search depth (plies) */
  depth?: number;
  /** Search time in milliseconds */
  movetime?: number;
  /** Number of moves to return (MultiPV) */
  count?: number;
}

/**
 * Request payload for move analysis
 */
export interface AnalyzeMoveRequest {
  /** Position FEN before the move */
  fen: string;
  /** The move that was played (UCI format) */
  playedMove: string;
  /** Analysis depth */
  depth?: number;
}

/**
 * Response payload for best moves
 */
export interface BestMovesResponse {
  /** Array of best moves with evaluations */
  moves: BestMove[];
  /** Success flag */
  success: true;
}

/**
 * Response payload for position evaluation
 */
export interface EvaluationResponse {
  /** Full position evaluation */
  evaluation: PositionEvaluation;
  /** Formatted score string (e.g., "+1.5", "M3") */
  formattedScore: string;
  /** Success flag */
  success: true;
}

/**
 * Response payload for move analysis
 */
export interface MoveAnalysisResponse {
  /** Move analysis result */
  analysis: MoveAnalysis;
  /** Success flag */
  success: true;
}

/**
 * Error response payload
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code for programmatic handling */
  code: string;
  /** Success flag */
  success: false;
}

/**
 * Generic success response
 */
export interface SuccessResponse {
  /** Success flag */
  success: true;
}

/**
 * Engine status response
 */
export interface EngineStatusResponse {
  /** Whether the engine is initialized */
  initialized: boolean;
  /** Success flag */
  success: true;
}

/**
 * Request payload for configuring bot opponent
 * Per Task 3.1: AI Opponent implementation
 */
export interface ConfigureBotRequest {
  /** Bot personality (sensei, student, club_player, tactician, blunder_prone) */
  personality?: BotPersonality;
  /** Target Elo rating (800-2400) - overrides personality's default */
  targetElo?: number;
  /** Difficulty preset (beginner, intermediate, advanced, master) */
  difficultyPreset?: DifficultyPreset;
  /** AI play mode (training or punishing) */
  playMode?: AIPlayMode;
  /** Whether to use response time delays for human-like play */
  useTimeDelays?: boolean;
}

/**
 * Request payload for bot move selection
 */
export interface BotMoveRequest {
  /** Position in FEN notation */
  fen: string;
  /** Optional moves from FEN position (UCI format) */
  moves?: string[];
}

/**
 * Response payload for bot move
 */
export interface BotMoveResponse {
  /** Selected move in UCI format */
  move: string;
  /** Engine evaluation of the move */
  score: number;
  /** Thinking time to display (ms) */
  thinkingTime: number;
  /** Whether the move was intentionally weakened */
  wasWeakened: boolean;
  /** Classification of the move */
  classification: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  /** Success flag */
  success: true;
}

/**
 * Response payload for bot profiles list
 */
export interface BotProfilesResponse {
  /** Available bot profiles */
  profiles: BotProfile[];
  /** Success flag */
  success: true;
}

/**
 * Response payload for current bot config
 */
export interface BotConfigResponse {
  /** Current bot profile */
  profile: BotProfile | null;
  /** Current play mode */
  playMode: AIPlayMode | null;
  /** Whether time delays are enabled */
  useTimeDelays: boolean;
  /** Success flag */
  success: true;
}

/**
 * IPC Method Names
 * All available backend methods that can be called via ipc.call()
 * All methods are prefixed with 'chess:' namespace for consistency
 */
export const IPC_METHODS = {
  /** Health check method */
  SAY_HELLO: 'chess:sayHello',
  /** Start a new game (clears engine state) */
  START_NEW_GAME: 'chess:startNewGame',
  /** Get best move recommendations */
  REQUEST_BEST_MOVES: 'chess:requestBestMoves',
  /** Evaluate a position */
  EVALUATE_POSITION: 'chess:evaluatePosition',
  /** Analyze a played move (CPL, classification) */
  ANALYZE_MOVE: 'chess:analyzeMove',
  /** Get top 3 guidance moves for Training Mode */
  GET_GUIDANCE_MOVES: 'chess:getGuidanceMoves',
  /** Set engine skill level (0-20) */
  SET_SKILL_LEVEL: 'chess:setSkillLevel',
  /** Get engine initialization status */
  GET_ENGINE_STATUS: 'chess:getEngineStatus',

  // Phase 3: AI Opponent Methods
  /** Configure bot opponent personality, difficulty, and play mode */
  CONFIGURE_BOT: 'chess:configureBot',
  /** Get move from AI opponent */
  GET_BOT_MOVE: 'chess:getBotMove',
  /** Get all available bot personalities */
  GET_BOT_PROFILES: 'chess:getBotProfiles',
  /** Get current bot configuration */
  GET_CURRENT_BOT_CONFIG: 'chess:getCurrentBotConfig',
  /** Get difficulty presets */
  GET_DIFFICULTY_PRESETS: 'chess:getDifficultyPresets',

  // Phase 4: Analysis Pipeline Methods
  /** Analyze an Exam Mode game (batch analysis, CPL, classification) */
  ANALYZE_GAME: 'chess:analyzeGame',
  /** Get analysis depth configuration */
  GET_ANALYSIS_CONFIG: 'chess:getAnalysisConfig',
  /** Calculate metrics from game analysis (9 composite scores) */
  CALCULATE_METRICS: 'chess:calculateMetrics',

  // Phase 4: Data Storage Methods
  /** Initialize data storage directory structure */
  INITIALIZE_STORAGE: 'chess:initializeStorage',
  /** Save game data to local storage */
  SAVE_GAME: 'chess:saveGame',
  /** Save analysis data to local storage */
  SAVE_ANALYSIS: 'chess:saveAnalysis',
  /** Get list of saved games */
  GET_GAMES_LIST: 'chess:getGamesList',
  /** Load a saved game by ID */
  LOAD_GAME: 'chess:loadGame',
  /** Load analysis for a game by ID */
  LOAD_ANALYSIS: 'chess:loadAnalysis',
  /** Get the storage base path */
  GET_STORAGE_PATH: 'chess:getStoragePath',

  // Phase 6: Player Progress Methods
  /** Load player profile with aggregated metrics */
  LOAD_PLAYER_PROFILE: 'chess:loadPlayerProfile',
  /** Save updated player profile */
  SAVE_PLAYER_PROFILE: 'chess:savePlayerProfile',
  /** Get achievement list with unlock status */
  GET_ACHIEVEMENTS: 'chess:getAchievements',
  /** Unlock an achievement */
  UNLOCK_ACHIEVEMENT: 'chess:unlockAchievement',

  // Phase 8: Export/Import Methods
  /** Export a single game to PGN */
  EXPORT_GAME: 'chess:exportGame',
  /** Export all games to a zip file */
  EXPORT_ALL_GAMES: 'chess:exportAllGames',
  /** Export player profile */
  EXPORT_PROFILE: 'chess:exportProfile',
  /** Export full backup */
  EXPORT_BACKUP: 'chess:exportBackup',
  /** Import a single game */
  IMPORT_GAME: 'chess:importGame',
  /** Import multiple games */
  IMPORT_BATCH_GAMES: 'chess:importBatchGames',
  /** Merge profiles */
  MERGE_PROFILES: 'chess:mergeProfiles',
  /** Get exports path */
  GET_EXPORTS_PATH: 'chess:getExportsPath',

  // Phase 8: Backup Methods
  /** Get backup settings */
  GET_BACKUP_SETTINGS: 'chess:getBackupSettings',
  /** Save backup settings */
  SAVE_BACKUP_SETTINGS: 'chess:saveBackupSettings',
  /** Check if backup is needed */
  CHECK_BACKUP_NEEDED: 'chess:checkBackupNeeded',
  /** Create automatic backup */
  CREATE_AUTOMATIC_BACKUP: 'chess:createAutomaticBackup',
  /** List backups */
  LIST_BACKUPS: 'chess:listBackups',
  /** Verify backup integrity */
  VERIFY_BACKUP: 'chess:verifyBackup',
  /** Get backups path */
  GET_BACKUPS_PATH: 'chess:getBackupsPath',

  // Debug Logging Methods (--dev mode only)
  /** Log a message from frontend to backend file logger */
  LOG_MESSAGE: 'chess:logMessage',
  /** Get log file path */
  GET_LOG_PATH: 'chess:getLogPath',
  /** Check if debug logging is enabled */
  IS_LOGGING_ENABLED: 'chess:isLoggingEnabled',
} as const;

/**
 * Type guard for error responses
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ErrorResponse).success === false &&
    'error' in response &&
    'code' in response
  );
}

/**
 * Type guard for success responses
 */
export function isSuccessResponse<T extends { success: true }>(
  response: T | ErrorResponse
): response is T {
  return response.success === true;
}
