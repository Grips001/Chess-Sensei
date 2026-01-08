/**
 * Game Summary Panel Component
 * Renders the game summary with statistics
 */

import type {
  StoredAnalysisData,
  StoredGameData,
  AnalysisSummary,
} from '../../../shared/analysis-types';

/**
 * Get CSS class for accuracy value
 */
export function getAccuracyClass(accuracy: number): string {
  if (accuracy >= 90) return 'excellent';
  if (accuracy >= 80) return 'good';
  if (accuracy >= 70) return 'average';
  if (accuracy >= 60) return 'below-average';
  return 'poor';
}

/**
 * Get result text
 */
function getResultText(result: string, playerColor: 'white' | 'black'): string {
  if (result === '1/2-1/2') return 'Draw';
  const playerWon =
    (result === '1-0' && playerColor === 'white') || (result === '0-1' && playerColor === 'black');
  return playerWon ? 'You Won!' : 'You Lost';
}

/**
 * Get result CSS class
 */
function getResultClass(result: string, playerColor: 'white' | 'black'): string {
  if (result === '1/2-1/2') return 'draw';
  const playerWon =
    (result === '1-0' && playerColor === 'white') || (result === '0-1' && playerColor === 'black');
  return playerWon ? 'win' : 'loss';
}

/**
 * Format duration
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string | undefined | null): string {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render move distribution chart
 */
function renderMoveDistribution(summary: AnalysisSummary): string {
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

/**
 * Render game summary
 */
export function renderGameSummary(
  analysisData: StoredAnalysisData | null,
  gameData: StoredGameData | null
): string {
  if (!analysisData || !gameData) return '';

  const summary = analysisData.summary;
  const metadata = gameData.metadata;
  const resultText = getResultText(metadata.result, metadata.playerColor);
  const resultClass = getResultClass(metadata.result, metadata.playerColor);

  return `
    <div class="game-result ${resultClass}">
      <h2>${resultText}</h2>
      <p>vs ${capitalizeFirst(metadata.botPersonality)} (${metadata.botElo} Elo)</p>
    </div>

    <div class="accuracy-section">
      <div class="accuracy-main">
        <div class="accuracy-circle ${getAccuracyClass(summary.overallAccuracy)}">
          <span class="accuracy-value">${summary.overallAccuracy.toFixed(1)}%</span>
          <span class="accuracy-label">Accuracy</span>
        </div>
      </div>

      <div class="accuracy-breakdown">
        <div class="phase-accuracy">
          <span class="phase-label">Opening</span>
          <div class="phase-bar">
            <div class="phase-fill ${getAccuracyClass(summary.openingAccuracy)}" style="width: ${summary.openingAccuracy}%"></div>
          </div>
          <span class="phase-value">${summary.openingAccuracy.toFixed(0)}%</span>
        </div>
        <div class="phase-accuracy">
          <span class="phase-label">Middlegame</span>
          <div class="phase-bar">
            <div class="phase-fill ${getAccuracyClass(summary.middlegameAccuracy)}" style="width: ${summary.middlegameAccuracy}%"></div>
          </div>
          <span class="phase-value">${summary.middlegameAccuracy.toFixed(0)}%</span>
        </div>
        <div class="phase-accuracy">
          <span class="phase-label">Endgame</span>
          <div class="phase-bar">
            <div class="phase-fill ${getAccuracyClass(summary.endgameAccuracy)}" style="width: ${summary.endgameAccuracy}%"></div>
          </div>
          <span class="phase-value">${summary.endgameAccuracy.toFixed(0)}%</span>
        </div>
      </div>
    </div>

    <div class="move-quality-section">
      <h3>Move Quality</h3>
      ${renderMoveDistribution(summary)}
      <div class="quality-stats">
        <div class="stat-row">
          <span>Blunders</span>
          <span class="blunder">${summary.blunders}</span>
        </div>
        <div class="stat-row">
          <span>Mistakes</span>
          <span class="mistake">${summary.mistakes}</span>
        </div>
        <div class="stat-row">
          <span>Inaccuracies</span>
          <span class="inaccuracy">${summary.inaccuracies}</span>
        </div>
        <div class="stat-row">
          <span>Avg Centipawn Loss</span>
          <span>${summary.averageCentipawnLoss.toFixed(1)}</span>
        </div>
      </div>
    </div>

    <div class="game-info-section">
      <h3>Game Info</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Duration</span>
          <span class="info-value">${formatDuration(metadata.duration)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Your Color</span>
          <span class="info-value">${capitalizeFirst(metadata.playerColor)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Termination</span>
          <span class="info-value">${capitalizeFirst(metadata.termination)}</span>
        </div>
        ${
          metadata.opening
            ? `
        <div class="info-item">
          <span class="info-label">Opening</span>
          <span class="info-value">${metadata.opening}</span>
        </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}
