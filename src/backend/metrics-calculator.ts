/**
 * Metrics Calculator
 *
 * Calculates all 9 composite score indexes from game analysis data
 * as specified in tracked-metrics.md and player-progress.md.
 *
 * Master Composite Indexes:
 * 1. Precision Score - Move accuracy and error avoidance
 * 2. Tactical Danger Score - Tactical vision and execution
 * 3. Stability Score - Consistency and time management
 * 4. Conversion Score - Winning technique
 * 5. Preparation Score - Opening knowledge
 * 6. Positional & Structure Score - Positional understanding
 * 7. Aggression & Risk Score - Playing style indicator
 * 8. Simplification Preference Score - Trading patterns
 * 9. Training Transfer Score - Improvement trends
 *
 * @see source-docs/tracked-metrics.md
 * @see source-docs/player-progress.md
 */

import type { GameAnalysis, AnalyzedMove } from './analysis-pipeline';

// ============================================
// Types
// ============================================

/**
 * Game-level metrics calculated from a single game analysis
 */
export interface GameMetrics {
  gameId: string;
  timestamp: string;
  playerColor: 'white' | 'black';
  botElo: number;
  result: '1-0' | '0-1' | '1/2-1/2';

  // Precision metrics
  precision: PrecisionMetrics;

  // Tactical metrics
  tactical: TacticalMetrics;

  // Stability metrics
  stability: StabilityMetrics;

  // Time management
  timeManagement: TimeManagementMetrics;

  // Game phase performance
  gamePhases: GamePhaseMetrics;
}

/**
 * Precision-related metrics
 */
export interface PrecisionMetrics {
  overallAccuracy: number;
  openingAccuracy: number;
  middlegameAccuracy: number;
  endgameAccuracy: number;
  averageCpl: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  goodMoves: number;
  excellentMoves: number;
  blundersWhileAhead: number;
  blundersInEqual: number;
  blundersWhileBehind: number;
  forcedErrorRate: number;
  unforcedErrorRate: number;
  firstInaccuracyMove: number | null;
}

/**
 * Tactical-related metrics
 */
export interface TacticalMetrics {
  tacticsCreated: number;
  tacticsConverted: number;
  missedWinningTactics: number;
  missedEqualizingTactics: number;
  missedForcedMates: number;
  totalTacticalOpportunities: number;
}

/**
 * Stability-related metrics
 */
export interface StabilityMetrics {
  postBlunderBlunderRate: number;
  gamesLostFromWinning: number;
  defensiveSaves: number;
}

/**
 * Time management metrics
 */
export interface TimeManagementMetrics {
  averageTimePerMove: number;
  movesUnder10s: number;
  movesUnder5s: number;
  movesUnder2s: number;
  totalMoves: number;
}

/**
 * Game phase metrics
 */
export interface GamePhaseMetrics {
  openingStart: number;
  openingEnd: number;
  middlegameStart: number;
  middlegameEnd: number;
  endgameStart: number;
  endgameEnd: number;
  evaluationAtMove10: number | null;
  evaluationAtMove15: number | null;
}

/**
 * Aggregated player profile metrics (across multiple games)
 */
export interface PlayerProfile {
  profileVersion: string;
  lastUpdated: string;
  totalGames: number;
  gamesAnalyzed: number;

  // Composite scores (0-100)
  compositeScores: CompositeScores;

  // Overall stats
  overallStats: OverallStats;

  // Records
  records: PlayerRecords;

  // Trends
  trends: PlayerTrends;

  // Detailed metrics
  detailedMetrics: DetailedMetrics;
}

/**
 * The 9 master composite scores
 */
export interface CompositeScores {
  precision: number;
  tacticalDanger: number;
  stability: number;
  conversion: number;
  preparation: number;
  positional: number;
  aggression: number;
  simplification: number;
  trainingTransfer: number;
}

/**
 * Overall statistics
 */
export interface OverallStats {
  averageAccuracy: number;
  averageCentipawnLoss: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  inaccuraciesPerGame: number;
}

/**
 * Player records
 */
