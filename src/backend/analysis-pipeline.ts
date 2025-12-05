/**
 * Post-Game Analysis Pipeline
 *
 * Implements the analysis pipeline for Exam Mode games as specified in
 * post-game-analysis.md and player-progress.md.
 *
 * Pipeline flow:
 * 1. Game Completion (Exam Mode)
 * 2. Extract all positions (FEN strings)
 * 3. Batch analysis with Stockfish WASM
 * 4. Calculate centipawn loss per move
 * 5. Classify moves (excellent, good, inaccuracy, mistake, blunder)
 * 6. Detect tactical motifs (fork, pin, skewer, etc.)
 * 7. Identify critical moments (evaluation swings)
 * 8. Calculate all metrics
 * 9. Generate recommendations
 * 10. Save analysis results to JSON
 * 11. Render analysis UI
 *
 * @see source-docs/post-game-analysis.md - "Analysis Pipeline"
 * @see source-docs/player-progress.md - "Metrics Collection Pipeline"
 */

import type { StockfishEngine } from '../engine/stockfish-engine';
import type { MoveClassification } from '../shared/engine-types';

// ============================================
// Types
// ============================================

/**
 * Move record from Exam Mode game
 */
export interface ExamMoveData {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fen: string;
  timestamp: number;
  timeSpent: number;
}

/**
 * Complete game data from Exam Mode
 */
export interface ExamGameData {
  gameId: string;
  timestamp: number;
  playerColor: 'white' | 'black';
  botPersonality: string;
  botElo: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  termination: string;
  duration: number;
  moves: ExamMoveData[];
  pgn: string;
  startingFen?: string;
}

/**
 * Analyzed move with engine evaluation
 */
export interface AnalyzedMove {
  moveNumber: number;
  color: 'white' | 'black';
  move: string; // SAN notation
  uci: string; // UCI notation
  evaluationBefore: number;
  evaluationAfter: number;
  centipawnLoss: number;
  classification: MoveClassification;
  accuracy: number;
  bestMove: string;
  alternativeMoves: Array<{ move: string; evaluation: number }>;
  timeSpent: number;
  timestamp: number;
}

/**
 * Critical moment in the game
 */
export interface CriticalMoment {
  moveNumber: number;
  color: 'white' | 'black';
  type: 'blunder' | 'mistake' | 'missed_win' | 'turning_point';
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
  color: 'white' | 'black';
  type: 'found' | 'missed';
  tactic:
    | 'fork'
    | 'pin'
    | 'skewer'
    | 'discovered_attack'
    | 'back_rank'
    | 'mate'
    | 'sacrifice'
    | 'other';
  bestMove: string;
  evaluation: number;
  description: string;
}

/**
 * Game phase with accuracy
 */
export interface GamePhase {
  start: number;
  end: number;
  accuracy: number;
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
  goodMoves: number;
  excellentMoves: number;
  totalMoves: number;
}

/**
 * Complete analysis result
 */
export interface GameAnalysis {
  gameId: string;
  analysisVersion: string;
  analysisTimestamp: string;
  engineVersion: string;
  summary: AnalysisSummary;
  moveAnalysis: AnalyzedMove[];
  criticalMoments: CriticalMoment[];
  tacticalOpportunities: TacticalOpportunity[];
  gamePhases: {
    opening: GamePhase;
    middlegame: GamePhase;
    endgame: GamePhase;
  };
}

/**
 * Analysis configuration
 */
export interface AnalysisConfig {
  /** Analysis depth for moves (default: 20 for deep, 15 for quick) */
  depth: number;
  /** Whether to run deep tactical scanning */
  deepAnalysis: boolean;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number, phase: string) => void;
}

// ============================================
// Constants
// ============================================

/** Default analysis depth for quick analysis */
export const QUICK_ANALYSIS_DEPTH = 15;

/** Default analysis depth for deep analysis */
export const DEEP_ANALYSIS_DEPTH = 20;

/** Threshold for critical moment (centipawn swing) */
const CRITICAL_MOMENT_THRESHOLD = 100; // 1 pawn swing

/** Opening phase ends approximately at move 12 */
const OPENING_END_MOVE = 12;

/** Middlegame ends approximately at move 35 */
const MIDDLEGAME_END_MOVE = 35;

/** Evaluation threshold for winning position */
const WINNING_THRESHOLD = 200; // +2.0 pawns

/** Evaluation threshold for mate */
const MATE_THRESHOLD = 90000;

// ============================================
// Analysis Pipeline Class
// ============================================

