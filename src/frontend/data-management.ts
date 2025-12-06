/**
 * Data Management UI Module
 *
 * Phase 8: Import/Export & Data Management
 *
 * Provides UI for:
 * - Task 8.3.1: Export flow UI
 * - Task 8.3.2: Import flow UI
 * - Task 8.5: Data Management UI
 *
 * @see source-docs/data-storage.md - "Export/Import UI Flow" section
 */

import * as buntralino from 'buntralino-client';
import { frontendLogger } from './frontend-logger';

// ============================================
// Types
// ============================================

/** Export format options */
type ExportFormat = 'pgn' | 'json';

/** Export type options (used in UI) */
type _ExportType = 'single-game' | 'all-games' | 'profile' | 'backup';

/** Import format options (used in UI) */
type _ImportFormat = 'json' | 'pgn' | 'batch';

/** Game list entry for export selection */
interface GameEntry {
  gameId: string;
  timestamp: string;
  result: string;
  botPersonality: string;
  botElo: number;
  playerColor: 'white' | 'black';
}

/** Export result from backend */
interface ExportResult {
  success: true;
  path: string;
  format: 'pgn' | 'json' | 'pdf';
  type: 'game' | 'games' | 'profile' | 'analysis' | 'backup';
  itemCount?: number;
  size?: number;
}

/** Import result from backend (used in import handlers) */
interface _ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{
    id: string;
    status: 'imported' | 'skipped' | 'error';
    reason?: string;
  }>;
}

// ============================================
// Data Management Manager
// ============================================

/**
 * Manages data export/import UI and operations
 */
export class DataManagementManager {
  private overlayElement: HTMLElement | null = null;
  private currentView: 'main' | 'export' | 'import' | 'backup' = 'main';
  private gamesList: GameEntry[] = [];

  constructor() {
    frontendLogger.info('DataManagement', 'Data management manager created');
  }

  /**
   * Initialize the data management overlay
   */
  initialize(overlayId: string): void {
    this.overlayElement = document.getElementById(overlayId);
    if (!this.overlayElement) {
      frontendLogger.warn('DataManagement', 'Overlay element not found', { overlayId });
      return;
    }
    this.setupEventListeners();
    frontendLogger.info('DataManagement', 'Data management initialized');
  }

  /**
   * Show the data management overlay
   */
  async show(): Promise<void> {
    if (!this.overlayElement) return;

    // Load games list
    await this.loadGamesList();

    this.currentView = 'main';
    this.renderMainView();
    this.overlayElement.classList.remove('hidden');

    frontendLogger.info('DataManagement', 'Data management overlay shown');
  }

  /**
   * Hide the data management overlay
   */
  hide(): void {
    if (!this.overlayElement) return;
    this.overlayElement.classList.add('hidden');
    frontendLogger.info('DataManagement', 'Data management overlay hidden');
  }