export interface PlayerRecords {
  winRate: number;
  drawRate: number;
  lossRate: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'draw' | 'loss' | null;
}

/**
 * Trend data
 */
export interface PlayerTrends {
  last10GamesAccuracy: number;
  last30GamesAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  blunderTrend: 'decreasing' | 'stable' | 'increasing';
}

/**
 * Detailed component metrics
 */
export interface DetailedMetrics {
  // Precision components
  openingAccuracyAvg: number;
  middlegameAccuracyAvg: number;
  endgameAccuracyAvg: number;

  // Tactical components
  tacticsFoundRate: number;
  tacticsMissedRate: number;

  // Time components
  averageTimePerMove: number;
  fastMovesRate: number;

  // Conversion
  conversionFromWinning: number;
}

// ============================================
// Constants
// ============================================

/** Evaluation threshold for "ahead" (in centipawns) */
const AHEAD_THRESHOLD = 50; // +0.5 pawns

/** Evaluation threshold for "behind" (in centipawns) */
const BEHIND_THRESHOLD = -50; // -0.5 pawns

/** Evaluation threshold for winning position */
const WINNING_THRESHOLD = 200; // +2.0 pawns

// ============================================
// Metrics Calculator Class
// ============================================

/**
 * Calculates game-level and profile-level metrics
 */
export class MetricsCalculator {
  /**
   * Calculate game-level metrics from a single game analysis
   *
   * @param analysis - The game analysis
   * @param playerColor - The player's color
   * @param botElo - Bot's Elo rating
   * @param result - Game result
   * @returns Game metrics
   */
  calculateGameMetrics(
    analysis: GameAnalysis,
    playerColor: 'white' | 'black',
    botElo: number,
    result: '1-0' | '0-1' | '1/2-1/2'
  ): GameMetrics {
    const playerMoves = analysis.moveAnalysis.filter((m) => m.color === playerColor);

    // Calculate precision metrics
    const precision = this.calculatePrecisionMetrics(analysis, playerMoves);

    // Calculate tactical metrics
    const tactical = this.calculateTacticalMetrics(analysis, playerColor);

    // Calculate stability metrics
    const stability = this.calculateStabilityMetrics(analysis, playerMoves, result);

    // Calculate time management metrics
    const timeManagement = this.calculateTimeMetrics(playerMoves);

    // Calculate game phase metrics
    const gamePhases = this.calculateGamePhaseMetrics(analysis, playerMoves);

    return {
      gameId: analysis.gameId,
      timestamp: analysis.analysisTimestamp,
      playerColor,
      botElo,
      result,
      precision,
      tactical,
      stability,
      timeManagement,
      gamePhases,
    };
  }

