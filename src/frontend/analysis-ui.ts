/**
 * Post-Game Analysis UI Module
 *
 * Implements the comprehensive post-game analysis interface for Exam Mode games.
 * Provides move-by-move review, evaluation graphs, mistake analysis, and more.
 *
 * @see source-docs/post-game-analysis.md
 * @see source-docs/TASKS.md - Phase 5
 */

import * as buntralino from 'buntralino-client';
import { IPC_METHODS, isErrorResponse } from '../shared/ipc-types';
import { ChessGame } from '../shared/chess-logic';
import { frontendLogger } from './frontend-logger';

// ============================================
// Frontend Types for Analysis Data
// These mirror the backend types but are defined here for frontend use
// ============================================

/**
 * Stored game data format (matches backend StoredGameData)
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
 * Move classification type
 */
export type MoveClassification = 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/**
 * Analyzed move data
 */
export interface AnalyzedMove {
  moveNumber: number;
  move: string;
  san: string;
  uci: string;
  color: 'white' | 'black';
  evaluationBefore: number;
  evaluationAfter: number;
  centipawnLoss: number;
  classification: MoveClassification;
  accuracy: number;
  bestMove: string;
  alternativeMoves: Array<{
    move: string;
    evaluation: number;
  }>;
  timeSpent: number;
  timestamp: number;
}

/**
 * Critical moment in the game
 */
export interface CriticalMoment {
  moveNumber: number;
  type: 'blunder' | 'missed_win' | 'turning_point' | 'brilliant';
  evaluationSwing: number;
  evaluationBefore: number;
  evaluationAfter: number;
  description: string;
  bestMove?: string;
}

/**
 * Tactical opportunity (found or missed)
 */
export interface TacticalOpportunity {
  moveNumber: number;
  type: 'found' | 'missed';
  tactic: string;
  evaluation: number;
  description: string;
}

/**
 * Game phase information
 */
export interface GamePhase {
  opening: { start: number; end: number; accuracy: number };
  middlegame: { start: number; end: number; accuracy: number };
  endgame: { start: number; end: number; accuracy: number };
}

/**
 * Analysis summary statistics
 */
export interface AnalysisSummary {
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
}

/**
 * Stored analysis data (matches backend StoredAnalysisData)
 */
export interface StoredAnalysisData {
  gameId: string;
  analysisVersion: string;
  analysisTimestamp: string;
  engineVersion: string;
  summary: AnalysisSummary;
  moveAnalysis: AnalyzedMove[];
  criticalMoments: CriticalMoment[];
  tacticalOpportunities: TacticalOpportunity[];
  gamePhases: GamePhase;
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
 * Composite scores from metrics calculator
 */
export interface CompositeScores {
  precisionScore: number;
  tacticalDangerScore: number;
  stabilityScore: number;
  conversionScore: number;
  preparationScore: number;
  positionalScore: number;
  aggressionScore: number;
  simplificationScore: number;
  trainingTransferScore: number;
}

// ============================================
// Types
// ============================================

/**
 * Move classification colors per post-game-analysis.md
 */
export const MOVE_COLORS = {
  excellent: '#22c55e', // Green
  good: '#14b8a6', // Teal
  inaccuracy: '#eab308', // Yellow
  mistake: '#f97316', // Orange
  blunder: '#ef4444', // Red
} as const;

/**
 * Move classification symbols
 */
export const MOVE_SYMBOLS = {
  excellent: '!!',
  good: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
} as const;

/**
 * Analysis UI State
 */
export interface AnalysisUIState {
  isActive: boolean;
  isLoading: boolean;
  gameId: string | null;
  gameData: StoredGameData | null;
  analysisData: StoredAnalysisData | null;
  metricsData: CompositeScores | null;
  currentMoveIndex: number;
  isAutoPlaying: boolean;
  autoPlayInterval: number | null;
  boardFlipped: boolean;
}

/**
 * Quick stats for game over screen
 */
export interface QuickStats {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  duration: string;
}

// ============================================
// Analysis UI Manager Class
// ============================================

/**
 * Manages the Post-Game Analysis UI
 */
export class AnalysisUIManager {
  private state: AnalysisUIState;
  private game: ChessGame;

  // Callbacks for external integration
  public onClose?: () => void;
  public onOpenSandbox?: (fen: string) => void;

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
   * Task 5.1.1: Calculate quick stats for game over screen
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
   * Task 5.1.1: Show enhanced game over screen with quick stats
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

    // Start analyzing in background
    this.state.isLoading = true;

    try {
      // Load game and analysis
      frontendLogger.info('AnalysisUI', 'Loading game and analysis data', { gameId });
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
        console.warn('Could not load game or analysis data');
        return;
      }

      frontendLogger.info('AnalysisUI', 'Game and analysis data loaded successfully', {
        gameId,
        playerColor: gameData.metadata?.playerColor,
        accuracy: analysisData.summary?.overallAccuracy,
      });

      this.state.gameData = gameData;
      this.state.analysisData = analysisData;
      this.state.gameId = gameId;

      // Calculate quick stats
      const quickStats = this.calculateQuickStats(analysisData, gameData.metadata.duration);
      frontendLogger.debug('AnalysisUI', 'Quick stats calculated', quickStats);

      // Update the game over modal with stats
      this.updateGameOverModal(result, termination, quickStats, playerColor);
      frontendLogger.exit('AnalysisUI', 'showGameOverWithStats');
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Error loading analysis for game over', error as Error);
      console.error('Error loading analysis for game over:', error);
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

