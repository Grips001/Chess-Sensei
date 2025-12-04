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
import { AIOpponent } from './ai-opponent';
import type {
  BestMove,
  PositionEvaluation,
  MoveAnalysis,
  GetBestMovesOptions,
} from '../shared/engine-types';
import { formatScore } from '../shared/engine-types';
import type { BotPersonality, BotProfile, AIPlayMode, DifficultyPreset } from '../shared/bot-types';
import {
  BOT_PERSONALITIES,
  DIFFICULTY_PRESETS,
  createBotProfileFromElo,
  applyDifficultyPreset,
} from '../shared/bot-types';

console.log('Chess-Sensei Backend initialized');

// Global engine instance (persistent in memory per ai-engine.md)
let engine: StockfishEngine | null = null;

// Global AI opponent instance
let aiOpponent: AIOpponent | null = null;

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

/** Request payload for configuring bot opponent */
interface ConfigureBotRequest {
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
interface BotMoveRequest {
  /** Position in FEN notation */
  fen: string;
  /** Optional moves from FEN position (UCI format) */
  moves?: string[];
}

/** Response payload for bot move */
interface BotMoveResponse {
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
interface BotProfilesResponse {
  /** Available bot profiles */
  profiles: BotProfile[];
  /** Success flag */
  success: true;
}

/** Response payload for current bot config */
interface BotConfigResponse {
  /** Current bot profile */
  profile: BotProfile | null;
  /** Current play mode */
  playMode: AIPlayMode | null;
  /** Whether time delays are enabled */
  useTimeDelays: boolean;
  /** Success flag */
  success: true;
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

  // ============================================
  // Phase 3: AI Opponent Methods
  // ============================================

  /**
   * Configure the AI opponent
   * Per Task 3.1.1: Implement bot move selection from engine
   * Per Task 3.1.2: Add configurable difficulty levels
   * Per Task 3.1.3: Implement bot personalities
   * Per Task 3.1.4: Implement preset difficulty modes
   * Per Task 3.1.5: Implement Training vs. Punishing modes
   */
  configureBot: async (
    payload: ConfigureBotRequest
  ): Promise<BotConfigResponse | ErrorResponse> => {
    try {
      if (!engine) {
        await initializeEngine();
      }

      // Start with a base profile
      let profile: BotProfile;

      if (payload.targetElo) {
        // Create profile from Elo rating
        profile = createBotProfileFromElo(payload.targetElo, payload.personality);
      } else if (payload.personality) {
        // Use predefined personality
        profile = { ...BOT_PERSONALITIES[payload.personality] };
      } else {
        // Default to club player
        profile = { ...BOT_PERSONALITIES.club_player };
      }

      // Apply difficulty preset if specified
      if (payload.difficultyPreset) {
        profile = applyDifficultyPreset(profile, payload.difficultyPreset);
      }

      // Create or update AI opponent
      const playMode = payload.playMode ?? 'training';
      const useTimeDelays = payload.useTimeDelays ?? true;

      aiOpponent = new AIOpponent(engine!, {
        profile,
        playMode,
        useTimeDelays,
      });

      console.log(`Bot configured: ${profile.name} (Elo ${profile.targetElo}), mode: ${playMode}`);

      return {
        profile: aiOpponent.getProfile(),
        playMode,
        useTimeDelays,
        success: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CONFIGURE_BOT_ERROR',
        success: false,
      };
    }
  },

  /**
   * Get move from AI opponent for the current position
   * Per Task 3.1.1: Implement bot move selection from engine
   * Per Task 3.1.6: Add response time delays
   */
  getBotMove: async (payload: BotMoveRequest): Promise<BotMoveResponse | ErrorResponse> => {
    try {
      if (!engine) {
        await initializeEngine();
      }

      // Create default opponent if not configured
      if (!aiOpponent) {
        aiOpponent = new AIOpponent(engine!, {
          profile: BOT_PERSONALITIES.club_player,
          playMode: 'training',
          useTimeDelays: true,
        });
      }

      const startTime = Date.now();
      const result = await aiOpponent.selectMove(payload.fen, payload.moves);
      const actualTime = Date.now() - startTime;

      // Wait for thinking time delay if enabled
      await aiOpponent.waitForThinkingTime(result.thinkingTime, actualTime);

      return {
        move: result.move,
        score: result.score,
        thinkingTime: result.thinkingTime,
        wasWeakened: result.wasWeakened,
        classification: result.classification,
        success: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BOT_MOVE_ERROR',
        success: false,
      };
    }
  },

  /**
   * Get all available bot personalities
   * Per Task 3.1.3: Implement bot personalities
   */
  getBotProfiles: async (): Promise<BotProfilesResponse> => {
    return {
      profiles: Object.values(BOT_PERSONALITIES),
      success: true,
    };
  },

  /**
   * Get current bot configuration
   */
  getCurrentBotConfig: async (): Promise<BotConfigResponse> => {
    if (!aiOpponent) {
      return {
        profile: null,
        playMode: null,
        useTimeDelays: true,
        success: true,
      };
    }

    return {
      profile: aiOpponent.getProfile(),
      playMode: (aiOpponent as any).config?.playMode ?? 'training',
      useTimeDelays: (aiOpponent as any).config?.useTimeDelays ?? true,
      success: true,
    };
  },

  /**
   * Get difficulty presets
   * Per Task 3.1.4: Implement preset difficulty modes
   */
  getDifficultyPresets: async (): Promise<{
    presets: Record<DifficultyPreset, Partial<BotProfile>>;
    success: true;
  }> => {
    return {
      presets: DIFFICULTY_PRESETS,
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
