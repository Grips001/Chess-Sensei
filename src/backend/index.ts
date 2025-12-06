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
let devMode = false;
{
  const viteHostArg = process.argv.find((arg) => arg.startsWith('--vitehost'));
  viteHost = viteHostArg?.split('=')[1]!;
  // Check for --dev flag to enable developer mode (console + inspector)
  devMode = process.argv.includes('--dev');
}

import { create, events, registerMethodMap } from 'buntralino';
import { createEngine, StockfishEngine } from '../engine/stockfish-engine';
import { AIOpponent } from './ai-opponent';
import {
  createAnalysisPipeline,
  AnalysisPipeline,
  QUICK_ANALYSIS_DEPTH,
  DEEP_ANALYSIS_DEPTH,
  type ExamGameData,
  type GameAnalysis,
} from './analysis-pipeline';
import {
  createMetricsCalculator,
  MetricsCalculator,
  type GameMetrics,
  type CompositeScores,
  type PlayerProfile,
} from './metrics-calculator';
import {
  createDataStorage,
  DataStorage,
  type StoredGameData,
  type StoredAnalysisData,
  type GameIndexEntry,
  type StoredAchievements,
} from './data-storage';
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
import { logger } from './file-logger';
import type { LogRequest } from '../shared/logger-types';

// Initialize logger early (before other initialization)
const executablePath = process.execPath;
logger.initialize(devMode, executablePath).then(() => {
  if (devMode) {
    logger.info('Backend', 'Logger initialized', {
      devMode,
      executablePath,
      argv: process.argv,
      cwd: process.cwd(),
    });
  }
});

if (devMode) {
  console.log('Chess-Sensei Backend initialized (DEV MODE)');
  logger.info('Backend', 'Chess-Sensei Backend initialized (DEV MODE)');
} else {
  console.log('Chess-Sensei Backend initialized');
}

// Global engine instance (persistent in memory per ai-engine.md)
let engine: StockfishEngine | null = null;

// Global AI opponent instance
let aiOpponent: AIOpponent | null = null;

// Global analysis pipeline instance
let analysisPipeline: AnalysisPipeline | null = null;

// Global metrics calculator instance
let metricsCalculator: MetricsCalculator | null = null;

// Global data storage instance
let dataStorage: DataStorage | null = null;

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

// ============================================
// Phase 4: Analysis Pipeline Types
// ============================================

/** Request payload for game analysis */
interface AnalyzeGameRequest {
  /** Complete game data from Exam Mode */
  gameData: ExamGameData;
  /** Whether to run deep analysis (default: false for quick analysis) */
  deepAnalysis?: boolean;
}

/** Response payload for game analysis */
interface GameAnalysisResponse {
  /** Complete analysis result */
  analysis: GameAnalysis;
  /** Success flag */
  success: true;
}

/** Request payload for metrics calculation */
interface CalculateMetricsRequest {
  /** Game analysis to calculate metrics from */
  analysis: GameAnalysis;
  /** Player's color */
  playerColor: 'white' | 'black';
  /** Bot's Elo rating */
  botElo: number;
  /** Game result */
  result: '1-0' | '0-1' | '1/2-1/2';
}

/** Response payload for metrics calculation */
interface GameMetricsResponse {
  /** Calculated game metrics */
  metrics: GameMetrics;
  /** Composite scores (0-100) */
  compositeScores: CompositeScores;
  /** Success flag */
  success: true;
}

// ============================================
// Phase 4: Data Storage Types
// ============================================

/** Request payload for saving a game */
interface SaveGameRequest {
  /** Game data to save */
  gameData: ExamGameData;
}

/** Response payload for save game */
interface SaveGameResponse {
  /** Path where game was saved */
  path: string;
  /** Success flag */
  success: true;
}

/** Request payload for saving analysis */
interface SaveAnalysisRequest {
  /** Analysis data to save */
  analysis: GameAnalysis;
}