    // Create stats HTML
    statsContainer.innerHTML = `
      <div class="quick-stats">
        <div class="stat-item accuracy">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value ${this.getAccuracyClass(stats.accuracy)}">${stats.accuracy.toFixed(1)}%</span>
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
   * Get CSS class for accuracy value
   */
  private getAccuracyClass(accuracy: number): string {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 80) return 'good';
    if (accuracy >= 70) return 'average';
    if (accuracy >= 60) return 'below-average';
    return 'poor';
  }

  /**
   * Task 5.1.2 & 5.2: Open full analysis UI
   */
  async openAnalysis(gameId: string): Promise<void> {
    frontendLogger.separator('AnalysisUI', 'Opening Full Analysis UI');
    frontendLogger.enter('AnalysisUI', 'openAnalysis', { gameId });

    this.state.isActive = true;
    this.state.isLoading = true;
    this.state.gameId = gameId;
    this.state.currentMoveIndex = 0;

    // Show loading state
    this.showAnalysisOverlay(true);
    this.showLoadingState(true);

    try {
      // Load game and analysis data
      frontendLogger.info('AnalysisUI', 'Loading game and analysis data for full UI', { gameId });
      const [gameData, analysisData] = await Promise.all([
        this.loadGame(gameId),
        this.loadAnalysis(gameId),
      ]);

      if (!gameData || !analysisData) {
        frontendLogger.error('AnalysisUI', 'Could not load game or analysis data', undefined, {
          gameId,
          hasGameData: !!gameData,
          hasAnalysisData: !!analysisData,
        });
        throw new Error('Could not load game or analysis data');
      }

      frontendLogger.info('AnalysisUI', 'Data loaded, setting state', {
        gameId,
        accuracy: analysisData.summary?.overallAccuracy,
      });

      this.state.gameData = gameData;
      this.state.analysisData = analysisData;

      // Load metrics if available
      try {
        this.state.metricsData = await this.loadMetrics(gameId);
      } catch {
        console.warn('Metrics not available for this game');
      }

      // Initialize the game to starting position
      this.game.reset();

      // Render the analysis UI
      frontendLogger.info('AnalysisUI', 'Rendering analysis UI');
      this.renderAnalysisUI();
      frontendLogger.exit('AnalysisUI', 'openAnalysis');
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Error opening analysis', error as Error, { gameId });
      console.error('Error opening analysis:', error);
      this.showError('Failed to load game analysis');
    } finally {
      this.state.isLoading = false;
      this.showLoadingState(false);
    }
  }

  /**
   * Close analysis UI
   */
  closeAnalysis(): void {
    this.stopAutoPlay();
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
      const response = await buntralino.run(IPC_METHODS.LOAD_GAME, { gameId });
      if (isErrorResponse(response)) {
        frontendLogger.error('AnalysisUI', 'Error loading game', undefined, {
          gameId,
          error: response.error,
          code: response.code,
        });
        console.error('Error loading game:', response.error);
        return null;
      }
      const gameData = (response as { game: StoredGameData }).game;
      frontendLogger.ipcResponse('AnalysisUI', 'LOAD_GAME', {
        success: true,
        gameId,
        hasData: !!gameData,
      });
      return gameData;
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Exception loading game', error as Error, { gameId });
      console.error('Error loading game:', error);
      return null;
    }
  }

  /**
   * Load analysis data from backend
   */
  private async loadAnalysis(gameId: string): Promise<StoredAnalysisData | null> {
    frontendLogger.ipc('AnalysisUI', 'LOAD_ANALYSIS', { gameId });
    try {
      const response = await buntralino.run(IPC_METHODS.LOAD_ANALYSIS, { gameId });
      if (isErrorResponse(response)) {
        frontendLogger.error('AnalysisUI', 'Error loading analysis', undefined, {
          gameId,
          error: response.error,
          code: response.code,
        });
        console.error('Error loading analysis:', response.error);
        return null;
      }
      const analysisData = (response as { analysis: StoredAnalysisData }).analysis;
      frontendLogger.ipcResponse('AnalysisUI', 'LOAD_ANALYSIS', {
        success: true,
        gameId,
        hasData: !!analysisData,
        accuracy: analysisData?.summary?.overallAccuracy,
      });
      return analysisData;
    } catch (error) {
      frontendLogger.error('AnalysisUI', 'Exception loading analysis', error as Error, { gameId });
      console.error('Error loading analysis:', error);
      return null;
    }
  }

  /**
   * Load metrics data from backend
   */
  private async loadMetrics(_gameId: string): Promise<CompositeScores | null> {
    // Metrics are stored in the analysis data in our implementation
    // This could be expanded to load from player profile
    return null;
  }

  /**
   * Task 5.1.2: Get games list for history
   */
  async getGamesList(): Promise<GameIndexEntry[]> {
    try {
      const response = await buntralino.run(IPC_METHODS.GET_GAMES_LIST, {});
      if (isErrorResponse(response)) {
        console.error('Error getting games list:', response.error);
        return [];
      }
      return (response as { games: GameIndexEntry[] }).games || [];
    } catch (error) {
      console.error('Error getting games list:', error);
      return [];
    }
  }

  // ========================================
  // Task 5.2: Move-by-Move Review
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
              <div class="analysis-board" id="analysis-board">
                <!-- Board will be rendered here -->
              </div>
            </div>
            <div class="analysis-controls">
              ${this.renderNavigationControls()}
            </div>
          </div>

          <!-- Right side: Panels -->
          <div class="analysis-panels">
            <!-- Evaluation Graph (Top) -->
            <div class="analysis-panel eval-graph-panel">
              <h3>Evaluation</h3>
              <div class="eval-graph-container" id="eval-graph-container">
                ${this.renderEvaluationGraph()}
              </div>
            </div>

            <!-- Move List Panel (Middle) -->
            <div class="analysis-panel move-list-panel">
              <h3>Moves</h3>
              <div class="analysis-move-list" id="analysis-move-list">
                ${this.renderMoveList()}
              </div>
            </div>

            <!-- Current Position Analysis (Bottom) -->
            <div class="analysis-panel position-panel">
              <h3>Position Analysis</h3>
              <div class="position-analysis" id="position-analysis">
                ${this.renderPositionAnalysis()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Tab Content (Task 5.5) -->
      <div class="analysis-tab-content" id="tab-summary">
        ${this.renderGameSummary()}
      </div>

      <!-- Analytics Tab Content (Task 5.6) -->
      <div class="analysis-tab-content" id="tab-analytics">
        ${this.renderDeepAnalytics()}
      </div>
    `;

    // Render the board
    this.renderAnalysisBoard();

    // Attach event listeners
    this.attachAnalysisEventListeners();
    this.attachTabEventListeners();
  }

