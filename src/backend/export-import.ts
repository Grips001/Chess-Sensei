/**
 * Export/Import Manager Module
 *
 * Handles all data export and import functionality:
 * - Export single game (PGN, JSON)
 * - Export all games (batch JSON)
 * - Export player profile (JSON)
 * - Export analysis report (PDF - future)
 * - Import single/batch games (JSON)
 * - Import from PGN
 * - Merge player profiles
 */

import { join } from 'path';

import type { StoredGameData, StoredAnalysisData } from './data-storage';
import type { PlayerProfile } from './metrics-calculator';
import { logger } from './file-logger';

// ============================================
// Types
// ============================================

/**
 * Export result containing the file path and operation details
 */
export interface ExportResult {
  success: true;
  path: string;
  format: 'pgn' | 'json' | 'pdf';
  type: 'game' | 'games' | 'profile' | 'analysis' | 'backup';
  itemCount?: number;
  size?: number;
}

/**
 * Import result with details about what was imported
 */
export interface ImportResult {
  success: true;
  imported: number;
  skipped: number;
  errors: number;
  details: ImportItemResult[];
}

/**
 * Individual import item result
 */
export interface ImportItemResult {
  id: string;
  status: 'imported' | 'skipped' | 'error';
  reason?: string;
}

/**
 * Error result for failed operations
 */
export interface ExportImportError {
  success: false;
  error: string;
  code: string;
}

/**
 * Batch export format - array of games
 */
export interface BatchGameExport {
  version: string;
  exportTimestamp: string;
  source: 'Chess-Sensei';
  gameCount: number;
  games: StoredGameData[];
  analyses?: StoredAnalysisData[];
}

/**
 * Full backup format - everything
 */
export interface FullBackupExport {
  version: string;
  exportTimestamp: string;
  source: 'Chess-Sensei';
  gameCount: number;
  games: StoredGameData[];
  analyses: StoredAnalysisData[];
  profile: PlayerProfile | null;
}

/**
 * PGN Header tags
 */
interface PGNHeaders {
  Event: string;
  Site: string;
  Date: string;
  Round: string;
  White: string;
  Black: string;
  Result: string;
  WhiteElo?: string;
  BlackElo?: string;
  Opening?: string;
  Termination?: string;
  TimeControl?: string;
}

// ============================================
// Constants
// ============================================

const EXPORT_VERSION = '1.0';
const EXPORT_SOURCE = 'Chess-Sensei';

// ============================================
// Export/Import Manager Class
// ============================================

/**
 * Handles all export and import operations
 */
export class ExportImportManager {
  private exportsPath: string;

  constructor(storagePath: string) {
    this.exportsPath = join(storagePath, 'exports');
  }

  /**
   * Ensure exports directory exists
   * Bun.write() creates directories automatically
   */
  private async ensureExportsDir(): Promise<void> {
    // Check if directory exists using Bun.file()
    try {
      const file = Bun.file(this.exportsPath);
      await file.exists();
    } catch {
      // Directory doesn't exist, but Bun.write() will create it automatically
    }
  }

