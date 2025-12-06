/**
 * Data Storage Module
 *
 * Handles all data persistence for Exam Mode games, analysis results,
 * and player metrics. Implements the storage patterns from data-storage.md.
 *
 * Storage Philosophy (per data-storage.md):
 * 1. Privacy First - All data stored locally by default
 * 2. Offline First - No dependencies on external services
 * 3. Portability - Standard JSON format for easy export/import
 * 4. Durability - Atomic writes, corruption detection, backups
 *
 * @see source-docs/data-storage.md
 */

import { join, dirname } from 'path';
import { mkdir, writeFile, readFile, rename, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';

import type { GameAnalysis, ExamGameData } from './analysis-pipeline';
import type { PlayerProfile } from './metrics-calculator';

// ============================================
// Types
// ============================================

/**
 * Game data as stored on disk (per data-storage.md format)
 */
export interface StoredGameData {
  gameId: string;
  version: string;
  timestamp: string;
  mode: 'exam';

  metadata: {
    playerColor: 'white' | 'black';
    botPersonality: string;
    botElo: number;
    opening?: string;
    result: '1-0' | '0-1' | '1/2-1/2';
    termination: string;
    duration: number;
  };

  moves: Array<{
    moveNumber: number;
    white?: {
      move: string;
      san: string;
      uci: string;
      fen: string;
      timestamp: number;
      timeSpent: number;
    };
    black?: {
      move: string;
      san: string;
      uci: string;
      fen: string;
      timestamp: number;
      timeSpent: number;
    };
  }>;

  pgn: string;
}

/**
 * Analysis data as stored on disk (per data-storage.md format)
 */
export interface StoredAnalysisData {
  gameId: string;
  analysisVersion: string;
  analysisTimestamp: string;
  engineVersion: string;

  summary: {
    overallAccuracy: number;
    openingAccuracy: number;
    middlegameAccuracy: number;
    endgameAccuracy: number;
    averageCentipawnLoss: number;
    blunders: number;
    mistakes: number;
    inaccuracies: number;
    excellentMoves: number;
    goodMoves: number;
  };

  moveAnalysis: GameAnalysis['moveAnalysis'];
  criticalMoments: GameAnalysis['criticalMoments'];
  tacticalOpportunities: GameAnalysis['tacticalOpportunities'];
  gamePhases: GameAnalysis['gamePhases'];
}

/**
 * Game index entry
 */
export interface GameIndexEntry {
  gameId: string;
  timestamp: string;
  result: string;
  botPersonality: string;
  botElo: number;
  playerColor: 'white' | 'black';
  path: string;
}

/**
 * Games index file
 */
export interface GamesIndex {
  version: string;
  lastUpdated: string;
  games: GameIndexEntry[];
}

// ============================================
// Constants
// ============================================

/** Data format version */
const DATA_VERSION = '1.0';

/** Application folder name */
const APP_FOLDER = 'Chess-Sensei';

// ============================================
// Data Storage Class
// ============================================

/**
 * Handles all data storage operations
 */
export class DataStorage {
  private basePath: string;
  private initialized = false;

  constructor() {
    this.basePath = this.getBasePathInternal();
  }

  /**
   * Task 4.4.2: Get platform-specific data path
   */
  private getBasePathInternal(): string {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        // Windows: %APPDATA%\Chess-Sensei\
        return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), APP_FOLDER);

      case 'darwin':
        // macOS: ~/Library/Application Support/Chess-Sensei/
        return join(homedir(), 'Library', 'Application Support', APP_FOLDER);

      default:
        // Linux: ~/.local/share/chess-sensei/
        return join(homedir(), '.local', 'share', APP_FOLDER.toLowerCase());
    }
  }

  /**
   * Task 4.4.1: Initialize directory structure
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directory structure
    const directories = [
      this.basePath,
      join(this.basePath, 'games'),
      join(this.basePath, 'analysis'),
      join(this.basePath, 'metrics'),
      join(this.basePath, 'settings'),
      join(this.basePath, 'exports'),
      join(this.basePath, 'backups'),
    ];

    for (const dir of directories) {
      await this.ensureDirectory(dir);
    }

    this.initialized = true;
    console.log(`Data storage initialized at: ${this.basePath}`);
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDirectory(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * Task 4.4.6: Atomic write operation
   *
   * 1. Write to temporary file
   * 2. Verify write succeeded
   * 3. Rename temporary file to target (atomic)
   */
  private async atomicWrite(filePath: string, data: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const dir = dirname(filePath);

    // Ensure directory exists
    await this.ensureDirectory(dir);

    // Write to temp file
    await writeFile(tempPath, data, 'utf-8');

    // Verify write succeeded
    const stats = await stat(tempPath);
    if (stats.size === 0 && data.length > 0) {
      throw new Error('Write verification failed: file is empty');
    }

    // Atomic rename
    await rename(tempPath, filePath);
  }

  /**
   * Read JSON file safely
   */
  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Task 4.4.3: Convert ExamGameData to stored format
   */
  private convertToStoredGame(gameData: ExamGameData): StoredGameData {
    // Group moves by move number for storage format
    const movesByNumber = new Map<
      number,
      { white?: ExamGameData['moves'][0]; black?: ExamGameData['moves'][0] }
    >();

    for (const move of gameData.moves) {
      if (!movesByNumber.has(move.moveNumber)) {
        movesByNumber.set(move.moveNumber, {});
      }
      const entry = movesByNumber.get(move.moveNumber)!;
      if (move.color === 'white') {
        entry.white = move;
      } else {
        entry.black = move;
      }
    }

    // Convert to array format
    const storedMoves: StoredGameData['moves'] = [];
    for (const [moveNumber, moves] of movesByNumber.entries()) {
      const moveEntry: StoredGameData['moves'][0] = { moveNumber };
      if (moves.white) {
        moveEntry.white = {
          move: moves.white.san,
          san: moves.white.san,
          uci: moves.white.uci,
          fen: moves.white.fen,
          timestamp: moves.white.timestamp,
          timeSpent: moves.white.timeSpent,
        };
      }
      if (moves.black) {
        moveEntry.black = {
          move: moves.black.san,
          san: moves.black.san,
          uci: moves.black.uci,
          fen: moves.black.fen,
          timestamp: moves.black.timestamp,
          timeSpent: moves.black.timeSpent,
        };
      }
      storedMoves.push(moveEntry);
    }

    // Sort by move number
    storedMoves.sort((a, b) => a.moveNumber - b.moveNumber);

    return {
      gameId: gameData.gameId,
      version: DATA_VERSION,
      timestamp: new Date(gameData.timestamp).toISOString(),
      mode: 'exam',
      metadata: {
        playerColor: gameData.playerColor,
        botPersonality: gameData.botPersonality,
        botElo: gameData.botElo,
        result: gameData.result,
        termination: gameData.termination,
        duration: gameData.duration,
      },
      moves: storedMoves,
      pgn: gameData.pgn,
    };
  }

  /**
   * Task 4.4.4: Convert GameAnalysis to stored format
   */
  private convertToStoredAnalysis(analysis: GameAnalysis): StoredAnalysisData {
    return {
      gameId: analysis.gameId,
      analysisVersion: analysis.analysisVersion,
      analysisTimestamp: analysis.analysisTimestamp,
      engineVersion: analysis.engineVersion,
      summary: {
        overallAccuracy: analysis.summary.overallAccuracy,
        openingAccuracy: analysis.summary.openingAccuracy,
        middlegameAccuracy: analysis.summary.middlegameAccuracy,
        endgameAccuracy: analysis.summary.endgameAccuracy,
        averageCentipawnLoss: analysis.summary.averageCentipawnLoss,
        blunders: analysis.summary.blunders,
        mistakes: analysis.summary.mistakes,
        inaccuracies: analysis.summary.inaccuracies,
        excellentMoves: analysis.summary.excellentMoves,
        goodMoves: analysis.summary.goodMoves,
      },
      moveAnalysis: analysis.moveAnalysis,
      criticalMoments: analysis.criticalMoments,
      tacticalOpportunities: analysis.tacticalOpportunities,
      gamePhases: analysis.gamePhases,
    };
  }

  /**
   * Get the game storage path for a given date
   */
  private getGamePath(gameId: string, timestamp: Date): string {
    const year = timestamp.getFullYear().toString();
    const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
    return join(this.basePath, 'games', year, month, `${gameId}.json`);
  }

  /**
   * Get the analysis storage path
   */
  private getAnalysisPath(gameId: string): string {
    return join(this.basePath, 'analysis', `${gameId}_analysis.json`);
  }

  /**
   * Task 4.4.7: Save game data (step 4)
   */
  async saveGame(gameData: ExamGameData): Promise<string> {
    await this.initialize();

    const storedGame = this.convertToStoredGame(gameData);
    const gamePath = this.getGamePath(gameData.gameId, new Date(gameData.timestamp));

    await this.atomicWrite(gamePath, JSON.stringify(storedGame, null, 2));

    // Update index
    await this.updateGameIndex(gameData, gamePath);

    console.log(`Game saved: ${gamePath}`);
    return gamePath;
  }

  /**
   * Task 4.4.7: Update game index (step 5)
   */
  private async updateGameIndex(gameData: ExamGameData, gamePath: string): Promise<void> {
    const indexPath = join(this.basePath, 'games', 'index.json');

    // Load existing index or create new
    let index = await this.readJson<GamesIndex>(indexPath);
    if (!index) {
      index = {
        version: DATA_VERSION,
        lastUpdated: new Date().toISOString(),
        games: [],
      };
    }

    // Add new entry
    const entry: GameIndexEntry = {
      gameId: gameData.gameId,
      timestamp: new Date(gameData.timestamp).toISOString(),
      result: gameData.result,
      botPersonality: gameData.botPersonality,
      botElo: gameData.botElo,
      playerColor: gameData.playerColor,
      path: gamePath.replace(this.basePath, ''), // Relative path
    };

    // Remove existing entry if present (for updates)
    index.games = index.games.filter((g) => g.gameId !== gameData.gameId);

    // Add and sort by timestamp (newest first)
    index.games.unshift(entry);
    index.lastUpdated = new Date().toISOString();

    await this.atomicWrite(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Task 4.4.7: Save analysis data (step 6)
   */
  async saveAnalysis(analysis: GameAnalysis): Promise<string> {
    await this.initialize();

    const storedAnalysis = this.convertToStoredAnalysis(analysis);
    const analysisPath = this.getAnalysisPath(analysis.gameId);

    await this.atomicWrite(analysisPath, JSON.stringify(storedAnalysis, null, 2));

    console.log(`Analysis saved: ${analysisPath}`);
    return analysisPath;
  }

  /**
   * Task 4.4.5: Save player profile
   */
  async savePlayerProfile(profile: PlayerProfile): Promise<void> {
    await this.initialize();

    const profilePath = join(this.basePath, 'metrics', 'player_profile.json');
    await this.atomicWrite(profilePath, JSON.stringify(profile, null, 2));

    console.log('Player profile saved');
  }

  /**
   * Load player profile
   */
  async loadPlayerProfile(): Promise<PlayerProfile | null> {
    await this.initialize();

    const profilePath = join(this.basePath, 'metrics', 'player_profile.json');
    return this.readJson<PlayerProfile>(profilePath);
  }

  /**
   * Load game data
   */
  async loadGame(gameId: string): Promise<StoredGameData | null> {
    await this.initialize();

    // Look up in index first
    const indexPath = join(this.basePath, 'games', 'index.json');
    const index = await this.readJson<GamesIndex>(indexPath);

    if (index) {
      const entry = index.games.find((g) => g.gameId === gameId);
      if (entry) {
        const fullPath = join(this.basePath, entry.path);
        return this.readJson<StoredGameData>(fullPath);
      }
    }

    return null;
  }

  /**
   * Load analysis data
   */
  async loadAnalysis(gameId: string): Promise<StoredAnalysisData | null> {
    await this.initialize();

    const analysisPath = this.getAnalysisPath(gameId);
    return this.readJson<StoredAnalysisData>(analysisPath);
  }

  /**
   * Get list of all games
   */
  async getGamesList(): Promise<GameIndexEntry[]> {
    await this.initialize();

    const indexPath = join(this.basePath, 'games', 'index.json');
    const index = await this.readJson<GamesIndex>(indexPath);

    return index?.games ?? [];
  }

  /**
   * Task 4.4.8: Validate game data
   */
  validateGameData(data: unknown): data is StoredGameData {
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
   * Get storage base path (for export/import)
   */
  getStorageBasePath(): string {
    return this.basePath;
  }

  /**
   * Check if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================
  // Phase 6: Achievement Methods
  // ============================================

  /**
   * Task 6.6: Load achievements
   */
  async loadAchievements(): Promise<StoredAchievements | null> {
    await this.initialize();

    const achievementsPath = join(this.basePath, 'metrics', 'achievements.json');
    return this.readJson<StoredAchievements>(achievementsPath);
  }

  /**
   * Task 6.6: Save achievements
   */
  async saveAchievements(achievements: StoredAchievements): Promise<void> {
    await this.initialize();

    const achievementsPath = join(this.basePath, 'metrics', 'achievements.json');
    await this.atomicWrite(achievementsPath, JSON.stringify(achievements, null, 2));
  }
}

/**
 * Stored achievements format
 */
export interface StoredAchievements {
  version: string;
  lastUpdated: string;
  achievements: Array<{
    id: string;
    unlockedAt?: string;
    progress: number;
  }>;
}

/**
 * Create a data storage instance
 */
export function createDataStorage(): DataStorage {
  return new DataStorage();
}