  /**
   * Attach tab navigation event listeners
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
    // Update tab buttons
    document.querySelectorAll('.analysis-tab').forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.analysis-tab-content').forEach((content) => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });

    // Attach export event listeners when summary tab is shown
    if (tabName === 'summary') {
      this.attachExportEventListeners();
    }
  }

  // ========================================
  // Task 5.5: Game Summary Report
  // ========================================

  /**
   * Task 5.5.1-5.5.5: Render game summary report
   */
  private renderGameSummary(): string {
    if (!this.state.analysisData || !this.state.gameData) return '';

    const analysis = this.state.analysisData;
    const game = this.state.gameData;
    const summary = analysis.summary;
    const phases = analysis.gamePhases;

    return `
      <div class="summary-layout">
        <!-- Overview Card -->
        <div class="summary-card overview-card">
          <h3>Game Overview</h3>
          <div class="overview-content">
            <div class="overview-result ${this.getResultClass(game.metadata.result, game.metadata.playerColor)}">
              <span class="result-text">${this.getResultText(game.metadata.result, game.metadata.playerColor)}</span>
              <span class="result-detail">${game.metadata.termination}</span>
            </div>
            <div class="overview-stats">
              <div class="overview-stat">
                <span class="stat-label">Opponent</span>
                <span class="stat-value">${this.capitalizeFirst(game.metadata.botPersonality)} (${game.metadata.botElo})</span>
              </div>
              <div class="overview-stat">
                <span class="stat-label">Duration</span>
                <span class="stat-value">${this.formatDuration(game.metadata.duration)}</span>
              </div>
              <div class="overview-stat">
                <span class="stat-label">Total Moves</span>
                <span class="stat-value">${analysis.moveAnalysis.length}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Accuracy Card -->
        <div class="summary-card accuracy-card">
          <h3>Accuracy</h3>
          <div class="accuracy-content">
            <div class="accuracy-main">
              <div class="accuracy-circle ${this.getAccuracyClass(summary.overallAccuracy)}">
                <span class="accuracy-value">${summary.overallAccuracy.toFixed(1)}%</span>
                <span class="accuracy-label">Overall</span>
              </div>
            </div>
            <div class="accuracy-phases">
              <div class="phase-accuracy">
                <span class="phase-name">Opening</span>
                <div class="phase-bar">
                  <div class="phase-fill ${this.getAccuracyClass(phases.opening.accuracy)}" style="width: ${phases.opening.accuracy}%"></div>
                </div>
                <span class="phase-value">${phases.opening.accuracy.toFixed(0)}%</span>
              </div>
              <div class="phase-accuracy">
                <span class="phase-name">Middlegame</span>
                <div class="phase-bar">
                  <div class="phase-fill ${this.getAccuracyClass(phases.middlegame.accuracy)}" style="width: ${phases.middlegame.accuracy}%"></div>
                </div>
                <span class="phase-value">${phases.middlegame.accuracy.toFixed(0)}%</span>
              </div>
              <div class="phase-accuracy">
                <span class="phase-name">Endgame</span>
                <div class="phase-bar">
                  <div class="phase-fill ${this.getAccuracyClass(phases.endgame.accuracy)}" style="width: ${phases.endgame.accuracy}%"></div>
                </div>
                <span class="phase-value">${phases.endgame.accuracy.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Move Quality Card -->
        <div class="summary-card quality-card">
          <h3>Move Quality</h3>
          <div class="quality-content">
            <div class="quality-row excellent">
              <span class="quality-icon">!!</span>
              <span class="quality-label">Excellent</span>
              <span class="quality-count">${summary.excellentMoves}</span>
            </div>
            <div class="quality-row good">
              <span class="quality-icon">!</span>
              <span class="quality-label">Good</span>
              <span class="quality-count">${summary.goodMoves}</span>
            </div>
            <div class="quality-row inaccuracy">
              <span class="quality-icon">?!</span>
              <span class="quality-label">Inaccuracies</span>
              <span class="quality-count">${summary.inaccuracies}</span>
            </div>
            <div class="quality-row mistake">
              <span class="quality-icon">?</span>
              <span class="quality-label">Mistakes</span>
              <span class="quality-count">${summary.mistakes}</span>
            </div>
            <div class="quality-row blunder">
              <span class="quality-icon">??</span>
              <span class="quality-label">Blunders</span>
              <span class="quality-count">${summary.blunders}</span>
            </div>
            <div class="quality-row cpl">
              <span class="quality-icon">⌀</span>
              <span class="quality-label">Avg CPL</span>
              <span class="quality-count">${summary.averageCentipawnLoss.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <!-- Critical Moments Card -->
        <div class="summary-card moments-card">
          <h3>Critical Moments</h3>
          <div class="moments-content">
            ${
              analysis.criticalMoments.length > 0
                ? analysis.criticalMoments
                    .map(
                      (moment) => `
              <div class="moment-item ${moment.type}" data-move="${moment.moveNumber}">
                <span class="moment-move">Move ${moment.moveNumber}</span>
                <span class="moment-type">${this.capitalizeFirst(moment.type.replace('_', ' '))}</span>
                <span class="moment-desc">${moment.description}</span>
              </div>
            `
                    )
                    .join('')
                : '<div class="no-moments">No critical moments detected</div>'
            }
          </div>
        </div>

        <!-- Tactical Opportunities Card -->
        <div class="summary-card tactics-card">
          <h3>Tactical Opportunities</h3>
          <div class="tactics-content">
            ${
              analysis.tacticalOpportunities.length > 0
                ? analysis.tacticalOpportunities
                    .map(
                      (tactic) => `
              <div class="tactic-item ${tactic.type}">
                <span class="tactic-icon">${tactic.type === 'found' ? '✓' : '✗'}</span>
                <span class="tactic-type">${this.capitalizeFirst(tactic.tactic)}</span>
                <span class="tactic-move">Move ${tactic.moveNumber}</span>
                <span class="tactic-status ${tactic.type}">${tactic.type === 'found' ? 'Found' : 'Missed'}</span>
              </div>
            `
                    )
                    .join('')
                : '<div class="no-tactics">No tactical opportunities detected</div>'
            }
          </div>
        </div>

        <!-- Export Actions -->
        <div class="summary-actions">
          <button class="export-btn" id="export-pgn-btn">📄 Export PGN</button>
          <button class="export-btn" id="export-json-btn">📋 Export JSON</button>
          <button class="export-btn" id="export-report-btn">📊 Export Report</button>
        </div>
      </div>
    `;
  }

  /**
   * Get result text based on game outcome
   */
  private getResultText(result: string, playerColor: 'white' | 'black'): string {
    if (result === '1/2-1/2') return 'Draw';
    const playerWon =
      (result === '1-0' && playerColor === 'white') ||
      (result === '0-1' && playerColor === 'black');
    return playerWon ? 'Victory' : 'Defeat';
  }

  /**
   * Get CSS class for result
   */
  private getResultClass(result: string, playerColor: 'white' | 'black'): string {
    if (result === '1/2-1/2') return 'draw';
    const playerWon =
      (result === '1-0' && playerColor === 'white') ||
      (result === '0-1' && playerColor === 'black');
    return playerWon ? 'win' : 'loss';
  }