/** Response payload for save analysis */
interface SaveAnalysisResponse {
  /** Path where analysis was saved */
  path: string;
  /** Success flag */
  success: true;
}

/** Response payload for games list */
interface GamesListResponse {
  /** List of game index entries */
  games: GameIndexEntry[];
  /** Success flag */
  success: true;
}

/** Request payload for loading a game */
interface LoadGameRequest {
  /** Game ID to load */
  gameId: string;
}

/** Response payload for loading a game */
interface LoadGameResponse {
  /** Loaded game data */
  game: StoredGameData;
  /** Success flag */
  success: true;
}

/** Request payload for loading analysis */
interface LoadAnalysisRequest {
  /** Game ID to load analysis for */
  gameId: string;
}

/** Response payload for loading analysis */
interface LoadAnalysisResponse {
  /** Loaded analysis data */
  analysis: StoredAnalysisData;
  /** Success flag */
  success: true;
}

// ========================================
// Phase 6: Player Progress Types
// ========================================

/** Response payload for loading player profile */
interface PlayerProfileResponse {
  /** Player profile (null if not yet created) */
  profile: PlayerProfile | null;
  /** Success flag */
  success: true;
}

/** Request payload for saving player profile */
interface SavePlayerProfileRequest {
  /** Profile data to save */
  profile: PlayerProfile;
}

/** Response payload for getting achievements */
interface AchievementsResponse {
  /** Achievements data (null if not yet created) */
  achievements: StoredAchievements | null;
  /** Success flag */
  success: true;
}

/** Request payload for unlocking an achievement */
interface UnlockAchievementRequest {
  /** Achievement ID to unlock */
  id: string;
  /** Current progress value */
  progress?: number;
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