  /**
   * Generate export filename with timestamp
   */
  private generateFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
  }

  // ============================================
  // Task 8.1.1: Export Single Game (PGN)
  // ============================================

  /**
   * Export a single game as PGN
   *
   * Standard PGN format per data-storage.md example:
   * - [Event] [Site] [Date] [Round] [White] [Black] [Result] headers
   * - Optional: WhiteElo, BlackElo, Opening, Termination
   * - Move text in algebraic notation
   */
  async exportGameAsPGN(
    game: StoredGameData,
    destinationPath?: string
  ): Promise<ExportResult | ExportImportError> {
    logger.info('ExportManager', 'Exporting game as PGN', { gameId: game.gameId });

    try {
      await this.ensureExportsDir();

      // Build PGN headers
      const headers: PGNHeaders = {
        Event: 'Chess-Sensei Exam Mode',
        Site: 'Chess-Sensei',
        Date: this.formatPGNDate(game.timestamp),
        Round: '?',
        White:
          game.metadata.playerColor === 'white'
            ? 'Player'
            : `${game.metadata.botPersonality} (${game.metadata.botElo})`,
        Black:
          game.metadata.playerColor === 'black'
            ? 'Player'
            : `${game.metadata.botPersonality} (${game.metadata.botElo})`,
        Result: game.metadata.result,
      };

      // Add optional headers
      if (game.metadata.playerColor === 'white') {
        headers.BlackElo = game.metadata.botElo.toString();
      } else {
        headers.WhiteElo = game.metadata.botElo.toString();
      }

      if (game.metadata.opening) {
        headers.Opening = game.metadata.opening;
      }

      if (game.metadata.termination) {
        headers.Termination = game.metadata.termination;
      }

      // Build PGN string
      const pgnContent = this.buildPGNString(headers, game);

      // Determine output path
      const filename = this.generateFilename(`game_${game.gameId.slice(0, 8)}`, 'pgn');
      const outputPath = destinationPath || join(this.exportsPath, filename);

      // Use Bun.write() for faster file I/O (creates directories automatically)
      await Bun.write(outputPath, pgnContent);

      logger.info('ExportManager', 'PGN export complete', { path: outputPath });

      return {
        success: true,
        path: outputPath,
        format: 'pgn',
        type: 'game',
        size: pgnContent.length,
      };
    } catch (error) {
      logger.error('ExportManager', 'PGN export failed', error, { gameId: game.gameId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PGN_EXPORT_ERROR',
      };
    }
  }

  /**
   * Format date for PGN header (YYYY.MM.DD)
   */
  private formatPGNDate(timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  /**
   * Build PGN string from headers and game data
   */
  private buildPGNString(headers: PGNHeaders, game: StoredGameData): string {
    // Build header section
    let pgn = '';
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        pgn += `[${key} "${value}"]\n`;
      }
    }
    pgn += '\n';

    // If we have a pre-built PGN string, extract just the moves
    if (game.pgn) {
      // Find where moves start (after blank line following headers)
      const existingPgn = game.pgn;
      const movesMatch = existingPgn.match(/\n\n(.+)$/s);
      if (movesMatch) {
        pgn += movesMatch[1];
        return pgn;
      }
    }

    // Build moves from structured data
    let moveText = '';
    for (const move of game.moves) {
      // Add move number for white's move
      if (move.white) {
        moveText += `${move.moveNumber}. ${move.white.san} `;
      }
      if (move.black) {
        moveText += `${move.black.san} `;
      }
    }

    // Add result
    const result = game.metadata.result;
    moveText += result;

    // Wrap lines at ~80 characters
    pgn += this.wrapPGNMoves(moveText);

    return pgn;
  }

  /**
   * Wrap PGN move text at reasonable line length
   */
  private wrapPGNMoves(moveText: string): string {
    const words = moveText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > 80 && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  // ============================================
  // Task 8.1.2: Export Single Game (JSON)
  // ============================================

  /**
   * Export a single game as JSON
   *
   * Includes complete game + analysis data per data-storage.md format
   */
  async exportGameAsJSON(
    game: StoredGameData,
    analysis?: StoredAnalysisData,
    destinationPath?: string
  ): Promise<ExportResult | ExportImportError> {
    logger.info('ExportManager', 'Exporting game as JSON', { gameId: game.gameId });

    try {
      await this.ensureExportsDir();

      const exportData = {
        version: EXPORT_VERSION,
        exportTimestamp: new Date().toISOString(),
        source: EXPORT_SOURCE,
        game,
        analysis: analysis || null,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      const filename = this.generateFilename(`game_${game.gameId.slice(0, 8)}`, 'json');
      const outputPath = destinationPath || join(this.exportsPath, filename);

      await Bun.write(outputPath, jsonContent);

      logger.info('ExportManager', 'JSON game export complete', { path: outputPath });

      return {
        success: true,
        path: outputPath,
        format: 'json',
        type: 'game',
        size: jsonContent.length,
      };
    } catch (error) {
      logger.error('ExportManager', 'JSON game export failed', error, { gameId: game.gameId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'JSON_EXPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.1.3: Export All Games (Batch JSON)
  // ============================================

  /**
   * Export all games as a batch JSON file
   *
   * Includes all Exam Mode games with optional analysis data
   */
  async exportAllGames(
    games: StoredGameData[],
    analyses?: StoredAnalysisData[],
    destinationPath?: string,
    progressCallback?: (current: number, total: number) => void
  ): Promise<ExportResult | ExportImportError> {
    logger.info('ExportManager', 'Exporting all games', { count: games.length });

    try {
      await this.ensureExportsDir();

      const exportData: BatchGameExport = {
        version: EXPORT_VERSION,
        exportTimestamp: new Date().toISOString(),
        source: EXPORT_SOURCE,
        gameCount: games.length,
        games,
        analyses: analyses || undefined,
      };

      // Report progress
      if (progressCallback) {
        progressCallback(0, games.length);
      }

      const jsonContent = JSON.stringify(exportData, null, 2);

      if (progressCallback) {
        progressCallback(games.length, games.length);
      }

      const filename = this.generateFilename('all_games', 'json');
      const outputPath = destinationPath || join(this.exportsPath, filename);

      await Bun.write(outputPath, jsonContent);

      logger.info('ExportManager', 'Batch export complete', {
        path: outputPath,
        count: games.length,
      });

      return {
        success: true,
        path: outputPath,
        format: 'json',
        type: 'games',
        itemCount: games.length,
        size: jsonContent.length,
      };
    } catch (error) {
      logger.error('ExportManager', 'Batch export failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BATCH_EXPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.1.4: Export Player Profile (JSON)
  // ============================================

  /**
   * Export player profile as JSON
   *
   * Includes composite scores, trends, all metrics
   */
  async exportPlayerProfile(
    profile: PlayerProfile,
    destinationPath?: string
  ): Promise<ExportResult | ExportImportError> {
    logger.info('ExportManager', 'Exporting player profile', { totalGames: profile.totalGames });

    try {
      await this.ensureExportsDir();

      const exportData = {
        version: EXPORT_VERSION,
        exportTimestamp: new Date().toISOString(),
        source: EXPORT_SOURCE,
        profile,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      const filename = this.generateFilename('player_profile', 'json');
      const outputPath = destinationPath || join(this.exportsPath, filename);

      await Bun.write(outputPath, jsonContent);

      logger.info('ExportManager', 'Profile export complete', { path: outputPath });

      return {
        success: true,
        path: outputPath,
        format: 'json',
        type: 'profile',
        size: jsonContent.length,
      };
    } catch (error) {
      logger.error('ExportManager', 'Profile export failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROFILE_EXPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.1.5: Export Full Backup
  // ============================================

  /**
   * Export everything as a full backup
   *
   * Includes all games, analyses, and profile
   */
  async exportFullBackup(
    games: StoredGameData[],
    analyses: StoredAnalysisData[],
    profile: PlayerProfile | null,
    destinationPath?: string
  ): Promise<ExportResult | ExportImportError> {
    logger.info('ExportManager', 'Creating full backup', {
      games: games.length,
      analyses: analyses.length,
      hasProfile: !!profile,
    });

    try {
      await this.ensureExportsDir();

      const exportData: FullBackupExport = {
        version: EXPORT_VERSION,
        exportTimestamp: new Date().toISOString(),
        source: EXPORT_SOURCE,
        gameCount: games.length,
        games,
        analyses,
        profile,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      const filename = this.generateFilename('chess_sensei_backup', 'json');
      const outputPath = destinationPath || join(this.exportsPath, filename);

      await Bun.write(outputPath, jsonContent);

      logger.info('ExportManager', 'Full backup complete', { path: outputPath });

      return {
        success: true,
        path: outputPath,
        format: 'json',
        type: 'backup',
        itemCount: games.length,
        size: jsonContent.length,
      };
    } catch (error) {
      logger.error('ExportManager', 'Full backup failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BACKUP_EXPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.2.1: Import Single Game (JSON)
  // ============================================

  /**
   * Import a single game from JSON
   *
   * Validates game data, assigns new UUID if duplicate detected
   */
  async importGameFromJSON(
    filePath: string,
    existingGameIds: Set<string>
  ): Promise<{ game: StoredGameData; analysis?: StoredAnalysisData } | ExportImportError> {
    logger.info('ImportManager', 'Importing game from JSON', { path: filePath });

    try {
      // Use Bun.file().text() for faster file reading
      const file = Bun.file(filePath);
      const content = await file.text();
      const data = JSON.parse(content);

      // Validate structure
      if (!data.game || !data.game.gameId) {
        return {
          success: false,
          error: 'Invalid game JSON: missing game data',
          code: 'INVALID_GAME_JSON',
        };
      }

      let game = data.game as StoredGameData;
      const analysis = data.analysis as StoredAnalysisData | undefined;

      // Check for duplicate
      if (existingGameIds.has(game.gameId)) {
        // Generate new UUID
        const newId = crypto.randomUUID();
        logger.info('ImportManager', 'Duplicate detected, assigning new ID', {
          oldId: game.gameId,
          newId,
        });
        game = { ...game, gameId: newId };
        if (analysis) {
          analysis.gameId = newId;
        }
      }

      // Validate game data
      if (!this.validateGameData(game)) {
        return {
          success: false,
          error: 'Invalid game data: failed validation',
          code: 'VALIDATION_FAILED',
        };
      }

      logger.info('ImportManager', 'Game imported successfully', { gameId: game.gameId });

      return { game, analysis };
    } catch (error) {
      logger.error('ImportManager', 'Game import failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'IMPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.2.2: Import Game Collection (Batch JSON)
  // ============================================

  /**
   * Import multiple games from a batch JSON file
   *
   * Validates each game, skips duplicates based on content hash
   */
  async importBatchGames(
    filePath: string,
    existingGameIds: Set<string>,
    progressCallback?: (current: number, total: number) => void
  ): Promise<
    | { games: StoredGameData[]; analyses: StoredAnalysisData[]; result: ImportResult }
    | ExportImportError
  > {
    logger.info('ImportManager', 'Importing batch games', { path: filePath });

    try {
      const file = Bun.file(filePath);
      const content = await file.text();
      const data = JSON.parse(content) as BatchGameExport;

      // Validate structure
      if (!data.games || !Array.isArray(data.games)) {
        return {
          success: false,
          error: 'Invalid batch JSON: missing games array',
          code: 'INVALID_BATCH_JSON',
        };
      }

      const importedGames: StoredGameData[] = [];
      const importedAnalyses: StoredAnalysisData[] = [];
      const details: ImportItemResult[] = [];
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      const total = data.games.length;

      for (let i = 0; i < data.games.length; i++) {
        const game = data.games[i];
        const gameId = game.gameId; // Capture before type narrowing

        if (progressCallback) {
          progressCallback(i + 1, total);
        }

        // Check for duplicate by ID
        if (existingGameIds.has(gameId)) {
          // Skip if ID exists (could be enhanced with content hash comparison in future)
          skipped++;
          details.push({
            id: gameId,
            status: 'skipped',
            reason: 'Duplicate game ID',
          });
          continue;
        }

        // Validate game data structure (runtime validation)
        if (!this.validateGameData(game as unknown)) {
          errors++;
          details.push({
            id: gameId,
            status: 'error',
            reason: 'Failed validation',
          });
          continue;
        }

        importedGames.push(game);
        imported++;
        details.push({
          id: game.gameId,
          status: 'imported',
        });

        // Check for corresponding analysis
        if (data.analyses) {
          const analysis = data.analyses.find((a) => a.gameId === game.gameId);
          if (analysis) {
            importedAnalyses.push(analysis);
          }
        }
      }

      logger.info('ImportManager', 'Batch import complete', {
        imported,
        skipped,
        errors,
      });

      return {
        games: importedGames,
        analyses: importedAnalyses,
        result: {
          success: true,
          imported,
          skipped,
          errors,
          details,
        },
      };
    } catch (error) {
      logger.error('ImportManager', 'Batch import failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BATCH_IMPORT_ERROR',
      };
    }
  }

  // ============================================
  // Task 8.2.3: Import from PGN
  // ============================================

  /**
   * Import a game from PGN file
   *
   * Parses standard PGN, creates new game entry
   * Note: Analysis must be triggered separately since PGN lacks analysis data
   */
  async importFromPGN(
    filePath: string
  ): Promise<{ game: StoredGameData; needsAnalysis: true } | ExportImportError> {
    logger.info('ImportManager', 'Importing from PGN', { path: filePath });

    try {
      const file = Bun.file(filePath);
      const content = await file.text();

      // Parse PGN
      const parsed = this.parsePGN(content);
      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse PGN file',
          code: 'PGN_PARSE_ERROR',
        };
      }

      // Create game data from PGN
      const gameId = crypto.randomUUID();
      const timestamp = this.parsePGNDate(parsed.headers.Date) || new Date().toISOString();

      // Determine player color from headers
      let playerColor: 'white' | 'black' = 'white';
      let botName = 'Imported Bot';
      let botElo = 1500;

      // Try to determine from White/Black headers
      if (parsed.headers.White?.toLowerCase() === 'player') {
        playerColor = 'white';
        botName = parsed.headers.Black || 'Imported Bot';
        botElo = parseInt(parsed.headers.BlackElo || '1500', 10);
      } else if (parsed.headers.Black?.toLowerCase() === 'player') {
        playerColor = 'black';
        botName = parsed.headers.White || 'Imported Bot';
        botElo = parseInt(parsed.headers.WhiteElo || '1500', 10);
      }

      const game: StoredGameData = {
        gameId,
        version: '1.0',
        timestamp,
        mode: 'exam',
        metadata: {
          playerColor,
          botPersonality: botName,
          botElo,
          opening: parsed.headers.Opening,
          result: (parsed.headers.Result as '1-0' | '0-1' | '1/2-1/2') || '1/2-1/2',
          termination: parsed.headers.Termination || 'unknown',
          duration: 0, // Unknown from PGN
        },
        moves: parsed.moves,
        pgn: content,
      };

      logger.info('ImportManager', 'PGN imported successfully', { gameId });

      return { game, needsAnalysis: true };
    } catch (error) {
      logger.error('ImportManager', 'PGN import failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PGN_IMPORT_ERROR',
      };
    }
  }

  /**
   * Parse PGN content
   */
  private parsePGN(content: string): {
    headers: Record<string, string>;
    moves: StoredGameData['moves'];
  } | null {
    try {
      // Extract headers
      const headers: Record<string, string> = {};
      const headerRegex = /\[(\w+)\s+"([^"]+)"\]/g;
      let match;
      while ((match = headerRegex.exec(content)) !== null) {
        headers[match[1]] = match[2];
      }

      // Extract moves (everything after headers)
      const movesStart = content.lastIndexOf(']') + 1;
      const movesText = content
        .slice(movesStart)
        .replace(/\{[^}]*\}/g, '') // Remove comments
        .replace(/\([^)]*\)/g, '') // Remove variations
        .replace(/\$\d+/g, '') // Remove NAGs
        .replace(/\r?\n/g, ' ') // Join lines
        .trim();

      // Parse move text
      const moves: StoredGameData['moves'] = [];
      const moveRegex = /(\d+)\.\s*(\S+)(?:\s+(\S+))?/g;
      let moveMatch;

      while ((moveMatch = moveRegex.exec(movesText)) !== null) {
        const moveNumber = parseInt(moveMatch[1], 10);
        const whiteMove = moveMatch[2];
        const blackMove = moveMatch[3];

        // Skip if it's just the result
        if (['1-0', '0-1', '1/2-1/2', '*'].includes(whiteMove)) {
          break;
        }

        const moveEntry: StoredGameData['moves'][0] = { moveNumber };

        if (whiteMove && !['1-0', '0-1', '1/2-1/2', '*'].includes(whiteMove)) {
          moveEntry.white = {
            move: whiteMove,
            san: whiteMove,
            uci: '', // Would need chess.js to convert
            fen: '', // Would need chess.js to generate
            timestamp: Date.now(),
            timeSpent: 0,
          };
        }

        if (blackMove && !['1-0', '0-1', '1/2-1/2', '*'].includes(blackMove)) {
          moveEntry.black = {
            move: blackMove,
            san: blackMove,
            uci: '', // Would need chess.js to convert
            fen: '', // Would need chess.js to generate
            timestamp: Date.now(),
            timeSpent: 0,
          };
        }

        moves.push(moveEntry);
      }

      return { headers, moves };
    } catch {
      return null;
    }
  }

  /**
   * Parse PGN date format (YYYY.MM.DD) to ISO string
   */
  private parsePGNDate(dateStr?: string): string | null {
    if (!dateStr) return null;

    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;

    const [year, month, day] = parts.map((p) => parseInt(p, 10));
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    // Handle ?? placeholders
    const validYear = year || 2025;
    const validMonth = month && month > 0 && month <= 12 ? month - 1 : 0;
    const validDay = day && day > 0 && day <= 31 ? day : 1;

    return new Date(validYear, validMonth, validDay).toISOString();
  }

  // ============================================
  // Task 8.2.4: Merge Player Profiles
  // ============================================

  /**
   * Merge two player profiles
   *
   * Combines metrics from two devices, most recent data wins for conflicts
   */
  async mergePlayerProfiles(
    primaryProfile: PlayerProfile,
    secondaryProfile: PlayerProfile
  ): Promise<PlayerProfile> {
    logger.info('ImportManager', 'Merging player profiles', {
      primaryGames: primaryProfile.totalGames,
      secondaryGames: secondaryProfile.totalGames,
    });

    // Determine which is more recent
    const primaryDate = new Date(primaryProfile.lastUpdated);
    const secondaryDate = new Date(secondaryProfile.lastUpdated);
    const isSecondaryNewer = secondaryDate > primaryDate;

    // Merge total games count (sum, assuming no overlap)
    // In a real implementation, you'd deduplicate based on game IDs
    const mergedProfile: PlayerProfile = {
      profileVersion: primaryProfile.profileVersion,
      lastUpdated: new Date().toISOString(),
      totalGames: primaryProfile.totalGames + secondaryProfile.totalGames,
      gamesAnalyzed: primaryProfile.gamesAnalyzed + secondaryProfile.gamesAnalyzed,

      // Use most recent composite scores, or average if same time
      compositeScores: isSecondaryNewer
        ? secondaryProfile.compositeScores
        : primaryProfile.compositeScores,

      // Average overall stats (weighted by game count)
      overallStats: this.weightedAverageStats(
        primaryProfile.overallStats,
        primaryProfile.totalGames,
        secondaryProfile.overallStats,
        secondaryProfile.totalGames
      ),

      // Combine records
      records: this.combineRecords(primaryProfile.records, secondaryProfile.records),

      // Use most recent trends
      trends: isSecondaryNewer ? secondaryProfile.trends : primaryProfile.trends,

      // Detailed metrics (use most recent)
      detailedMetrics: isSecondaryNewer
        ? secondaryProfile.detailedMetrics
        : primaryProfile.detailedMetrics,
    };

    logger.info('ImportManager', 'Profiles merged', {
      totalGames: mergedProfile.totalGames,
    });

    return mergedProfile;
  }

  /**
   * Calculate weighted average of overall stats
   */
  private weightedAverageStats(
    stats1: PlayerProfile['overallStats'],
    count1: number,
    stats2: PlayerProfile['overallStats'],
    count2: number
  ): PlayerProfile['overallStats'] {
    const total = count1 + count2;
    if (total === 0) return stats1;

    const w1 = count1 / total;
    const w2 = count2 / total;

    return {
      averageAccuracy: stats1.averageAccuracy * w1 + stats2.averageAccuracy * w2,
      averageCentipawnLoss: stats1.averageCentipawnLoss * w1 + stats2.averageCentipawnLoss * w2,
      blundersPerGame: stats1.blundersPerGame * w1 + stats2.blundersPerGame * w2,
      mistakesPerGame: stats1.mistakesPerGame * w1 + stats2.mistakesPerGame * w2,
      inaccuraciesPerGame: stats1.inaccuraciesPerGame * w1 + stats2.inaccuraciesPerGame * w2,
    };
  }

  /**
   * Combine win/loss records
   */
  private combineRecords(
    records1: PlayerProfile['records'],
    records2: PlayerProfile['records']
  ): PlayerProfile['records'] {
    const totalGames1 = 1 / (records1.winRate + records1.drawRate + records1.lossRate) || 0;
    const totalGames2 = 1 / (records2.winRate + records2.drawRate + records2.lossRate) || 0;
    const totalGames = totalGames1 + totalGames2;

    if (totalGames === 0) return records1;

    return {
      winRate: (records1.winRate * totalGames1 + records2.winRate * totalGames2) / totalGames,
      drawRate: (records1.drawRate * totalGames1 + records2.drawRate * totalGames2) / totalGames,
      lossRate: (records1.lossRate * totalGames1 + records2.lossRate * totalGames2) / totalGames,
      longestWinStreak: Math.max(records1.longestWinStreak, records2.longestWinStreak),
      longestLoseStreak: Math.max(records1.longestLoseStreak, records2.longestLoseStreak),
      // Current streak can't be meaningfully merged - use the most recent one
      currentStreak: records2.currentStreak,
      currentStreakType: records2.currentStreakType,
    };
  }

  // ============================================
  // Validation Helpers
  // ============================================

  /**
   * Validate game data structure
   */
  private validateGameData(data: unknown): data is StoredGameData {
    if (!data || typeof data !== 'object') return false;

    const game = data as Partial<StoredGameData>;

    // Check required fields
    if (!game.gameId || typeof game.gameId !== 'string') return false;
    if (!game.version || typeof game.version !== 'string') return false;
    if (!game.timestamp || typeof game.timestamp !== 'string') return false;
    if (game.mode !== 'exam') return false;
    if (!game.metadata || typeof game.metadata !== 'object') return false;
    if (!Array.isArray(game.moves)) return false;
    if (!game.pgn || typeof game.pgn !== 'string') return false;

    // Check metadata
    const meta = game.metadata;
    if (!['white', 'black'].includes(meta.playerColor as string)) return false;
    if (typeof meta.botElo !== 'number') return false;
    if (!['1-0', '0-1', '1/2-1/2'].includes(meta.result as string)) return false;

    return true;
  }

  /**
   * Get exports directory path
   */
  getExportsPath(): string {
    return this.exportsPath;
  }
}

/**
 * Create an export/import manager instance
 */
export function createExportImportManager(storagePath: string): ExportImportManager {
  return new ExportImportManager(storagePath);
}
