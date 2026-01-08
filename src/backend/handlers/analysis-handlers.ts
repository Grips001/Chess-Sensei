/**
 * Analysis Pipeline IPC Handlers
 * Handles game analysis and metrics calculation
 */

import type { StockfishEngine } from '../../engine/stockfish-engine';
import {
  createAnalysisPipeline,
  type AnalysisPipeline,
  QUICK_ANALYSIS_DEPTH,
  DEEP_ANALYSIS_DEPTH,
} from '../analysis-pipeline';
import { createMetricsCalculator, type MetricsCalculator } from '../metrics-calculator';
import { logger } from '../file-logger';
import type {
  AnalyzeGameRequest,
  GameAnalysisResponse,
  CalculateMetricsRequest,
  GameMetricsResponse,
  ErrorResponse,
} from './ipc-types';

export interface AnalysisHandlersDeps {
  getEngine: () => StockfishEngine | null;
  initializeEngine: () => Promise<void>;
  getAnalysisPipeline: () => AnalysisPipeline | null;
  setAnalysisPipeline: (pipeline: AnalysisPipeline) => void;
  getMetricsCalculator: () => MetricsCalculator | null;
  setMetricsCalculator: (calculator: MetricsCalculator) => void;
}

export function createAnalysisHandlers(deps: AnalysisHandlersDeps) {
  const {
    getEngine,
    initializeEngine,
    getAnalysisPipeline,
    setAnalysisPipeline,
    getMetricsCalculator,
    setMetricsCalculator,
  } = deps;

  async function ensureEngine(): Promise<StockfishEngine> {
    let engine = getEngine();
    if (!engine) {
      await initializeEngine();
      engine = getEngine();
    }
    if (!engine) {
      throw new Error('Engine failed to initialize');
    }
    return engine;
  }

  return {
    /**
     * Analyze an Exam Mode game
     * Per Task 4.2.1: Implement analysis pipeline
     *
     * This runs the full post-game analysis pipeline:
     * 1. Extract all positions
     * 2. Batch analysis with Stockfish
     * 3. Calculate centipawn loss per move
     * 4. Classify moves
     * 5. Detect tactical motifs
     * 6. Identify critical moments
     * 7. Determine game phases
     * 8. Calculate summary metrics
     */
    analyzeGame: async (
      payload: AnalyzeGameRequest
    ): Promise<GameAnalysisResponse | ErrorResponse> => {
      try {
        const engine = await ensureEngine();

        // Create or reuse analysis pipeline
        let analysisPipeline = getAnalysisPipeline();
        if (!analysisPipeline) {
          analysisPipeline = createAnalysisPipeline(engine, {
            depth: payload.deepAnalysis ? DEEP_ANALYSIS_DEPTH : QUICK_ANALYSIS_DEPTH,
            deepAnalysis: payload.deepAnalysis ?? false,
          });
          setAnalysisPipeline(analysisPipeline);
        } else {
          // Update config for this analysis
          analysisPipeline.setDeepAnalysis(payload.deepAnalysis ?? false);
        }

        console.log(
          `Starting ${payload.deepAnalysis ? 'deep' : 'quick'} analysis for game ${payload.gameData.gameId}`
        );

        const analysis = await analysisPipeline.analyzeGame(payload.gameData);

        console.log(
          `Analysis complete: ${analysis.summary.totalMoves} moves, ` +
            `${analysis.summary.overallAccuracy}% accuracy, ` +
            `${analysis.summary.blunders} blunders, ${analysis.summary.mistakes} mistakes`
        );

        return {
          analysis,
          success: true,
        };
      } catch (error) {
        logger.error('IPC:analyzeGame', 'Analysis error', error);
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'ANALYSIS_ERROR',
          success: false,
        };
      }
    },

    /**
     * Get analysis configuration info
     */
    getAnalysisConfig: async (): Promise<{
      quickDepth: number;
      deepDepth: number;
      success: true;
    }> => {
      return {
        quickDepth: QUICK_ANALYSIS_DEPTH,
        deepDepth: DEEP_ANALYSIS_DEPTH,
        success: true,
      };
    },

    /**
     * Calculate metrics from game analysis
     * Per Task 4.3: Implement metrics calculation
     *
     * Calculates all 9 composite indexes:
     * 1. Precision Score
     * 2. Tactical Danger Score
     * 3. Stability Score
     * 4. Conversion Score
     * 5. Preparation Score
     * 6. Positional & Structure Score
     * 7. Aggression & Risk Score
     * 8. Simplification Preference Score
     * 9. Training Transfer Score
     */
    calculateMetrics: async (
      payload: CalculateMetricsRequest
    ): Promise<GameMetricsResponse | ErrorResponse> => {
      try {
        // Create metrics calculator if needed
        let metricsCalculator = getMetricsCalculator();
        if (!metricsCalculator) {
          metricsCalculator = createMetricsCalculator();
          setMetricsCalculator(metricsCalculator);
        }

        // Calculate game-level metrics
        const metrics = metricsCalculator.calculateGameMetrics(
          payload.analysis,
          payload.playerColor,
          payload.botElo,
          payload.result
        );

        // Determine if player was winning at any point
        const playerMoves = payload.analysis.moveAnalysis.filter(
          (m) => m.color === payload.playerColor
        );
        const wasWinning = playerMoves.some((m) => m.evaluationBefore >= 200);

        // Determine if player won
        const playerWon =
          (payload.result === '1-0' && payload.playerColor === 'white') ||
          (payload.result === '0-1' && payload.playerColor === 'black');

        // Calculate composite scores
        const compositeScores = metricsCalculator.calculateCompositeScores(
          metrics,
          wasWinning,
          playerWon
        );

        console.log(
          `Metrics calculated: Precision=${compositeScores.precision}, ` +
            `Tactical=${compositeScores.tacticalDanger}, ` +
            `Stability=${compositeScores.stability}`
        );

        return {
          metrics,
          compositeScores,
          success: true,
        };
      } catch (error) {
        logger.error('IPC:calculateMetrics', 'Metrics calculation error', error);
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'METRICS_ERROR',
          success: false,
        };
      }
    },
  };
}

export type AnalysisHandlers = ReturnType<typeof createAnalysisHandlers>;
