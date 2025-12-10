/**
 * Bot Constants
 *
 * Centralized constants for AI opponent configuration.
 * These define the valid ranges and interpolation parameters
 * for bot strength calculations.
 */

/**
 * Valid Elo rating range for bot opponents
 */
export const ELO_RANGE = {
  /** Minimum supported Elo rating */
  MIN: 800,
  /** Maximum supported Elo rating */
  MAX: 2400,
  /** Range span (MAX - MIN) */
  SPAN: 1600,
} as const;

/**
 * Parameter ranges for bot configuration.
 * These define how engine parameters scale with Elo.
 */
export const BOT_PARAMETER_RANGES = {
  /** Search depth: 4 (800 Elo) to 20 (2400 Elo) */
  depth: { min: 4, max: 20 },
  /** Move sampling window: 6 (800 Elo) to 1 (2400 Elo) */
  moveSampling: { min: 1, max: 6 },
  /** Evaluation noise in centipawns: 200 (800 Elo) to 10 (2400 Elo) */
  evaluationNoise: { min: 10, max: 200 },
  /** Blunder rate: 0.15 (800 Elo) to 0.005 (2400 Elo) */
  blunderRate: { min: 0.005, max: 0.15 },
  /** Inaccuracy rate: 0.30 (800 Elo) to 0.02 (2400 Elo) */
  inaccuracyRate: { min: 0.02, max: 0.3 },
} as const;

/**
 * Default thinking time ranges in milliseconds
 */
export const THINKING_TIME = {
  /** Minimum thinking time */
  MIN_DEFAULT: 200,
  /** Maximum thinking time */
  MAX_DEFAULT: 2000,
  /** Quick move threshold (instant moves) */
  INSTANT: 100,
  /** Long think threshold */
  LONG: 5000,
} as const;

/**
 * Clamps an Elo rating to the valid range.
 *
 * @param elo - Target Elo rating
 * @returns Clamped Elo within valid range
 */
export function clampElo(elo: number): number {
  return Math.max(ELO_RANGE.MIN, Math.min(ELO_RANGE.MAX, elo));
}

/**
 * Calculates the interpolation factor for a given Elo.
 * Returns 0 at MIN_ELO and 1 at MAX_ELO.
 *
 * @param elo - Target Elo rating (will be clamped)
 * @returns Factor between 0 and 1
 */
export function eloToFactor(elo: number): number {
  const clampedElo = clampElo(elo);
  return (clampedElo - ELO_RANGE.MIN) / ELO_RANGE.SPAN;
}

/**
 * Calculates a bot parameter value based on Elo.
 * Linearly interpolates between min and max values.
 *
 * @param elo - Target Elo rating
 * @param range - Parameter range { min, max }
 * @param invert - If true, lower Elo gives higher values (default: false)
 * @returns Calculated parameter value
 *
 * @example
 * ```typescript
 * // Get depth for 1600 Elo (midpoint)
 * const depth = calculateBotParameter(1600, BOT_PARAMETER_RANGES.depth);
 * // Returns 12 (midpoint between 4 and 20)
 *
 * // Get evaluation noise for 1600 Elo (inverted scale)
 * const noise = calculateBotParameter(1600, BOT_PARAMETER_RANGES.evaluationNoise, true);
 * // Returns 105 (midpoint between 200 and 10)
 * ```
 */
export function calculateBotParameter(
  elo: number,
  range: { min: number; max: number },
  invert: boolean = false
): number {
  const factor = eloToFactor(elo);
  const adjustedFactor = invert ? 1 - factor : factor;
  return range.min + adjustedFactor * (range.max - range.min);
}

/**
 * Calculates the estimated Elo from bot parameters.
 * Useful for displaying "effective Elo" of custom configurations.
 *
 * @param blunderRate - Current blunder rate
 * @param inaccuracyRate - Current inaccuracy rate (used as secondary indicator)
 * @returns Estimated Elo rating
 */
export function estimateEloFromParameters(blunderRate: number, inaccuracyRate: number): number {
  // Use blunder rate as primary indicator (most impactful on playing strength)
  const blunderFactor =
    (BOT_PARAMETER_RANGES.blunderRate.max - blunderRate) /
    (BOT_PARAMETER_RANGES.blunderRate.max - BOT_PARAMETER_RANGES.blunderRate.min);

  // Use inaccuracy rate as secondary indicator
  const inaccuracyFactor =
    (BOT_PARAMETER_RANGES.inaccuracyRate.max - inaccuracyRate) /
    (BOT_PARAMETER_RANGES.inaccuracyRate.max - BOT_PARAMETER_RANGES.inaccuracyRate.min);

  // Weight blunder rate more heavily (70%) than inaccuracy rate (30%)
  const combinedFactor = blunderFactor * 0.7 + inaccuracyFactor * 0.3;

  return Math.round(ELO_RANGE.MIN + combinedFactor * ELO_RANGE.SPAN);
}