    const config = aiOpponent.getConfig();
    return {
      profile: aiOpponent.getProfile(),
      playMode: config.playMode,
      useTimeDelays: config.useTimeDelays,
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

  // ============================================
  // Phase 4: Analysis Pipeline Methods
  // ============================================

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
      if (!engine) {
        await initializeEngine();
      }

      // Create or reuse analysis pipeline
      if (!analysisPipeline) {
        analysisPipeline = createAnalysisPipeline(engine!, {
          depth: payload.deepAnalysis ? DEEP_ANALYSIS_DEPTH : QUICK_ANALYSIS_DEPTH,
          deepAnalysis: payload.deepAnalysis ?? false,
        });
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
      console.error('Analysis error:', error);
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
      if (!metricsCalculator) {
        metricsCalculator = createMetricsCalculator();
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
      console.error('Metrics calculation error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'METRICS_ERROR',
        success: false,
      };
    }
  },

  // ============================================
  // Phase 4: Data Storage Methods
  // ============================================

  /**
   * Initialize data storage
   * Per Task 4.4.1: Initialize directory structure
   */
  initializeStorage: async (): Promise<{ success: true } | ErrorResponse> => {
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      await dataStorage.initialize();
      return { success: true };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'STORAGE_INIT_ERROR',
        success: false,
      };
    }
  },

  /**
   * Save game data
   * Per Task 4.4.7: Implement game save flow
   */
  saveGame: async (payload: SaveGameRequest): Promise<SaveGameResponse | ErrorResponse> => {
    logger.info('IPC:saveGame', 'Saving game data', {
      gameId: payload.gameData?.gameId,
      playerColor: payload.gameData?.playerColor,
      result: payload.gameData?.result,
      moveCount: payload.gameData?.moves?.length,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const path = await dataStorage.saveGame(payload.gameData);
      logger.info('IPC:saveGame', 'Game saved successfully', { path });
      return { path, success: true };
    } catch (error) {
      logger.error('IPC:saveGame', 'Failed to save game', error);
      console.error('Save game error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAVE_GAME_ERROR',
        success: false,
      };
    }
  },

  /**
   * Save analysis data
   * Per Task 4.4.7: Trigger analysis save
   */
  saveAnalysis: async (
    payload: SaveAnalysisRequest
  ): Promise<SaveAnalysisResponse | ErrorResponse> => {
    logger.info('IPC:saveAnalysis', 'Saving analysis data', {
      gameId: payload.analysis?.gameId,
      totalMoves: payload.analysis?.summary?.totalMoves,
      accuracy: payload.analysis?.summary?.overallAccuracy,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const path = await dataStorage.saveAnalysis(payload.analysis);
      logger.info('IPC:saveAnalysis', 'Analysis saved successfully', { path });
      return { path, success: true };
    } catch (error) {
      logger.error('IPC:saveAnalysis', 'Failed to save analysis', error);
      console.error('Save analysis error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAVE_ANALYSIS_ERROR',
        success: false,
      };
    }
  },

  /**
   * Get list of saved games
   */
  getGamesList: async (): Promise<GamesListResponse | ErrorResponse> => {
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const games = await dataStorage.getGamesList();
      return { games, success: true };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GET_GAMES_ERROR',
        success: false,
      };
    }
  },

  /**
   * Load a saved game
   */
  loadGame: async (payload: LoadGameRequest): Promise<LoadGameResponse | ErrorResponse> => {
    logger.info('IPC:loadGame', 'Loading game', { gameId: payload.gameId });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const game = await dataStorage.loadGame(payload.gameId);
      if (!game) {
        logger.warn('IPC:loadGame', 'Game not found', { gameId: payload.gameId });
        return {
          error: `Game not found: ${payload.gameId}`,
          code: 'GAME_NOT_FOUND',
          success: false,
        };
      }
      logger.info('IPC:loadGame', 'Game loaded successfully', {
        gameId: payload.gameId,
        playerColor: game.metadata?.playerColor,
        result: game.metadata?.result,
      });
      return { game, success: true };
    } catch (error) {
      logger.error('IPC:loadGame', 'Failed to load game', error, { gameId: payload.gameId });
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LOAD_GAME_ERROR',
        success: false,
      };
    }
  },

  /**
   * Load analysis for a game
   */
  loadAnalysis: async (
    payload: LoadAnalysisRequest
  ): Promise<LoadAnalysisResponse | ErrorResponse> => {
    logger.info('IPC:loadAnalysis', 'Loading analysis', { gameId: payload.gameId });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const analysis = await dataStorage.loadAnalysis(payload.gameId);
      if (!analysis) {
        logger.warn('IPC:loadAnalysis', 'Analysis not found', { gameId: payload.gameId });
        return {
          error: `Analysis not found for game: ${payload.gameId}`,
          code: 'ANALYSIS_NOT_FOUND',
          success: false,
        };
      }
      logger.info('IPC:loadAnalysis', 'Analysis loaded successfully', {
        gameId: payload.gameId,
        accuracy: analysis.summary?.overallAccuracy,
      });
      return { analysis, success: true };
    } catch (error) {
      logger.error('IPC:loadAnalysis', 'Failed to load analysis', error, {
        gameId: payload.gameId,
      });
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LOAD_ANALYSIS_ERROR',
        success: false,
      };
    }
  },

  /**
   * Get storage base path
   */
  getStoragePath: async (): Promise<{ path: string; success: true }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
    }
    return { path: dataStorage.getStorageBasePath(), success: true };
  },

  // ========================================
  // Phase 6: Player Progress Methods
  // ========================================

  /**
   * Load player profile with aggregated metrics
   */
  loadPlayerProfile: async (): Promise<PlayerProfileResponse | ErrorResponse> => {
    logger.info('IPC:loadPlayerProfile', 'Loading player profile');
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const profile = await dataStorage.loadPlayerProfile();
      logger.info('IPC:loadPlayerProfile', 'Profile loaded', {
        hasProfile: !!profile,
        totalGames: profile?.totalGames,
      });
      return { profile, success: true };
    } catch (error) {
      logger.error('IPC:loadPlayerProfile', 'Failed to load profile', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LOAD_PROFILE_ERROR',
        success: false,
      };
    }
  },

  /**
   * Save updated player profile
   */
  savePlayerProfile: async (
    payload: SavePlayerProfileRequest
  ): Promise<{ success: true } | ErrorResponse> => {
    logger.info('IPC:savePlayerProfile', 'Saving player profile', {
      totalGames: payload.profile?.totalGames,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      await dataStorage.savePlayerProfile(payload.profile);
      logger.info('IPC:savePlayerProfile', 'Profile saved successfully');
      return { success: true };
    } catch (error) {
      logger.error('IPC:savePlayerProfile', 'Failed to save profile', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SAVE_PROFILE_ERROR',
        success: false,
      };
    }
  },

  /**
   * Get achievement list with unlock status
   */
  getAchievements: async (): Promise<AchievementsResponse | ErrorResponse> => {
    logger.info('IPC:getAchievements', 'Loading achievements');
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      const achievements = await dataStorage.loadAchievements();
      logger.info('IPC:getAchievements', 'Achievements loaded', {
        count: achievements?.achievements?.length ?? 0,
      });
      return { achievements, success: true };
    } catch (error) {
      logger.error('IPC:getAchievements', 'Failed to load achievements', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LOAD_ACHIEVEMENTS_ERROR',
        success: false,
      };
    }
  },

  /**
   * Unlock an achievement
   */
  unlockAchievement: async (
    payload: UnlockAchievementRequest
  ): Promise<{ success: true } | ErrorResponse> => {
    logger.info('IPC:unlockAchievement', 'Unlocking achievement', { id: payload.id });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
      }
      let achievements = await dataStorage.loadAchievements();
      if (!achievements) {
        achievements = {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          achievements: [],
        };
      }

      // Check if achievement already exists
      const existingIndex = achievements.achievements.findIndex((a) => a.id === payload.id);
      if (existingIndex >= 0) {
        // Update existing
        achievements.achievements[existingIndex].unlockedAt = new Date().toISOString();
        achievements.achievements[existingIndex].progress = payload.progress ?? 1;
      } else {
        // Add new
        achievements.achievements.push({
          id: payload.id,
          unlockedAt: new Date().toISOString(),
          progress: payload.progress ?? 1,
        });
      }

      achievements.lastUpdated = new Date().toISOString();
      await dataStorage.saveAchievements(achievements);
      logger.info('IPC:unlockAchievement', 'Achievement unlocked', { id: payload.id });
      return { success: true };
    } catch (error) {
      logger.error('IPC:unlockAchievement', 'Failed to unlock achievement', error, {
        id: payload.id,
      });
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNLOCK_ACHIEVEMENT_ERROR',
        success: false,
      };
    }
  },

  // ========================================
  // Debug Logging Methods (--dev mode only)
  // ========================================

  /**
   * Log a message from frontend
   */
  logMessage: async (payload: LogRequest): Promise<{ success: true }> => {
    logger.logFromFrontend(payload);
    return { success: true };
  },

  /**
   * Get log file path
   */
  getLogPath: async (): Promise<{ path: string; enabled: boolean; success: true }> => {
    return {
      path: logger.getLogFilePath(),
      enabled: logger.isEnabled(),
      success: true,
    };
  },

  /**
   * Check if debug logging is enabled
   */
  isLoggingEnabled: async (): Promise<{ enabled: boolean; success: true }> => {
    return { enabled: logger.isEnabled(), success: true };
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
  // Enable inspector (DevTools) only in dev mode
  enableInspector: devMode,
});

// Exit the app completely when the main window is closed without the `shutdown` command.
events.on('close', (windowName: string) => {
  if (windowName === 'main') {
    process.exit();
  }
});
