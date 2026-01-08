/**
 * Analysis Types
 * Shared type definitions for post-game analysis
 * Used by both frontend and backend
 */

// ============================================
// Game Data Types
// ============================================

/**
 * Stored game data format (matches backend StoredGameData)
 */
export interface StoredGameData {
  gameId: string;
  version: string;
  timestamp: string;
  mode: 'exam';
  metadata: {
    playerColor: 'white' | 'black';
    botPersonality: string;
    botElo: number;
    opening?: string;
    result: '1-0' | '0-1' | '1/2-1/2';
    termination: string;
    duration: number;
  };
  moves: Array<{
    moveNumber: number;
    white?: {
      move: string;
      san: string;
      uci: string;
      fen: string;
      timestamp: number;
      timeSpent: number;
    };
    black?: {
      move: string;
      san: string;
      uci: string;
      fen: string;
      timestamp: number;
      timeSpent: number;
    };
  }>;
  pgn: string;
}

// ============================================
// Analysis Data Types
// ============================================

/**
 * Move classification type
 */
export type MoveClassification = 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/**
 * Analyzed move data
 */
export interface AnalyzedMove {
  moveNumber: number;
  move: string;
  san: string;
  uci: string;
  color: 'white' | 'black';
  evaluationBefore: number;
  evaluationAfter: number;
  centipawnLoss: number;
  classification: MoveClassification;
  accuracy: number;
  bestMove: string;
  alternativeMoves: Array<{
    move: string;
    evaluation: number;
  }>;
  timeSpent: number;
  timestamp: number;
}

/**
 * Critical moment in the game
 */
export interface CriticalMoment {
  moveNumber: number;
  type: 'blunder' | 'missed_win' | 'turning_point' | 'brilliant';
  evaluationSwing: number;
  evaluationBefore: number;
  evaluationAfter: number;
  description: string;
  bestMove?: string;
}

/**
 * Tactical opportunity (found or missed)
 */
export interface TacticalOpportunity {
  moveNumber: number;
  type: 'found' | 'missed';
  tactic: string;
  evaluation: number;
  description: string;
}

/**
 * Game phase information
 */
export interface GamePhase {
  opening: { start: number; end: number; accuracy: number };
  middlegame: { start: number; end: number; accuracy: number };
  endgame: { start: number; end: number; accuracy: number };
}

/**
 * Analysis summary statistics
 */
export interface AnalysisSummary {
  overallAccuracy: number;
  openingAccuracy: number;
  middlegameAccuracy: number;
  endgameAccuracy: number;
  averageCentipawnLoss: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  excellentMoves: number;
  goodMoves: number;
  totalMoves?: number;
}

/**
 * Stored analysis data (matches backend StoredAnalysisData)
 */
export interface StoredAnalysisData {
  gameId: string;
  analysisVersion: string;
  analysisTimestamp: string;
  engineVersion: string;
  summary: AnalysisSummary;
  moveAnalysis: AnalyzedMove[];
  criticalMoments: CriticalMoment[];
  tacticalOpportunities: TacticalOpportunity[];
  gamePhases: GamePhase;
}

/**
 * Game index entry
 */
export interface GameIndexEntry {
  gameId: string;
  timestamp: string;
  result: string;
  botPersonality: string;
  botElo: number;
  playerColor: 'white' | 'black';
  path: string;
}

/**
 * Composite scores from metrics calculator
 */
export interface CompositeScores {
  precisionScore: number;
  tacticalDangerScore: number;
  stabilityScore: number;
  conversionScore: number;
  preparationScore: number;
  positionalScore: number;
  aggressionScore: number;
  simplificationScore: number;
  trainingTransferScore: number;
}

// ============================================
// UI State Types
// ============================================

/**
 * Analysis UI State
 */
export interface AnalysisUIState {
  isActive: boolean;
  isLoading: boolean;
  gameId: string | null;
  gameData: StoredGameData | null;
  analysisData: StoredAnalysisData | null;
  metricsData: CompositeScores | null;
  currentMoveIndex: number;
  isAutoPlaying: boolean;
  autoPlayInterval: number | null;
  boardFlipped: boolean;
}

/**
 * Quick stats for game over screen
 */
export interface QuickStats {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  duration: string;
}

// ============================================
// Constants
// ============================================

/**
 * Move classification colors per post-game-analysis.md
 */
export const MOVE_COLORS = {
  excellent: '#22c55e', // Green
  good: '#14b8a6', // Teal
  inaccuracy: '#eab308', // Yellow
  mistake: '#f97316', // Orange
  blunder: '#ef4444', // Red
} as const;

/**
 * Move classification symbols
 */
export const MOVE_SYMBOLS = {
  excellent: '!!',
  good: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
} as const;
