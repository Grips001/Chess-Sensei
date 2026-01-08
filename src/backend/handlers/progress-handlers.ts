/**
 * Player Progress IPC Handlers
 * Handles player profile, achievements, and progress tracking
 */

import { createDataStorage, type DataStorage } from '../data-storage';
import { logger } from '../file-logger';
import type {
  PlayerProfileResponse,
  SavePlayerProfileRequest,
  AchievementsResponse,
  UnlockAchievementRequest,
  ErrorResponse,
} from './ipc-types';

export interface ProgressHandlersDeps {
  getDataStorage: () => DataStorage | null;
  setDataStorage: (storage: DataStorage) => void;
}

export function createProgressHandlers(deps: ProgressHandlersDeps) {
  const { getDataStorage, setDataStorage } = deps;

  function ensureStorage(): DataStorage {
    let storage = getDataStorage();
    if (!storage) {
      storage = createDataStorage();
      setDataStorage(storage);
    }
    return storage;
  }

  return {
    /**
     * Load player profile with aggregated metrics
     */
    loadPlayerProfile: async (): Promise<PlayerProfileResponse | ErrorResponse> => {
      logger.info('IPC:loadPlayerProfile', 'Loading player profile');
      try {
        const storage = ensureStorage();
        const profile = await storage.loadPlayerProfile();
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
        const storage = ensureStorage();
        await storage.savePlayerProfile(payload.profile);
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
        const storage = ensureStorage();
        const achievements = await storage.loadAchievements();
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
        const storage = ensureStorage();
        let achievements = await storage.loadAchievements();
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
        await storage.saveAchievements(achievements);
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
  };
}

export type ProgressHandlers = ReturnType<typeof createProgressHandlers>;
