/**
 * Analysis UI Controller
 * Coordinates the post-game analysis interface
 */

import { ipc } from '../websocket-ipc-client';
import { IPC_METHODS, isErrorResponse } from '../../shared/ipc-types';
import { ChessGame } from '../../shared/chess-logic';
import { frontendLogger } from '../frontend-logger';
import { printAnalysis } from '../print-utils';
import { copyAnalysisAsHTML } from '../clipboard-utils';

import type {
  StoredGameData,
  StoredAnalysisData,
  GameIndexEntry,
  AnalysisUIState,
  QuickStats,
} from '../../shared/analysis-types';

import { renderAnalysisBoard } from './components/board-renderer';
import { renderEvaluationGraph, updateEvalGraphMarker } from './components/evaluation-graph';
import { renderMoveList, updateMoveListSelection } from './components/move-list';
import { renderPositionAnalysis } from './components/position-analysis';
import { renderGameSummary, getAccuracyClass } from './components/summary-panel';
import {
  renderTrainingRecommendations,
  generateRecommendations,
} from './components/recommendations';
import { showAlternativesModal } from './components/alternatives-modal';
import {
  renderNavigationControls,
  attachNavigationListeners,
  createKeyboardHandler,
  type NavigationHandlers,
} from './components/navigation-controls';

/**
 * Analysis UI Manager Class
 * Manages the Post-Game Analysis UI
 */
export class AnalysisUIManager {
  private state: AnalysisUIState;
  private game: ChessGame;

  // Callbacks for external integration
  public onClose?: () => void;
  public onOpenSandbox?: (fen: string) => void;

