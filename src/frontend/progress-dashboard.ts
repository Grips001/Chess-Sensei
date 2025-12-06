/**
 * Progress Dashboard UI Module
 *
 * Implements the comprehensive player progress tracking interface.
 * Displays composite scores, trend graphs, game history, and analytics
 * across all Exam Mode games played.
 *
 * @see source-docs/player-progress.md
 * @see source-docs/tracked-metrics.md
 * @see source-docs/TASKS.md - Phase 6
 */

import * as buntralino from 'buntralino-client';
import { IPC_METHODS, isErrorResponse } from '../shared/ipc-types';
import type { GameIndexEntry, StoredAnalysisData, CompositeScores } from './analysis-ui';
import { frontendLogger } from './frontend-logger';

// ============================================
// Types
// ============================================

/**
 * Player profile with aggregated metrics
 */
export interface PlayerProfile {
  profileVersion: string;
  lastUpdated: string;
  totalGames: number;
  gamesAnalyzed: number;
  compositeScores: CompositeScores;
  overallStats: OverallStats;
  records: PlayerRecords;
  trends: PlayerTrends;
  detailedMetrics: DetailedMetrics;
}

/**
 * Overall statistics
 */
export interface OverallStats {
  averageAccuracy: number;
  averageCentipawnLoss: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  inaccuraciesPerGame: number;
}

/**
 * Player records
 */
export interface PlayerRecords {
  winRate: number;
  drawRate: number;
  lossRate: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  currentStreak: number;
  currentStreakType: 'win' | 'draw' | 'loss' | null;
}

/**
 * Trend data
 */
export interface PlayerTrends {
  last10GamesAccuracy: number;
  last30GamesAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  blunderTrend: 'decreasing' | 'stable' | 'increasing';
}

/**
 * Detailed component metrics
 */
export interface DetailedMetrics {
  openingAccuracyAvg: number;
  middlegameAccuracyAvg: number;
  endgameAccuracyAvg: number;
  tacticsFoundRate: number;
  tacticsMissedRate: number;
  averageTimePerMove: number;
  fastMovesRate: number;
  conversionFromWinning: number;
}

/**
 * Game entry with analysis summary
 */
export interface GameWithAnalysis {
  game: GameIndexEntry;
  analysis: StoredAnalysisData | null;
}

/**
 * Dashboard state
 */
export interface DashboardState {
  isActive: boolean;
  isLoading: boolean;
  profile: PlayerProfile | null;
  games: GameWithAnalysis[];
  selectedTab: 'overview' | 'history' | 'analytics' | 'achievements';
  selectedGameId: string | null;
  timePeriod: 'all' | 'last10' | 'last30' | 'thisMonth';
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
}

// ============================================
// Constants
// ============================================

/**
 * Composite score names and descriptions
 */
export const COMPOSITE_SCORES = {
  precision: {
    name: 'Precision',
    description: 'Move accuracy and error avoidance',
    color: '#3b82f6',
  },
  tacticalDanger: {
    name: 'Tactical',
    description: 'Tactical vision and execution',
    color: '#ef4444',
  },
  stability: {
    name: 'Stability',
    description: 'Consistency and time management',
    color: '#22c55e',
  },
  conversion: { name: 'Conversion', description: 'Winning technique', color: '#f59e0b' },
  preparation: { name: 'Preparation', description: 'Opening knowledge', color: '#8b5cf6' },
  positional: { name: 'Positional', description: 'Positional understanding', color: '#06b6d4' },
  aggression: { name: 'Aggression', description: 'Playing style indicator', color: '#ec4899' },
  simplification: { name: 'Simplification', description: 'Trading patterns', color: '#84cc16' },
  trainingTransfer: { name: 'Improvement', description: 'Learning progress', color: '#f97316' },
} as const;

/**
 * Accuracy thresholds for score coloring
 */
const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 60,
  belowAverage: 40,
};

// ============================================
// Progress Dashboard Manager Class
// ============================================

/**
 * Manages the Progress Dashboard UI
 */
export class ProgressDashboardManager {
  private state: DashboardState;

  // Callbacks for external integration
  public onClose?: () => void;
  public onViewGame?: (gameId: string) => void;

  constructor() {
    this.state = {
      isActive: false,
      isLoading: false,
      profile: null,
      games: [],
      selectedTab: 'overview',
      selectedGameId: null,
      timePeriod: 'all',
    };
  }

  /**
   * Get current state
   */
  getState(): DashboardState {
    return { ...this.state };
  }

  /**
   * Check if dashboard is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Open the progress dashboard
   */
  async open(): Promise<void> {
    frontendLogger.separator('Dashboard', 'Opening Progress Dashboard');
    frontendLogger.enter('Dashboard', 'open');

    this.state.isActive = true;
    this.state.isLoading = true;

    // Show loading state
    this.showDashboardOverlay(true);
    this.showLoadingState(true);

    try {
      // Load player profile and game history
      await Promise.all([this.loadPlayerProfile(), this.loadGameHistory()]);

      // Render the dashboard
      this.renderDashboard();

      frontendLogger.exit('Dashboard', 'open');
    } catch (error) {
      frontendLogger.error('Dashboard', 'Error opening dashboard', error as Error);
      console.error('Error opening dashboard:', error);
      this.showError('Failed to load progress data');
    } finally {
      this.state.isLoading = false;
      this.showLoadingState(false);
    }
  }

  /**
   * Close the dashboard
   */
  close(): void {
    this.state.isActive = false;
    this.state.selectedGameId = null;
    this.showDashboardOverlay(false);
    this.onClose?.();
  }