  /**
   * Format duration in seconds to MM:SS
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ========================================
  // Task 5.6: Deep Analytics Dashboard
  // ========================================

  /**
   * Task 5.6.1-5.6.7: Render deep analytics dashboard
   */
  private renderDeepAnalytics(): string {
    if (!this.state.analysisData || !this.state.gameData) return '';

    const analysis = this.state.analysisData;
    const summary = analysis.summary;

    // Calculate additional analytics
    const playerMoves = analysis.moveAnalysis.filter(
      (m) => m.color === this.state.gameData!.metadata.playerColor
    );
    const totalPlayerMoves = playerMoves.length;
    const avgTimePerMove =
      playerMoves.reduce((sum, m) => sum + m.timeSpent, 0) / totalPlayerMoves / 1000;

    // Calculate time correlation (moves with more time tend to be better?)
    const fastMoves = playerMoves.filter((m) => m.timeSpent < 5000);
    const slowMoves = playerMoves.filter((m) => m.timeSpent >= 10000);
    const fastAccuracy =
      fastMoves.length > 0
        ? fastMoves.reduce((sum, m) => sum + m.accuracy, 0) / fastMoves.length
        : 0;
    const slowAccuracy =
      slowMoves.length > 0
        ? slowMoves.reduce((sum, m) => sum + m.accuracy, 0) / slowMoves.length
        : 0;

    return `
      <div class="analytics-layout">
        <!-- Time Analysis -->
        <div class="analytics-card">
          <h3>Time Management</h3>
          <div class="analytics-content">
            <div class="analytics-stat">
              <span class="stat-label">Avg Time/Move</span>
              <span class="stat-value">${avgTimePerMove.toFixed(1)}s</span>
            </div>
            <div class="analytics-stat">
              <span class="stat-label">Fast Move Accuracy</span>
              <span class="stat-value ${this.getAccuracyClass(fastAccuracy)}">${fastAccuracy.toFixed(0)}%</span>
              <span class="stat-note">(&lt;5s)</span>
            </div>
            <div class="analytics-stat">
              <span class="stat-label">Slow Move Accuracy</span>
              <span class="stat-value ${this.getAccuracyClass(slowAccuracy)}">${slowAccuracy.toFixed(0)}%</span>
              <span class="stat-note">(&gt;10s)</span>
            </div>
          </div>
        </div>

        <!-- Accuracy Breakdown -->
        <div class="analytics-card">
          <h3>Accuracy by Phase</h3>
          <div class="analytics-chart">
            ${this.renderAccuracyChart()}
          </div>
        </div>

        <!-- Move Distribution -->
        <div class="analytics-card">
          <h3>Move Distribution</h3>
          <div class="distribution-chart">
            ${this.renderMoveDistribution(summary)}
          </div>
        </div>

        <!-- Training Recommendations (Task 5.7) -->
        <div class="analytics-card recommendations-card">
          <h3>Training Recommendations</h3>
          <div class="recommendations-content">
            ${this.renderTrainingRecommendations()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render accuracy chart
   */
  private renderAccuracyChart(): string {
    if (!this.state.analysisData) return '';
    const phases = this.state.analysisData.gamePhases;

    return `
      <div class="bar-chart">
        <div class="bar-item">
          <div class="bar-label">Opening</div>
          <div class="bar-container">
            <div class="bar ${this.getAccuracyClass(phases.opening.accuracy)}" style="width: ${phases.opening.accuracy}%">
              ${phases.opening.accuracy.toFixed(0)}%
            </div>
          </div>
        </div>
        <div class="bar-item">
          <div class="bar-label">Middlegame</div>
          <div class="bar-container">
            <div class="bar ${this.getAccuracyClass(phases.middlegame.accuracy)}" style="width: ${phases.middlegame.accuracy}%">
              ${phases.middlegame.accuracy.toFixed(0)}%
            </div>
          </div>
        </div>
        <div class="bar-item">
          <div class="bar-label">Endgame</div>
          <div class="bar-container">
            <div class="bar ${this.getAccuracyClass(phases.endgame.accuracy)}" style="width: ${phases.endgame.accuracy}%">
              ${phases.endgame.accuracy.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render move distribution pie/bar chart
   */
  private renderMoveDistribution(summary: AnalysisSummary): string {
    const total =
      summary.excellentMoves +
      summary.goodMoves +
      summary.inaccuracies +
      summary.mistakes +
      summary.blunders;
    if (total === 0) return '<div class="no-data">No move data</div>';

    const pct = (count: number) => ((count / total) * 100).toFixed(1);

    return `
      <div class="distribution-bars">
        <div class="dist-bar excellent" style="flex: ${summary.excellentMoves}" title="Excellent: ${summary.excellentMoves} (${pct(summary.excellentMoves)}%)"></div>
        <div class="dist-bar good" style="flex: ${summary.goodMoves}" title="Good: ${summary.goodMoves} (${pct(summary.goodMoves)}%)"></div>
        <div class="dist-bar inaccuracy" style="flex: ${summary.inaccuracies}" title="Inaccuracies: ${summary.inaccuracies} (${pct(summary.inaccuracies)}%)"></div>
        <div class="dist-bar mistake" style="flex: ${summary.mistakes}" title="Mistakes: ${summary.mistakes} (${pct(summary.mistakes)}%)"></div>
        <div class="dist-bar blunder" style="flex: ${summary.blunders}" title="Blunders: ${summary.blunders} (${pct(summary.blunders)}%)"></div>
      </div>
      <div class="distribution-legend">
        <span class="legend-item excellent">Excellent</span>
        <span class="legend-item good">Good</span>
        <span class="legend-item inaccuracy">Inaccuracy</span>
        <span class="legend-item mistake">Mistake</span>
        <span class="legend-item blunder">Blunder</span>
      </div>
    `;
  }

  // ========================================
  // Task 5.7: Training Recommendations
  // ========================================

  /**
   * Task 5.7.1-5.7.4: Generate training recommendations
   */
  private renderTrainingRecommendations(): string {
    if (!this.state.analysisData || !this.state.gameData) return '';

    const analysis = this.state.analysisData;
    const summary = analysis.summary;
    const phases = analysis.gamePhases;
    const recommendations: string[] = [];

    // Opening recommendations
    if (phases.opening.accuracy < 70) {
      recommendations.push(
        'Study opening principles and develop a repertoire for common openings.'
      );
    }

    // Tactical recommendations
    if (summary.blunders > 2 || summary.mistakes > 4) {
      recommendations.push(
        'Practice tactical puzzles to reduce blunders and improve pattern recognition.'
      );
    }

    // Time management recommendations
    const playerMoves = analysis.moveAnalysis.filter(
      (m) => m.color === this.state.gameData!.metadata.playerColor
    );
    const quickBlunders = playerMoves.filter(
      (m) =>
        m.timeSpent < 3000 && (m.classification === 'blunder' || m.classification === 'mistake')
    );
    if (quickBlunders.length > 2) {
      recommendations.push('Slow down on critical moves - many errors came from quick decisions.');
    }

    // Middlegame recommendations
    if (phases.middlegame.accuracy < 70) {
      recommendations.push(
        'Focus on middlegame strategy: piece coordination, pawn structure, and king safety.'
      );
    }

    // Endgame recommendations
    if (phases.endgame.accuracy < 70 && phases.endgame.end > phases.endgame.start) {
      recommendations.push(
        'Study endgame fundamentals: king activity, pawn promotion, and basic checkmates.'
      );
    }

    // Tactical opportunities
    const missedTactics = analysis.tacticalOpportunities.filter((t) => t.type === 'missed');
    if (missedTactics.length > 2) {
      recommendations.push(
        'Work on calculating tactics deeper - you missed several tactical opportunities.'
      );
    }

    // If no specific issues, give general encouragement
    if (recommendations.length === 0) {
      if (summary.overallAccuracy >= 85) {
        recommendations.push(
          'Excellent game! Continue with advanced positional concepts and deeper analysis.'
        );
      } else {
        recommendations.push(
          'Good game! Keep practicing regularly and analyze your games to improve.'
        );
      }
    }

    return recommendations
      .map(
        (rec, i) => `
      <div class="recommendation-item">
        <span class="rec-number">${i + 1}</span>
        <span class="rec-text">${rec}</span>
      </div>
    `
      )
      .join('');
  }

  /**
   * Task 5.2.1: Render navigation controls
   */
  private renderNavigationControls(): string {
    return `
      <div class="nav-controls">
        <button class="nav-button" id="nav-start" title="Go to start">
          <span>⏮</span>
        </button>
        <button class="nav-button" id="nav-prev" title="Previous move">
          <span>◀</span>
        </button>
        <button class="nav-button play-pause" id="nav-play" title="Auto-play">
          <span>▶</span>
        </button>
        <button class="nav-button" id="nav-next" title="Next move">
          <span>▶</span>
        </button>
        <button class="nav-button" id="nav-end" title="Go to end">
          <span>⏭</span>
        </button>
        <button class="nav-button" id="nav-flip" title="Flip board">
          <span>🔄</span>
        </button>
      </div>
      <div class="jump-controls">
        <button class="jump-button blunder" id="jump-prev-mistake" title="Previous mistake">
          ← Mistake
        </button>
        <button class="jump-button blunder" id="jump-next-mistake" title="Next mistake">
          Mistake →
        </button>
      </div>
    `;
  }

  /**
   * Task 5.2.3: Render move list with annotations
   */
  private renderMoveList(): string {
    if (!this.state.analysisData) return '';

    const moves = this.state.analysisData.moveAnalysis;
    const playerColor = this.state.gameData?.metadata.playerColor || 'white';
    let html = '';

    // Group moves by move number
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      html += `<div class="move-pair" data-move-number="${moveNumber}">`;
      html += `<span class="move-number">${moveNumber}.</span>`;

      // White's move
      if (whiteMove) {
        const isPlayerMove = playerColor === 'white';
        html += this.renderMoveEntry(whiteMove, i, isPlayerMove);
      }

      // Black's move
      if (blackMove) {
        const isPlayerMove = playerColor === 'black';
        html += this.renderMoveEntry(blackMove, i + 1, isPlayerMove);
      }

      html += '</div>';
    }

    return html;
  }

  /**
   * Render individual move entry with classification
   */
  private renderMoveEntry(move: AnalyzedMove, index: number, isPlayerMove: boolean): string {
    const symbol = isPlayerMove ? MOVE_SYMBOLS[move.classification] || '' : '';
    const colorClass = isPlayerMove ? `move-${move.classification}` : 'move-opponent';
    const evalChange = this.formatEvalChange(move.evaluationBefore, move.evaluationAfter);
    const isSelected = index === this.state.currentMoveIndex;

    return `
      <span class="move-entry ${colorClass} ${isSelected ? 'selected' : ''}"
            data-index="${index}"
            title="CPL: ${move.centipawnLoss}">
        <span class="move-san">${move.move}</span>
        <span class="move-symbol">${symbol}</span>
        <span class="move-eval-change">${evalChange}</span>
      </span>
    `;
  }

  /**
   * Format evaluation change for display
   */
  private formatEvalChange(before: number, after: number): string {
    const change = (after - before) / 100;
    if (Math.abs(change) < 0.1) return '';
    const sign = change > 0 ? '+' : '';
    return `(${sign}${change.toFixed(1)})`;
  }

  /**
   * Task 5.2.4: Render evaluation graph
   */
  private renderEvaluationGraph(): string {
    if (!this.state.analysisData) return '';

    const moves = this.state.analysisData.moveAnalysis;
    const width = 100; // percentage
    const height = 100;
    const maxEval = 500; // 5 pawns max for display

    // Build SVG path
    let pathData = `M 0,${height / 2}`;
    const points: string[] = [];

    moves.forEach((move, index) => {
      const x = (index / Math.max(moves.length - 1, 1)) * width;
      // Clamp evaluation for display
      const clampedEval = Math.max(-maxEval, Math.min(maxEval, move.evaluationAfter));
      // Convert to Y coordinate (inverted, 0 at top)
      const y = height / 2 - (clampedEval / maxEval) * (height / 2);
      pathData += ` L ${x},${y}`;
      points.push(
        `<circle class="eval-point" cx="${x}%" cy="${y}%" r="3" data-index="${index}" />`
      );
    });

    return `
      <svg class="eval-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <!-- Center line (equal position) -->
        <line class="eval-center-line" x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" />

        <!-- Evaluation line -->
        <path class="eval-line" d="${pathData}" fill="none" />

        <!-- Points for clicking -->
        ${points.join('')}

        <!-- Current position marker -->
        <line class="eval-current-marker" id="eval-current-marker"
              x1="0" y1="0" x2="0" y2="${height}" />
      </svg>
      <div class="eval-graph-labels">
        <span class="eval-label white">+5</span>
        <span class="eval-label center">0</span>
        <span class="eval-label black">-5</span>
      </div>
    `;
  }

  /**
   * Task 5.2.5: Render current position analysis panel
   */
  private renderPositionAnalysis(): string {
    if (!this.state.analysisData) return '';

    const move = this.state.analysisData.moveAnalysis[this.state.currentMoveIndex];
    if (!move) {
      return `<div class="no-analysis">Select a move to see analysis</div>`;
    }

    const playerColor = this.state.gameData?.metadata.playerColor || 'white';
    const isPlayerMove = move.color === playerColor;

    return `
      <div class="position-info">
        <div class="info-row">
          <span class="info-label">Your Move:</span>
          <span class="info-value move-san">${move.move}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Move Quality:</span>
          <span class="info-value classification-${move.classification}">
            ${this.capitalizeFirst(move.classification)} ${MOVE_SYMBOLS[move.classification] || ''}
            <span class="cpl">(${move.centipawnLoss} CPL)</span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Engine Best:</span>
          <span class="info-value best-move">${move.bestMove}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Eval Before:</span>
          <span class="info-value">${this.formatEval(move.evaluationBefore)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Eval After:</span>
          <span class="info-value">${this.formatEval(move.evaluationAfter)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Change:</span>
          <span class="info-value eval-change ${this.getEvalChangeClass(move)}">
            ${this.formatEvalSwing(move.evaluationBefore, move.evaluationAfter)}
          </span>
        </div>
      </div>
      ${
        isPlayerMove &&
        (move.classification === 'mistake' ||
          move.classification === 'blunder' ||
          move.classification === 'inaccuracy')
          ? `
        <button class="view-alternatives-btn" data-index="${this.state.currentMoveIndex}">
          View Alternatives
        </button>
      `
          : ''
      }
    `;
  }

  /**
   * Format evaluation for display
   */
  private formatEval(centipawns: number): string {
    if (Math.abs(centipawns) >= 90000) {
      // Mate score
      const mateIn = Math.ceil((100000 - Math.abs(centipawns)) / 2);
      return centipawns > 0 ? `M${mateIn}` : `-M${mateIn}`;
    }
    const pawns = centipawns / 100;
    const sign = pawns > 0 ? '+' : '';
    return `${sign}${pawns.toFixed(2)}`;
  }

  /**
   * Format evaluation swing
   */
  private formatEvalSwing(before: number, after: number): string {
    const swing = (after - before) / 100;
    const sign = swing > 0 ? '+' : '';
    return `${sign}${swing.toFixed(2)} pawns`;
  }

  /**
   * Get CSS class for eval change
   */
  private getEvalChangeClass(move: AnalyzedMove): string {
    const swing = move.evaluationAfter - move.evaluationBefore;
    if (swing > 50) return 'positive';
    if (swing < -50) return 'negative';
    return 'neutral';
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Render the analysis board
   */
  private renderAnalysisBoard(): void {
    const boardElement = document.getElementById('analysis-board');
    if (!boardElement) return;

    // Reset game to get to current position
    this.game.reset();
    if (this.state.analysisData) {
      for (
        let i = 0;
        i <= this.state.currentMoveIndex && i < this.state.analysisData.moveAnalysis.length;
        i++
      ) {
        const move = this.state.analysisData.moveAnalysis[i];
        try {
          this.game.makeMove(move.uci);
        } catch (e) {
          console.error('Error making move:', move.uci, e);
        }
      }
    }

    // Render the board
    const fen = this.game.getFen();
    boardElement.innerHTML = this.renderBoardHTML(fen);

    // Highlight the last move if any
    if (this.state.currentMoveIndex >= 0 && this.state.analysisData) {
      const move = this.state.analysisData.moveAnalysis[this.state.currentMoveIndex];
      if (move) {
        this.highlightMove(move);
      }
    }
  }

  /**
   * Render board HTML from FEN
   */
  private renderBoardHTML(fen: string): string {
    const position = this.parseFenToBoard(fen);
    let html = '';

    const rankStart = this.state.boardFlipped ? 1 : 8;
    const rankEnd = this.state.boardFlipped ? 9 : 0;
    const rankStep = this.state.boardFlipped ? 1 : -1;
    const fileStart = this.state.boardFlipped ? 7 : 0;
    const fileEnd = this.state.boardFlipped ? -1 : 8;
    const fileStep = this.state.boardFlipped ? -1 : 1;

    for (
      let rank = rankStart;
      this.state.boardFlipped ? rank < rankEnd : rank > rankEnd;
      rank += rankStep
    ) {
      for (
        let file = fileStart;
        this.state.boardFlipped ? file > fileEnd : file < fileEnd;
        file += fileStep
      ) {
        const isLight = (rank + file) % 2 === 0;
        const fileChar = String.fromCharCode(97 + file);
        const squareName = `${fileChar}${rank}`;
        const rankIndex = 8 - rank;
        const piece = position[rankIndex]?.[file];

        html += `
          <div class="analysis-square ${isLight ? 'light' : 'dark'}" data-square="${squareName}">
            ${piece ? `<img class="analysis-piece" src="/assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg" alt="${piece.color}${piece.type}" />` : ''}
          </div>
        `;
      }
    }

    return html;
  }

  /**
   * Parse FEN to board array
   */
  private parseFenToBoard(fen: string): ({ color: string; type: string } | null)[][] {
    const fenParts = fen.split(' ');
    const boardFen = fenParts[0];
    const ranks = boardFen.split('/');
    const board: ({ color: string; type: string } | null)[][] = [];

    for (const rankString of ranks) {
      const rank: ({ color: string; type: string } | null)[] = [];
      for (const char of rankString) {
        if (/\d/.test(char)) {
          const emptyCount = parseInt(char, 10);
          for (let i = 0; i < emptyCount; i++) {
            rank.push(null);
          }
        } else if (/[rnbqkpRNBQKP]/.test(char)) {
          const isWhite = char === char.toUpperCase();
          rank.push({
            color: isWhite ? 'w' : 'b',
            type: char.toLowerCase(),
          });
        }
      }
      board.push(rank);
    }

    return board;
  }

  /**
   * Task 5.2.2: Highlight move on board with classification color
   */
  private highlightMove(move: AnalyzedMove): void {
    // Clear previous highlights
    document.querySelectorAll('.analysis-square').forEach((sq) => {
      sq.classList.remove(
        'highlight-from',
        'highlight-to',
        'highlight-excellent',
        'highlight-good',
        'highlight-inaccuracy',
        'highlight-mistake',
        'highlight-blunder'
      );
    });

    // Get from and to squares from UCI
    const from = move.uci.substring(0, 2);
    const to = move.uci.substring(2, 4);

    const fromSquare = document.querySelector(`.analysis-square[data-square="${from}"]`);
    const toSquare = document.querySelector(`.analysis-square[data-square="${to}"]`);

    if (fromSquare) {
      fromSquare.classList.add('highlight-from', `highlight-${move.classification}`);
    }
    if (toSquare) {
      toSquare.classList.add('highlight-to', `highlight-${move.classification}`);
    }
  }

  /**
   * Attach event listeners for analysis UI
   */
  private attachAnalysisEventListeners(): void {
    // Navigation buttons
    document.getElementById('nav-start')?.addEventListener('click', () => this.goToStart());
    document.getElementById('nav-prev')?.addEventListener('click', () => this.goToPreviousMove());
    document.getElementById('nav-play')?.addEventListener('click', () => this.toggleAutoPlay());
    document.getElementById('nav-next')?.addEventListener('click', () => this.goToNextMove());
    document.getElementById('nav-end')?.addEventListener('click', () => this.goToEnd());
    document.getElementById('nav-flip')?.addEventListener('click', () => this.flipBoard());

    // Jump to mistakes
    document
      .getElementById('jump-prev-mistake')
      ?.addEventListener('click', () => this.jumpToPreviousMistake());
    document
      .getElementById('jump-next-mistake')
      ?.addEventListener('click', () => this.jumpToNextMistake());

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
    document.addEventListener('keydown', this.handleKeyPress.bind(this));

    // Close button
    document
      .getElementById('analysis-close-btn')
      ?.addEventListener('click', () => this.closeAnalysis());
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyPress(e: KeyboardEvent): void {
    if (!this.state.isActive) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.goToPreviousMove();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.goToNextMove();
        break;
      case 'Home':
        e.preventDefault();
        this.goToStart();
        break;
      case 'End':
        e.preventDefault();
        this.goToEnd();
        break;
      case ' ':
        e.preventDefault();
        this.toggleAutoPlay();
        break;
      case 'Escape':
        e.preventDefault();
        this.closeAnalysis();
        break;
    }
  }

  // ========================================
  // Navigation Methods
  // ========================================

  /**
   * Go to starting position
   */
  goToStart(): void {
    this.goToMove(-1);
  }

  /**
   * Go to previous move
   */
  goToPreviousMove(): void {
    if (this.state.currentMoveIndex > -1) {
      this.goToMove(this.state.currentMoveIndex - 1);
    }
  }

  /**
   * Go to next move
   */
  goToNextMove(): void {
    if (!this.state.analysisData) return;
    if (this.state.currentMoveIndex < this.state.analysisData.moveAnalysis.length - 1) {
      this.goToMove(this.state.currentMoveIndex + 1);
    }
  }

  /**
   * Go to end position
   */
  goToEnd(): void {
    if (!this.state.analysisData) return;
    this.goToMove(this.state.analysisData.moveAnalysis.length - 1);
  }

  /**
   * Go to specific move index
   */
  goToMove(index: number): void {
    this.state.currentMoveIndex = index;

    // Update board
    this.renderAnalysisBoard();

    // Update move list selection
    document.querySelectorAll('.move-entry').forEach((entry) => {
      const entryIndex = parseInt((entry as HTMLElement).dataset.index || '-2');
      entry.classList.toggle('selected', entryIndex === index);
    });

    // Update position analysis panel
    const positionPanel = document.getElementById('position-analysis');
    if (positionPanel) {
      positionPanel.innerHTML = this.renderPositionAnalysis();
      // Re-attach alternatives button listener
      document.querySelectorAll('.view-alternatives-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
          this.showAlternatives(idx);
        });
      });
    }

