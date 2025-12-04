/**
 * Chess-Sensei Backend Entry Point
 *
 * This file initializes the Bun backend and sets up IPC with the frontend.
 * Provides engine operations and game logic via Buntralino IPC.
 *
 * @see source-docs/architecture.md - "Backend / Logic Layer"
 * @see source-docs/ai-engine.md - "WASM Integration in Buntralino"
 */

let viteHost: string | null = null;
{
  const viteHostArg = process.argv.find((arg) => arg.startsWith('--vitehost'));
  viteHost = viteHostArg?.split('=')[1]!;
}

import { create, events, registerMethodMap } from 'buntralino';
import { createEngine, StockfishEngine } from '../engine/stockfish-engine';
import type {
  BestMove,
  PositionEvaluation,
  MoveAnalysis,
  GetBestMovesOptions,
} from '../shared/engine-types';
import { formatScore } from '../shared/engine-types';

console.log('Chess-Sensei Backend initialized');

// Global engine instance (persistent in memory per ai-engine.md)
let engine: StockfishEngine | null = null;

/**
 * Initialize the chess engine
 * Called once on backend startup
 */
async function initializeEngine(): Promise<void> {
  if (engine) {
    console.log('Engine already initialized');
    return;
  }

  console.log('Initializing Stockfish engine...');
  engine = await createEngine();
  console.log('Stockfish engine ready');
}

// Initialize engine on startup
initializeEngine().catch((error) => {
  console.error('Failed to initialize engine:', error);
});

/**
 * IPC Request/Response Types
 * Per Task 1.4.2: Define structured JSON payloads
 */

/** Request payload for position-based operations */
interface PositionRequest {
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
interface AnalyzeMoveRequest {
  /** Position FEN before the move */
  fen: string;
  /** The move that was played (UCI format) */
  playedMove: string;
  /** Analysis depth */
  depth?: number;
}

/** Response payload for best moves */
interface BestMovesResponse {
  /** Array of best moves with evaluations */
  moves: BestMove[];
  /** Success flag */
  success: true;
}

/** Response payload for position evaluation */
interface EvaluationResponse {
  /** Full position evaluation */
  evaluation: PositionEvaluation;
  /** Formatted score string (e.g., "+1.5", "M3") */
  formattedScore: string;
  /** Success flag */
  success: true;
}

/** Response payload for move analysis */
interface MoveAnalysisResponse {
  /** Move analysis result */
  analysis: MoveAnalysis;
  /** Success flag */
  success: true;
}

/** Error response payload */
interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code: string;
  /** Success flag */
  success: false;
}

/**
 * Function map that allows running named functions with `buntralino.run` on the client (Neutralino) side.
 *
 * Per architecture.md: All frontend↔backend communication goes through Buntralino
 * Per ai-engine.md: Backend maintains persistent engine instance
 */
const functionMap = {
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
      if (!engine) {
        await initializeEngine();
      }
      await engine!.newGame();
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
      if (!engine) {
        await initializeEngine();
      }

      await engine!.setPosition(payload.fen, payload.moves);

      const options: GetBestMovesOptions = {
        depth: payload.depth,
        movetime: payload.movetime,
        count: payload.count ?? 1,
      };

      const moves = await engine!.getBestMoves(options);

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
      if (!engine) {
        await initializeEngine();
      }

      await engine!.setPosition(payload.fen, payload.moves);

      const options: GetBestMovesOptions = {
        depth: payload.depth,
        movetime: payload.movetime,
      };

      const evaluation = await engine!.evaluatePosition(options);
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
      if (!engine) {
        await initializeEngine();
      }

      const analysis = await engine!.analyzeMove(payload.fen, payload.playedMove, {
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
      if (!engine) {
        await initializeEngine();
      }

      await engine!.setPosition(payload.fen, payload.moves);

      const moves = await engine!.getBestMoves({
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
  setSkillLevel: async (payload: { level: number }): Promise<{ success: true } | ErrorResponse> => {
    try {
      if (!engine) {
        await initializeEngine();
      }

      const level = Math.max(0, Math.min(20, payload.level));
      await engine!.setOption('Skill Level', level);

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
    return {
      initialized: engine?.isInitialized() ?? false,
      success: true,
    };
  },
};

registerMethodMap(functionMap);

// Export types for frontend use
export type {
  PositionRequest,
  AnalyzeMoveRequest,
  BestMovesResponse,
  EvaluationResponse,
  MoveAnalysisResponse,
  ErrorResponse,
};

await create(viteHost ?? '/', {
  // Name windows to easily manipulate them and distinguish them in events
  name: 'main',
  // We need this option to add Neutralino globals to the Vite-hosted page
  injectGlobals: true,
  // Any options for Neutralino.window.create can go here
});

// Exit the app completely when the main window is closed without the `shutdown` command.
events.on('close', (windowName: string) => {
  if (windowName === 'main') {
    process.exit();
  }
});