  /**
   * Load player profile from backend
   */
  private async loadPlayerProfile(): Promise<void> {
    frontendLogger.ipc('Dashboard', 'LOAD_PLAYER_PROFILE', {});
    try {
      const response = await buntralino.run(IPC_METHODS.LOAD_PLAYER_PROFILE, {});
      if (isErrorResponse(response)) {
        // Profile may not exist yet - create default
        this.state.profile = this.createDefaultProfile();
        return;
      }
      this.state.profile =
        (response as { profile: PlayerProfile }).profile || this.createDefaultProfile();
    } catch (error) {
      console.warn('Could not load player profile, using defaults:', error);
      this.state.profile = this.createDefaultProfile();
    }
  }

  /**
   * Load game history from backend
   */
  private async loadGameHistory(): Promise<void> {
    frontendLogger.ipc('Dashboard', 'GET_GAMES_LIST', {});
    try {
      const response = await buntralino.run(IPC_METHODS.GET_GAMES_LIST, {});
      if (isErrorResponse(response)) {
        this.state.games = [];
        return;
      }
      const games = (response as { games: GameIndexEntry[] }).games || [];

      // Load analysis for each game (for summary data)
      this.state.games = await Promise.all(
        games.map(async (game) => {
          const analysis = await this.loadGameAnalysis(game.gameId);
          return { game, analysis };
        })
      );

      // Recalculate profile from games if profile is default
      if (this.state.games.length > 0 && this.state.profile?.totalGames === 0) {
        this.recalculateProfile();
      }
    } catch (error) {
      console.error('Error loading game history:', error);
      this.state.games = [];
    }
  }

  /**
   * Load analysis for a specific game
   */
  private async loadGameAnalysis(gameId: string): Promise<StoredAnalysisData | null> {
    try {
      const response = await buntralino.run(IPC_METHODS.LOAD_ANALYSIS, { gameId });
      if (isErrorResponse(response)) {
        return null;
      }
      return (response as { analysis: StoredAnalysisData }).analysis;
    } catch {
      return null;
    }
  }

  /**
   * Create default player profile
   */
  private createDefaultProfile(): PlayerProfile {
    return {
      profileVersion: '1.0',
      lastUpdated: new Date().toISOString(),
      totalGames: 0,
      gamesAnalyzed: 0,
      compositeScores: {
        precisionScore: 50,
        tacticalDangerScore: 50,
        stabilityScore: 50,
        conversionScore: 50,
        preparationScore: 50,
        positionalScore: 50,
        aggressionScore: 50,
        simplificationScore: 50,
        trainingTransferScore: 50,
      },
      overallStats: {
        averageAccuracy: 0,
        averageCentipawnLoss: 0,
        blundersPerGame: 0,
        mistakesPerGame: 0,
        inaccuraciesPerGame: 0,
      },
      records: {
        winRate: 0,
        drawRate: 0,
        lossRate: 0,
        longestWinStreak: 0,
        longestLoseStreak: 0,
        currentStreak: 0,
        currentStreakType: null,
      },
      trends: {
        last10GamesAccuracy: 0,
        last30GamesAccuracy: 0,
        accuracyTrend: 'stable',
        blunderTrend: 'stable',
      },
      detailedMetrics: {
        openingAccuracyAvg: 0,
        middlegameAccuracyAvg: 0,
        endgameAccuracyAvg: 0,
        tacticsFoundRate: 0,
        tacticsMissedRate: 0,
        averageTimePerMove: 0,
        fastMovesRate: 0,
        conversionFromWinning: 0,
      },
    };
  }

  /**
   * Recalculate profile from game data
   */
  private recalculateProfile(): void {
    if (this.state.games.length === 0) return;

    const gamesWithAnalysis = this.state.games.filter((g) => g.analysis !== null);
    if (gamesWithAnalysis.length === 0) return;

    // Calculate averages
    let totalAccuracy = 0;
    let totalCPL = 0;
    let totalBlunders = 0;
    let totalMistakes = 0;
    let totalInaccuracies = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const { game, analysis } of gamesWithAnalysis) {
      if (analysis) {
        totalAccuracy += analysis.summary.overallAccuracy;
        totalCPL += analysis.summary.averageCentipawnLoss;
        totalBlunders += analysis.summary.blunders;
        totalMistakes += analysis.summary.mistakes;
        totalInaccuracies += analysis.summary.inaccuracies;
      }

      // Determine win/loss from player's perspective
      const playerColor = game.playerColor;
      if (game.result === '1/2-1/2') {
        draws++;
      } else if (
        (game.result === '1-0' && playerColor === 'white') ||
        (game.result === '0-1' && playerColor === 'black')
      ) {
        wins++;
      } else {
        losses++;
      }
    }

    const count = gamesWithAnalysis.length;
    const total = wins + draws + losses;

