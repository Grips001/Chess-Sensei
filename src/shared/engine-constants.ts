/**
 * Engine Constants
 *
 * Centralized constants for chess engine scoring and evaluation.
 * Used across backend analysis and frontend display.
 */

/**
 * Score offset for mate-in-N scores.
 * Stockfish uses this convention: mate in N = MATE_SCORE_OFFSET - N
 */
export const MATE_SCORE_OFFSET = 100000;

/**
 * Threshold above which a score is considered a mate score.
 * Any score with absolute value above this is treated as forced mate.
 */
export const MATE_SCORE_THRESHOLD = 90000;

/**
 * Maximum valid centipawn score (non-mate).
 * Scores above this indicate mate, not centipawn evaluation.
 */
export const MAX_CENTIPAWN_SCORE = 30000;

/**
 * Score representing a draw (stalemate, insufficient material, etc.)
 */
export const DRAW_SCORE = 0;

/**
 * Checks if a score represents a forced mate.
 *
 * @param score - Centipawn score from engine
 * @returns true if the score indicates forced mate
 *
 * @example
 * ```typescript
 * if (isMateScore(analysis.score)) {
 *   const movesToMate = scoreToMateDistance(analysis.score);
 *   console.log(`Mate in ${movesToMate}`);
 * }
 * ```
 */
export function isMateScore(score: number): boolean {
  return Math.abs(score) > MATE_SCORE_THRESHOLD;
}

/**
 * Converts a mate score to the number of moves until mate.
 *
 * @param score - Mate score from engine (must satisfy isMateScore)
 * @returns Number of moves until mate (positive = winning, negative = losing)
 *
 * @example
 * ```typescript
 * // Score of 99997 means mate in 3 for white
 * scoreToMateDistance(99997); // returns 3
 *
 * // Score of -99995 means mate in 5 for black (against white)
 * scoreToMateDistance(-99995); // returns -5
 * ```
 */
export function scoreToMateDistance(score: number): number {
  if (!isMateScore(score)) {
    throw new Error(`Score ${score} is not a mate score`);
  }

  if (score > 0) {
    return MATE_SCORE_OFFSET - score;
  } else {
    return -MATE_SCORE_OFFSET - score;
  }
}

/**
 * Converts a mate distance to the engine score format.
 *
 * @param movesToMate - Number of moves until mate (positive = winning)
 * @returns Engine score representing the mate
 *
 * @example
 * ```typescript
 * // Mate in 3 for side to move
 * mateDistanceToScore(3); // returns 99997
 *
 * // Opponent mates in 5
 * mateDistanceToScore(-5); // returns -99995
 * ```
 */
export function mateDistanceToScore(movesToMate: number): number {
  if (movesToMate > 0) {
    return MATE_SCORE_OFFSET - movesToMate;
  } else {
    return -MATE_SCORE_OFFSET - movesToMate;
  }
}

/**
 * Formats a centipawn score for display.
 *
 * @param score - Centipawn score from engine
 * @returns Formatted string like "+1.50", "-2.30", or "M5" for mate
 *
 * @example
 * ```typescript
 * formatCentipawnScore(150);    // "+1.50"
 * formatCentipawnScore(-230);   // "-2.30"
 * formatCentipawnScore(99997);  // "M3"
 * formatCentipawnScore(-99995); // "-M5"
 * ```
 */
export function formatCentipawnScore(score: number): string {
  if (isMateScore(score)) {
    const distance = scoreToMateDistance(score);
    if (distance > 0) {
      return `M${distance}`;
    } else {
      return `-M${Math.abs(distance)}`;
    }
  }

  const pawns = score / 100;
  const sign = pawns >= 0 ? '+' : '';
  return `${sign}${pawns.toFixed(2)}`;
}

/**
 * Normalizes a score to be within displayable centipawn range.
 * Clamps extreme non-mate scores for consistent UI display.
 *
 * @param score - Raw centipawn score
 * @returns Normalized score clamped to reasonable display range
 */
export function normalizeScoreForDisplay(score: number): number {
  if (isMateScore(score)) {
    return score; // Keep mate scores as-is
  }

  // Clamp to ±MAX_CENTIPAWN_SCORE for display purposes
  return Math.max(-MAX_CENTIPAWN_SCORE, Math.min(MAX_CENTIPAWN_SCORE, score));
}
