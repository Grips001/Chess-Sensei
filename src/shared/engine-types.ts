/**
 * Engine Interface Types
 *
 * Defines the core interfaces for chess engine integration.
 * These types are shared between frontend and backend.
 *
 * @see source-docs/ai-engine.md for full specification
 */

/**
 * Best move recommendation from the chess engine
 */
export interface BestMove {
  /** Move in UCI format (e.g., "e2e4", "g1f3") */
  move: string;
  /** Centipawn score evaluation (positive = white advantage) */
  score: number;
  /** Principal variation - sequence of best moves */
  pv?: string[];
}

/**
 * Options for requesting best moves from the engine
 */
export interface GetBestMovesOptions {
  /** Search depth (plies) */
  depth?: number;
  /** Search time in milliseconds */
  movetime?: number;
  /** Number of best moves to return (MultiPV) */
  count?: number;
}

/**
 * Chess engine interface as defined in ai-engine.md
 *
 * Provides a clean abstraction over the UCI protocol for:
 * - Setting positions
 * - Requesting analysis
 * - Controlling search parameters
 */
export interface Engine {
  /**
   * Initialize the engine
   * Must be called before any other method
   */
  init(): Promise<void>;

  /**
   * Set the current position
   * @param fen - Position in FEN notation
   * @param moves - Optional list of moves from FEN position (UCI format)
   */
  setPosition(fen: string, moves?: string[]): Promise<void>;

  /**
   * Get best move recommendations
   * @param options - Search options (depth, time, count)
   * @returns Array of best moves with evaluations
   */
  getBestMoves(options?: GetBestMovesOptions): Promise<BestMove[]>;

  /**
   * Terminate the engine
   * Cleans up resources
   */
  quit(): Promise<void>;
}

/**
 * Position evaluation result
 */
export interface PositionEvaluation {
  /** Centipawn evaluation (positive = white advantage) */
  score: number;
  /** Best move in the position */
  bestMove: string;
  /** Principal variation */
  pv: string[];
  /** Search depth achieved */
  depth: number;
  /** Nodes searched */
  nodes?: number;
  /** Nodes per second */
  nps?: number;
  /** Time spent in milliseconds */
  time?: number;
}

/**
 * Engine options for controlling behavior
 */
export interface EngineOptions {
  /** Number of threads (1 for single-threaded WASM) */
  threads?: number;
  /** Hash table size in MB */
  hash?: number;
  /** Skill level (0-20) */
  skillLevel?: number;
  /** Number of principal variations to compute */
  multiPV?: number;
  /** Enable UCI_LimitStrength */
  limitStrength?: boolean;
  /** Target Elo rating (when limitStrength is true) */
  elo?: number;
}

/**
 * Starting position FEN
 */
export const STARTPOS_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Move classification based on centipawn loss
 * Thresholds from player-progress.md
 */
export enum MoveClassification {
  /** Within 10 centipawns of best move (100% accuracy) */
  EXCELLENT = 'excellent',
  /** Within 10-25 centipawns (90% accuracy) */
  GOOD = 'good',
  /** 25-75 centipawns worse (70% accuracy) */
  INACCURACY = 'inaccuracy',
  /** 75-200 centipawns worse (40% accuracy) */
  MISTAKE = 'mistake',
  /** 200+ centipawns worse (0% accuracy) */
  BLUNDER = 'blunder',
}

/**
 * Move classification thresholds in centipawns
 * From player-progress.md
 */
export const MOVE_THRESHOLDS = {
  /** Maximum CPL for Excellent move */
  EXCELLENT: 10,
  /** Maximum CPL for Good move */
  GOOD: 25,
  /** Maximum CPL for Inaccuracy */
  INACCURACY: 75,
  /** Maximum CPL for Mistake */
  MISTAKE: 200,
} as const;

/**
 * Accuracy score for each move classification
 * From player-progress.md
 */
export const CLASSIFICATION_ACCURACY = {
  [MoveClassification.EXCELLENT]: 100,
  [MoveClassification.GOOD]: 90,
  [MoveClassification.INACCURACY]: 70,
  [MoveClassification.MISTAKE]: 40,
  [MoveClassification.BLUNDER]: 0,
} as const;

/**
 * Result of analyzing a played move
 */
export interface MoveAnalysis {
  /** The move that was played (UCI format) */
  playedMove: string;
  /** The best move according to engine (UCI format) */
  bestMove: string;
  /** Centipawn loss (0 if played best move, positive otherwise) */
  centipawnLoss: number;
  /** Move classification based on CPL */
  classification: MoveClassification;
  /** Accuracy score (0-100) */
  accuracy: number;
  /** Evaluation after played move */
  evalAfterPlayed: number;
  /** Evaluation after best move would have been */
  evalAfterBest: number;
  /** Alternative moves with evaluations */
  alternatives?: BestMove[];
}

/**
 * Classify a move based on centipawn loss
 * @param centipawnLoss - The CPL value
 * @returns Classification and accuracy
 */
export function classifyMove(centipawnLoss: number): {
  classification: MoveClassification;
  accuracy: number;
} {
  const cpl = Math.abs(centipawnLoss);

  if (cpl <= MOVE_THRESHOLDS.EXCELLENT) {
    return {
      classification: MoveClassification.EXCELLENT,
      accuracy: CLASSIFICATION_ACCURACY[MoveClassification.EXCELLENT],
    };
  } else if (cpl <= MOVE_THRESHOLDS.GOOD) {
    return {
      classification: MoveClassification.GOOD,
      accuracy: CLASSIFICATION_ACCURACY[MoveClassification.GOOD],
    };
  } else if (cpl <= MOVE_THRESHOLDS.INACCURACY) {
    return {
      classification: MoveClassification.INACCURACY,
      accuracy: CLASSIFICATION_ACCURACY[MoveClassification.INACCURACY],
    };
  } else if (cpl <= MOVE_THRESHOLDS.MISTAKE) {
    return {
      classification: MoveClassification.MISTAKE,
      accuracy: CLASSIFICATION_ACCURACY[MoveClassification.MISTAKE],
    };
  } else {
    return {
      classification: MoveClassification.BLUNDER,
      accuracy: CLASSIFICATION_ACCURACY[MoveClassification.BLUNDER],
    };
  }
}

/**
 * Format centipawn score to human-readable string
 * @param score - Centipawn score (positive = white advantage)
 * @returns Formatted string like "+1.5" or "-2.3" or "M5" for mate
 */
export function formatScore(score: number): string {
  // Check for mate scores (stored as large values)
  if (Math.abs(score) > 90000) {
    const mateIn = score > 0 ? 100000 - score : -100000 - score;
    return `M${mateIn}`;
  }

  // Convert centipawns to pawns with sign
  const pawns = score / 100;
  const sign = pawns >= 0 ? '+' : '';
  return `${sign}${pawns.toFixed(2)}`;
}