    this.state.profile = {
      ...this.createDefaultProfile(),
      totalGames: this.state.games.length,
      gamesAnalyzed: count,
      overallStats: {
        averageAccuracy: totalAccuracy / count,
        averageCentipawnLoss: totalCPL / count,
        blundersPerGame: totalBlunders / count,
        mistakesPerGame: totalMistakes / count,
        inaccuraciesPerGame: totalInaccuracies / count,
      },
      records: {
        winRate: total > 0 ? (wins / total) * 100 : 0,
        drawRate: total > 0 ? (draws / total) * 100 : 0,
        lossRate: total > 0 ? (losses / total) * 100 : 0,
        longestWinStreak: this.calculateStreak('win'),
        longestLoseStreak: this.calculateStreak('loss'),
        currentStreak: 0,
        currentStreakType: null,
      },
      compositeScores: this.calculateCompositeScores(gamesWithAnalysis),
    };
  }

  /**
   * Calculate streak length
   */
  private calculateStreak(type: 'win' | 'loss'): number {
    let maxStreak = 0;
    let currentStreak = 0;

    for (const { game } of this.state.games) {
      const playerColor = game.playerColor;
      const isWin =
        (game.result === '1-0' && playerColor === 'white') ||
        (game.result === '0-1' && playerColor === 'black');
      const isLoss =
        (game.result === '0-1' && playerColor === 'white') ||
        (game.result === '1-0' && playerColor === 'black');

      const matches = (type === 'win' && isWin) || (type === 'loss' && isLoss);

      if (matches) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  /**
   * Calculate composite scores from game analyses
   */
  private calculateCompositeScores(games: GameWithAnalysis[]): CompositeScores {
    if (games.length === 0) {
      return this.createDefaultProfile().compositeScores;
    }

    // Average the accuracy as a proxy for precision score
    let totalPrecision = 0;
    let totalTactical = 0;

    for (const { analysis } of games) {
      if (analysis) {
        // Precision based on accuracy
        totalPrecision += analysis.summary.overallAccuracy;

        // Tactical based on tactics found
        const found = analysis.tacticalOpportunities.filter((t) => t.type === 'found').length;
        const total = analysis.tacticalOpportunities.length;
        totalTactical += total > 0 ? (found / total) * 100 : 50;
      }
    }

    const count = games.filter((g) => g.analysis).length;

    return {
      precisionScore: count > 0 ? totalPrecision / count : 50,
      tacticalDangerScore: count > 0 ? totalTactical / count : 50,
      stabilityScore: 50, // Would need more data
      conversionScore: 50,
      preparationScore: 50,
      positionalScore: 50,
      aggressionScore: 50,
      simplificationScore: 50,
      trainingTransferScore: 50,
    };
  }

  // ========================================
  // Rendering Methods
  // ========================================

  /**
   * Render the full dashboard
   */
  private renderDashboard(): void {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    container.innerHTML = `
      <!-- Tab Navigation -->
      <div class="dashboard-tabs">
        <button class="dashboard-tab ${this.state.selectedTab === 'overview' ? 'active' : ''}" data-tab="overview">
          Overview
        </button>
        <button class="dashboard-tab ${this.state.selectedTab === 'history' ? 'active' : ''}" data-tab="history">
          Game History
        </button>
        <button class="dashboard-tab ${this.state.selectedTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
          Deep Analytics
        </button>
        <button class="dashboard-tab ${this.state.selectedTab === 'achievements' ? 'active' : ''}" data-tab="achievements">
          Achievements
        </button>
      </div>

      <!-- Tab Content -->
      <div class="dashboard-tab-content">
        ${this.renderTabContent()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render current tab content
   */
  private renderTabContent(): string {
    switch (this.state.selectedTab) {
      case 'overview':
        return this.renderOverviewTab();
      case 'history':
        return this.renderHistoryTab();
      case 'analytics':
        return this.renderAnalyticsTab();
      case 'achievements':
        return this.renderAchievementsTab();
      default:
        return '';
    }
  }

  // ========================================
  // Task 6.1: Overview Tab
  // ========================================

  /**
   * Task 6.1.1-6.1.4: Render overview tab
   */
  private renderOverviewTab(): string {
    if (!this.state.profile) {
      return '<div class="no-data">No player data available. Play some games to see your progress!</div>';
    }

    const profile = this.state.profile;

    return `
      <div class="overview-layout">
        <!-- Task 6.1.1: Composite Index Radar Chart -->
        <div class="dashboard-card radar-card">
          <h3>Skill Profile</h3>
          <div class="radar-chart-container">
            ${this.renderRadarChart(profile.compositeScores)}
          </div>
        </div>

        <!-- Task 6.1.4: Key Metrics Summary Cards -->
        <div class="dashboard-card metrics-card">
          <h3>Quick Stats</h3>
          ${this.renderQuickStats(profile)}
        </div>

        <!-- Win/Draw/Loss Record -->
        <div class="dashboard-card record-card">
          <h3>Game Record</h3>
          ${this.renderGameRecord(profile.records)}
        </div>

        <!-- Task 6.1.2: Trend Graphs -->
        <div class="dashboard-card trends-card">
          <h3>Accuracy Trend</h3>
          ${this.renderTrendGraph()}
        </div>

        <!-- Task 6.1.3: Recent Games -->
        <div class="dashboard-card recent-games-card">
          <h3>Recent Games</h3>
          ${this.renderRecentGames()}
        </div>
      </div>
    `;
  }

  /**
   * Task 6.1.1: Render radar/spider chart for composite scores
   */
  private renderRadarChart(scores: CompositeScores): string {
    const scoreEntries = [
      { key: 'precision', value: scores.precisionScore, ...COMPOSITE_SCORES.precision },
      {
        key: 'tacticalDanger',
        value: scores.tacticalDangerScore,
        ...COMPOSITE_SCORES.tacticalDanger,
      },
      { key: 'stability', value: scores.stabilityScore, ...COMPOSITE_SCORES.stability },
      { key: 'conversion', value: scores.conversionScore, ...COMPOSITE_SCORES.conversion },
      { key: 'preparation', value: scores.preparationScore, ...COMPOSITE_SCORES.preparation },
      { key: 'positional', value: scores.positionalScore, ...COMPOSITE_SCORES.positional },
      { key: 'aggression', value: scores.aggressionScore, ...COMPOSITE_SCORES.aggression },
      {
        key: 'simplification',
        value: scores.simplificationScore,
        ...COMPOSITE_SCORES.simplification,
      },
      {
        key: 'trainingTransfer',
        value: scores.trainingTransferScore,
        ...COMPOSITE_SCORES.trainingTransfer,
      },
    ];

    const size = 200;
    const center = size / 2;
    const maxRadius = size * 0.4;
    const numAxes = scoreEntries.length;
    const angleStep = (2 * Math.PI) / numAxes;

    // Generate axis lines
    const axisLines = scoreEntries
      .map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />`;
      })
      .join('');

    // Generate concentric circles (rings at 20%, 40%, 60%, 80%, 100%)
    const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
      .map((scale) => {
        const r = maxRadius * scale;
        return `<circle cx="${center}" cy="${center}" r="${r}" class="radar-ring" />`;
      })
      .join('');

    // Generate data polygon
    const dataPoints = scoreEntries
      .map((entry, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const r = (entry.value / 100) * maxRadius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');

    // Generate labels
    const labels = scoreEntries
      .map((entry, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelRadius = maxRadius + 25;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        const textAnchor =
          Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1
            ? 'middle'
            : angle > -Math.PI / 2 && angle < Math.PI / 2
              ? 'start'
              : 'end';
        return `
        <text x="${x}" y="${y}" class="radar-label" text-anchor="${textAnchor}" dominant-baseline="middle">
          ${entry.name}
        </text>
        <text x="${x}" y="${y + 12}" class="radar-value" text-anchor="${textAnchor}" dominant-baseline="middle">
          ${Math.round(entry.value)}
        </text>
      `;
      })
      .join('');

    // Generate data points
    const dataPointCircles = scoreEntries
      .map((entry, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const r = (entry.value / 100) * maxRadius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `<circle cx="${x}" cy="${y}" r="4" class="radar-point" fill="${entry.color}" />`;
      })
      .join('');

    return `
      <svg class="radar-chart" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">
        <!-- Background rings -->
        ${rings}

        <!-- Axis lines -->
        ${axisLines}

        <!-- Data polygon -->
        <polygon points="${dataPoints}" class="radar-polygon" />

        <!-- Data points -->
        ${dataPointCircles}

        <!-- Labels -->
        ${labels}
      </svg>
    `;
  }

  /**
   * Task 6.1.4: Render quick stats summary
   */
  private renderQuickStats(profile: PlayerProfile): string {
    const stats = profile.overallStats;

    return `
      <div class="quick-stats-grid">
        <div class="stat-card ${this.getScoreClass(stats.averageAccuracy)}">
          <div class="stat-value">${stats.averageAccuracy.toFixed(1)}%</div>
          <div class="stat-label">Avg Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.averageCentipawnLoss.toFixed(0)}</div>
          <div class="stat-label">Avg CPL</div>
        </div>
        <div class="stat-card ${stats.blundersPerGame < 1 ? 'excellent' : stats.blundersPerGame < 2 ? 'good' : 'poor'}">
          <div class="stat-value">${stats.blundersPerGame.toFixed(1)}</div>
          <div class="stat-label">Blunders/Game</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${profile.totalGames}</div>
          <div class="stat-label">Games Played</div>
        </div>
      </div>
    `;
  }

  /**
   * Render game record (W/D/L)
   */
  private renderGameRecord(records: PlayerRecords): string {
    return `
      <div class="game-record">
        <div class="record-bar">
          <div class="bar-segment win" style="width: ${records.winRate}%" title="Wins: ${records.winRate.toFixed(1)}%"></div>
          <div class="bar-segment draw" style="width: ${records.drawRate}%" title="Draws: ${records.drawRate.toFixed(1)}%"></div>
          <div class="bar-segment loss" style="width: ${records.lossRate}%" title="Losses: ${records.lossRate.toFixed(1)}%"></div>
        </div>
        <div class="record-legend">
          <span class="legend-item win">Win ${records.winRate.toFixed(0)}%</span>
          <span class="legend-item draw">Draw ${records.drawRate.toFixed(0)}%</span>
          <span class="legend-item loss">Loss ${records.lossRate.toFixed(0)}%</span>
        </div>
        <div class="streak-info">
          <span>Best Win Streak: ${records.longestWinStreak}</span>
          <span>Best Lose Streak: ${records.longestLoseStreak}</span>
        </div>
      </div>
    `;
  }

  /**
   * Task 6.1.2: Render accuracy trend graph
   */
  private renderTrendGraph(): string {
    const gamesWithAnalysis = this.state.games.filter((g) => g.analysis);
    if (gamesWithAnalysis.length < 2) {
      return '<div class="no-data">Play more games to see trends</div>';
    }

    // Take last 20 games for the trend
    const recentGames = gamesWithAnalysis.slice(0, 20).reverse();
    const width = 100;
    const height = 60;
    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Generate path
    let pathData = '';
    const points: string[] = [];

    recentGames.forEach((game, index) => {
      const x = padding + (index / (recentGames.length - 1)) * graphWidth;
      const accuracy = game.analysis?.summary.overallAccuracy || 0;
      const y = padding + (1 - accuracy / 100) * graphHeight;

      if (index === 0) {
        pathData = `M ${x},${y}`;
      } else {
        pathData += ` L ${x},${y}`;
      }

      points.push(`<circle cx="${x}%" cy="${y}%" r="2" class="trend-point" />`);
    });

    return `
      <svg class="trend-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <!-- Grid lines -->
        <line x1="${padding}%" y1="${padding}%" x2="${width - padding}%" y2="${padding}%" class="grid-line" />
        <line x1="${padding}%" y1="${height / 2}%" x2="${width - padding}%" y2="${height / 2}%" class="grid-line" />
        <line x1="${padding}%" y1="${height - padding}%" x2="${width - padding}%" y2="${height - padding}%" class="grid-line" />

        <!-- Trend line -->
        <path d="${pathData}" class="trend-line" fill="none" />

        <!-- Data points -->
        ${points.join('')}
      </svg>
      <div class="trend-labels">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
    `;
  }

  /**
   * Task 6.1.3: Render recent games list
   */
  private renderRecentGames(): string {
    const recentGames = this.state.games.slice(0, 5);

    if (recentGames.length === 0) {
      return '<div class="no-data">No games played yet</div>';
    }

    return `
      <div class="recent-games-list">
        ${recentGames.map(({ game, analysis }) => this.renderGameRow(game, analysis)).join('')}
      </div>
      <button class="view-all-btn" data-action="view-all-games">View All Games</button>
    `;
  }

  /**
   * Render a single game row
   */
  private renderGameRow(game: GameIndexEntry, analysis: StoredAnalysisData | null): string {
    const date = new Date(game.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const resultClass = this.getResultClass(game.result, game.playerColor);
    const resultText = this.getResultText(game.result, game.playerColor);
    const accuracy = analysis?.summary.overallAccuracy?.toFixed(0) || '—';

    return `
      <div class="game-row" data-game-id="${game.gameId}">
        <div class="game-date">${dateStr}</div>
        <div class="game-opponent">${this.capitalizeFirst(game.botPersonality)} (${game.botElo})</div>
        <div class="game-result ${resultClass}">${resultText}</div>
        <div class="game-accuracy ${this.getScoreClass(Number(accuracy) || 0)}">${accuracy}%</div>
        <button class="view-game-btn" data-game-id="${game.gameId}">View</button>
      </div>
    `;
  }

  // ========================================
  // Task 6.1.3: History Tab
  // ========================================

  /**
   * Render history tab with full game list
   */
  private renderHistoryTab(): string {
    if (this.state.games.length === 0) {
      return '<div class="no-data">No games played yet. Start an Exam Mode game to begin tracking!</div>';
    }

    return `
      <div class="history-layout">
        <div class="history-filters">
          <select id="time-filter" class="filter-select">
            <option value="all" ${this.state.timePeriod === 'all' ? 'selected' : ''}>All Time</option>
            <option value="last10" ${this.state.timePeriod === 'last10' ? 'selected' : ''}>Last 10 Games</option>
            <option value="last30" ${this.state.timePeriod === 'last30' ? 'selected' : ''}>Last 30 Games</option>
            <option value="thisMonth" ${this.state.timePeriod === 'thisMonth' ? 'selected' : ''}>This Month</option>
          </select>
        </div>

        <div class="history-table">
          <div class="table-header">
            <span class="col-date">Date</span>
            <span class="col-opponent">Opponent</span>
            <span class="col-color">Color</span>
            <span class="col-result">Result</span>
            <span class="col-accuracy">Accuracy</span>
            <span class="col-blunders">Blunders</span>
            <span class="col-actions">Actions</span>
          </div>
          <div class="table-body">
            ${this.getFilteredGames()
              .map(({ game, analysis }) => this.renderHistoryRow(game, analysis))
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get games filtered by time period
   */
  private getFilteredGames(): GameWithAnalysis[] {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (this.state.timePeriod) {
      case 'last10':
        return this.state.games.slice(0, 10);
      case 'last30':
        return this.state.games.slice(0, 30);
      case 'thisMonth':
        return this.state.games.filter((g) => new Date(g.game.timestamp) >= startOfMonth);
      default:
        return this.state.games;
    }
  }

  /**
   * Render history table row
   */
  private renderHistoryRow(game: GameIndexEntry, analysis: StoredAnalysisData | null): string {
    const date = new Date(game.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
    const resultClass = this.getResultClass(game.result, game.playerColor);
    const resultSymbol =
      game.result === '1/2-1/2'
        ? '½-½'
        : this.getResultText(game.result, game.playerColor) === 'Win'
          ? '1-0'
          : '0-1';
    const accuracy = analysis?.summary.overallAccuracy?.toFixed(1) || '—';
    const blunders = analysis?.summary.blunders ?? '—';

    return `
      <div class="table-row" data-game-id="${game.gameId}">
        <span class="col-date">${dateStr}</span>
        <span class="col-opponent">${this.capitalizeFirst(game.botPersonality)} (${game.botElo})</span>
        <span class="col-color">${game.playerColor === 'white' ? '○' : '●'}</span>
        <span class="col-result ${resultClass}">${resultSymbol}</span>
        <span class="col-accuracy ${this.getScoreClass(Number(accuracy) || 0)}">${accuracy}%</span>
        <span class="col-blunders ${Number(blunders) > 2 ? 'high' : ''}">${blunders}</span>
        <span class="col-actions">
          <button class="dashboard-action-btn view-btn" data-game-id="${game.gameId}" title="View Analysis">📊</button>
        </span>
      </div>
    `;
  }

  // ========================================
  // Task 6.2-6.5: Analytics Tab
  // ========================================

  /**
   * Task 6.2-6.5: Render analytics tab
   */
  private renderAnalyticsTab(): string {
    if (this.state.games.length === 0) {
      return '<div class="no-data">No games to analyze yet. Play some Exam Mode games first!</div>';
    }

    return `
      <div class="analytics-layout">
        <!-- Task 6.2.2: Accuracy by Game Phase -->
        <div class="dashboard-card phase-accuracy-card">
          <h3>Accuracy by Game Phase</h3>
          ${this.renderPhaseAccuracyChart()}
        </div>

        <!-- Task 6.2.3: Error Distribution -->
        <div class="dashboard-card error-dist-card">
          <h3>Error Distribution</h3>
          ${this.renderErrorDistribution()}
        </div>

        <!-- Task 6.2.4: CPL Trends -->
        <div class="dashboard-card cpl-trend-card">
          <h3>Centipawn Loss Trend</h3>
          ${this.renderCPLTrend()}
        </div>

        <!-- Task 6.3: Historical Comparison -->
        <div class="dashboard-card comparison-card">
          <h3>Period Comparison</h3>
          ${this.renderPeriodComparison()}
        </div>

        <!-- Task 6.5: Performance vs. Bot Difficulty -->
        <div class="dashboard-card bot-performance-card">
          <h3>Performance by Opponent Strength</h3>
          ${this.renderBotPerformance()}
        </div>

        <!-- Task 6.7: Training Suggestions -->
        <div class="dashboard-card suggestions-card">
          <h3>Training Suggestions</h3>
          ${this.renderTrainingSuggestions()}
        </div>
      </div>
    `;
  }

  /**
   * Task 6.2.2: Render accuracy by game phase chart
   */
  private renderPhaseAccuracyChart(): string {
    const gamesWithAnalysis = this.state.games.filter((g) => g.analysis);
    if (gamesWithAnalysis.length === 0) {
      return '<div class="no-data">No analysis data available</div>';
    }

    // Calculate average accuracy per phase
    let openingTotal = 0,
      middlegameTotal = 0,
      endgameTotal = 0;
    let count = 0;

    for (const { analysis } of gamesWithAnalysis) {
      if (analysis) {
        openingTotal += analysis.gamePhases.opening.accuracy;
        middlegameTotal += analysis.gamePhases.middlegame.accuracy;
        endgameTotal += analysis.gamePhases.endgame.accuracy;
        count++;
      }
    }

    const openingAvg = count > 0 ? openingTotal / count : 0;
    const middlegameAvg = count > 0 ? middlegameTotal / count : 0;
    const endgameAvg = count > 0 ? endgameTotal / count : 0;

    return `
      <div class="phase-bars">
        <div class="phase-bar-item">
          <span class="phase-name">Opening</span>
          <div class="bar-wrapper">
            <div class="bar ${this.getScoreClass(openingAvg)}" style="width: ${openingAvg}%"></div>
          </div>
          <span class="phase-value">${openingAvg.toFixed(0)}%</span>
        </div>
        <div class="phase-bar-item">
          <span class="phase-name">Middlegame</span>
          <div class="bar-wrapper">
            <div class="bar ${this.getScoreClass(middlegameAvg)}" style="width: ${middlegameAvg}%"></div>
          </div>
          <span class="phase-value">${middlegameAvg.toFixed(0)}%</span>
        </div>
        <div class="phase-bar-item">
          <span class="phase-name">Endgame</span>
          <div class="bar-wrapper">
            <div class="bar ${this.getScoreClass(endgameAvg)}" style="width: ${endgameAvg}%"></div>
          </div>
          <span class="phase-value">${endgameAvg.toFixed(0)}%</span>
        </div>
      </div>
    `;
  }

  /**
   * Task 6.2.3: Render error distribution
   */
  private renderErrorDistribution(): string {
    const gamesWithAnalysis = this.state.games.filter((g) => g.analysis);
    if (gamesWithAnalysis.length === 0) {
      return '<div class="no-data">No analysis data available</div>';
    }

    let excellent = 0,
      good = 0,
      inaccuracies = 0,
      mistakes = 0,
      blunders = 0;

    for (const { analysis } of gamesWithAnalysis) {
      if (analysis) {
        excellent += analysis.summary.excellentMoves;
        good += analysis.summary.goodMoves;
        inaccuracies += analysis.summary.inaccuracies;
        mistakes += analysis.summary.mistakes;
        blunders += analysis.summary.blunders;
      }
    }

    const total = excellent + good + inaccuracies + mistakes + blunders;
    if (total === 0) {
      return '<div class="no-data">No move data available</div>';
    }

    return `
      <div class="error-distribution">
        <div class="dist-row">
          <span class="dist-label excellent">Excellent (!!):</span>
          <div class="dist-bar-wrapper">
            <div class="dist-bar excellent" style="width: ${(excellent / total) * 100}%"></div>
          </div>
          <span class="dist-count">${excellent}</span>
        </div>
        <div class="dist-row">
          <span class="dist-label good">Good (!):</span>
          <div class="dist-bar-wrapper">
            <div class="dist-bar good" style="width: ${(good / total) * 100}%"></div>
          </div>
          <span class="dist-count">${good}</span>
        </div>
        <div class="dist-row">
          <span class="dist-label inaccuracy">Inaccuracies (?!):</span>
          <div class="dist-bar-wrapper">
            <div class="dist-bar inaccuracy" style="width: ${(inaccuracies / total) * 100}%"></div>
          </div>
          <span class="dist-count">${inaccuracies}</span>
        </div>
        <div class="dist-row">
          <span class="dist-label mistake">Mistakes (?):</span>
          <div class="dist-bar-wrapper">
            <div class="dist-bar mistake" style="width: ${(mistakes / total) * 100}%"></div>
          </div>
          <span class="dist-count">${mistakes}</span>
        </div>
        <div class="dist-row">
          <span class="dist-label blunder">Blunders (??):</span>
          <div class="dist-bar-wrapper">
            <div class="dist-bar blunder" style="width: ${(blunders / total) * 100}%"></div>
          </div>
          <span class="dist-count">${blunders}</span>
        </div>
      </div>
    `;
  }

  /**
   * Task 6.2.4: Render CPL trend
   */
  private renderCPLTrend(): string {
    const gamesWithAnalysis = this.state.games
      .filter((g) => g.analysis)
      .slice(0, 20)
      .reverse();
    if (gamesWithAnalysis.length < 2) {
      return '<div class="no-data">Need more games to show trend</div>';
    }

    const width = 100;
    const height = 50;
    const padding = 5;
    const maxCPL = 100; // Max CPL to display

    let pathData = '';
    gamesWithAnalysis.forEach((game, index) => {
      const x = padding + (index / (gamesWithAnalysis.length - 1)) * (width - padding * 2);
      const cpl = Math.min(game.analysis?.summary.averageCentipawnLoss || 0, maxCPL);
      const y = padding + (cpl / maxCPL) * (height - padding * 2);

      if (index === 0) {
        pathData = `M ${x},${y}`;
      } else {
        pathData += ` L ${x},${y}`;
      }
    });

    return `
      <svg class="cpl-graph" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <path d="${pathData}" class="cpl-line" fill="none" />
      </svg>
      <div class="cpl-labels">
        <span>0 CPL (best)</span>
        <span>${maxCPL} CPL</span>
      </div>
    `;
  }

  /**
   * Task 6.3: Render period comparison
   */
  private renderPeriodComparison(): string {
    const all = this.state.games.filter((g) => g.analysis);
    if (all.length < 10) {
      return '<div class="no-data">Need at least 10 games for comparison</div>';
    }

    const last10 = all.slice(0, 10);
    const prev10 = all.slice(10, 20);

    if (prev10.length === 0) {
      return '<div class="no-data">Not enough games for comparison</div>';
    }

    const calcAvg = (games: GameWithAnalysis[]) => {
      let total = 0;
      games.forEach((g) => {
        total += g.analysis?.summary.overallAccuracy || 0;
      });
      return total / games.length;
    };

    const last10Avg = calcAvg(last10);
    const prev10Avg = calcAvg(prev10);
    const change = last10Avg - prev10Avg;
    const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';

    return `
      <div class="period-comparison">
        <div class="period-block">
          <span class="period-label">Last 10 Games</span>
          <span class="period-value">${last10Avg.toFixed(1)}%</span>
        </div>
        <div class="comparison-arrow ${changeClass}">
          ${change > 0 ? '↑' : change < 0 ? '↓' : '→'}
          <span class="change-value">${Math.abs(change).toFixed(1)}%</span>
        </div>
        <div class="period-block">
          <span class="period-label">Previous 10 Games</span>
          <span class="period-value">${prev10Avg.toFixed(1)}%</span>
        </div>
      </div>
      <div class="comparison-summary ${changeClass}">
        ${
          change > 2
            ? 'Great improvement! Keep it up!'
            : change > 0
              ? 'Slight improvement detected.'
              : change < -2
                ? 'Accuracy declining - review your games.'
                : change < 0
                  ? 'Slight decline - stay focused!'
                  : 'Performance is consistent.'
        }
      </div>
    `;
  }

  /**
   * Task 6.5: Render performance vs bot difficulty
   */
  private renderBotPerformance(): string {
    const gamesWithAnalysis = this.state.games.filter((g) => g.analysis);
    if (gamesWithAnalysis.length === 0) {
      return '<div class="no-data">No games to analyze</div>';
    }

    // Group by bot Elo ranges
    const ranges: Record<string, { wins: number; total: number; accuracy: number; count: number }> =
      {
        '800-1000': { wins: 0, total: 0, accuracy: 0, count: 0 },
        '1000-1200': { wins: 0, total: 0, accuracy: 0, count: 0 },
        '1200-1400': { wins: 0, total: 0, accuracy: 0, count: 0 },
        '1400-1600': { wins: 0, total: 0, accuracy: 0, count: 0 },
        '1600+': { wins: 0, total: 0, accuracy: 0, count: 0 },
      };

    for (const { game, analysis } of gamesWithAnalysis) {
      const elo = game.botElo;
      let range: string;
      if (elo < 1000) range = '800-1000';
      else if (elo < 1200) range = '1000-1200';
      else if (elo < 1400) range = '1200-1400';
      else if (elo < 1600) range = '1400-1600';
      else range = '1600+';

      ranges[range].total++;
      ranges[range].count++;
      ranges[range].accuracy += analysis?.summary.overallAccuracy || 0;

      const isWin =
        (game.result === '1-0' && game.playerColor === 'white') ||
        (game.result === '0-1' && game.playerColor === 'black');
      if (isWin) ranges[range].wins++;
    }

    return `
      <div class="bot-performance-table">
        <div class="table-header">
          <span>Elo Range</span>
          <span>Games</span>
          <span>Win Rate</span>
          <span>Avg Accuracy</span>
        </div>
        ${Object.entries(ranges)
          .filter(([_, data]) => data.total > 0)
          .map(
            ([range, data]) => `
            <div class="table-row">
              <span>${range}</span>
              <span>${data.total}</span>
              <span>${((data.wins / data.total) * 100).toFixed(0)}%</span>
              <span>${(data.accuracy / data.count).toFixed(1)}%</span>
            </div>
          `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Task 6.7: Render training suggestions
   */
  private renderTrainingSuggestions(): string {
    const suggestions: string[] = [];
    const profile = this.state.profile;

    if (!profile || profile.totalGames === 0) {
      return '<div class="suggestion-item">Play Exam Mode games to receive personalized training suggestions!</div>';
    }

    // Analyze weaknesses
    const scores = profile.compositeScores;

    if (scores.precisionScore < 70) {
      suggestions.push('Focus on accuracy: Think longer before each move to reduce blunders.');
    }
    if (scores.tacticalDangerScore < 60) {
      suggestions.push('Practice tactical puzzles to improve pattern recognition.');
    }
    if (profile.detailedMetrics.openingAccuracyAvg < 70) {
      suggestions.push('Study opening principles and develop a reliable repertoire.');
    }
    if (profile.overallStats.blundersPerGame > 2) {
      suggestions.push('Review your games to identify common blunder patterns.');
    }
    if (profile.records.winRate < 40) {
      suggestions.push('Consider playing against lower-rated bots to build confidence.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Great work! Keep practicing to maintain your skill level.');
    }

    return suggestions
      .map(
        (s, i) => `
      <div class="suggestion-item">
        <span class="suggestion-number">${i + 1}</span>
        <span class="suggestion-text">${s}</span>
      </div>
    `
      )
      .join('');
  }

  // ========================================
  // Task 6.6: Achievements Tab
  // ========================================

  /**
   * Task 6.6: Render achievements tab
   */
  private renderAchievementsTab(): string {
    const achievements = this.getAchievements();

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const totalCount = achievements.length;

    return `
      <div class="achievements-layout">
        <div class="achievements-header">
          <h3>Achievements</h3>
          <div class="achievement-progress">
            <span>${unlockedCount}/${totalCount} Unlocked</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
            </div>
          </div>
        </div>

        <div class="achievements-grid">
          ${achievements.map((a) => this.renderAchievementCard(a)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Get all achievements with current progress
   */
  private getAchievements(): Achievement[] {
    const profile = this.state.profile;
    const games = this.state.games;

    return [
      // Precision milestones
      {
        id: 'first_clean_game',
        name: 'Clean Sheet',
        description: 'Play a game with 0 blunders',
        icon: '🎯',
        unlocked: games.some((g) => g.analysis?.summary.blunders === 0),
        progress: games.filter((g) => g.analysis?.summary.blunders === 0).length,
        maxProgress: 1,
      },
      {
        id: 'high_accuracy',
        name: 'Sharp Mind',
        description: 'Achieve 85%+ accuracy in a game',
        icon: '🧠',
        unlocked: games.some((g) => (g.analysis?.summary.overallAccuracy || 0) >= 85),
        progress: games.filter((g) => (g.analysis?.summary.overallAccuracy || 0) >= 85).length,
        maxProgress: 1,
      },
      {
        id: 'ten_games',
        name: 'Getting Started',
        description: 'Play 10 Exam Mode games',
        icon: '🎮',
        unlocked: games.length >= 10,
        progress: Math.min(games.length, 10),
        maxProgress: 10,
      },
      {
        id: 'fifty_games',
        name: 'Dedicated Player',
        description: 'Play 50 Exam Mode games',
        icon: '⭐',
        unlocked: games.length >= 50,
        progress: Math.min(games.length, 50),
        maxProgress: 50,
      },
      {
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first game',
        icon: '🏆',
        unlocked: games.some(
          (g) =>
            (g.game.result === '1-0' && g.game.playerColor === 'white') ||
            (g.game.result === '0-1' && g.game.playerColor === 'black')
        ),
        progress: 1,
        maxProgress: 1,
      },
      {
        id: 'win_streak_3',
        name: 'Hot Streak',
        description: 'Win 3 games in a row',
        icon: '🔥',
        unlocked: (profile?.records.longestWinStreak || 0) >= 3,
        progress: Math.min(profile?.records.longestWinStreak || 0, 3),
        maxProgress: 3,
      },
      {
        id: 'beat_1400',
        name: 'Giant Slayer',
        description: 'Beat a 1400+ rated bot',
        icon: '⚔️',
        unlocked: games.some(
          (g) =>
            g.game.botElo >= 1400 &&
            ((g.game.result === '1-0' && g.game.playerColor === 'white') ||
              (g.game.result === '0-1' && g.game.playerColor === 'black'))
        ),
        progress: 1,
        maxProgress: 1,
      },
      {
        id: 'improving',
        name: 'On The Rise',
        description: 'Show improvement over 10 games',
        icon: '📈',
        unlocked: profile?.trends.accuracyTrend === 'improving',
        progress: profile?.trends.accuracyTrend === 'improving' ? 1 : 0,
        maxProgress: 1,
      },
    ];
  }

  /**
   * Render achievement card
   */
  private renderAchievementCard(achievement: Achievement): string {
    const progressPct = (achievement.progress / achievement.maxProgress) * 100;

    return `
      <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
        <div class="achievement-info">
          <span class="achievement-name">${achievement.name}</span>
          <span class="achievement-desc">${achievement.description}</span>
          ${
            !achievement.unlocked
              ? `
            <div class="achievement-progress-bar">
              <div class="progress-fill" style="width: ${progressPct}%"></div>
            </div>
            <span class="achievement-progress-text">${achievement.progress}/${achievement.maxProgress}</span>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get CSS class for score value
   */
  private getScoreClass(score: number): string {
    if (score >= SCORE_THRESHOLDS.excellent) return 'excellent';
    if (score >= SCORE_THRESHOLDS.good) return 'good';
    if (score >= SCORE_THRESHOLDS.average) return 'average';
    if (score >= SCORE_THRESHOLDS.belowAverage) return 'below-average';
    return 'poor';
  }

  /**
   * Get result text
   */
  private getResultText(result: string, playerColor: 'white' | 'black'): string {
    if (result === '1/2-1/2') return 'Draw';
    const playerWon =
      (result === '1-0' && playerColor === 'white') ||
      (result === '0-1' && playerColor === 'black');
    return playerWon ? 'Win' : 'Loss';
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
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ========================================
  // Event Handlers
  // ========================================

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Tab switching
    document.querySelectorAll('.dashboard-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const tabName = (e.currentTarget as HTMLElement).dataset
          .tab as DashboardState['selectedTab'];
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // View game buttons
    document.querySelectorAll('.view-game-btn, .view-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = (e.currentTarget as HTMLElement).dataset.gameId;
        if (gameId) {
          this.onViewGame?.(gameId);
        }
      });
    });

    // View all games button
    document.querySelector('[data-action="view-all-games"]')?.addEventListener('click', () => {
      this.switchTab('history');
    });

    // Time filter
    document.getElementById('time-filter')?.addEventListener('change', (e) => {
      this.state.timePeriod = (e.target as HTMLSelectElement).value as DashboardState['timePeriod'];
      this.renderDashboard();
    });

    // Close button
    document.getElementById('dashboard-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    // Game row clicks
    document.querySelectorAll('.game-row, .table-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const gameId = (e.currentTarget as HTMLElement).dataset.gameId;
        if (gameId) {
          this.onViewGame?.(gameId);
        }
      });
    });
  }

  /**
   * Switch between tabs
   */
  private switchTab(tabName: DashboardState['selectedTab']): void {
    this.state.selectedTab = tabName;
    this.renderDashboard();
  }

  // ========================================
  // UI Helper Methods
  // ========================================

  /**
   * Show/hide dashboard overlay
   */
  private showDashboardOverlay(show: boolean): void {
    const overlay = document.getElementById('dashboard-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  /**
   * Show/hide loading state
   */
  private showLoadingState(show: boolean): void {
    const loading = document.getElementById('dashboard-loading');
    const content = document.getElementById('dashboard-content');

    if (loading) loading.classList.toggle('hidden', !show);
    if (content) content.classList.toggle('hidden', show);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const content = document.getElementById('dashboard-content');
    if (content) {
      content.innerHTML = `
        <div class="dashboard-error">
          <span class="error-icon">⚠️</span>
          <p>${message}</p>
          <button class="error-close-btn" onclick="this.closest('.dashboard-error').remove()">Close</button>
        </div>
      `;
    }
  }
}

/**
 * Create and export the progress dashboard manager instance
 */
export function createProgressDashboard(): ProgressDashboardManager {
  return new ProgressDashboardManager();
}

export default ProgressDashboardManager;
