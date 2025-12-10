/**
 * Chess-Sensei Backend Entry Point
 *
 * This file initializes the Bun backend and sets up IPC with the frontend.
 * Provides engine operations and game logic via WebSocket IPC (port 9339).
 */

let devMode = false;
{
  // Check for --dev flag to enable developer mode (console + inspector)
  devMode = process.argv.includes('--dev');
}

import { createWebSocketServer, WebSocketServer } from './websocket-server';
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
import {
  createExportImportManager,
  ExportImportManager,
  type ExportResult,
  type ImportResult,
  type ExportImportError,
} from './export-import';
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

// Global export/import manager instance
let exportImportManager: ExportImportManager | null = null;

// Global WebSocket server instance for real-time streaming
let wsServer: WebSocketServer | null = null;

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

// ========================================
// Phase 8: Export/Import Types
// ========================================

/** Request payload for exporting a single game */
interface ExportGameRequest {
  /** Game ID to export */
  gameId: string;
  /** Export format */
  format: 'pgn' | 'json';
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for exporting all games */
interface ExportAllGamesRequest {
  /** Optional destination path */
  destinationPath?: string;
  /** Include analysis data */
  includeAnalysis?: boolean;
}

/** Request payload for exporting player profile */
interface ExportProfileRequest {
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for full backup */
interface ExportBackupRequest {
  /** Optional destination path */
  destinationPath?: string;
}

/** Request payload for importing a single game */
interface ImportGameRequest {
  /** Path to the file to import */
  filePath: string;
  /** Format of the file */
  format: 'json' | 'pgn';
}

/** Request payload for importing batch games */
interface ImportBatchRequest {
  /** Path to the batch JSON file */
  filePath: string;
}

/** Request payload for merging profiles */
interface MergeProfilesRequest {
  /** Path to the profile file to merge */
  filePath: string;
}

/** Response payload for export operations */
interface ExportResponse {
  /** Export result details */
  result: ExportResult;
  /** Success flag */
  success: true;
}

/** Response payload for import operations */
interface ImportResponse {
  /** Import result details */
  result: ImportResult;
  /** Success flag */
  success: true;
}

/** Response payload for single game import */
interface ImportGameResponse {
  /** Imported game data */
  game: StoredGameData;
  /** Analysis data if available */
  analysis?: StoredAnalysisData;
  /** Whether analysis is needed */
  needsAnalysis?: boolean;
  /** Success flag */
  success: true;
}

/**
 * Function map that allows running named functions with `ipc.call()` on the client (Neutralino) side.
 *
 * Per architecture.md: All frontend↔backend communication goes through WebSocket IPC (port 9339)
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
      logger.error('IPC:calculateMetrics', 'Metrics calculation error', error);
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
  // Phase 8: Export/Import Methods
  // ========================================

  /**
   * Export a single game as PGN or JSON
   * Per Task 8.1.1: Export single game (PGN)
   * Per Task 8.1.2: Export single game (JSON)
   */
  exportGame: async (payload: ExportGameRequest): Promise<ExportResponse | ErrorResponse> => {
    logger.info('IPC:exportGame', 'Exporting game', {
      gameId: payload.gameId,
      format: payload.format,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Load game data
      const game = await dataStorage.loadGame(payload.gameId);
      if (!game) {
        return {
          success: false,
          error: `Game not found: ${payload.gameId}`,
          code: 'GAME_NOT_FOUND',
        };
      }

      let result: ExportResult | ExportImportError;

      if (payload.format === 'pgn') {
        result = await exportImportManager.exportGameAsPGN(game, payload.destinationPath);
      } else {
        // Load analysis if available
        const analysis = await dataStorage.loadAnalysis(payload.gameId);
        result = await exportImportManager.exportGameAsJSON(
          game,
          analysis ?? undefined,
          payload.destinationPath
        );
      }

      if (!result.success) {
        return result as ErrorResponse;
      }

      logger.info('IPC:exportGame', 'Game exported successfully', {
        path: (result as ExportResult).path,
      });
      return { result: result as ExportResult, success: true };
    } catch (error) {
      logger.error('IPC:exportGame', 'Failed to export game', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPORT_ERROR',
      };
    }
  },

  /**
   * Export all games as batch JSON
   * Per Task 8.1.3: Export all games (batch JSON)
   */
  exportAllGames: async (
    payload: ExportAllGamesRequest
  ): Promise<ExportResponse | ErrorResponse> => {
    logger.info('IPC:exportAllGames', 'Exporting all games', {
      includeAnalysis: payload.includeAnalysis,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Load all games in parallel for better performance
      const gamesList = await dataStorage.getGamesList();

      // Load games in parallel
      const gamePromises = gamesList.map((entry) => dataStorage!.loadGame(entry.gameId));
      const loadedGames = await Promise.all(gamePromises);
      const games = loadedGames.filter((g): g is StoredGameData => g !== null);

      // Load analyses in parallel if requested
      let analyses: StoredAnalysisData[] = [];
      if (payload.includeAnalysis) {
        const analysisPromises = games.map((game) => dataStorage!.loadAnalysis(game.gameId));
        const loadedAnalyses = await Promise.all(analysisPromises);
        analyses = loadedAnalyses.filter((a): a is StoredAnalysisData => a !== null);
      }

      const result = await exportImportManager.exportAllGames(
        games,
        payload.includeAnalysis ? analyses : undefined,
        payload.destinationPath
      );

      if (!result.success) {
        return result as ErrorResponse;
      }

      logger.info('IPC:exportAllGames', 'All games exported', {
        count: games.length,
        path: (result as ExportResult).path,
      });
      return { result: result as ExportResult, success: true };
    } catch (error) {
      logger.error('IPC:exportAllGames', 'Failed to export all games', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPORT_ALL_ERROR',
      };
    }
  },

  /**
   * Export player profile as JSON
   * Per Task 8.1.4: Export player profile (JSON)
   */
  exportProfile: async (payload: ExportProfileRequest): Promise<ExportResponse | ErrorResponse> => {
    logger.info('IPC:exportProfile', 'Exporting player profile');
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Load player profile
      const profile = await dataStorage.loadPlayerProfile();
      if (!profile) {
        return {
          success: false,
          error: 'No player profile found',
          code: 'PROFILE_NOT_FOUND',
        };
      }

      const result = await exportImportManager.exportPlayerProfile(
        profile,
        payload.destinationPath
      );

      if (!result.success) {
        return result as ErrorResponse;
      }

      logger.info('IPC:exportProfile', 'Profile exported', { path: (result as ExportResult).path });
      return { result: result as ExportResult, success: true };
    } catch (error) {
      logger.error('IPC:exportProfile', 'Failed to export profile', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPORT_PROFILE_ERROR',
      };
    }
  },

  /**
   * Export full backup (all games, analyses, and profile)
   * Per Task 8.1.5: Export full backup
   */
  exportBackup: async (payload: ExportBackupRequest): Promise<ExportResponse | ErrorResponse> => {
    logger.info('IPC:exportBackup', 'Creating full backup');
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Load all games in parallel for better performance
      const gamesList = await dataStorage.getGamesList();

      // Load games in parallel
      const gamePromises = gamesList.map((entry) => dataStorage!.loadGame(entry.gameId));
      const loadedGames = await Promise.all(gamePromises);
      const games = loadedGames.filter((g): g is StoredGameData => g !== null);

      // Load analyses in parallel
      const analysisPromises = games.map((game) => dataStorage!.loadAnalysis(game.gameId));
      const loadedAnalyses = await Promise.all(analysisPromises);
      const analyses = loadedAnalyses.filter((a): a is StoredAnalysisData => a !== null);

      // Load profile
      const profile = await dataStorage.loadPlayerProfile();

      const result = await exportImportManager.exportFullBackup(
        games,
        analyses,
        profile,
        payload.destinationPath
      );

      if (!result.success) {
        return result as ErrorResponse;
      }

      logger.info('IPC:exportBackup', 'Full backup created', {
        games: games.length,
        path: (result as ExportResult).path,
      });
      return { result: result as ExportResult, success: true };
    } catch (error) {
      logger.error('IPC:exportBackup', 'Failed to create backup', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BACKUP_ERROR',
      };
    }
  },

