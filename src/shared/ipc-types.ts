/**
 * IPC Types for Frontend-Backend Communication
 *
 * Shared type definitions for Buntralino IPC calls.
 * These types are used by both frontend and backend.
 *
 * @see source-docs/architecture.md - "Backend / Logic Layer"
 * @see source-docs/ai-engine.md - "WASM Integration in Buntralino"
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
 * All available backend methods that can be called via buntralino.run()
 */
export const IPC_METHODS = {
  /** Health check method */
  SAY_HELLO: 'sayHello',
  /** Start a new game (clears engine state) */
  START_NEW_GAME: 'startNewGame',
  /** Get best move recommendations */
  REQUEST_BEST_MOVES: 'requestBestMoves',
  /** Evaluate a position */
  EVALUATE_POSITION: 'evaluatePosition',
  /** Analyze a played move (CPL, classification) */
  ANALYZE_MOVE: 'analyzeMove',
  /** Get top 3 guidance moves for Training Mode */
  GET_GUIDANCE_MOVES: 'getGuidanceMoves',
  /** Set engine skill level (0-20) */
  SET_SKILL_LEVEL: 'setSkillLevel',
  /** Get engine initialization status */
  GET_ENGINE_STATUS: 'getEngineStatus',

  // Phase 3: AI Opponent Methods
  /** Configure bot opponent personality, difficulty, and play mode */
  CONFIGURE_BOT: 'configureBot',
  /** Get move from AI opponent */
  GET_BOT_MOVE: 'getBotMove',
  /** Get all available bot personalities */
  GET_BOT_PROFILES: 'getBotProfiles',
  /** Get current bot configuration */
  GET_CURRENT_BOT_CONFIG: 'getCurrentBotConfig',
  /** Get difficulty presets */
  GET_DIFFICULTY_PRESETS: 'getDifficultyPresets',
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
