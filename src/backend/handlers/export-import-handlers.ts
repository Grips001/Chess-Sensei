/**
 * Export/Import IPC Handlers
 * Handles game export/import in various formats (PGN, JSON, batch)
 */

import {
  createDataStorage,
  type DataStorage,
  type StoredGameData,
  type StoredAnalysisData,
} from '../data-storage';
import {
  createExportImportManager,
  type ExportImportManager,
  type ExportResult,
  type ExportImportError,
  type ImportResult,
} from '../export-import';
import type { PlayerProfile } from '../metrics-calculator';
import { logger } from '../file-logger';
import type {
  ExportGameRequest,
  ExportAllGamesRequest,
  ExportProfileRequest,
  ExportBackupRequest,
  ImportGameRequest,
  ImportBatchRequest,
  MergeProfilesRequest,
  ExportResponse,
  ImportResponse,
  ImportGameResponse,
  ErrorResponse,
} from './ipc-types';

export interface ExportImportHandlersDeps {
  getDataStorage: () => DataStorage | null;
  setDataStorage: (storage: DataStorage) => void;
  getExportImportManager: () => ExportImportManager | null;
  setExportImportManager: (manager: ExportImportManager) => void;
}

export function createExportImportHandlers(deps: ExportImportHandlersDeps) {
  const { getDataStorage, setDataStorage, getExportImportManager, setExportImportManager } = deps;

  async function ensureStorage(): Promise<DataStorage> {
    let storage = getDataStorage();
    if (!storage) {
      storage = createDataStorage();
      setDataStorage(storage);
      await storage.initialize();
    }
    return storage;
  }

  async function ensureExportImportManager(): Promise<ExportImportManager> {
    const storage = await ensureStorage();
    let manager = getExportImportManager();
    if (!manager) {
      manager = createExportImportManager(storage.getStorageBasePath());
      setExportImportManager(manager);
    }
    return manager;
  }

  return {
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Load game data
        const game = await storage.loadGame(payload.gameId);
        if (!game) {
          return {
            success: false,
            error: `Game not found: ${payload.gameId}`,
            code: 'GAME_NOT_FOUND',
          };
        }

        let result: ExportResult | ExportImportError;

        if (payload.format === 'pgn') {
          result = await manager.exportGameAsPGN(game, payload.destinationPath);
        } else {
          // Load analysis if available
          const analysis = await storage.loadAnalysis(payload.gameId);
          result = await manager.exportGameAsJSON(
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Load all games in parallel for better performance
        const gamesList = await storage.getGamesList();

        // Load games in parallel
        const gamePromises = gamesList.map((entry) => storage.loadGame(entry.gameId));
        const loadedGames = await Promise.all(gamePromises);
        const games = loadedGames.filter((g): g is StoredGameData => g !== null);

        // Load analyses in parallel if requested
        let analyses: StoredAnalysisData[] = [];
        if (payload.includeAnalysis) {
          const analysisPromises = games.map((game) => storage.loadAnalysis(game.gameId));
          const loadedAnalyses = await Promise.all(analysisPromises);
          analyses = loadedAnalyses.filter((a): a is StoredAnalysisData => a !== null);
        }

        const result = await manager.exportAllGames(
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
    exportProfile: async (
      payload: ExportProfileRequest
    ): Promise<ExportResponse | ErrorResponse> => {
      logger.info('IPC:exportProfile', 'Exporting player profile');
      try {
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Load player profile
        const profile = await storage.loadPlayerProfile();
        if (!profile) {
          return {
            success: false,
            error: 'No player profile found',
            code: 'PROFILE_NOT_FOUND',
          };
        }

        const result = await manager.exportPlayerProfile(profile, payload.destinationPath);

        if (!result.success) {
          return result as ErrorResponse;
        }

        logger.info('IPC:exportProfile', 'Profile exported', {
          path: (result as ExportResult).path,
        });
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Load all games in parallel for better performance
        const gamesList = await storage.getGamesList();

        // Load games in parallel
        const gamePromises = gamesList.map((entry) => storage.loadGame(entry.gameId));
        const loadedGames = await Promise.all(gamePromises);
        const games = loadedGames.filter((g): g is StoredGameData => g !== null);

        // Load analyses in parallel
        const analysisPromises = games.map((game) => storage.loadAnalysis(game.gameId));
        const loadedAnalyses = await Promise.all(analysisPromises);
        const analyses = loadedAnalyses.filter((a): a is StoredAnalysisData => a !== null);

        // Load profile
        const profile = await storage.loadPlayerProfile();

        const result = await manager.exportFullBackup(
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Get existing game IDs for duplicate detection
        const gamesList = await storage.getGamesList();
        const existingIds = new Set(gamesList.map((g) => g.gameId));

        if (payload.format === 'pgn') {
          const result = await manager.importFromPGN(payload.filePath);
          if ('success' in result && result.success === false) {
            return result as ErrorResponse;
          }
          const pgnResult = result as { game: StoredGameData; needsAnalysis: true };

          // Save the imported game
          await storage.saveGame({
            gameId: pgnResult.game.gameId,
            timestamp: new Date(pgnResult.game.timestamp).getTime(),
            playerColor: pgnResult.game.metadata.playerColor,
            botPersonality: pgnResult.game.metadata.botPersonality,
            botElo: pgnResult.game.metadata.botElo,
            result: pgnResult.game.metadata.result,
            termination: pgnResult.game.metadata.termination,
            duration: pgnResult.game.metadata.duration,
            moves: pgnResult.game.moves.flatMap((m) => {
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
          const result = await manager.importGameFromJSON(payload.filePath, existingIds);
          if ('success' in result && result.success === false) {
            return result as ErrorResponse;
          }
          const jsonResult = result as { game: StoredGameData; analysis?: StoredAnalysisData };

          // Save the imported game
          await storage.saveGame({
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
            await storage.saveAnalysis({
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Get existing game IDs for duplicate detection
        const gamesList = await storage.getGamesList();
        const existingIds = new Set(gamesList.map((g) => g.gameId));

        const result = await manager.importBatchGames(payload.filePath, existingIds);

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
          storage.saveGame({
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

          return storage.saveAnalysis({
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
        const storage = await ensureStorage();
        const manager = await ensureExportImportManager();

        // Load current profile
        const currentProfile = await storage.loadPlayerProfile();
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
        const mergedProfile = await manager.mergePlayerProfiles(currentProfile, data.profile);

        // Save merged profile
        await storage.savePlayerProfile(mergedProfile);

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
      const manager = await ensureExportImportManager();
      return { path: manager.getExportsPath(), success: true };
    },
  };
}

export type ExportImportHandlers = ReturnType<typeof createExportImportHandlers>;