/**
 * Post-game analysis pipeline
 *
 * Analyzes Exam Mode games to produce comprehensive metrics
 * and insights for player improvement.
 */
export class AnalysisPipeline {
  private engine: StockfishEngine;
  private config: AnalysisConfig;

  constructor(engine: StockfishEngine, config?: Partial<AnalysisConfig>) {
    this.engine = engine;
    this.config = {
      depth: config?.depth ?? QUICK_ANALYSIS_DEPTH,
      deepAnalysis: config?.deepAnalysis ?? false,
      onProgress: config?.onProgress,
    };
  }

  /**
   * Analyze a complete Exam Mode game
   *
   * @param gameData - The game data to analyze
   * @returns Complete game analysis
   */
  async analyzeGame(gameData: ExamGameData): Promise<GameAnalysis> {
    const startTime = Date.now();
    const totalMoves = gameData.moves.length;
    const playerColor = gameData.playerColor;

    // Step 2: Extract all positions (FEN strings) - already in move data
    this.reportProgress(0, totalMoves, 'Extracting positions');

    // Step 3 & 4: Batch analysis with Stockfish - Calculate centipawn loss per move
    const analyzedMoves: AnalyzedMove[] = [];
    let previousEval = 0; // Starting position is equal

    // Get starting position evaluation
    const startingFen =
      gameData.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    await this.engine.setPosition(startingFen);
    const startingEval = await this.engine.evaluatePosition({ depth: this.config.depth });
    previousEval = startingEval.score;

    for (let i = 0; i < gameData.moves.length; i++) {
      const move = gameData.moves[i];
      this.reportProgress(i + 1, totalMoves, `Analyzing move ${move.moveNumber}. ${move.san}`);

      // Get position before this move
      const positionBefore = i === 0 ? startingFen : gameData.moves[i - 1].fen;

      // Analyze the move
      const analysis = await this.engine.analyzeMove(positionBefore, move.uci, {
        depth: this.config.depth,
      });

      // Get evaluation after the move for the next iteration
      // Note: analysis.evalAfterPlayed is from the perspective of the side that just moved
      const evalAfter =
        move.color === 'white' ? analysis.evalAfterPlayed : -analysis.evalAfterPlayed;

      // Calculate CPL from player's perspective
      let cpl = analysis.centipawnLoss;
      if (move.color !== playerColor) {
        // For bot moves, we still track CPL but it's informational
        cpl = analysis.centipawnLoss;
      }

      const analyzedMove: AnalyzedMove = {
        moveNumber: move.moveNumber,
        color: move.color,
        move: move.san,
        uci: move.uci,
        evaluationBefore: previousEval,
        evaluationAfter: evalAfter,
        centipawnLoss: cpl,
        classification: analysis.classification,
        accuracy: analysis.accuracy,
        bestMove: analysis.bestMove,
        alternativeMoves: (analysis.alternatives ?? []).slice(0, 3).map((alt) => ({
          move: alt.move,
          evaluation: alt.score,
        })),
        timeSpent: move.timeSpent,
        timestamp: move.timestamp,
      };

      analyzedMoves.push(analyzedMove);
      previousEval = evalAfter;
    }

    // Step 5: Classify moves (already done in analyzeMove)

    // Step 6: Detect tactical motifs
    const tacticalOpportunities = this.detectTacticalOpportunities(analyzedMoves, playerColor);

    // Step 7: Identify critical moments
    const criticalMoments = this.identifyCriticalMoments(analyzedMoves, playerColor);

    // Step 8: Calculate all metrics - summary and game phases
    const gamePhases = this.determineGamePhases(analyzedMoves, playerColor);
    const summary = this.calculateSummary(analyzedMoves, gamePhases, playerColor);

    // Build final analysis result
    const analysis: GameAnalysis = {
      gameId: gameData.gameId,
      analysisVersion: '1.0',
      analysisTimestamp: new Date().toISOString(),
      engineVersion: 'Stockfish WASM',
      summary,
      moveAnalysis: analyzedMoves,
      criticalMoments,
      tacticalOpportunities,
      gamePhases,
    };

    const elapsed = Date.now() - startTime;
    console.log(`Analysis completed in ${elapsed}ms for ${totalMoves} moves`);

    return analysis;
  }

