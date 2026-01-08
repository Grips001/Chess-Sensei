/**
 * IPC Request/Response Types
 * Per Task 1.4.2: Define structured JSON payloads
 */

import type { BestMove, PositionEvaluation, MoveAnalysis } from '../../shared/engine-types';
import type {
  BotPersonality,
  BotProfile,
  AIPlayMode,
  DifficultyPreset,
} from '../../shared/bot-types';
import type { ExamGameData, GameAnalysis } from '../analysis-pipeline';
import type { GameMetrics, CompositeScores, PlayerProfile } from '../metrics-calculator';
import type {
  StoredGameData,
  StoredAnalysisData,
  GameIndexEntry,
  StoredAchievements,
} from '../data-storage';
import type { ExportResult, ImportResult } from '../export-import';

// ============================================
// Core Engine Request/Response Types
// ============================================

/** Request payload for position-based operations */
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

/** Request payload for move analysis */
export interface AnalyzeMoveRequest {
  /** Position FEN before the move */
  fen: string;
  /** The move that was played (UCI format) */
  playedMove: string;
  /** Analysis depth */
  depth?: number;
}

/** Response payload for best moves */
export interface BestMovesResponse {
  /** Array of best moves with evaluations */
  moves: BestMove[];
  /** Success flag */
  success: true;
}

/** Response payload for position evaluation */
export interface EvaluationResponse {
  /** Full position evaluation */
  evaluation: PositionEvaluation;
  /** Formatted score string (e.g., "+1.5", "M3") */
  formattedScore: string;
  /** Success flag */
  success: true;
}

/** Response payload for move analysis */
export interface MoveAnalysisResponse {
  /** Move analysis result */
  analysis: MoveAnalysis;
  /** Success flag */
  success: true;
}

/** Error response payload */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code: string;
  /** Success flag */
  success: false;
}

// ============================================
// AI Opponent Request/Response Types
// ============================================

/** Request payload for configuring bot opponent */
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

/** Request payload for bot move selection */
export interface BotMoveRequest {
  /** Position in FEN notation */
  fen: string;
  /** Optional moves from FEN position (UCI format) */
  moves?: string[];
}

/** Response payload for bot move */
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

/** Response payload for bot profiles list */
export interface BotProfilesResponse {
  /** Available bot profiles */
  profiles: BotProfile[];
  /** Success flag */
  success: true;
}

/** Response payload for current bot config */
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

// ============================================
// Analysis Pipeline Request/Response Types
// ============================================

/** Request payload for game analysis */
export interface AnalyzeGameRequest {
  /** Complete game data from Exam Mode */
  gameData: ExamGameData;
  /** Whether to run deep analysis (default: false for quick analysis) */
  deepAnalysis?: boolean;
}

/** Response payload for game analysis */
export interface GameAnalysisResponse {
  /** Complete analysis result */
  analysis: GameAnalysis;
  /** Success flag */
  success: true;
}

/** Request payload for metrics calculation */
export interface CalculateMetricsRequest {
  /** Game analysis to calculate metrics from */
  analysis: GameAnalysis;
  /** Player's color */
  playerColor: 'white' | 'black';
  /** Bot's Elo rating */
  botElo: number;
  /** Game result */
  result: '1-0' | '0-1' | '1/2-1/2';
}

/** Response payload for metrics calculation */
export interface GameMetricsResponse {
  /** Calculated game metrics */
  metrics: GameMetrics;
  /** Composite scores (0-100) */
  compositeScores: CompositeScores;
  /** Success flag */
  success: true;
}

// ============================================
// Data Storage Request/Response Types
// ============================================

/** Request payload for saving a game */
export interface SaveGameRequest {
  /** Game data to save */
  gameData: ExamGameData;
}

/** Response payload for save game */
export interface SaveGameResponse {
  /** Path where game was saved */
  path: string;
  /** Success flag */
  success: true;
}

/** Request payload for saving analysis */
export interface SaveAnalysisRequest {
  /** Analysis data to save */
  analysis: GameAnalysis;
}

/** Response payload for save analysis */
export interface SaveAnalysisResponse {
  /** Path where analysis was saved */
  path: string;
  /** Success flag */
  success: true;
}

/** Response payload for games list */
export interface GamesListResponse {
  /** List of game index entries */
  games: GameIndexEntry[];
  /** Success flag */
  success: true;
}

/** Request payload for loading a game */
export interface LoadGameRequest {
  /** Game ID to load */
  gameId: string;
}

/** Response payload for loading a game */
export interface LoadGameResponse {
  /** Loaded game data */
  game: StoredGameData;
  /** Success flag */
  success: true;
}

/** Request payload for loading analysis */
export interface LoadAnalysisRequest {
  /** Game ID to load analysis for */
  gameId: string;
}

/** Response payload for loading analysis */
export interface LoadAnalysisResponse {
  /** Loaded analysis data */
  analysis: StoredAnalysisData;
  /** Success flag */
  success: true;
}

// ============================================
// Player Progress Request/Response Types
// ============================================

/** Response payload for loading player profile */
export interface PlayerProfileResponse {
  /** Player profile (null if not yet created) */
  profile: PlayerProfile | null;
  /** Success flag */
  success: true;
}

/** Request payload for saving player profile */
export interface SavePlayerProfileRequest {
  /** Profile data to save */
  profile: PlayerProfile;
}

/** Response payload for getting achievements */
export interface AchievementsResponse {
  /** Achievements data (null if not yet created) */
  achievements: StoredAchievements | null;
  /** Success flag */
  success: true;
}

/** Request payload for unlocking an achievement */
export interface UnlockAchievementRequest {
  /** Achievement ID to unlock */
  id: string;
  /** Current progress value */
  progress?: number;
}

// ============================================
// Export/Import Request/Response Types
// ============================================

/** Request payload for exporting a single game */
export interface ExportGameRequest {
  /** Game ID to export */
  gameId: string;
  /** Export format */
  format: 'pgn' | 'json';
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for exporting all games */
export interface ExportAllGamesRequest {
  /** Optional destination path */
  destinationPath?: string;
  /** Include analysis data */
  includeAnalysis?: boolean;
}

/** Request payload for exporting player profile */
export interface ExportProfileRequest {
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for full backup */
export interface ExportBackupRequest {
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for importing a single game */
export interface ImportGameRequest {
  /** Path to the file to import */
  filePath: string;
  /** Format of the file */
  format: 'json' | 'pgn';
}

/** Request payload for importing batch games */
export interface ImportBatchRequest {
  /** Path to the batch JSON file */
  filePath: string;
}

/** Request payload for merging profiles */
export interface MergeProfilesRequest {
  /** Path to the profile file to merge */
  filePath: string;
}

/** Response payload for export operations */
export interface ExportResponse {
  /** Export result details */
  result: ExportResult;
  /** Success flag */
  success: true;
}

/** Response payload for import operations */
export interface ImportResponse {
  /** Import result details */
  result: ImportResult;
  /** Success flag */
  success: true;
}

/** Response payload for single game import */
export interface ImportGameResponse {
  /** Imported game data */
  game: StoredGameData;
  /** Analysis data if available */
  analysis?: StoredAnalysisData;
  /** Whether analysis is needed */
  needsAnalysis?: boolean;
  /** Success flag */
  success: true;
}
