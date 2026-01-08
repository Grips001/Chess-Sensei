/**
 * AI Opponent IPC Handlers
 * Handles bot configuration, move selection, and difficulty settings
 */

import type { StockfishEngine } from '../../engine/stockfish-engine';
import { AIOpponent } from '../ai-opponent';
import type { BotProfile, DifficultyPreset } from '../../shared/bot-types';
import {
  BOT_PERSONALITIES,
  DIFFICULTY_PRESETS,
  createBotProfileFromElo,
  applyDifficultyPreset,
} from '../../shared/bot-types';
import type {
  ConfigureBotRequest,
  BotMoveRequest,
  BotMoveResponse,
  BotProfilesResponse,
  BotConfigResponse,
  ErrorResponse,
} from './ipc-types';

export interface BotHandlersDeps {
  getEngine: () => StockfishEngine | null;
  initializeEngine: () => Promise<void>;
  getAIOpponent: () => AIOpponent | null;
  setAIOpponent: (opponent: AIOpponent) => void;
}

export function createBotHandlers(deps: BotHandlersDeps) {
  const { getEngine, initializeEngine, getAIOpponent, setAIOpponent } = deps;

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
        const engine = await ensureEngine();

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

        const aiOpponent = new AIOpponent(engine, {
          profile,
          playMode,
          useTimeDelays,
        });

        setAIOpponent(aiOpponent);

        console.log(
          `Bot configured: ${profile.name} (Elo ${profile.targetElo}), mode: ${playMode}`
        );

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
        const engine = await ensureEngine();

        // Create default opponent if not configured
        let aiOpponent = getAIOpponent();
        if (!aiOpponent) {
          aiOpponent = new AIOpponent(engine, {
            profile: BOT_PERSONALITIES.club_player,
            playMode: 'training',
            useTimeDelays: true,
          });
          setAIOpponent(aiOpponent);
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
      const aiOpponent = getAIOpponent();
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
  };
}

export type BotHandlers = ReturnType<typeof createBotHandlers>;