  /**
   * Task 4.3.1: Calculate Precision Score
   *
   * Formula from player-progress.md:
   * Precision = (
   *   overall_accuracy * 0.30 +
   *   (100 - blunders_per_game * 10) * 0.25 +
   *   (100 - avg_centipawn_loss / 2) * 0.20 +
   *   opening_accuracy * 0.10 +
   *   middlegame_accuracy * 0.10 +
   *   endgame_accuracy * 0.05
   * )
   */
  calculatePrecisionScore(metrics: GameMetrics): number {
    const p = metrics.precision;

    // Clamp values to valid ranges
    const blunderPenalty = Math.min(100, p.blunders * 10);
    const cplPenalty = Math.min(100, p.averageCpl / 2);

    const score =
      p.overallAccuracy * 0.3 +
      (100 - blunderPenalty) * 0.25 +
      (100 - cplPenalty) * 0.2 +
      p.openingAccuracy * 0.1 +
      p.middlegameAccuracy * 0.1 +
      p.endgameAccuracy * 0.05;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.2: Calculate Tactical Danger Score
   */
  calculateTacticalScore(metrics: GameMetrics): number {
    const t = metrics.tactical;

    // Base on tactics found vs opportunities
    const totalOpportunities = t.totalTacticalOpportunities;
    if (totalOpportunities === 0) {
      // No tactical opportunities - neutral score
      return 50;
    }

    const foundRate = (t.tacticsConverted / totalOpportunities) * 100;
    const missedPenalty = t.missedForcedMates * 20 + t.missedWinningTactics * 10;

    const score = foundRate - missedPenalty + 50; // Base 50, adjust up/down

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.3: Calculate Stability Score
   */
  calculateStabilityScore(metrics: GameMetrics): number {
    const s = metrics.stability;
    const tm = metrics.timeManagement;

    // Fast moves penalty (rushed decisions)
    const fastMovesPenalty = (tm.movesUnder5s / Math.max(1, tm.totalMoves)) * 30;

    // Post-blunder penalty
    const postBlunderPenalty = s.postBlunderBlunderRate * 20;

    const score = 80 - fastMovesPenalty - postBlunderPenalty;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.4: Calculate Conversion Score
   */
  calculateConversionScore(_metrics: GameMetrics, wasWinning: boolean, won: boolean): number {
    // Simple conversion: did player convert winning positions?
    if (!wasWinning) {
      return 50; // Neutral if never winning
    }

    return won ? 100 : 20; // High if converted, low if lost from winning
  }

  /**
   * Task 4.3.5: Calculate Preparation Score
   */
  calculatePreparationScore(metrics: GameMetrics): number {
    const gp = metrics.gamePhases;
    const p = metrics.precision;

    // Based on opening accuracy and evaluation at key points
    let score = p.openingAccuracy * 0.6;

    // Bonus for good evaluation at move 10/15
    if (gp.evaluationAtMove10 !== null && gp.evaluationAtMove10 > 0) {
      score += 20;
    }
    if (gp.evaluationAtMove15 !== null && gp.evaluationAtMove15 > 0) {
      score += 20;
    }

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.6: Calculate Positional & Structure Score
   */
  calculatePositionalScore(metrics: GameMetrics): number {
    // Based primarily on precision metrics as a proxy
    const p = metrics.precision;

    // Low blunder rate + high accuracy = good positional play
    const blunderPenalty = Math.min(50, p.blunders * 15);
    const score = p.overallAccuracy - blunderPenalty;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.7: Calculate Aggression & Risk Score
   *
   * Note: This is a style indicator, not a quality measure
   * High = aggressive, Low = cautious
   */
  calculateAggressionScore(_metrics: GameMetrics): number {
    // Would need piece activity and pawn structure analysis
    // For now, return neutral value
    return 50;
  }

  /**
   * Task 4.3.8: Calculate Simplification Preference Score
   *
   * Note: This is a style indicator, not a quality measure
   */
  calculateSimplificationScore(_metrics: GameMetrics): number {
    // Would need piece trade analysis
    // For now, return neutral value
    return 50;
  }

  /**
   * Task 4.3.9: Calculate Training Transfer Score
   *
   * Requires historical data - calculated at profile level
   */
  calculateTrainingTransferScore(recentAccuracies: number[]): number {
    if (recentAccuracies.length < 5) {
      return 50; // Not enough data
    }

    // Check if accuracy is trending up
    const firstHalf = recentAccuracies.slice(0, Math.floor(recentAccuracies.length / 2));
    const secondHalf = recentAccuracies.slice(Math.floor(recentAccuracies.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const improvement = secondAvg - firstAvg;

    // Scale to 0-100: -10% improvement = 0, +10% = 100, 0% = 50
    const score = 50 + improvement * 5;

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Task 4.3.10: Calculate all composite scores for a game
   */
  calculateCompositeScores(
    metrics: GameMetrics,
    wasWinning: boolean,
    won: boolean
  ): CompositeScores {
    return {
      precision: this.calculatePrecisionScore(metrics),
      tacticalDanger: this.calculateTacticalScore(metrics),
      stability: this.calculateStabilityScore(metrics),
      conversion: this.calculateConversionScore(metrics, wasWinning, won),
      preparation: this.calculatePreparationScore(metrics),
      positional: this.calculatePositionalScore(metrics),
      aggression: this.calculateAggressionScore(metrics),
      simplification: this.calculateSimplificationScore(metrics),
      trainingTransfer: 50, // Calculated at profile level with historical data
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private calculatePrecisionMetrics(
    analysis: GameAnalysis,
    playerMoves: AnalyzedMove[]
  ): PrecisionMetrics {
    if (playerMoves.length === 0) {
      return this.emptyPrecisionMetrics();
    }

    // Count move classifications
    let blunders = 0,
      mistakes = 0,
      inaccuracies = 0,
      goodMoves = 0,
      excellentMoves = 0;
    let blundersWhileAhead = 0,
      blundersInEqual = 0,
      blundersWhileBehind = 0;
    let forcedErrors = 0,
      unforcedErrors = 0;
    let firstInaccuracyMove: number | null = null;
    let totalCpl = 0;

    for (const move of playerMoves) {
      totalCpl += move.centipawnLoss;

      switch (move.classification) {
        case 'blunder':
          blunders++;
          // Categorize by position before blunder
          if (move.evaluationBefore > AHEAD_THRESHOLD) {
            blundersWhileAhead++;
            unforcedErrors++;
          } else if (move.evaluationBefore < BEHIND_THRESHOLD) {
            blundersWhileBehind++;
            forcedErrors++;
          } else {
            blundersInEqual++;
            unforcedErrors++;
          }
          if (firstInaccuracyMove === null) {
            firstInaccuracyMove = move.moveNumber;
          }
          break;
        case 'mistake':
          mistakes++;
          if (move.evaluationBefore < BEHIND_THRESHOLD) {
            forcedErrors++;
          } else {
            unforcedErrors++;
          }
          if (firstInaccuracyMove === null) {
            firstInaccuracyMove = move.moveNumber;
          }
          break;
        case 'inaccuracy':
          inaccuracies++;
          if (firstInaccuracyMove === null) {
            firstInaccuracyMove = move.moveNumber;
          }
          break;
        case 'good':
          goodMoves++;
          break;
        case 'excellent':
          excellentMoves++;
          break;
      }
    }

    const totalErrors = forcedErrors + unforcedErrors;

    return {
      overallAccuracy: analysis.summary.overallAccuracy,
      openingAccuracy: analysis.summary.openingAccuracy,
      middlegameAccuracy: analysis.summary.middlegameAccuracy,
      endgameAccuracy: analysis.summary.endgameAccuracy,
      averageCpl: Math.round(totalCpl / playerMoves.length),
      blunders,
      mistakes,
      inaccuracies,
      goodMoves,
      excellentMoves,
      blundersWhileAhead,
      blundersInEqual,
      blundersWhileBehind,
      forcedErrorRate: totalErrors > 0 ? forcedErrors / totalErrors : 0,
      unforcedErrorRate: totalErrors > 0 ? unforcedErrors / totalErrors : 0,
      firstInaccuracyMove,
    };
  }

  private calculateTacticalMetrics(
    analysis: GameAnalysis,
    playerColor: 'white' | 'black'
  ): TacticalMetrics {
    const opportunities = analysis.tacticalOpportunities.filter((t) => t.color === playerColor);

    let created = 0,
      converted = 0,
      missedWinning = 0,
      missedEqualizing = 0,
      missedMates = 0;

    for (const opp of opportunities) {
      if (opp.type === 'found') {
        created++;
        converted++;
      } else {
        // missed
        if (opp.tactic === 'mate') {
          missedMates++;
        } else if (opp.evaluation >= WINNING_THRESHOLD) {
          missedWinning++;
        } else {
          missedEqualizing++;
        }
      }
    }

    return {
      tacticsCreated: created,
      tacticsConverted: converted,
      missedWinningTactics: missedWinning,
      missedEqualizingTactics: missedEqualizing,
      missedForcedMates: missedMates,
      totalTacticalOpportunities: opportunities.length,
    };
  }

  private calculateStabilityMetrics(
    _analysis: GameAnalysis,
    playerMoves: AnalyzedMove[],
    result: '1-0' | '0-1' | '1/2-1/2'
  ): StabilityMetrics {
    // Post-blunder blunder rate: how often do we blunder again after blundering?
    let postBlunderBlunders = 0;
    let totalPostBlunderMoves = 0;
    let inPostBlunderState = false;

    for (let i = 0; i < playerMoves.length; i++) {
      if (inPostBlunderState) {
        totalPostBlunderMoves++;
        if (playerMoves[i].classification === 'blunder') {
          postBlunderBlunders++;
        }
      }
      if (playerMoves[i].classification === 'blunder') {
        inPostBlunderState = true;
      }
    }

    // Check if lost from winning position
    let wasWinning = false;
    let lostFromWinning = 0;

    for (const move of playerMoves) {
      if (move.evaluationBefore >= WINNING_THRESHOLD) {
        wasWinning = true;
      }
    }

    const playerLost =
      (result === '0-1' && playerMoves[0]?.color === 'white') ||
      (result === '1-0' && playerMoves[0]?.color === 'black');

    if (wasWinning && playerLost) {
      lostFromWinning = 1;
    }

    // Defensive saves: drew from worse position
    let wasLosing = false;
    for (const move of playerMoves) {
      if (move.evaluationBefore <= -WINNING_THRESHOLD) {
        wasLosing = true;
        break;
      }
    }

    const drew = result === '1/2-1/2';
    const defensiveSave = wasLosing && drew ? 1 : 0;

    return {
      postBlunderBlunderRate:
        totalPostBlunderMoves > 0 ? postBlunderBlunders / totalPostBlunderMoves : 0,
      gamesLostFromWinning: lostFromWinning,
      defensiveSaves: defensiveSave,
    };
  }

  private calculateTimeMetrics(playerMoves: AnalyzedMove[]): TimeManagementMetrics {
    if (playerMoves.length === 0) {
      return {
        averageTimePerMove: 0,
        movesUnder10s: 0,
        movesUnder5s: 0,
        movesUnder2s: 0,
        totalMoves: 0,
      };
    }

    let totalTime = 0;
    let under10s = 0,
      under5s = 0,
      under2s = 0;

    for (const move of playerMoves) {
      totalTime += move.timeSpent;
      if (move.timeSpent < 10) under10s++;
      if (move.timeSpent < 5) under5s++;
      if (move.timeSpent < 2) under2s++;
    }

    return {
      averageTimePerMove: totalTime / playerMoves.length,
      movesUnder10s: under10s,
      movesUnder5s: under5s,
      movesUnder2s: under2s,
      totalMoves: playerMoves.length,
    };
  }

  private calculateGamePhaseMetrics(
    analysis: GameAnalysis,
    playerMoves: AnalyzedMove[]
  ): GamePhaseMetrics {
    const phases = analysis.gamePhases;

    // Get evaluation at specific moves
    let evalAt10: number | null = null;
    let evalAt15: number | null = null;

    for (const move of playerMoves) {
      if (move.moveNumber === 10 && evalAt10 === null) {
        evalAt10 = move.evaluationAfter;
      }
      if (move.moveNumber === 15 && evalAt15 === null) {
        evalAt15 = move.evaluationAfter;
      }
    }

    return {
      openingStart: phases.opening.start,
      openingEnd: phases.opening.end,
      middlegameStart: phases.middlegame.start,
      middlegameEnd: phases.middlegame.end,
      endgameStart: phases.endgame.start,
      endgameEnd: phases.endgame.end,
      evaluationAtMove10: evalAt10,
      evaluationAtMove15: evalAt15,
    };
  }

  private emptyPrecisionMetrics(): PrecisionMetrics {
    return {
      overallAccuracy: 0,
      openingAccuracy: 0,
      middlegameAccuracy: 0,
      endgameAccuracy: 0,
      averageCpl: 0,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      goodMoves: 0,
      excellentMoves: 0,
      blundersWhileAhead: 0,
      blundersInEqual: 0,
      blundersWhileBehind: 0,
      forcedErrorRate: 0,
      unforcedErrorRate: 0,
      firstInaccuracyMove: null,
    };
  }
}

/**
 * Create a metrics calculator instance
 */
export function createMetricsCalculator(): MetricsCalculator {
  return new MetricsCalculator();
}