  // Bound event handler reference for cleanup (prevents memory leak)
  private boundKeyPressHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.state = {
      isActive: false,
      isLoading: false,
      gameId: null,
      gameData: null,
      analysisData: null,
      metricsData: null,
      currentMoveIndex: 0,
      isAutoPlaying: false,
      autoPlayInterval: null,
      boardFlipped: false,
    };
    this.game = new ChessGame();
  }

  /**
   * Get current state
   */
  getState(): AnalysisUIState {
    return { ...this.state };
  }

  /**
   * Check if analysis UI is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Calculate quick stats for game over screen
   */
  calculateQuickStats(analysis: StoredAnalysisData, duration: number): QuickStats {
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
      accuracy: analysis.summary.overallAccuracy,
      blunders: analysis.summary.blunders,
      mistakes: analysis.summary.mistakes,
      inaccuracies: analysis.summary.inaccuracies,
      duration: formatDuration(duration),
    };
  }

  /**
   * Show enhanced game over screen with quick stats
   */
  async showGameOverWithStats(
    gameId: string,
    result: string,
    termination: string,
    playerColor: 'white' | 'black'
  ): Promise<void> {
    frontendLogger.enter('AnalysisUI', 'showGameOverWithStats', {
      gameId,
      result,
      termination,
      playerColor,
    });

    this.state.isLoading = true;

    try {
      const [gameData, analysisData] = await Promise.all([
        this.loadGame(gameId),
        this.loadAnalysis(gameId),
      ]);

      if (!gameData || !analysisData) {
        frontendLogger.warn('AnalysisUI', 'Could not load game or analysis data', {
          gameId,
          hasGameData: !!gameData,
          hasAnalysisData: !!analysisData,
        });
        return;
      }

      this.state.gameData = gameData;
      this.state.analysisData = analysisData;
      this.state.gameId = gameId;

      const quickStats = this.calculateQuickStats(analysisData, gameData.metadata.duration);
      this.updateGameOverModal(result, termination, quickStats, playerColor);
      frontendLogger.exit('AnalysisUI', 'showGameOverWithStats');
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Error loading analysis for game over', error as Error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Update game over modal with quick stats
   */
  private updateGameOverModal(
    _result: string,
    _termination: string,
    stats: QuickStats,
    _playerColor: 'white' | 'black'
  ): void {
    const statsContainer = document.getElementById('game-over-stats');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="quick-stats">
        <div class="stat-item accuracy">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value ${getAccuracyClass(stats.accuracy)}">${stats.accuracy.toFixed(1)}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Blunders</span>
          <span class="stat-value blunder-count">${stats.blunders}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Mistakes</span>
          <span class="stat-value mistake-count">${stats.mistakes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Inaccuracies</span>
          <span class="stat-value inaccuracy-count">${stats.inaccuracies}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${stats.duration}</span>
        </div>
      </div>
    `;

    statsContainer.classList.remove('hidden');
  }

  /**
   * Open full analysis UI
   */
  async openAnalysis(gameId: string): Promise<void> {
    frontendLogger.separator('AnalysisUI', 'Opening Full Analysis UI');
    frontendLogger.enter('AnalysisUI', 'openAnalysis', { gameId });

    this.state.isActive = true;
    this.state.isLoading = true;
    this.state.gameId = gameId;
    this.state.currentMoveIndex = 0;

    this.showAnalysisOverlay(true);
    this.showLoadingState(true);

    try {
      const [gameData, analysisData] = await Promise.all([
        this.loadGame(gameId),
        this.loadAnalysis(gameId),
      ]);

      if (!gameData || !analysisData) {
        throw new Error('Could not load game or analysis data');
      }

      this.state.gameData = gameData;
      this.state.analysisData = analysisData;

      this.showLoadingState(false);
      this.renderAnalysisUI();
      frontendLogger.exit('AnalysisUI', 'openAnalysis');
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Error opening analysis', error as Error, { gameId });
      this.showError('Failed to load analysis. Please try again.');
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Close analysis UI
   */
  closeAnalysis(): void {
    this.stopAutoPlay();

    // Remove keyboard listener
    if (this.boundKeyPressHandler) {
      document.removeEventListener('keydown', this.boundKeyPressHandler);
      this.boundKeyPressHandler = null;
    }

    this.state.isActive = false;
    this.state.gameId = null;
    this.state.gameData = null;
    this.state.analysisData = null;
    this.state.metricsData = null;
    this.state.currentMoveIndex = 0;

    this.showAnalysisOverlay(false);
    this.onClose?.();
  }

  /**
   * Load game data from backend
   */
  private async loadGame(gameId: string): Promise<StoredGameData | null> {
    frontendLogger.ipc('AnalysisUI', 'LOAD_GAME', { gameId });
    try {
      const response = await ipc.call(IPC_METHODS.LOAD_GAME, { gameId });
      if (isErrorResponse(response)) {
        frontendLogger.error('AnalysisUI', 'Error loading game', undefined, {
          gameId,
          error: response.error,
          code: response.code,
        });
        return null;
      }
      return (response as { game: StoredGameData }).game;
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Exception loading game', error as Error, { gameId });
      return null;
    }
  }

  /**
   * Load analysis data from backend
   */
  private async loadAnalysis(gameId: string): Promise<StoredAnalysisData | null> {
    frontendLogger.ipc('AnalysisUI', 'LOAD_ANALYSIS', { gameId });
    try {
      const response = await ipc.call(IPC_METHODS.LOAD_ANALYSIS, { gameId });
      if (isErrorResponse(response)) {
        frontendLogger.error('AnalysisUI', 'Error loading analysis', undefined, {
          gameId,
          error: response.error,
          code: response.code,
        });
        return null;
      }
      return (response as { analysis: StoredAnalysisData }).analysis;
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Exception loading analysis', error as Error, { gameId });
      return null;
    }
  }

  /**
   * Get games list for history
   */
  async getGamesList(): Promise<GameIndexEntry[]> {
    try {
      const response = await ipc.call(IPC_METHODS.GET_GAMES_LIST, {});
      if (isErrorResponse(response)) {
        return [];
      }
      return (response as { games: GameIndexEntry[] }).games || [];
    } catch (error) {
      console.error('Error getting games list:', error);
      return [];
    }
  }

  // ========================================
  // Rendering Methods
  // ========================================

  /**
   * Render the full analysis UI
   */
  private renderAnalysisUI(): void {
    const container = document.getElementById('analysis-content');
    if (!container || !this.state.analysisData || !this.state.gameData) return;

    container.innerHTML = `
      <!-- Tab Navigation -->
      <div class="analysis-tabs">
        <button class="analysis-tab active" data-tab="review">Move Review</button>
        <button class="analysis-tab" data-tab="summary">Game Summary</button>
        <button class="analysis-tab" data-tab="analytics">Deep Analytics</button>
      </div>

      <!-- Review Tab Content -->
      <div class="analysis-tab-content active" id="tab-review">
        <div class="analysis-layout">
          <!-- Left side: Board and controls -->
          <div class="analysis-board-section">
            <div class="analysis-board-wrapper">
              <div class="analysis-board" id="analysis-board"></div>
            </div>
            <div class="analysis-controls">
              ${renderNavigationControls()}
            </div>
          </div>

          <!-- Right side: Panels -->
          <div class="analysis-panels">
            <div class="analysis-panel eval-graph-panel">
              <h3>Evaluation</h3>
              <div class="eval-graph-container" id="eval-graph-container">
                ${renderEvaluationGraph(this.state.analysisData, this.state.gameData)}
              </div>
            </div>

            <div class="analysis-panel move-list-panel">
              <h3>Moves</h3>
              <div class="analysis-move-list" id="analysis-move-list">
                ${renderMoveList(this.state.analysisData, this.state.gameData, this.state.currentMoveIndex)}
              </div>
            </div>

            <div class="analysis-panel position-panel">
              <h3>Position Analysis</h3>
              <div class="position-analysis" id="position-analysis">
                ${renderPositionAnalysis(this.state.analysisData, this.state.gameData, this.state.currentMoveIndex)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Tab Content -->
      <div class="analysis-tab-content" id="tab-summary">
        ${renderGameSummary(this.state.analysisData, this.state.gameData)}
      </div>

      <!-- Analytics Tab Content -->
      <div class="analysis-tab-content" id="tab-analytics">
        ${this.renderDeepAnalytics()}
      </div>
    `;

    // Render the board
    this.renderBoard();

    // Attach event listeners
    this.attachAnalysisEventListeners();
    this.attachTabEventListeners();
  }

  /**
   * Render the analysis board
   */
  private renderBoard(): void {
    const boardElement = document.getElementById('analysis-board');
    if (!boardElement) return;

    renderAnalysisBoard(
      this.game,
      {
        currentMoveIndex: this.state.currentMoveIndex,
        boardFlipped: this.state.boardFlipped,
        analysisData: this.state.analysisData,
      },
      boardElement
    );
  }

  /**
   * Render deep analytics tab
   */
  private renderDeepAnalytics(): string {
    if (!this.state.analysisData || !this.state.gameData) return '';

    const phases = this.state.analysisData.gamePhases;

    return `
      <div class="analytics-layout">
        <div class="analytics-section">
          <h3>Phase Accuracy</h3>
          <div class="bar-chart">
            <div class="bar-item">
              <div class="bar-label">Opening</div>
              <div class="bar-container">
                <div class="bar ${getAccuracyClass(phases.opening.accuracy)}" style="width: ${phases.opening.accuracy}%">
                  ${phases.opening.accuracy.toFixed(0)}%
                </div>
              </div>
            </div>
            <div class="bar-item">
              <div class="bar-label">Middlegame</div>
              <div class="bar-container">
                <div class="bar ${getAccuracyClass(phases.middlegame.accuracy)}" style="width: ${phases.middlegame.accuracy}%">
                  ${phases.middlegame.accuracy.toFixed(0)}%
                </div>
              </div>
            </div>
            <div class="bar-item">
              <div class="bar-label">Endgame</div>
              <div class="bar-container">
                <div class="bar ${getAccuracyClass(phases.endgame.accuracy)}" style="width: ${phases.endgame.accuracy}%">
                  ${phases.endgame.accuracy.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="analytics-section">
          <h3>Training Recommendations</h3>
          <div class="recommendations-content">
            ${renderTrainingRecommendations(this.state.analysisData, this.state.gameData)}
          </div>
        </div>
      </div>
    `;
  }

  // ========================================
  // Event Listeners
  // ========================================

  /**
   * Attach tab navigation listeners
   */
  private attachTabEventListeners(): void {
    document.querySelectorAll('.analysis-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const tabName = (e.currentTarget as HTMLElement).dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  /**
   * Switch between analysis tabs
   */
  private switchTab(tabName: string): void {
    document.querySelectorAll('.analysis-tab').forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
    });

    document.querySelectorAll('.analysis-tab-content').forEach((content) => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  /**
   * Attach analysis event listeners
   */
  private attachAnalysisEventListeners(): void {
    // Navigation handlers
    const handlers: NavigationHandlers = {
      goToStart: () => this.goToStart(),
      goToPreviousMove: () => this.goToPreviousMove(),
      goToNextMove: () => this.goToNextMove(),
      goToEnd: () => this.goToEnd(),
      toggleAutoPlay: () => this.toggleAutoPlay(),
      flipBoard: () => this.flipBoard(),
      jumpToPreviousMistake: () => this.jumpToPreviousMistake(),
      jumpToNextMistake: () => this.jumpToNextMistake(),
      closeAnalysis: () => this.closeAnalysis(),
    };

    attachNavigationListeners(handlers);

    // Move list clicks
    document.querySelectorAll('.move-entry').forEach((entry) => {
      entry.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.goToMove(index);
      });
    });

    // Eval graph clicks
    document.querySelectorAll('.eval-point').forEach((point) => {
      point.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as SVGElement).dataset.index || '0');
        this.goToMove(index);
      });
    });

    // View alternatives button
    document.querySelectorAll('.view-alternatives-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
        this.showAlternatives(index);
      });
    });

    // Keyboard navigation
    this.boundKeyPressHandler = createKeyboardHandler(handlers, () => this.state.isActive);
    document.addEventListener('keydown', this.boundKeyPressHandler);

    // Close button
    document
      .getElementById('analysis-close-btn')
      ?.addEventListener('click', () => this.closeAnalysis());

    // Print and copy buttons
    const analysisHeader = document.querySelector('.analysis-header');
    if (analysisHeader) {
      const printBtn = document.createElement('button');
      printBtn.className = 'analysis-print-btn';
      printBtn.innerHTML = '🖨️ Print';
      printBtn.onclick = () => printAnalysis();
      printBtn.style.marginLeft = 'auto';
      printBtn.style.marginRight = '5px';
      analysisHeader.appendChild(printBtn);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'analysis-copy-btn';
      copyBtn.innerHTML = '📋 Copy HTML';
      copyBtn.onclick = () => copyAnalysisAsHTML();
      copyBtn.style.marginRight = '10px';
      analysisHeader.appendChild(copyBtn);
    }
  }

  // ========================================
  // Navigation Methods
  // ========================================

  goToStart(): void {
    this.goToMove(-1);
  }

  goToPreviousMove(): void {
    if (this.state.currentMoveIndex > -1) {
      this.goToMove(this.state.currentMoveIndex - 1);
    }
  }

  goToNextMove(): void {
    if (!this.state.analysisData) return;
    if (this.state.currentMoveIndex < this.state.analysisData.moveAnalysis.length - 1) {
      this.goToMove(this.state.currentMoveIndex + 1);
    }
  }

  goToEnd(): void {
    if (!this.state.analysisData) return;
    this.goToMove(this.state.analysisData.moveAnalysis.length - 1);
  }

  goToMove(index: number): void {
    this.state.currentMoveIndex = index;

    // Update board
    this.renderBoard();

    // Update move list selection
    updateMoveListSelection(index);

    // Update position analysis panel
    const positionPanel = document.getElementById('position-analysis');
    if (positionPanel) {
      positionPanel.innerHTML = renderPositionAnalysis(
        this.state.analysisData,
        this.state.gameData,
        this.state.currentMoveIndex
      );
      // Re-attach alternatives button listener
      document.querySelectorAll('.view-alternatives-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
          this.showAlternatives(idx);
        });
      });
    }

    // Update eval graph marker
    updateEvalGraphMarker(this.state.analysisData, index);
  }

  jumpToPreviousMistake(): void {
    if (!this.state.analysisData) return;
    const playerColor = this.state.gameData?.metadata.playerColor || 'white';

    for (let i = this.state.currentMoveIndex - 1; i >= 0; i--) {
      const move = this.state.analysisData.moveAnalysis[i];
      if (
        move.color === playerColor &&
        (move.classification === 'mistake' || move.classification === 'blunder')
      ) {
        this.goToMove(i);
        return;
      }
    }
  }

  jumpToNextMistake(): void {
    if (!this.state.analysisData) return;
    const playerColor = this.state.gameData?.metadata.playerColor || 'white';

    for (
      let i = this.state.currentMoveIndex + 1;
      i < this.state.analysisData.moveAnalysis.length;
      i++
    ) {
      const move = this.state.analysisData.moveAnalysis[i];
      if (
        move.color === playerColor &&
        (move.classification === 'mistake' || move.classification === 'blunder')
      ) {
        this.goToMove(i);
        return;
      }
    }
  }

  // ========================================
  // Auto-play Methods
  // ========================================

  toggleAutoPlay(): void {
    if (this.state.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (!this.state.analysisData) return;
    this.state.isAutoPlaying = true;

    const playButton = document.getElementById('nav-play');
    if (playButton) {
      playButton.innerHTML = '<span>⏸</span>';
    }

    this.state.autoPlayInterval = window.setInterval(() => {
      if (
        this.state.analysisData &&
        this.state.currentMoveIndex < this.state.analysisData.moveAnalysis.length - 1
      ) {
        this.goToNextMove();
      } else {
        this.stopAutoPlay();
      }
    }, 1500);
  }

  private stopAutoPlay(): void {
    this.state.isAutoPlaying = false;

    if (this.state.autoPlayInterval) {
      clearInterval(this.state.autoPlayInterval);
      this.state.autoPlayInterval = null;
    }

    const playButton = document.getElementById('nav-play');
    if (playButton) {
      playButton.innerHTML = '<span>▶</span>';
    }
  }

  // ========================================
  // Board Methods
  // ========================================

  flipBoard(): void {
    this.state.boardFlipped = !this.state.boardFlipped;
    this.renderBoard();
  }

  // ========================================
  // Alternatives Modal
  // ========================================

  showAlternatives(moveIndex: number): void {
    if (!this.state.analysisData) return;
    const move = this.state.analysisData.moveAnalysis[moveIndex];
    if (!move) return;

    showAlternativesModal(move, moveIndex, this.onOpenSandbox);
  }

  // ========================================
  // UI State Methods
  // ========================================

  private showAnalysisOverlay(show: boolean): void {
    const overlay = document.getElementById('analysis-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  private showLoadingState(show: boolean): void {
    const loading = document.getElementById('analysis-loading');
    const content = document.getElementById('analysis-content');
    if (loading) loading.classList.toggle('hidden', !show);
    if (content) content.classList.toggle('hidden', show);
  }

  private showError(message: string): void {
    const content = document.getElementById('analysis-content');
    if (content) {
      content.innerHTML = `
        <div class="analysis-error">
          <p>${message}</p>
          <button onclick="document.getElementById('analysis-overlay').classList.add('hidden')">
            Close
          </button>
        </div>
      `;
    }
    this.showLoadingState(false);
  }

  // ========================================
  // Export Methods
  // ========================================

  exportPGN(): void {
    if (!this.state.gameData) return;
    const pgn = this.state.gameData.pgn;
    this.downloadFile(pgn, `game-${this.state.gameId}.pgn`, 'application/x-chess-pgn');
    this.showNotification('PGN exported successfully', 'success');
  }

  exportJSON(): void {
    if (!this.state.gameData || !this.state.analysisData) return;
    const data = {
      game: this.state.gameData,
      analysis: this.state.analysisData,
    };
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, `analysis-${this.state.gameId}.json`, 'application/json');
    this.showNotification('JSON exported successfully', 'success');
  }

  exportReport(): void {
    if (!this.state.gameData || !this.state.analysisData) return;
    const html = this.generateReportHTML();
    this.downloadFile(html, `report-${this.state.gameId}.html`, 'text/html');
    this.showNotification('Report exported successfully', 'success');
  }

  private generateReportHTML(): string {
    if (!this.state.gameData || !this.state.analysisData) return '';

    const summary = this.state.analysisData.summary;
    const metadata = this.state.gameData.metadata;
    const recommendations =
      this.state.gameData && this.state.analysisData
        ? generateRecommendations(this.state.analysisData, this.state.gameData)
        : [];

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Chess Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2 { color: #333; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
    .stat { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .recommendations li { margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Chess Game Analysis Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>

  <h2>Game Summary</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${summary.overallAccuracy.toFixed(1)}%</div>
      <div>Accuracy</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.blunders}</div>
      <div>Blunders</div>
    </div>
    <div class="stat">
      <div class="stat-value">${summary.mistakes}</div>
      <div>Mistakes</div>
    </div>
  </div>

  <h2>Game Details</h2>
  <ul>
    <li><strong>Result:</strong> ${metadata.result}</li>
    <li><strong>Your Color:</strong> ${metadata.playerColor}</li>
    <li><strong>Opponent:</strong> ${metadata.botPersonality} (${metadata.botElo} Elo)</li>
    <li><strong>Termination:</strong> ${metadata.termination}</li>
  </ul>

  <h2>Training Recommendations</h2>
  <ul class="recommendations">
    ${recommendations.map((rec) => `<li>${rec}</li>`).join('')}
  </ul>
</body>
</html>
    `;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `export-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Attach export button event listeners
   */
  attachExportEventListeners(): void {
    document.getElementById('export-pgn-btn')?.addEventListener('click', () => this.exportPGN());
    document.getElementById('export-json-btn')?.addEventListener('click', () => this.exportJSON());
    document
      .getElementById('export-report-btn')
      ?.addEventListener('click', () => this.exportReport());
  }
}

/**
 * Create and export the analysis UI manager instance
 */
export function createAnalysisUI(): AnalysisUIManager {
  return new AnalysisUIManager();
}

export default AnalysisUIManager;