  /**
   * Import a single game from JSON or PGN
   * Per Task 8.2.1: Import single game (JSON)
   * Per Task 8.2.3: Import from PGN
   */
  importGame: async (payload: ImportGameRequest): Promise<ImportGameResponse | ErrorResponse> => {
    logger.info('IPC:importGame', 'Importing game', {
      path: payload.filePath,
      format: payload.format,
    });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Get existing game IDs for duplicate detection
      const gamesList = await dataStorage.getGamesList();
      const existingIds = new Set(gamesList.map((g) => g.gameId));

      if (payload.format === 'pgn') {
        const result = await exportImportManager.importFromPGN(payload.filePath);
        if ('success' in result && result.success === false) {
          return result as ErrorResponse;
        }
        const pgnResult = result as { game: StoredGameData; needsAnalysis: true };

        // Save the imported game
        await dataStorage.saveGame({
          gameId: pgnResult.game.gameId,
          timestamp: new Date(pgnResult.game.timestamp).getTime(),
          playerColor: pgnResult.game.metadata.playerColor,
          botPersonality: pgnResult.game.metadata.botPersonality,
          botElo: pgnResult.game.metadata.botElo,
          result: pgnResult.game.metadata.result,
          termination: pgnResult.game.metadata.termination,
          duration: pgnResult.game.metadata.duration,
          moves: pgnResult.game.moves.flatMap((m, _i) => {
            const moves = [];
            if (m.white) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'white' as const,
                san: m.white.san,
                uci: m.white.uci,
                fen: m.white.fen,
                timestamp: m.white.timestamp,
                timeSpent: m.white.timeSpent,
              });
            }
            if (m.black) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'black' as const,
                san: m.black.san,
                uci: m.black.uci,
                fen: m.black.fen,
                timestamp: m.black.timestamp,
                timeSpent: m.black.timeSpent,
              });
            }
            return moves;
          }),
          pgn: pgnResult.game.pgn,
        });

        logger.info('IPC:importGame', 'PGN game imported', { gameId: pgnResult.game.gameId });
        return {
          game: pgnResult.game,
          needsAnalysis: true,
          success: true,
        };
      } else {
        const result = await exportImportManager.importGameFromJSON(payload.filePath, existingIds);
        if ('success' in result && result.success === false) {
          return result as ErrorResponse;
        }
        const jsonResult = result as { game: StoredGameData; analysis?: StoredAnalysisData };

        // Save the imported game
        await dataStorage.saveGame({
          gameId: jsonResult.game.gameId,
          timestamp: new Date(jsonResult.game.timestamp).getTime(),
          playerColor: jsonResult.game.metadata.playerColor,
          botPersonality: jsonResult.game.metadata.botPersonality,
          botElo: jsonResult.game.metadata.botElo,
          result: jsonResult.game.metadata.result,
          termination: jsonResult.game.metadata.termination,
          duration: jsonResult.game.metadata.duration,
          moves: jsonResult.game.moves.flatMap((m) => {
            const moves = [];
            if (m.white) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'white' as const,
                san: m.white.san,
                uci: m.white.uci,
                fen: m.white.fen,
                timestamp: m.white.timestamp,
                timeSpent: m.white.timeSpent,
              });
            }
            if (m.black) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'black' as const,
                san: m.black.san,
                uci: m.black.uci,
                fen: m.black.fen,
                timestamp: m.black.timestamp,
                timeSpent: m.black.timeSpent,
              });
            }
            return moves;
          }),
          pgn: jsonResult.game.pgn,
        });

        // Save analysis if available
        if (jsonResult.analysis) {
          await dataStorage.saveAnalysis({
            gameId: jsonResult.analysis.gameId,
            analysisVersion: jsonResult.analysis.analysisVersion,
            analysisTimestamp: jsonResult.analysis.analysisTimestamp,
            engineVersion: jsonResult.analysis.engineVersion,
            summary: {
              ...jsonResult.analysis.summary,
              totalMoves: jsonResult.game.moves.length,
            },
            moveAnalysis: jsonResult.analysis.moveAnalysis,
            criticalMoments: jsonResult.analysis.criticalMoments,
            tacticalOpportunities: jsonResult.analysis.tacticalOpportunities,
            gamePhases: jsonResult.analysis.gamePhases,
          });
        }

        logger.info('IPC:importGame', 'JSON game imported', { gameId: jsonResult.game.gameId });
        return {
          game: jsonResult.game,
          analysis: jsonResult.analysis,
          needsAnalysis: !jsonResult.analysis,
          success: true,
        };
      }
    } catch (error) {
      logger.error('IPC:importGame', 'Failed to import game', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'IMPORT_ERROR',
      };
    }
  },

  /**
   * Import multiple games from batch JSON
   * Per Task 8.2.2: Import game collection (batch JSON)
   */
  importBatchGames: async (
    payload: ImportBatchRequest
  ): Promise<ImportResponse | ErrorResponse> => {
    logger.info('IPC:importBatchGames', 'Importing batch games', { path: payload.filePath });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Get existing game IDs for duplicate detection
      const gamesList = await dataStorage.getGamesList();
      const existingIds = new Set(gamesList.map((g) => g.gameId));

      const result = await exportImportManager.importBatchGames(payload.filePath, existingIds);
      if ('success' in result && result.success === false) {
        return result as ErrorResponse;
      }

      const batchResult = result as {
        games: StoredGameData[];
        analyses: StoredAnalysisData[];
        result: ImportResult;
      };

      // Save imported games in parallel for better performance
      const saveGamePromises = batchResult.games.map((game) =>
        dataStorage!.saveGame({
          gameId: game.gameId,
          timestamp: new Date(game.timestamp).getTime(),
          playerColor: game.metadata.playerColor,
          botPersonality: game.metadata.botPersonality,
          botElo: game.metadata.botElo,
          result: game.metadata.result,
          termination: game.metadata.termination,
          duration: game.metadata.duration,
          moves: game.moves.flatMap((m) => {
            const moves = [];
            if (m.white) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'white' as const,
                san: m.white.san,
                uci: m.white.uci,
                fen: m.white.fen,
                timestamp: m.white.timestamp,
                timeSpent: m.white.timeSpent,
              });
            }
            if (m.black) {
              moves.push({
                moveNumber: m.moveNumber,
                color: 'black' as const,
                san: m.black.san,
                uci: m.black.uci,
                fen: m.black.fen,
                timestamp: m.black.timestamp,
                timeSpent: m.black.timeSpent,
              });
            }
            return moves;
          }),
          pgn: game.pgn,
        })
      );
      await Promise.all(saveGamePromises);

      // Save imported analyses in parallel
      const saveAnalysisPromises = batchResult.analyses.map((analysis) => {
        // Calculate totalMoves from moveAnalysis if not present in summary
        const totalMoves =
          'totalMoves' in analysis.summary
            ? (analysis.summary as { totalMoves: number }).totalMoves
            : analysis.moveAnalysis.length;

        return dataStorage!.saveAnalysis({
          gameId: analysis.gameId,
          analysisVersion: analysis.analysisVersion,
          analysisTimestamp: analysis.analysisTimestamp,
          engineVersion: analysis.engineVersion,
          summary: {
            ...analysis.summary,
            totalMoves,
          },
          moveAnalysis: analysis.moveAnalysis,
          criticalMoments: analysis.criticalMoments,
          tacticalOpportunities: analysis.tacticalOpportunities,
          gamePhases: analysis.gamePhases,
        });
      });
      await Promise.all(saveAnalysisPromises);

      logger.info('IPC:importBatchGames', 'Batch import complete', {
        imported: batchResult.result.imported,
        skipped: batchResult.result.skipped,
        errors: batchResult.result.errors,
      });
      return { result: batchResult.result, success: true };
    } catch (error) {
      logger.error('IPC:importBatchGames', 'Failed to import batch games', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BATCH_IMPORT_ERROR',
      };
    }
  },

  /**
   * Merge player profiles from another device
   * Per Task 8.2.4: Merge player profiles
   */
  mergeProfiles: async (
    payload: MergeProfilesRequest
  ): Promise<{ profile: PlayerProfile; success: true } | ErrorResponse> => {
    logger.info('IPC:mergeProfiles', 'Merging profiles', { path: payload.filePath });
    try {
      if (!dataStorage) {
        dataStorage = createDataStorage();
        await dataStorage.initialize();
      }
      if (!exportImportManager) {
        exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
      }

      // Load current profile
      const currentProfile = await dataStorage.loadPlayerProfile();
      if (!currentProfile) {
        return {
          success: false,
          error: 'No current player profile found',
          code: 'PROFILE_NOT_FOUND',
        };
      }

      // Load profile to merge from file
      const { readFile } = await import('fs/promises');
      const content = await readFile(payload.filePath, 'utf-8');
      const data = JSON.parse(content);

      if (!data.profile) {
        return {
          success: false,
          error: 'Invalid profile file: missing profile data',
          code: 'INVALID_PROFILE',
        };
      }

      // Merge profiles
      const mergedProfile = await exportImportManager.mergePlayerProfiles(
        currentProfile,
        data.profile
      );

      // Save merged profile
      await dataStorage.savePlayerProfile(mergedProfile);

      logger.info('IPC:mergeProfiles', 'Profiles merged', {
        totalGames: mergedProfile.totalGames,
      });
      return { profile: mergedProfile, success: true };
    } catch (error) {
      logger.error('IPC:mergeProfiles', 'Failed to merge profiles', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'MERGE_ERROR',
      };
    }
  },

  /**
   * Get exports directory path
   */
  getExportsPath: async (): Promise<{ path: string; success: true }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    if (!exportImportManager) {
      exportImportManager = createExportImportManager(dataStorage.getStorageBasePath());
    }
    return { path: exportImportManager.getExportsPath(), success: true };
  },

  // ========================================
  // Phase 8.4: Backup & Restore Methods
  // ========================================

  /**
   * Task 8.4.1: Get backup settings
   */
  getBackupSettings: async (): Promise<{
    settings: {
      enabled: boolean;
      frequency: string;
      lastBackupTimestamp?: string;
      compression: boolean;
    };
    success: true;
  }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    const settings = await dataStorage.loadBackupSettings();
    return { settings, success: true };
  },

  /**
   * Task 8.4.1: Save backup settings
   */
  saveBackupSettings: async (payload: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'after-game';
    compression: boolean;
  }): Promise<{ success: true }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    const currentSettings = await dataStorage.loadBackupSettings();
    await dataStorage.saveBackupSettings({
      ...currentSettings,
      enabled: payload.enabled,
      frequency: payload.frequency,
      compression: payload.compression,
    });
    logger.info('Backup', 'Backup settings saved', payload);
    return { success: true };
  },

  /**
   * Task 8.4.1: Check if automatic backup should be created
   */
  checkBackupNeeded: async (payload: {
    trigger: 'startup' | 'after-game';
  }): Promise<{
    needed: boolean;
    success: true;
  }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    const needed = await dataStorage.shouldCreateBackup(payload.trigger);
    return { needed, success: true };
  },

  /**
   * Task 8.4.1: Create automatic backup
   */
  createAutomaticBackup: async (payload: {
    type: 'daily' | 'weekly' | 'after-game';
  }): Promise<{
    backup: {
      filename: string;
      timestamp: string;
      type: string;
      gameCount: number;
      size: number;
    } | null;
    success: true;
  }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    logger.info('Backup', 'Creating automatic backup', { type: payload.type });
    const backup = await dataStorage.createAutomaticBackup(payload.type);
    if (backup) {
      logger.info('Backup', 'Automatic backup created', backup);
    } else {
      logger.warn('Backup', 'Failed to create automatic backup');
    }
    return { backup, success: true };
  },

  /**
   * Task 8.4.3: List available backups
   */
  listBackups: async (): Promise<{
    backups: Array<{
      filename: string;
      timestamp: string;
      type: string;
      gameCount: number;
      size: number;
    }>;
    success: true;
  }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    const backups = await dataStorage.listBackups();
    return { backups, success: true };
  },

  /**
   * Task 8.4.4: Verify backup integrity
   */
  verifyBackup: async (payload: {
    filename: string;
  }): Promise<{
    valid: boolean;
    issues: string[];
    success: true;
  }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    logger.info('Backup', 'Verifying backup', { filename: payload.filename });
    const result = await dataStorage.verifyBackup(payload.filename);
    logger.info('Backup', 'Backup verification result', { ...result, filename: payload.filename });
    return { ...result, success: true };
  },

  /**
   * Get backups folder path
   */
  getBackupsPath: async (): Promise<{ path: string; success: true }> => {
    if (!dataStorage) {
      dataStorage = createDataStorage();
      await dataStorage.initialize();
    }
    return { path: dataStorage.getBackupsPath(), success: true };
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

// Initialize WebSocket server (handles both RPC commands and real-time streaming)
wsServer = createWebSocketServer(9339, devMode);

// Register all IPC methods on WebSocket server
// Core Engine Methods
wsServer.registerMethod('chess:sayHello', functionMap.sayHello);
wsServer.registerMethod('chess:startNewGame', functionMap.startNewGame);
wsServer.registerMethod('chess:requestBestMoves', functionMap.requestBestMoves);
wsServer.registerMethod('chess:evaluatePosition', functionMap.evaluatePosition);
wsServer.registerMethod('chess:analyzeMove', functionMap.analyzeMove);
wsServer.registerMethod('chess:getGuidanceMoves', functionMap.getGuidanceMoves);
wsServer.registerMethod('chess:setSkillLevel', functionMap.setSkillLevel);
wsServer.registerMethod('chess:getEngineStatus', functionMap.getEngineStatus);

// AI Opponent Methods
wsServer.registerMethod('chess:configureBot', functionMap.configureBot);
wsServer.registerMethod('chess:getBotMove', functionMap.getBotMove);
wsServer.registerMethod('chess:getBotProfiles', functionMap.getBotProfiles);
wsServer.registerMethod('chess:getCurrentBotConfig', functionMap.getCurrentBotConfig);
wsServer.registerMethod('chess:getDifficultyPresets', functionMap.getDifficultyPresets);

// Analysis Pipeline Methods
wsServer.registerMethod('chess:analyzeGame', functionMap.analyzeGame);
wsServer.registerMethod('chess:getAnalysisConfig', functionMap.getAnalysisConfig);
wsServer.registerMethod('chess:calculateMetrics', functionMap.calculateMetrics);

// Data Storage Methods
wsServer.registerMethod('chess:initializeStorage', functionMap.initializeStorage);
wsServer.registerMethod('chess:saveGame', functionMap.saveGame);
wsServer.registerMethod('chess:saveAnalysis', functionMap.saveAnalysis);
wsServer.registerMethod('chess:getGamesList', functionMap.getGamesList);
wsServer.registerMethod('chess:loadGame', functionMap.loadGame);
wsServer.registerMethod('chess:loadAnalysis', functionMap.loadAnalysis);
wsServer.registerMethod('chess:getStoragePath', functionMap.getStoragePath);

// Player Progress Methods
wsServer.registerMethod('chess:loadPlayerProfile', functionMap.loadPlayerProfile);
wsServer.registerMethod('chess:savePlayerProfile', functionMap.savePlayerProfile);
wsServer.registerMethod('chess:getAchievements', functionMap.getAchievements);
wsServer.registerMethod('chess:unlockAchievement', functionMap.unlockAchievement);

// Export/Import Methods
wsServer.registerMethod('chess:exportGame', functionMap.exportGame);
wsServer.registerMethod('chess:exportAllGames', functionMap.exportAllGames);
wsServer.registerMethod('chess:exportProfile', functionMap.exportProfile);
wsServer.registerMethod('chess:exportBackup', functionMap.exportBackup);
wsServer.registerMethod('chess:importGame', functionMap.importGame);
wsServer.registerMethod('chess:importBatchGames', functionMap.importBatchGames);
wsServer.registerMethod('chess:mergeProfiles', functionMap.mergeProfiles);
wsServer.registerMethod('chess:getExportsPath', functionMap.getExportsPath);

// Backup & Restore Methods
wsServer.registerMethod('chess:getBackupSettings', functionMap.getBackupSettings);
wsServer.registerMethod('chess:saveBackupSettings', functionMap.saveBackupSettings);
wsServer.registerMethod('chess:checkBackupNeeded', functionMap.checkBackupNeeded);
wsServer.registerMethod('chess:createAutomaticBackup', functionMap.createAutomaticBackup);
wsServer.registerMethod('chess:listBackups', functionMap.listBackups);
wsServer.registerMethod('chess:verifyBackup', functionMap.verifyBackup);
wsServer.registerMethod('chess:getBackupsPath', functionMap.getBackupsPath);

// Debug Logging Methods
wsServer.registerMethod('chess:logMessage', functionMap.logMessage);
wsServer.registerMethod('chess:getLogPath', functionMap.getLogPath);
wsServer.registerMethod('chess:isLoggingEnabled', functionMap.isLoggingEnabled);

// Start WebSocket server
await wsServer.start();
console.log(`[WebSocket] Server started on port ${wsServer.getPort()}`);
console.log(`[WebSocket] Registered ${Object.keys(functionMap).length} RPC methods`);

// Launch Neutralino UI after WebSocket server is ready
// Only launch in production mode (when running from built executable)
const isBuiltExecutable = process.execPath.includes('Chess-Sensei');
if (isBuiltExecutable) {
  const { spawn } = await import('child_process');
  const path = await import('path');

  // Get the directory containing the executable
  const exeDir = path.dirname(process.execPath);
  const neutralinoPath = path.join(exeDir, 'neutralino.exe');

  logger.info('Backend', 'Launching Neutralino UI', { path: neutralinoPath, devMode });

  // Build command line arguments for Neutralino
  const neutralinoArgs: string[] = [];
  if (devMode) {
    // Enable inspector (DevTools) in dev mode
    neutralinoArgs.push('--window-enable-inspector=true');
  }

  // Spawn Neutralino process
  const neutralinoProcess = spawn(neutralinoPath, neutralinoArgs, {
    cwd: exeDir,
    stdio: 'inherit',
    detached: false,
  });

  neutralinoProcess.on('error', (error) => {
    logger.error('Backend', 'Failed to launch Neutralino', error);
    console.error('[Neutralino] Failed to launch:', error.message);
  });

  neutralinoProcess.on('exit', (code) => {
    logger.info('Backend', 'Neutralino exited', { code });
    console.log(`[Neutralino] Process exited with code ${code}`);
    // Exit the backend when Neutralino closes
    process.exit(code ?? 0);
  });

  console.log('[Neutralino] UI launched');
} else {
  // Development mode - Neutralino is launched separately via `bun run dev`
  console.log('[Backend] Running in development mode - Neutralino should be launched separately');
}

// Export types for frontend use
export type {
  PositionRequest,
  AnalyzeMoveRequest,
  BestMovesResponse,
  EvaluationResponse,
  MoveAnalysisResponse,
  ErrorResponse,
};

// Export WebSocket server instance for use in other modules
export { wsServer };

// Backend initialization complete
console.log('Chess-Sensei backend initialized successfully');