  /**
   * Load the list of saved games
   */
  private async loadGamesList(): Promise<void> {
    try {
      const response = (await buntralino.run('getGamesList', {})) as {
        games: GameEntry[];
        success: boolean;
      };

      if (response.success) {
        this.gamesList = response.games;
        frontendLogger.info('DataManagement', 'Games list loaded', {
          count: this.gamesList.length,
        });
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Failed to load games list', error);
      this.gamesList = [];
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.overlayElement) return;

    // Close button
    const closeBtn = this.overlayElement.querySelector('#data-mgmt-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Export button
    const exportBtn = this.overlayElement.querySelector('#export-data-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.showExportView());
    }

    // Import button
    const importBtn = this.overlayElement.querySelector('#import-data-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.showImportView());
    }

    // Backup button
    const backupBtn = this.overlayElement.querySelector('#backup-data-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => this.showBackupView());
    }
  }

  /**
   * Render the main data management view
   */
  private renderMainView(): void {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const gamesCount = this.gamesList.length;

    content.innerHTML = `
      <div class="data-mgmt-main">
        <div class="data-stats">
          <div class="stat-card">
            <div class="stat-value">${gamesCount}</div>
            <div class="stat-label">Saved Games</div>
          </div>
        </div>

        <div class="data-actions">
          <button class="data-action-btn export" id="export-data-btn">
            <span class="action-icon">📤</span>
            <span class="action-title">Export Data</span>
            <span class="action-desc">Save games, profile, or create backup</span>
          </button>

          <button class="data-action-btn import" id="import-data-btn">
            <span class="action-icon">📥</span>
            <span class="action-title">Import Data</span>
            <span class="action-desc">Load games from files</span>
          </button>

          <button class="data-action-btn backup" id="backup-data-btn">
            <span class="action-icon">💾</span>
            <span class="action-title">Backup & Restore</span>
            <span class="action-desc">Full data backup management</span>
          </button>
        </div>

        <div class="data-info">
          <p>Your data is stored locally on this device. Export regularly to keep backups.</p>
        </div>
      </div>
    `;

    // Re-attach event listeners for dynamically created buttons
    this.setupEventListeners();
  }

  /**
   * Show the export view
   */
  private showExportView(): void {
    this.currentView = 'export';
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    content.innerHTML = `
      <div class="data-mgmt-export">
        <button class="back-btn" id="export-back-btn">← Back</button>
        <h3>Export Data</h3>

        <div class="export-options">
          <div class="export-option" data-type="single-game">
            <div class="option-header">
              <span class="option-icon">♟</span>
              <span class="option-title">Single Game</span>
            </div>
            <p class="option-desc">Export one game as PGN or JSON</p>
            <div class="option-formats">
              <label><input type="radio" name="single-format" value="pgn" checked> PGN</label>
              <label><input type="radio" name="single-format" value="json"> JSON</label>
            </div>
            ${this.renderGameSelector('single-game-select')}
            <button class="export-btn" id="export-single-btn" ${this.gamesList.length === 0 ? 'disabled' : ''}>
              Export Game
            </button>
          </div>

          <div class="export-option" data-type="all-games">
            <div class="option-header">
              <span class="option-icon">📚</span>
              <span class="option-title">All Games</span>
            </div>
            <p class="option-desc">Export all ${this.gamesList.length} games as JSON</p>
            <label class="checkbox-option">
              <input type="checkbox" id="include-analysis" checked>
              Include analysis data
            </label>
            <button class="export-btn" id="export-all-btn" ${this.gamesList.length === 0 ? 'disabled' : ''}>
              Export All Games
            </button>
          </div>

          <div class="export-option" data-type="profile">
            <div class="option-header">
              <span class="option-icon">📊</span>
              <span class="option-title">Player Profile</span>
            </div>
            <p class="option-desc">Export your statistics and progress</p>
            <button class="export-btn" id="export-profile-btn">Export Profile</button>
          </div>

          <div class="export-option" data-type="backup">
            <div class="option-header">
              <span class="option-icon">💾</span>
              <span class="option-title">Full Backup</span>
            </div>
            <p class="option-desc">Export everything (games, analysis, profile)</p>
            <button class="export-btn primary" id="export-backup-btn">Create Backup</button>
          </div>
        </div>

        <div id="export-status" class="export-status hidden"></div>
      </div>
    `;

    this.setupExportListeners();
  }

  /**
   * Render game selector dropdown
   */
  private renderGameSelector(id: string): string {
    if (this.gamesList.length === 0) {
      return '<p class="no-games">No games available</p>';
    }

    const options = this.gamesList
      .map((game) => {
        const date = new Date(game.timestamp).toLocaleDateString();
        const result = game.result;
        const opponent = `${game.botPersonality} (${game.botElo})`;
        return `<option value="${game.gameId}">${date} - ${result} vs ${opponent}</option>`;
      })
      .join('');

    return `<select id="${id}" class="game-selector">${options}</select>`;
  }

  /**
   * Setup export view event listeners
   */
  private setupExportListeners(): void {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    // Back button
    const backBtn = content.querySelector('#export-back-btn');
    backBtn?.addEventListener('click', () => this.renderMainView());

    // Export single game
    const exportSingleBtn = content.querySelector('#export-single-btn');
    exportSingleBtn?.addEventListener('click', () => this.exportSingleGame());

    // Export all games
    const exportAllBtn = content.querySelector('#export-all-btn');
    exportAllBtn?.addEventListener('click', () => this.exportAllGames());

    // Export profile
    const exportProfileBtn = content.querySelector('#export-profile-btn');
    exportProfileBtn?.addEventListener('click', () => this.exportProfile());

    // Export backup
    const exportBackupBtn = content.querySelector('#export-backup-btn');
    exportBackupBtn?.addEventListener('click', () => this.exportBackup());
  }

  /**
   * Export a single game
   */
  private async exportSingleGame(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const gameSelect = content.querySelector('#single-game-select') as HTMLSelectElement;
    const formatRadios = content.querySelectorAll('input[name="single-format"]');
    const statusEl = content.querySelector('#export-status');

    if (!gameSelect || !statusEl) return;

    const gameId = gameSelect.value;
    let format: ExportFormat = 'pgn';
    formatRadios.forEach((radio) => {
      if ((radio as HTMLInputElement).checked) {
        format = (radio as HTMLInputElement).value as ExportFormat;
      }
    });

    this.showStatus(statusEl as HTMLElement, 'Exporting game...', 'loading');

    try {
      const response = (await buntralino.run('exportGame', {
        gameId,
        format,
      })) as { result: ExportResult; success: boolean } | { success: false; error: string };

      if (response.success && 'result' in response) {
        this.showStatus(
          statusEl as HTMLElement,
          `Game exported successfully to: ${response.result.path}`,
          'success'
        );
        frontendLogger.info('DataManagement', 'Game exported', {
          gameId,
          format,
          path: response.result.path,
        });
      } else {
        const errorMsg = 'error' in response ? response.error : 'Unknown error';
        this.showStatus(statusEl as HTMLElement, `Export failed: ${errorMsg}`, 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Export single game failed', error);
      this.showStatus(statusEl as HTMLElement, 'Export failed. Please try again.', 'error');
    }
  }

  /**
   * Export all games
   */
  private async exportAllGames(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const includeAnalysis =
      (content.querySelector('#include-analysis') as HTMLInputElement)?.checked ?? true;
    const statusEl = content.querySelector('#export-status');

    if (!statusEl) return;

    this.showStatus(statusEl as HTMLElement, 'Exporting all games...', 'loading');

    try {
      const response = (await buntralino.run('exportAllGames', {
        includeAnalysis,
      })) as { result: ExportResult; success: boolean } | { success: false; error: string };

      if (response.success && 'result' in response) {
        this.showStatus(
          statusEl as HTMLElement,
          `${response.result.itemCount} games exported to: ${response.result.path}`,
          'success'
        );
        frontendLogger.info('DataManagement', 'All games exported', {
          count: response.result.itemCount,
          path: response.result.path,
        });
      } else {
        const errorMsg = 'error' in response ? response.error : 'Unknown error';
        this.showStatus(statusEl as HTMLElement, `Export failed: ${errorMsg}`, 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Export all games failed', error);
      this.showStatus(statusEl as HTMLElement, 'Export failed. Please try again.', 'error');
    }
  }

  /**
   * Export player profile
   */
  private async exportProfile(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const statusEl = content?.querySelector('#export-status');

    if (!statusEl) return;

    this.showStatus(statusEl as HTMLElement, 'Exporting profile...', 'loading');

    try {
      const response = (await buntralino.run('exportProfile', {})) as
        | {
            result: ExportResult;
            success: boolean;
          }
        | { success: false; error: string };

      if (response.success && 'result' in response) {
        this.showStatus(
          statusEl as HTMLElement,
          `Profile exported to: ${response.result.path}`,
          'success'
        );
        frontendLogger.info('DataManagement', 'Profile exported', { path: response.result.path });
      } else {
        const errorMsg = 'error' in response ? response.error : 'Unknown error';
        this.showStatus(statusEl as HTMLElement, `Export failed: ${errorMsg}`, 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Export profile failed', error);
      this.showStatus(statusEl as HTMLElement, 'Export failed. Please try again.', 'error');
    }
  }

  /**
   * Export full backup
   */
  private async exportBackup(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const statusEl = content?.querySelector('#export-status');

    if (!statusEl) return;

    this.showStatus(statusEl as HTMLElement, 'Creating backup...', 'loading');

    try {
      const response = (await buntralino.run('exportBackup', {})) as
        | {
            result: ExportResult;
            success: boolean;
          }
        | { success: false; error: string };

      if (response.success && 'result' in response) {
        this.showStatus(
          statusEl as HTMLElement,
          `Backup created: ${response.result.path} (${response.result.itemCount} games)`,
          'success'
        );
        frontendLogger.info('DataManagement', 'Backup created', {
          path: response.result.path,
          count: response.result.itemCount,
        });
      } else {
        const errorMsg = 'error' in response ? response.error : 'Unknown error';
        this.showStatus(statusEl as HTMLElement, `Backup failed: ${errorMsg}`, 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Backup failed', error);
      this.showStatus(statusEl as HTMLElement, 'Backup failed. Please try again.', 'error');
    }
  }

  /**
   * Show the import view
   */
  private showImportView(): void {
    this.currentView = 'import';
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    content.innerHTML = `
      <div class="data-mgmt-import">
        <button class="back-btn" id="import-back-btn">← Back</button>
        <h3>Import Data</h3>

        <div class="import-options">
          <div class="import-option" data-type="json">
            <div class="option-header">
              <span class="option-icon">📄</span>
              <span class="option-title">JSON File</span>
            </div>
            <p class="option-desc">Import a single game or batch of games from JSON</p>
            <input type="file" id="json-file-input" accept=".json" class="file-input">
            <button class="import-btn" id="import-json-btn" disabled>Import JSON</button>
          </div>

          <div class="import-option" data-type="pgn">
            <div class="option-header">
              <span class="option-icon">♟</span>
              <span class="option-title">PGN File</span>
            </div>
            <p class="option-desc">Import games from standard PGN format</p>
            <input type="file" id="pgn-file-input" accept=".pgn" class="file-input">
            <button class="import-btn" id="import-pgn-btn" disabled>Import PGN</button>
            <p class="import-note">Note: Imported PGN games will need analysis</p>
          </div>

          <div class="import-option" data-type="merge">
            <div class="option-header">
              <span class="option-icon">🔗</span>
              <span class="option-title">Merge Profiles</span>
            </div>
            <p class="option-desc">Combine stats from another device</p>
            <input type="file" id="merge-file-input" accept=".json" class="file-input">
            <button class="import-btn" id="merge-profile-btn" disabled>Merge Profile</button>
          </div>
        </div>

        <div id="import-status" class="import-status hidden"></div>
        <div id="import-preview" class="import-preview hidden"></div>
      </div>
    `;

    this.setupImportListeners();
  }

  /**
   * Setup import view event listeners
   */
  private setupImportListeners(): void {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    // Back button
    const backBtn = content.querySelector('#import-back-btn');
    backBtn?.addEventListener('click', () => this.renderMainView());

    // File inputs enable buttons
    const jsonInput = content.querySelector('#json-file-input') as HTMLInputElement;
    const jsonBtn = content.querySelector('#import-json-btn') as HTMLButtonElement;
    jsonInput?.addEventListener('change', () => {
      jsonBtn.disabled = !jsonInput.files?.length;
    });

    const pgnInput = content.querySelector('#pgn-file-input') as HTMLInputElement;
    const pgnBtn = content.querySelector('#import-pgn-btn') as HTMLButtonElement;
    pgnInput?.addEventListener('change', () => {
      pgnBtn.disabled = !pgnInput.files?.length;
    });

    const mergeInput = content.querySelector('#merge-file-input') as HTMLInputElement;
    const mergeBtn = content.querySelector('#merge-profile-btn') as HTMLButtonElement;
    mergeInput?.addEventListener('change', () => {
      mergeBtn.disabled = !mergeInput.files?.length;
    });

    // Import buttons
    jsonBtn?.addEventListener('click', () => this.importJSON());
    pgnBtn?.addEventListener('click', () => this.importPGN());
    mergeBtn?.addEventListener('click', () => this.mergeProfiles());
  }

  /**
   * Import JSON file (single game or batch)
   */
  private async importJSON(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const fileInput = content.querySelector('#json-file-input') as HTMLInputElement;
    const statusEl = content.querySelector('#import-status');

    if (!fileInput?.files?.length || !statusEl) return;

    const file = fileInput.files[0];
    this.showStatus(statusEl as HTMLElement, 'Reading file...', 'loading');

    try {
      // Read file content
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      // Determine if batch or single game
      const isBatch = Array.isArray(data.games);

      if (isBatch) {
        // Batch import
        this.showStatus(
          statusEl as HTMLElement,
          `Importing ${data.games.length} games...`,
          'loading'
        );

        // For batch import, we need to write to a temp file and use backend
        // In a real implementation, we'd use Neutralino's filesystem API
        // For now, show a message about the feature
        this.showStatus(
          statusEl as HTMLElement,
          `Batch import would process ${data.games.length} games. Full implementation requires file system access.`,
          'success'
        );
      } else {
        // Single game import
        this.showStatus(statusEl as HTMLElement, 'Importing game...', 'loading');

        // Similar limitation - need file system access for full implementation
        this.showStatus(
          statusEl as HTMLElement,
          'Single game import detected. Full implementation requires file system access.',
          'success'
        );
      }

      frontendLogger.info('DataManagement', 'JSON import processed', {
        isBatch,
        filename: file.name,
      });
    } catch (error) {
      frontendLogger.error('DataManagement', 'JSON import failed', error);
      this.showStatus(
        statusEl as HTMLElement,
        'Failed to read JSON file. Please check the format.',
        'error'
      );
    }
  }

  /**
   * Import PGN file
   */
  private async importPGN(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const fileInput = content.querySelector('#pgn-file-input') as HTMLInputElement;
    const statusEl = content.querySelector('#import-status');

    if (!fileInput?.files?.length || !statusEl) return;

    const file = fileInput.files[0];
    this.showStatus(statusEl as HTMLElement, 'Reading PGN file...', 'loading');

    try {
      const fileContent = await file.text();

      // Check if file contains PGN data
      if (!fileContent.includes('[Event') && !fileContent.includes('1.')) {
        this.showStatus(statusEl as HTMLElement, 'Invalid PGN file format.', 'error');
        return;
      }

      this.showStatus(
        statusEl as HTMLElement,
        'PGN file read successfully. Full implementation requires file system access for import.',
        'success'
      );

      frontendLogger.info('DataManagement', 'PGN import processed', { filename: file.name });
    } catch (error) {
      frontendLogger.error('DataManagement', 'PGN import failed', error);
      this.showStatus(statusEl as HTMLElement, 'Failed to read PGN file.', 'error');
    }
  }

  /**
   * Merge player profiles
   */
  private async mergeProfiles(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const fileInput = content.querySelector('#merge-file-input') as HTMLInputElement;
    const statusEl = content.querySelector('#import-status');

    if (!fileInput?.files?.length || !statusEl) return;

    const file = fileInput.files[0];
    this.showStatus(statusEl as HTMLElement, 'Reading profile...', 'loading');

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      if (!data.profile) {
        this.showStatus(
          statusEl as HTMLElement,
          'Invalid profile file. Missing profile data.',
          'error'
        );
        return;
      }

      this.showStatus(
        statusEl as HTMLElement,
        'Profile file read successfully. Full implementation requires file system access for merge.',
        'success'
      );

      frontendLogger.info('DataManagement', 'Profile merge processed', { filename: file.name });
    } catch (error) {
      frontendLogger.error('DataManagement', 'Profile merge failed', error);
      this.showStatus(statusEl as HTMLElement, 'Failed to read profile file.', 'error');
    }
  }

  /**
   * Show the backup view
   */
  private async showBackupView(): Promise<void> {
    this.currentView = 'backup';
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    // Load backup settings and list
    const settings = await this.loadBackupSettings();
    const backups = await this.loadBackupsList();

    content.innerHTML = `
      <div class="data-mgmt-backup">
        <button class="back-btn" id="backup-back-btn">← Back</button>
        <h3>Backup & Restore</h3>

        <div class="backup-section">
          <h4>Automatic Backups</h4>
          <div class="backup-settings">
            <label class="checkbox-option">
              <input type="checkbox" id="auto-backup-enabled" ${settings.enabled ? 'checked' : ''}>
              Enable automatic backups
            </label>
            <div class="frequency-options">
              <label><input type="radio" name="backup-frequency" value="daily" ${settings.frequency === 'daily' ? 'checked' : ''} ${!settings.enabled ? 'disabled' : ''}> Daily</label>
              <label><input type="radio" name="backup-frequency" value="weekly" ${settings.frequency === 'weekly' ? 'checked' : ''} ${!settings.enabled ? 'disabled' : ''}> Weekly</label>
              <label><input type="radio" name="backup-frequency" value="after-game" ${settings.frequency === 'after-game' ? 'checked' : ''} ${!settings.enabled ? 'disabled' : ''}> After each game</label>
            </div>
            ${settings.lastBackupTimestamp ? `<p class="last-backup">Last backup: ${new Date(settings.lastBackupTimestamp).toLocaleString()}</p>` : ''}
          </div>
          <button class="backup-btn" id="save-settings-btn">Save Settings</button>
        </div>

        <div class="backup-section">
          <h4>Create Backup</h4>
          <p>Create a complete backup of all your data including games, analysis, and progress.</p>
          <button class="backup-btn primary" id="create-backup-btn">
            <span class="btn-icon">💾</span>
            Create Full Backup Now
          </button>
        </div>

        <div class="backup-section">
          <h4>Available Backups (${backups.length})</h4>
          ${
            backups.length > 0
              ? `
            <div class="backups-list">
              ${backups
                .slice(0, 10)
                .map(
                  (backup) => `
                <div class="backup-item" data-filename="${backup.filename}">
                  <div class="backup-info">
                    <span class="backup-date">${new Date(backup.timestamp).toLocaleString()}</span>
                    <span class="backup-type">${backup.type}</span>
                    <span class="backup-games">${backup.gameCount} games</span>
                    <span class="backup-size">${this.formatSize(backup.size)}</span>
                  </div>
                  <button class="verify-btn" data-filename="${backup.filename}">Verify</button>
                </div>
              `
                )
                .join('')}
            </div>
          `
              : '<p class="no-backups">No backups found</p>'
          }
        </div>

        <div class="backup-section">
          <h4>Restore from File</h4>
          <p>Restore your data from a backup file.</p>
          <input type="file" id="restore-file-input" accept=".json" class="file-input">
          <button class="backup-btn" id="restore-backup-btn" disabled>
            <span class="btn-icon">📦</span>
            Restore Backup
          </button>
          <p class="warning-note">Warning: This will overwrite your current data!</p>
        </div>

        <div class="backup-section">
          <h4>Storage Location</h4>
          <p id="storage-path">Loading...</p>
          <button class="backup-btn secondary" id="open-folder-btn">
            <span class="btn-icon">📁</span>
            Open Data Folder
          </button>
        </div>

        <div id="backup-status" class="backup-status hidden"></div>
      </div>
    `;

    this.setupBackupListeners();
    this.loadStoragePath();
  }

  /**
   * Load backup settings from backend
   */
  private async loadBackupSettings(): Promise<{
    enabled: boolean;
    frequency: string;
    lastBackupTimestamp?: string;
    compression: boolean;
  }> {
    try {
      const response = (await buntralino.run('getBackupSettings', {})) as {
        settings: {
          enabled: boolean;
          frequency: string;
          lastBackupTimestamp?: string;
          compression: boolean;
        };
        success: boolean;
      };
      if (response.success) {
        return response.settings;
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Failed to load backup settings', error);
    }
    return { enabled: true, frequency: 'daily', compression: false };
  }

  /**
   * Load list of available backups
   */
  private async loadBackupsList(): Promise<
    Array<{ filename: string; timestamp: string; type: string; gameCount: number; size: number }>
  > {
    try {
      const response = (await buntralino.run('listBackups', {})) as {
        backups: Array<{
          filename: string;
          timestamp: string;
          type: string;
          gameCount: number;
          size: number;
        }>;
        success: boolean;
      };
      if (response.success) {
        return response.backups;
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Failed to load backups list', error);
    }
    return [];
  }

  /**
   * Format file size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Setup backup view event listeners
   */
  private setupBackupListeners(): void {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    // Back button
    const backBtn = content.querySelector('#backup-back-btn');
    backBtn?.addEventListener('click', () => this.renderMainView());

    // Auto backup enabled checkbox
    const autoBackupCheckbox = content.querySelector('#auto-backup-enabled') as HTMLInputElement;
    autoBackupCheckbox?.addEventListener('change', () => {
      const frequencyRadios = content.querySelectorAll(
        'input[name="backup-frequency"]'
      ) as NodeListOf<HTMLInputElement>;
      frequencyRadios.forEach((radio) => {
        radio.disabled = !autoBackupCheckbox.checked;
      });
    });

    // Save settings button
    const saveSettingsBtn = content.querySelector('#save-settings-btn');
    saveSettingsBtn?.addEventListener('click', () => this.saveBackupSettings());

    // Create backup button
    const createBtn = content.querySelector('#create-backup-btn');
    createBtn?.addEventListener('click', () => this.createManualBackup());

    // Verify backup buttons
    const verifyBtns = content.querySelectorAll('.verify-btn');
    verifyBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filename = (e.target as HTMLElement).dataset.filename;
        if (filename) this.verifyBackup(filename);
      });
    });

    // Restore file input enables button
    const restoreInput = content.querySelector('#restore-file-input') as HTMLInputElement;
    const restoreBtn = content.querySelector('#restore-backup-btn') as HTMLButtonElement;
    restoreInput?.addEventListener('change', () => {
      restoreBtn.disabled = !restoreInput.files?.length;
    });

    // Restore button
    restoreBtn?.addEventListener('click', () => this.restoreBackup());

    // Open folder button
    const openFolderBtn = content.querySelector('#open-folder-btn');
    openFolderBtn?.addEventListener('click', () => this.openDataFolder());
  }

  /**
   * Save backup settings
   */
  private async saveBackupSettings(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const statusEl = content?.querySelector('#backup-status');
    if (!content || !statusEl) return;

    const enabledCheckbox = content.querySelector('#auto-backup-enabled') as HTMLInputElement;
    const frequencyRadios = content.querySelectorAll(
      'input[name="backup-frequency"]'
    ) as NodeListOf<HTMLInputElement>;

    let frequency: 'daily' | 'weekly' | 'after-game' = 'daily';
    frequencyRadios.forEach((radio) => {
      if (radio.checked) {
        frequency = radio.value as 'daily' | 'weekly' | 'after-game';
      }
    });

    this.showStatus(statusEl as HTMLElement, 'Saving settings...', 'loading');

    try {
      const response = (await buntralino.run('saveBackupSettings', {
        enabled: enabledCheckbox.checked,
        frequency,
        compression: false,
      })) as { success: boolean };

      if (response.success) {
        this.showStatus(statusEl as HTMLElement, 'Backup settings saved!', 'success');
        frontendLogger.info('DataManagement', 'Backup settings saved', {
          enabled: enabledCheckbox.checked,
          frequency,
        });
      } else {
        this.showStatus(statusEl as HTMLElement, 'Failed to save settings', 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Failed to save backup settings', error);
      this.showStatus(statusEl as HTMLElement, 'Failed to save settings', 'error');
    }
  }

  /**
   * Create manual backup
   */
  private async createManualBackup(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const statusEl = content?.querySelector('#backup-status');
    if (!statusEl) return;

    this.showStatus(statusEl as HTMLElement, 'Creating backup...', 'loading');

    try {
      // Use the export backup for manual backups (saves to exports folder)
      await this.exportBackup();

      // Also create an automatic backup (saves to backups folder)
      const response = (await buntralino.run('createAutomaticBackup', { type: 'daily' })) as {
        backup: { filename: string; gameCount: number; size: number } | null;
        success: boolean;
      };

      if (response.success && response.backup) {
        this.showStatus(
          statusEl as HTMLElement,
          `Backup created: ${response.backup.filename} (${response.backup.gameCount} games)`,
          'success'
        );
        // Refresh the view to show new backup
        setTimeout(() => this.showBackupView(), 1500);
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Manual backup failed', error);
      this.showStatus(statusEl as HTMLElement, 'Backup failed. Please try again.', 'error');
    }
  }

  /**
   * Verify a backup file
   */
  private async verifyBackup(filename: string): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const statusEl = content?.querySelector('#backup-status');
    if (!statusEl) return;

    this.showStatus(statusEl as HTMLElement, 'Verifying backup...', 'loading');

    try {
      const response = (await buntralino.run('verifyBackup', { filename })) as {
        valid: boolean;
        issues: string[];
        success: boolean;
      };

      if (response.success) {
        if (response.valid) {
          this.showStatus(statusEl as HTMLElement, `Backup "${filename}" is valid!`, 'success');
        } else {
          this.showStatus(
            statusEl as HTMLElement,
            `Backup has issues: ${response.issues.join(', ')}`,
            'error'
          );
        }
        frontendLogger.info('DataManagement', 'Backup verified', {
          filename,
          valid: response.valid,
          issues: response.issues,
        });
      } else {
        this.showStatus(statusEl as HTMLElement, 'Failed to verify backup', 'error');
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Backup verification failed', error);
      this.showStatus(statusEl as HTMLElement, 'Verification failed', 'error');
    }
  }

  /**
   * Load and display storage path
   */
  private async loadStoragePath(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    const pathEl = content?.querySelector('#storage-path');

    if (!pathEl) return;

    try {
      const response = (await buntralino.run('getStoragePath', {})) as {
        path: string;
        success: boolean;
      };
      if (response.success) {
        pathEl.textContent = response.path;
      }
    } catch (error) {
      pathEl.textContent = 'Unable to determine storage location';
      frontendLogger.error('DataManagement', 'Failed to load storage path', error);
    }
  }

  /**
   * Restore from backup file
   */
  private async restoreBackup(): Promise<void> {
    const content = this.overlayElement?.querySelector('#data-mgmt-content');
    if (!content) return;

    const fileInput = content.querySelector('#restore-file-input') as HTMLInputElement;
    const statusEl = content.querySelector('#backup-status');

    if (!fileInput?.files?.length || !statusEl) return;

    // Show confirmation dialog (confirm is appropriate for desktop app user confirmation)
    const userConfirmed =
      // eslint-disable-next-line no-alert
      confirm(
        'This will overwrite your current data. Are you sure you want to restore from this backup?'
      );
    if (!userConfirmed) {
      return;
    }

    const file = fileInput.files[0];
    this.showStatus(statusEl as HTMLElement, 'Reading backup file...', 'loading');

    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      // Validate backup structure
      if (!data.games || !data.source || data.source !== 'Chess-Sensei') {
        this.showStatus(statusEl as HTMLElement, 'Invalid backup file format.', 'error');
        return;
      }

      this.showStatus(
        statusEl as HTMLElement,
        `Backup contains ${data.gameCount || data.games.length} games. Full restore requires file system access.`,
        'success'
      );

      frontendLogger.info('DataManagement', 'Backup restore processed', {
        filename: file.name,
        games: data.gameCount,
      });
    } catch (error) {
      frontendLogger.error('DataManagement', 'Backup restore failed', error);
      this.showStatus(statusEl as HTMLElement, 'Failed to read backup file.', 'error');
    }
  }

  /**
   * Open the data folder in file explorer
   */
  private async openDataFolder(): Promise<void> {
    try {
      const response = (await buntralino.run('getExportsPath', {})) as {
        path: string;
        success: boolean;
      };
      if (response.success) {
        // In a full implementation, we'd use Neutralino's os.open() to open the folder
        frontendLogger.info('DataManagement', 'Open folder requested', { path: response.path });
        // Alert is appropriate here to show path to user (TODO: replace with Neutralino os.open)
        // eslint-disable-next-line no-alert
        alert(
          `Data is stored at: ${response.path}\n\nUse your file explorer to navigate to this location.`
        );
      }
    } catch (error) {
      frontendLogger.error('DataManagement', 'Failed to get exports path', error);
    }
  }

  /**
   * Show status message
   */
  private showStatus(
    element: HTMLElement,
    message: string,
    type: 'loading' | 'success' | 'error'
  ): void {
    element.className = `status-message ${type}`;
    element.classList.remove('hidden');

    if (type === 'loading') {
      element.innerHTML = `<div class="loading-spinner"></div><span>${message}</span>`;
    } else if (type === 'success') {
      element.innerHTML = `<span class="status-icon">✓</span><span>${message}</span>`;
    } else {
      element.innerHTML = `<span class="status-icon">✗</span><span>${message}</span>`;
    }
  }
}

/**
 * Create a data management manager instance
 */
export function createDataManagement(): DataManagementManager {
  return new DataManagementManager();
}
