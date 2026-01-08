/**
 * Core Engine IPC Handlers
 * Handles position evaluation, best moves, and move analysis
 */

import type { StockfishEngine } from '../../engine/stockfish-engine';
import type { GetBestMovesOptions } from '../../shared/engine-types';
import { formatScore } from '../../shared/engine-types';
import type {
  PositionRequest,
  AnalyzeMoveRequest,
  BestMovesResponse,
  EvaluationResponse,
  MoveAnalysisResponse,
  ErrorResponse,
} from './ipc-types';

export interface EngineHandlersDeps {
  getEngine: () => StockfishEngine | null;
  initializeEngine: () => Promise<void>;
}

export function createEngineHandlers(deps: EngineHandlersDeps) {
  const { getEngine, initializeEngine } = deps;

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
     * Health check / test method
     */
    sayHello: async (payload: { message: string }) => {
      return `Chess-Sensei Backend: ${payload.message}`;
    },

    /**
     * Start a new game
     * Clears engine hash tables and resets state
     */
    startNewGame: async (): Promise<{ success: true } | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        await engine.newGame();
        return { success: true };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'NEW_GAME_ERROR',
          success: false,
        };
      }
    },

    /**
     * Get best move recommendations for a position
     * Per Task 1.4.1: Register requestBestMoves method
     */
    requestBestMoves: async (
      payload: PositionRequest
    ): Promise<BestMovesResponse | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        await engine.setPosition(payload.fen, payload.moves);

        const options: GetBestMovesOptions = {
          depth: payload.depth,
          movetime: payload.movetime,
          count: payload.count ?? 1,
        };

        const moves = await engine.getBestMoves(options);

        return {
          moves,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'BEST_MOVES_ERROR',
          success: false,
        };
      }
    },

    /**
     * Evaluate a position
     * Per Task 1.4.1: Register evaluatePosition method
     */
    evaluatePosition: async (
      payload: PositionRequest
    ): Promise<EvaluationResponse | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        await engine.setPosition(payload.fen, payload.moves);

        const options: GetBestMovesOptions = {
          depth: payload.depth,
          movetime: payload.movetime,
        };

        const evaluation = await engine.evaluatePosition(options);
        const formattedScore = formatScore(evaluation.score);

        return {
          evaluation,
          formattedScore,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'EVALUATION_ERROR',
          success: false,
        };
      }
    },

    /**
     * Analyze a played move
     * Returns centipawn loss and classification
     */
    analyzeMove: async (
      payload: AnalyzeMoveRequest
    ): Promise<MoveAnalysisResponse | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        const analysis = await engine.analyzeMove(payload.fen, payload.playedMove, {
          depth: payload.depth,
        });

        return {
          analysis,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'ANALYSIS_ERROR',
          success: false,
        };
      }
    },

    /**
     * Get the top 3 best moves (for Training Mode guidance)
     * Per move-guidance.md: Returns blue/green/yellow highlighted moves
     */
    getGuidanceMoves: async (
      payload: PositionRequest
    ): Promise<BestMovesResponse | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        await engine.setPosition(payload.fen, payload.moves);

        const moves = await engine.getBestMoves({
          depth: payload.depth ?? 15,
          count: 3, // Always top 3 for guidance
        });

        return {
          moves,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'GUIDANCE_ERROR',
          success: false,
        };
      }
    },

    /**
     * Set engine skill level (for bot difficulty)
     * Per ai-engine.md: Skill level 0-20
     */
    setSkillLevel: async (payload: {
      level: number;
    }): Promise<{ success: true } | ErrorResponse> => {
      try {
        const engine = await ensureEngine();
        const level = Math.max(0, Math.min(20, payload.level));
        await engine.setOption('Skill Level', level);

        return { success: true };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'SKILL_LEVEL_ERROR',
          success: false,
        };
      }
    },

    /**
     * Get engine status
     */
    getEngineStatus: async (): Promise<{
      initialized: boolean;
      success: true;
    }> => {
      const engine = getEngine();
      return {
        initialized: engine?.isInitialized() ?? false,
        success: true,
      };
    },
  };
}

export type EngineHandlers = ReturnType<typeof createEngineHandlers>;
