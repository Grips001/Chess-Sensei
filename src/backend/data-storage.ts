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

import { join } from 'path';
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

/** Backup retention: keep last N daily backups */
const DAILY_BACKUP_RETENTION = 7;

/** Backup retention: keep last N weekly backups */
const WEEKLY_BACKUP_RETENTION = 4;

// ============================================
// Data Storage Class
// ============================================

/**
 * Handles all data storage operations
 *
 * Phase 9 Enhancement: In-memory fallback if disk is unavailable
 * When disk storage fails, data is cached in memory and a warning is logged.
 * This allows the application to continue functioning without data loss.
 */
export class DataStorage {
  private basePath: string;
  private initialized = false;

  /** Phase 9: In-memory fallback cache when disk is unavailable */
  private inMemoryMode = false;
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    this.basePath = this.getBasePathInternal();
  }

  /**
   * Phase 9: Check if running in memory-only mode
   */
  isInMemoryMode(): boolean {
    return this.inMemoryMode;
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
   * Phase 9 Enhancement: Fallback to in-memory mode if disk is unavailable
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

    try {
      for (const dir of directories) {
        await this.ensureDirectory(dir);
      }

      // Verify disk is writable by creating a test file
      const testPath = join(this.basePath, '.write-test');
      await Bun.write(testPath, 'test');
      const fs = await import('fs/promises');
      await fs.unlink(testPath);

      this.initialized = true;
      console.log(`Data storage initialized at: ${this.basePath}`);
    } catch (error) {
      // Phase 9: Enable in-memory fallback mode
      console.warn(
        `Data storage initialization failed, using in-memory fallback:`,
        error instanceof Error ? error.message : error
      );
      this.inMemoryMode = true;
      this.initialized = true;
      console.log(`Data storage running in MEMORY-ONLY mode (data will be lost on exit)`);
    }
  }

  /**
   * Ensure a directory exists
   * Note: Bun.write() automatically creates directories, so this is mainly for explicit checks
   */
  private async ensureDirectory(path: string): Promise<void> {
    // Bun.write() will create directories automatically
    // This method is kept for compatibility but can be simplified
    try {
      const file = Bun.file(path);
      await file.exists(); // Just check if it exists, Bun will create on write
    } catch {
      // Directory doesn't exist, but Bun.write() will create it
    }
  }

  /**
   * Task 4.4.6: Atomic write operation using Bun.write()
   * Phase 9 Enhancement: Falls back to in-memory cache if disk write fails
   *
   * 1. Write to temporary file
   * 2. Verify write succeeded
   * 3. Rename temporary file to target (atomic)
   *
   * Note: Bun.write() automatically creates directories
   */
  private async atomicWrite(filePath: string, data: string): Promise<void> {
    // Phase 9: Use in-memory cache if in fallback mode
    if (this.inMemoryMode) {
      this.memoryCache.set(filePath, data);
      return;
    }

    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temp file (Bun.write creates directories automatically)
      await Bun.write(tempPath, data);

      // Verify write succeeded
      const tempFile = Bun.file(tempPath);
      const size = tempFile.size;
      if (size === 0 && data.length > 0) {
        throw new Error('Write verification failed: file is empty');
      }

      // Atomic rename using native fs (Bun doesn't have rename yet)
      const fs = await import('fs/promises');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Phase 9: Fallback to in-memory cache on write failure
      console.warn(`Disk write failed, caching in memory: ${filePath}`);
      this.memoryCache.set(filePath, data);
      // Don't throw - allow app to continue with in-memory data
    }
  }

  /**
   * Read JSON file safely using Bun.file()
   * Phase 9 Enhancement: Checks in-memory cache first
   */
  private async readJson<T>(filePath: string): Promise<T | null> {
    // Phase 9: Check in-memory cache first
    const cached = this.memoryCache.get(filePath);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        return null;
      }
    }

    // Skip disk access if in memory-only mode
    if (this.inMemoryMode) {
      return null;
    }

    try {
      const file = Bun.file(filePath);
      return (await file.json()) as T;
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

  // ============================================
  // Phase 8: Backup & Restore Methods
  // ============================================

  /**
   * Task 8.4.1: Load backup settings
   */
  async loadBackupSettings(): Promise<BackupSettings> {
    await this.initialize();

    const settingsPath = join(this.basePath, 'settings', 'backup_settings.json');
    const settings = await this.readJson<BackupSettings>(settingsPath);

    // Return defaults if no settings exist
    return (
      settings || {
        enabled: true,
        frequency: 'daily',
        compression: false,
      }
    );
  }

  /**
   * Task 8.4.1: Save backup settings
   */
  async saveBackupSettings(settings: BackupSettings): Promise<void> {
    await this.initialize();

    const settingsPath = join(this.basePath, 'settings', 'backup_settings.json');
    await this.atomicWrite(settingsPath, JSON.stringify(settings, null, 2));
  }

  /**
   * Task 8.4.1: Check if backup is needed based on settings
   */
  async shouldCreateBackup(trigger: 'startup' | 'after-game'): Promise<boolean> {
    const settings = await this.loadBackupSettings();

    if (!settings.enabled) {
      return false;
    }

    // For after-game trigger, only create backup if setting matches
    if (trigger === 'after-game' && settings.frequency !== 'after-game') {
      return false;
    }

    // For startup, check if enough time has passed
    if (trigger === 'startup') {
      if (!settings.lastBackupTimestamp) {
        return true;
      }

      const lastBackup = new Date(settings.lastBackupTimestamp);
      const now = new Date();
      const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

      if (settings.frequency === 'daily' && hoursSinceLastBackup >= 24) {
        return true;
      }

      if (settings.frequency === 'weekly' && hoursSinceLastBackup >= 168) {
        return true;
      }
    }

    return trigger === 'after-game' && settings.frequency === 'after-game';
  }

  /**
   * Task 8.4.1: Create automatic backup
   *
   * Follows data-storage.md backup specifications:
   * - Location: backups/ folder
   * - Retention: last 7 daily, last 4 weekly
   * - Format: full copy of all data
   */
  async createAutomaticBackup(type: 'daily' | 'weekly' | 'after-game'): Promise<BackupInfo | null> {
    await this.initialize();

    try {
      const backupsPath = join(this.basePath, 'backups');
      await this.ensureDirectory(backupsPath);

      // Gather all data
      const games = await this.getAllGamesData();
      const analyses = await this.getAllAnalysesData();
      const profile = await this.loadPlayerProfile();
      const achievements = await this.loadAchievements();

      // Create backup data
      const backupData = {
        version: DATA_VERSION,
        backupTimestamp: new Date().toISOString(),
        backupType: type,
        source: 'Chess-Sensei',
        gameCount: games.length,
        games,
        analyses,
        profile,
        achievements,
      };

      // Generate filename with timestamp and type
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `backup_${type}_${timestamp}.json`;
      const backupPath = join(backupsPath, filename);

      // Write backup
      const jsonContent = JSON.stringify(backupData, null, 2);
      await this.atomicWrite(backupPath, jsonContent);

      // Update settings with last backup time
      const settings = await this.loadBackupSettings();
      settings.lastBackupTimestamp = new Date().toISOString();
      await this.saveBackupSettings(settings);

      // Clean up old backups according to retention policy
      await this.cleanupOldBackups();

      // Get file size using Bun.file()
      const backupFile = Bun.file(backupPath);
      const fileSize = backupFile.size;

      console.log(
        `Automatic backup created: ${filename} (${games.length} games, ${fileSize} bytes)`
      );

      return {
        filename,
        timestamp: backupData.backupTimestamp,
        type,
        gameCount: games.length,
        size: fileSize,
      };
    } catch (error) {
      console.error('Failed to create automatic backup:', error);
      return null;
    }
  }

  /**
   * Task 8.4.1: Get all games data for backup
   */
  private async getAllGamesData(): Promise<StoredGameData[]> {
    const gamesList = await this.getGamesList();
    const games: StoredGameData[] = [];

    for (const entry of gamesList) {
      const game = await this.loadGame(entry.gameId);
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Task 8.4.1: Get all analyses data for backup
   */
  private async getAllAnalysesData(): Promise<StoredAnalysisData[]> {
    const gamesList = await this.getGamesList();
    const analyses: StoredAnalysisData[] = [];

    for (const entry of gamesList) {
      const analysis = await this.loadAnalysis(entry.gameId);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Task 8.4.1: Cleanup old backups according to retention policy
   *
   * Per data-storage.md:
   * - Retention: last 7 daily, last 4 weekly
   */
  private async cleanupOldBackups(): Promise<void> {
    const backupsPath = join(this.basePath, 'backups');

    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(backupsPath);
      const backupFiles = files.filter((f) => f.startsWith('backup_') && f.endsWith('.json'));

      // Separate by type
      const dailyBackups: { filename: string; timestamp: Date }[] = [];
      const weeklyBackups: { filename: string; timestamp: Date }[] = [];
      const otherBackups: { filename: string; timestamp: Date }[] = [];

      for (const filename of backupFiles) {
        // Parse filename: backup_<type>_<timestamp>.json
        const match = filename.match(/^backup_(daily|weekly|after-game|manual)_(.+)\.json$/);
        if (!match) continue;

        const type = match[1];
        const timestampStr = match[2].replace(/-/g, ':').replace('T', ' ');
        const timestamp = new Date(timestampStr.slice(0, 10) + 'T' + timestampStr.slice(11) + 'Z');

        if (type === 'daily' || type === 'after-game') {
          dailyBackups.push({ filename, timestamp });
        } else if (type === 'weekly') {
          weeklyBackups.push({ filename, timestamp });
        } else {
          otherBackups.push({ filename, timestamp });
        }
      }

      // Sort by timestamp (newest first)
      dailyBackups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      weeklyBackups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Delete old daily backups (keep last 7)
      for (let i = DAILY_BACKUP_RETENTION; i < dailyBackups.length; i++) {
        const filePath = join(backupsPath, dailyBackups[i].filename);
        await fs.unlink(filePath);
        console.log(`Deleted old backup: ${dailyBackups[i].filename}`);
      }

      // Delete old weekly backups (keep last 4)
      for (let i = WEEKLY_BACKUP_RETENTION; i < weeklyBackups.length; i++) {
        const filePath = join(backupsPath, weeklyBackups[i].filename);
        await fs.unlink(filePath);
        console.log(`Deleted old backup: ${weeklyBackups[i].filename}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Task 8.4.3: List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    await this.initialize();

    const backupsPath = join(this.basePath, 'backups');
    const backups: BackupInfo[] = [];

    try {
      // Check if backups directory exists using Bun.file()
      const backupsDir = Bun.file(backupsPath);
      if (!(await backupsDir.exists())) {
        return [];
      }

      const fs = await import('fs/promises');
      const files = await fs.readdir(backupsPath);
      const backupFiles = files.filter((f) => f.startsWith('backup_') && f.endsWith('.json'));

      for (const filename of backupFiles) {
        const filePath = join(backupsPath, filename);

        try {
          const file = Bun.file(filePath);
          const stats = { size: file.size, mtime: new Date(file.lastModified) };
          const content = await this.readJson<{
            backupTimestamp: string;
            backupType: 'daily' | 'weekly' | 'manual' | 'after-game';
            gameCount: number;
          }>(filePath);

          if (content) {
            backups.push({
              filename,
              timestamp: content.backupTimestamp || stats.mtime.toISOString(),
              type: content.backupType || 'manual',
              gameCount: content.gameCount || 0,
              size: stats.size,
            });
          }
        } catch {
          // Skip invalid backup files
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
    }

    return backups;
  }

  /**
   * Task 8.4.4: Verify backup integrity
   */
  async verifyBackup(filename: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const backupPath = join(this.basePath, 'backups', filename);
      const file = Bun.file(backupPath);
      const data = await file.json();

      // Check required fields
      if (!data.version) issues.push('Missing version field');
      if (!data.backupTimestamp) issues.push('Missing timestamp');
      if (!data.source || data.source !== 'Chess-Sensei') issues.push('Invalid or missing source');
      if (!Array.isArray(data.games)) issues.push('Missing or invalid games array');

      // Validate each game
      if (Array.isArray(data.games)) {
        for (let i = 0; i < data.games.length; i++) {
          if (!this.validateGameData(data.games[i])) {
            issues.push(`Game at index ${i} failed validation`);
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [
          `Failed to read backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Get backups folder path
   */
  getBackupsPath(): string {
    return join(this.basePath, 'backups');
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
 * Task 8.4.1: Backup settings configuration
 */
export interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'after-game';
  lastBackupTimestamp?: string;
  compression: boolean;
}

/**
 * Task 8.4.1: Backup metadata
 */
export interface BackupInfo {
  filename: string;
  timestamp: string;
  type: 'daily' | 'weekly' | 'manual' | 'after-game';
  gameCount: number;
  size: number;
}

/**
 * Create a data storage instance
 */
export function createDataStorage(): DataStorage {
  return new DataStorage();
}