  /**
   * Task 4.2.4: Identify critical moments
   *
   * Detect evaluation changes > 1.0 pawn
   */
  private identifyCriticalMoments(
    analyzedMoves: AnalyzedMove[],
    playerColor: 'white' | 'black'
  ): CriticalMoment[] {
    const criticalMoments: CriticalMoment[] = [];

    for (const move of analyzedMoves) {
      // Only track player's critical moments (not bot's)
      if (move.color !== playerColor) continue;

      const swing = Math.abs(move.evaluationAfter - move.evaluationBefore);

      if (swing >= CRITICAL_MOMENT_THRESHOLD || move.classification === 'blunder') {
        let type: CriticalMoment['type'] = 'turning_point';
        let description = '';

        if (move.classification === 'blunder') {
          type = 'blunder';
          description = `Blunder with ${move.move}, lost ${(swing / 100).toFixed(1)} pawns`;
        } else if (move.classification === 'mistake') {
          type = 'mistake';
          description = `Mistake with ${move.move}, lost ${(swing / 100).toFixed(1)} pawns`;
        } else if (
          move.evaluationBefore >= WINNING_THRESHOLD &&
          move.evaluationAfter < WINNING_THRESHOLD
        ) {
          type = 'missed_win';
          description = `Lost winning advantage with ${move.move}`;
        } else {
          description = `Evaluation swing of ${(swing / 100).toFixed(1)} pawns`;
        }

        criticalMoments.push({
          moveNumber: move.moveNumber,
          color: move.color,
          type,
          evaluationSwing: swing,
          evaluationBefore: move.evaluationBefore,
          evaluationAfter: move.evaluationAfter,
          description,
          bestMove: move.bestMove,
        });
      }
    }

    return criticalMoments;
  }