    // Update eval graph marker
    this.updateEvalGraphMarker(index);

    // Auto-scroll move list
    const selectedMove = document.querySelector('.move-entry.selected');
    if (selectedMove) {
      selectedMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Update eval graph current position marker
   */
  private updateEvalGraphMarker(index: number): void {
    if (!this.state.analysisData) return;
    const marker = document.getElementById('eval-current-marker');
    if (!marker) return;

    const totalMoves = this.state.analysisData.moveAnalysis.length;
    const x = (index / Math.max(totalMoves - 1, 1)) * 100;
    marker.setAttribute('x1', `${x}%`);
    marker.setAttribute('x2', `${x}%`);
  }

  /**
   * Jump to previous mistake/blunder
   */
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

  /**
   * Jump to next mistake/blunder
   */
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

  /**
   * Toggle auto-play
   */
  toggleAutoPlay(): void {
    if (this.state.isAutoPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  /**
   * Start auto-play
   */
  private startAutoPlay(): void {
    this.state.isAutoPlaying = true;
    const playBtn = document.getElementById('nav-play');
    if (playBtn) {
      playBtn.innerHTML = '<span>⏸</span>';
      playBtn.title = 'Pause';
    }

    this.state.autoPlayInterval = window.setInterval(() => {
      if (!this.state.analysisData) return;
      if (this.state.currentMoveIndex >= this.state.analysisData.moveAnalysis.length - 1) {
        this.stopAutoPlay();
        return;
      }
      this.goToNextMove();
    }, 1500);
  }

  /**
   * Stop auto-play
   */
  private stopAutoPlay(): void {
    this.state.isAutoPlaying = false;
    if (this.state.autoPlayInterval) {
      clearInterval(this.state.autoPlayInterval);
      this.state.autoPlayInterval = null;
    }

    const playBtn = document.getElementById('nav-play');
    if (playBtn) {
      playBtn.innerHTML = '<span>▶</span>';
      playBtn.title = 'Auto-play';
    }
  }

  /**
   * Flip the analysis board
   */
  flipBoard(): void {
    this.state.boardFlipped = !this.state.boardFlipped;
    this.renderAnalysisBoard();
  }

  // ========================================
  // Task 5.3 & 5.4: Mistake Deep Dive & Alternatives
  // ========================================

  /**
   * Show alternatives modal for a move
   */
  showAlternatives(moveIndex: number): void {
    if (!this.state.analysisData) return;
    const move = this.state.analysisData.moveAnalysis[moveIndex];
    if (!move) return;

    // Create and show alternatives modal
    this.showAlternativesModal(move, moveIndex);
  }

  /**
   * Render and show alternatives modal
   */
  private showAlternativesModal(move: AnalyzedMove, moveIndex: number): void {
    const modalHTML = `
      <div class="alternatives-modal-overlay" id="alternatives-modal">
        <div class="alternatives-modal">
          <button class="modal-close-btn" id="alternatives-close">×</button>
          <h2>Move Analysis</h2>

          <div class="mistake-info">
            <div class="what-happened">
              <h3>What Happened</h3>
              <div class="played-move">
                <span class="label">You played:</span>
                <span class="move classification-${move.classification}">${move.move} ${MOVE_SYMBOLS[move.classification] || ''}</span>
              </div>
              <div class="why-mistake">
                <span class="label">Result:</span>
                <span class="value negative">${this.formatEvalSwing(move.evaluationBefore, move.evaluationAfter)}</span>
              </div>
            </div>

            <div class="better-alternatives">
              <h3>Better Alternatives</h3>
              <div class="best-move">
                <span class="label">Engine best:</span>
                <span class="move best">${move.bestMove}</span>
              </div>
              ${
                move.alternativeMoves.length > 0
                  ? `
                <div class="alternative-moves">
                  ${move.alternativeMoves
                    .map(
                      (alt, i) => `
                    <div class="alt-move">
                      <span class="rank">${i + 1}.</span>
                      <span class="move">${alt.move}</span>
                      <span class="eval">${this.formatEval(alt.evaluation)}</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
              <div class="eval-comparison">
                <div class="comparison-row">
                  <span class="label">After your move:</span>
                  <span class="value">${this.formatEval(move.evaluationAfter)}</span>
                </div>
                <div class="comparison-row">
                  <span class="label">After best move:</span>
                  <span class="value">${move.alternativeMoves[0] ? this.formatEval(move.alternativeMoves[0].evaluation) : this.formatEval(move.evaluationBefore)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="action-btn sandbox-btn" id="open-sandbox-btn">
              Open in Sandbox
            </button>
          </div>
        </div>
      </div>
    `;

    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners
    document.getElementById('alternatives-close')?.addEventListener('click', () => {
      document.getElementById('alternatives-modal')?.remove();
    });

    document.getElementById('alternatives-modal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'alternatives-modal') {
        document.getElementById('alternatives-modal')?.remove();
      }
    });

    document.getElementById('open-sandbox-btn')?.addEventListener('click', () => {
      // Get FEN before the move
      this.game.reset();
      for (let i = 0; i < moveIndex; i++) {
        const m = this.state.analysisData!.moveAnalysis[i];
        this.game.makeMove(m.uci);
      }
      const fen = this.game.getFen();
      document.getElementById('alternatives-modal')?.remove();
      this.onOpenSandbox?.(fen);
    });
  }

  // ========================================
  // UI Helper Methods
  // ========================================

  /**
   * Show/hide analysis overlay
   */
  private showAnalysisOverlay(show: boolean): void {
    const overlay = document.getElementById('analysis-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  /**
   * Show/hide loading state
   */
  private showLoadingState(show: boolean): void {
    const loading = document.getElementById('analysis-loading');
    const content = document.getElementById('analysis-content');

    if (loading) loading.classList.toggle('hidden', !show);
    if (content) content.classList.toggle('hidden', show);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const content = document.getElementById('analysis-content');
    if (content) {
      content.innerHTML = `
        <div class="analysis-error">
          <span class="error-icon">⚠️</span>
          <p>${message}</p>
          <button class="error-close-btn" onclick="this.closest('.analysis-error').remove()">Close</button>
        </div>
      `;
    }
  }

  // ========================================
  // Task 5.8: Export Options
  // ========================================

  /**
   * Task 5.8.1: Export game as PGN file
   */
  exportPGN(): void {
    if (!this.state.gameData || !this.state.analysisData) {
      this.showExportError('No game data to export');
      return;
    }

    const game = this.state.gameData;
    const analysis = this.state.analysisData;

    // Build PGN with headers and annotated moves
    let pgn = '';

    // Standard PGN headers
    pgn += `[Event "Chess-Sensei ${this.capitalizeFirst(game.mode)} Game"]\n`;
    pgn += `[Site "Chess-Sensei"]\n`;
    pgn += `[Date "${this.formatDate(game.timestamp)}"]\n`;
    pgn += `[Round "?"]\n`;
    pgn += `[White "${game.metadata.playerColor === 'white' ? 'Player' : game.metadata.botPersonality}"]\n`;
    pgn += `[Black "${game.metadata.playerColor === 'black' ? 'Player' : game.metadata.botPersonality}"]\n`;
    pgn += `[Result "${game.metadata.result}"]\n`;
    pgn += `[WhiteElo "${game.metadata.playerColor === 'white' ? '?' : game.metadata.botElo}"]\n`;
    pgn += `[BlackElo "${game.metadata.playerColor === 'black' ? '?' : game.metadata.botElo}"]\n`;
    pgn += `[Termination "${game.metadata.termination}"]\n`;
    pgn += `[Annotator "Chess-Sensei Engine Analysis"]\n`;
    pgn += `[PlayerAccuracy "${analysis.summary.overallAccuracy.toFixed(1)}%"]\n`;
    pgn += '\n';

    // Build move text with annotations
    let moveText = '';
    const moves = analysis.moveAnalysis;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isWhiteMove = move.color === 'white';
      const isPlayerMove = move.color === game.metadata.playerColor;

      // Add move number for white moves or after comments
      if (isWhiteMove) {
        moveText += `${move.moveNumber}. `;
      }

      // Add the move
      moveText += move.san;

      // Add annotation symbol for player moves with issues
      if (isPlayerMove) {
        const symbol = MOVE_SYMBOLS[move.classification];
        if (symbol) {
          moveText += symbol;
        }

        // Add comment for mistakes/blunders
        if (move.classification === 'blunder' || move.classification === 'mistake') {
          moveText += ` { ${this.capitalizeFirst(move.classification)}: ${move.centipawnLoss} centipawn loss. `;
          moveText += `Better was ${move.bestMove} }`;
        }
      }

      moveText += ' ';

      // Add evaluation comment periodically (every 4 moves)
      if (i % 4 === 3) {
        moveText += `{ Eval: ${this.formatEval(move.evaluationAfter)} } `;
      }
    }

    // Add result
    moveText += game.metadata.result;
    pgn += this.wrapPGNText(moveText, 80);

    // Download the file
    this.downloadFile(pgn, `chess-sensei-game-${game.gameId}.pgn`, 'application/x-chess-pgn');
    this.showExportSuccess('PGN file downloaded');
  }

  /**
   * Task 5.8.2: Export game as JSON
   */
  exportJSON(): void {
    if (!this.state.gameData || !this.state.analysisData) {
      this.showExportError('No game data to export');
      return;
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      game: this.state.gameData,
      analysis: this.state.analysisData,
      metrics: this.state.metricsData,
    };

    const json = JSON.stringify(exportData, null, 2);
    this.downloadFile(
      json,
      `chess-sensei-game-${this.state.gameData.gameId}.json`,
      'application/json'
    );
    this.showExportSuccess('JSON file downloaded');
  }

  /**
   * Task 5.8.3: Export game report (text/markdown format)
   */
  exportReport(): void {
    if (!this.state.gameData || !this.state.analysisData) {
      this.showExportError('No game data to export');
      return;
    }

    const game = this.state.gameData;
    const analysis = this.state.analysisData;
    const summary = analysis.summary;
    const phases = analysis.gamePhases;

    let report = '';

    // Header
    report += '# Chess-Sensei Game Analysis Report\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Game Information
    report += '## Game Information\n\n';
    report += `| Property | Value |\n`;
    report += `|----------|-------|\n`;
    report += `| Date | ${this.formatDate(game.timestamp)} |\n`;
    report += `| Mode | ${this.capitalizeFirst(game.mode)} Mode |\n`;
    report += `| Player Color | ${this.capitalizeFirst(game.metadata.playerColor)} |\n`;
    report += `| Opponent | ${this.capitalizeFirst(game.metadata.botPersonality)} (${game.metadata.botElo} Elo) |\n`;
    report += `| Result | ${this.getResultText(game.metadata.result, game.metadata.playerColor)} (${game.metadata.result}) |\n`;
    report += `| Termination | ${game.metadata.termination} |\n`;
    report += `| Duration | ${this.formatDuration(game.metadata.duration)} |\n`;
    report += `| Total Moves | ${analysis.moveAnalysis.length} |\n\n`;

    // Accuracy Summary
    report += '## Accuracy Summary\n\n';
    report += `**Overall Accuracy: ${summary.overallAccuracy.toFixed(1)}%**\n\n`;
    report += `| Game Phase | Accuracy |\n`;
    report += `|------------|----------|\n`;
    report += `| Opening (moves ${phases.opening.start}-${phases.opening.end}) | ${phases.opening.accuracy.toFixed(1)}% |\n`;
    report += `| Middlegame (moves ${phases.middlegame.start}-${phases.middlegame.end}) | ${phases.middlegame.accuracy.toFixed(1)}% |\n`;
    report += `| Endgame (moves ${phases.endgame.start}-${phases.endgame.end}) | ${phases.endgame.accuracy.toFixed(1)}% |\n\n`;

    // Move Quality
    report += '## Move Quality\n\n';
    report += `| Classification | Count | Symbol |\n`;
    report += `|----------------|-------|--------|\n`;
    report += `| Excellent | ${summary.excellentMoves} | !! |\n`;
    report += `| Good | ${summary.goodMoves} | ! |\n`;
    report += `| Inaccuracies | ${summary.inaccuracies} | ?! |\n`;
    report += `| Mistakes | ${summary.mistakes} | ? |\n`;
    report += `| Blunders | ${summary.blunders} | ?? |\n`;
    report += `\nAverage Centipawn Loss: ${summary.averageCentipawnLoss.toFixed(0)} CPL\n\n`;

    // Critical Moments
    if (analysis.criticalMoments.length > 0) {
      report += '## Critical Moments\n\n';
      for (const moment of analysis.criticalMoments) {
        report += `### Move ${moment.moveNumber}: ${this.capitalizeFirst(moment.type.replace('_', ' '))}\n`;
        report += `${moment.description}\n`;
        report += `Evaluation swing: ${this.formatEval(moment.evaluationBefore)} → ${this.formatEval(moment.evaluationAfter)}\n`;
        if (moment.bestMove) {
          report += `Better move: ${moment.bestMove}\n`;
        }
        report += '\n';
      }
    }

    // Tactical Opportunities
    const missedTactics = analysis.tacticalOpportunities.filter((t) => t.type === 'missed');
    const foundTactics = analysis.tacticalOpportunities.filter((t) => t.type === 'found');

    if (analysis.tacticalOpportunities.length > 0) {
      report += '## Tactical Opportunities\n\n';
      report += `Found: ${foundTactics.length} | Missed: ${missedTactics.length}\n\n`;

      if (missedTactics.length > 0) {
        report += '### Missed Tactics\n\n';
        for (const tactic of missedTactics) {
          report += `- Move ${tactic.moveNumber}: ${this.capitalizeFirst(tactic.tactic)} - ${tactic.description}\n`;
        }
        report += '\n';
      }
    }

    // Move-by-Move Analysis (just mistakes/blunders for brevity)
    const problematicMoves = analysis.moveAnalysis.filter(
      (m) =>
        m.color === game.metadata.playerColor &&
        (m.classification === 'blunder' || m.classification === 'mistake')
    );

    if (problematicMoves.length > 0) {
      report += '## Moves to Review\n\n';
      for (const move of problematicMoves) {
        report += `### Move ${move.moveNumber}${move.color === 'black' ? '...' : '.'} ${move.san} (${this.capitalizeFirst(move.classification)})\n`;
        report += `CPL: ${move.centipawnLoss} | Eval: ${this.formatEval(move.evaluationBefore)} → ${this.formatEval(move.evaluationAfter)}\n`;
        report += `Better: ${move.bestMove}\n\n`;
      }
    }

    // Training Recommendations
    report += '## Training Recommendations\n\n';
    const recommendations = this.generateRecommendationsList();
    for (let i = 0; i < recommendations.length; i++) {
      report += `${i + 1}. ${recommendations[i]}\n`;
    }
    report += '\n';

    // Footer
    report += '---\n';
    report += '*Generated by Chess-Sensei - Your Personal Chess Training Partner*\n';

    // Download the file
    this.downloadFile(report, `chess-sensei-report-${game.gameId}.md`, 'text/markdown');
    this.showExportSuccess('Report downloaded');
  }

  /**
   * Generate recommendations as array for export
   */
  private generateRecommendationsList(): string[] {
    if (!this.state.analysisData || !this.state.gameData) return [];

    const analysis = this.state.analysisData;
    const summary = analysis.summary;
    const phases = analysis.gamePhases;
    const recommendations: string[] = [];

    if (phases.opening.accuracy < 70) {
      recommendations.push(
        'Study opening principles and develop a repertoire for common openings.'
      );
    }

    if (summary.blunders > 2 || summary.mistakes > 4) {
      recommendations.push(
        'Practice tactical puzzles to reduce blunders and improve pattern recognition.'
      );
    }

    const playerMoves = analysis.moveAnalysis.filter(
      (m) => m.color === this.state.gameData!.metadata.playerColor
    );
    const quickBlunders = playerMoves.filter(
      (m) =>
        m.timeSpent < 3000 && (m.classification === 'blunder' || m.classification === 'mistake')
    );
    if (quickBlunders.length > 2) {
      recommendations.push('Slow down on critical moves - many errors came from quick decisions.');
    }

    if (phases.middlegame.accuracy < 70) {
      recommendations.push(
        'Focus on middlegame strategy: piece coordination, pawn structure, and king safety.'
      );
    }

    if (phases.endgame.accuracy < 70 && phases.endgame.end > phases.endgame.start) {
      recommendations.push(
        'Study endgame fundamentals: king activity, pawn promotion, and basic checkmates.'
      );
    }

    const missedTactics = analysis.tacticalOpportunities.filter((t) => t.type === 'missed');
    if (missedTactics.length > 2) {
      recommendations.push(
        'Work on calculating tactics deeper - you missed several tactical opportunities.'
      );
    }

    if (recommendations.length === 0) {
      if (summary.overallAccuracy >= 85) {
        recommendations.push(
          'Excellent game! Continue with advanced positional concepts and deeper analysis.'
        );
      } else {
        recommendations.push(
          'Good game! Keep practicing regularly and analyze your games to improve.'
        );
      }
    }

    return recommendations;
  }

  /**
   * Format date from ISO string
   */
  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Wrap PGN text to specified line length
   */
  private wrapPGNText(text: string, maxLength: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.join('\n');
  }

  /**
   * Download a file
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Show export success notification
   */
  private showExportSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  /**
   * Show export error notification
   */
  private showExportError(message: string): void {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification toast
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `export-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
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
