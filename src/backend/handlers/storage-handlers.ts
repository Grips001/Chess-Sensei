/**
 * Data Storage IPC Handlers
 * Handles saving, loading, and managing game and analysis data
 */

import { createDataStorage, type DataStorage } from '../data-storage';
import { logger } from '../file-logger';
import type {
  SaveGameRequest,
  SaveGameResponse,
  SaveAnalysisRequest,
  SaveAnalysisResponse,
  GamesListResponse,
  LoadGameRequest,
  LoadGameResponse,
  LoadAnalysisRequest,
  LoadAnalysisResponse,
  ErrorResponse,
} from './ipc-types';

export interface StorageHandlersDeps {
  getDataStorage: () => DataStorage | null;
  setDataStorage: (storage: DataStorage) => void;
}

export function createStorageHandlers(deps: StorageHandlersDeps) {
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
     * Initialize data storage
     * Per Task 4.4.1: Initialize directory structure
     */
    initializeStorage: async (): Promise<{ success: true } | ErrorResponse> => {
      try {
        const storage = ensureStorage();
        await storage.initialize();
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
        const storage = ensureStorage();
        const path = await storage.saveGame(payload.gameData);
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
        const storage = ensureStorage();
        const path = await storage.saveAnalysis(payload.analysis);
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
        const storage = ensureStorage();
        const games = await storage.getGamesList();
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
        const storage = ensureStorage();
        const game = await storage.loadGame(payload.gameId);
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
        const storage = ensureStorage();
        const analysis = await storage.loadAnalysis(payload.gameId);
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
      const storage = ensureStorage();
      return { path: storage.getStorageBasePath(), success: true };
    },
  };
}

export type StorageHandlers = ReturnType<typeof createStorageHandlers>;