  /**
   * Task 4.2.5: Detect tactical opportunities
   *
   * Identify forks, pins, skewers, discovered attacks, etc.
   */
  private detectTacticalOpportunities(
    analyzedMoves: AnalyzedMove[],
    playerColor: 'white' | 'black'
  ): TacticalOpportunity[] {
    const opportunities: TacticalOpportunity[] = [];

    for (const move of analyzedMoves) {
      // Only track player's tactical opportunities
      if (move.color !== playerColor) continue;

      // Check if player found a winning tactic (played best move with big eval gain)
      const evalGain = move.evaluationAfter - move.evaluationBefore;
      if (evalGain >= 100 && move.centipawnLoss < 25) {
        // Player found a good tactic
        opportunities.push({
          moveNumber: move.moveNumber,
          color: move.color,
          type: 'found',
          tactic: this.detectTacticType(move),
          bestMove: move.move,
          evaluation: move.evaluationAfter,
          description: `Found tactical opportunity: ${move.move}`,
        });
      }

      // Check if player missed a winning tactic
      if (move.centipawnLoss >= 100 && move.bestMove !== move.uci) {
        // Check if best move would have given a significant advantage
        const bestMoveAlt = move.alternativeMoves[0];
        if (bestMoveAlt && bestMoveAlt.evaluation >= move.evaluationBefore + 100) {
          opportunities.push({
            moveNumber: move.moveNumber,
            color: move.color,
            type: 'missed',
            tactic: this.detectTacticType(move),
            bestMove: move.bestMove,
            evaluation: bestMoveAlt.evaluation,
            description: `Missed tactical opportunity: ${move.bestMove} instead of ${move.move}`,
          });
        }
      }

      // Check for missed forced mates
      if (
        move.alternativeMoves[0] &&
        Math.abs(move.alternativeMoves[0].evaluation) >= MATE_THRESHOLD &&
        move.centipawnLoss > 0
      ) {
        opportunities.push({
          moveNumber: move.moveNumber,
          color: move.color,
          type: 'missed',
          tactic: 'mate',
          bestMove: move.bestMove,
          evaluation: move.alternativeMoves[0].evaluation,
          description: `Missed forced mate with ${move.bestMove}`,
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect the type of tactic based on move characteristics
   */
  private detectTacticType(_move: AnalyzedMove): TacticalOpportunity['tactic'] {
    // Basic heuristic - would need more sophisticated analysis for accurate detection
    // This is a placeholder that can be enhanced with pattern recognition
    return 'other';
  }

  /**
   * Task 4.2.6: Determine game phases
   *
   * Opening: moves 1-12
   * Middlegame: moves 13-35
   * Endgame: remaining moves
   */
  private determineGamePhases(
    analyzedMoves: AnalyzedMove[],
    playerColor: 'white' | 'black'
  ): { opening: GamePhase; middlegame: GamePhase; endgame: GamePhase } {
    const playerMoves = analyzedMoves.filter((m) => m.color === playerColor);
    const lastMove =
      analyzedMoves.length > 0 ? analyzedMoves[analyzedMoves.length - 1].moveNumber : 0;

    // Calculate phase boundaries
    const openingEnd = Math.min(OPENING_END_MOVE, lastMove);
    const middlegameEnd = Math.min(MIDDLEGAME_END_MOVE, lastMove);

    // Get moves for each phase
    const openingMoves = playerMoves.filter((m) => m.moveNumber <= openingEnd);
    const middlegameMoves = playerMoves.filter(
      (m) => m.moveNumber > openingEnd && m.moveNumber <= middlegameEnd
    );
    const endgameMoves = playerMoves.filter((m) => m.moveNumber > middlegameEnd);

    // Calculate accuracy for each phase
    const calcAccuracy = (moves: AnalyzedMove[]): number => {
      if (moves.length === 0) return 0;
      return moves.reduce((sum, m) => sum + m.accuracy, 0) / moves.length;
    };

    return {
      opening: {
        start: 1,
        end: openingEnd,
        accuracy: calcAccuracy(openingMoves),
      },
      middlegame: {
        start: openingEnd + 1,
        end: middlegameEnd,
        accuracy: calcAccuracy(middlegameMoves),
      },
      endgame: {
        start: middlegameEnd + 1,
        end: lastMove,
        accuracy: calcAccuracy(endgameMoves),
      },
    };
  }

  /**
   * Task 4.2.2 & 4.2.3: Calculate summary metrics
   */
  private calculateSummary(
    analyzedMoves: AnalyzedMove[],
    gamePhases: { opening: GamePhase; middlegame: GamePhase; endgame: GamePhase },
    playerColor: 'white' | 'black'
  ): AnalysisSummary {
    const playerMoves = analyzedMoves.filter((m) => m.color === playerColor);

    if (playerMoves.length === 0) {
      return {
        overallAccuracy: 0,
        openingAccuracy: gamePhases.opening.accuracy,
        middlegameAccuracy: gamePhases.middlegame.accuracy,
        endgameAccuracy: gamePhases.endgame.accuracy,
        averageCentipawnLoss: 0,
        blunders: 0,
        mistakes: 0,
        inaccuracies: 0,
        goodMoves: 0,
        excellentMoves: 0,
        totalMoves: 0,
      };
    }

    // Count move classifications
    let blunders = 0;
    let mistakes = 0;
    let inaccuracies = 0;
    let goodMoves = 0;
    let excellentMoves = 0;
    let totalCpl = 0;

    for (const move of playerMoves) {
      switch (move.classification) {
        case 'blunder':
          blunders++;
          break;
        case 'mistake':
          mistakes++;
          break;
        case 'inaccuracy':
          inaccuracies++;
          break;
        case 'good':
          goodMoves++;
          break;
        case 'excellent':
          excellentMoves++;
          break;
      }
      totalCpl += move.centipawnLoss;
    }

    // Calculate overall accuracy (average of all move accuracies)
    const overallAccuracy =
      playerMoves.reduce((sum, m) => sum + m.accuracy, 0) / playerMoves.length;
    const averageCpl = totalCpl / playerMoves.length;

    return {
      overallAccuracy: Math.round(overallAccuracy * 10) / 10,
      openingAccuracy: Math.round(gamePhases.opening.accuracy * 10) / 10,
      middlegameAccuracy: Math.round(gamePhases.middlegame.accuracy * 10) / 10,
      endgameAccuracy: Math.round(gamePhases.endgame.accuracy * 10) / 10,
      averageCentipawnLoss: Math.round(averageCpl),
      blunders,
      mistakes,
      inaccuracies,
      goodMoves,
      excellentMoves,
      totalMoves: playerMoves.length,
    };
  }

  /**
   * Report progress to callback if configured
   */
  private reportProgress(current: number, total: number, phase: string): void {
    if (this.config.onProgress) {
      this.config.onProgress(current, total, phase);
    }
  }

  /**
   * Configure analysis depth
   * Task 4.2.7: Configure analysis depth
   */
  setDepth(depth: number): void {
    this.config.depth = depth;
  }

  /**
   * Enable deep analysis mode
   */
  setDeepAnalysis(enabled: boolean): void {
    this.config.deepAnalysis = enabled;
    if (enabled) {
      this.config.depth = DEEP_ANALYSIS_DEPTH;
    }
  }
}

/**
 * Create an analysis pipeline instance
 */
export function createAnalysisPipeline(
  engine: StockfishEngine,
  config?: Partial<AnalysisConfig>
): AnalysisPipeline {
  return new AnalysisPipeline(engine, config);
}
