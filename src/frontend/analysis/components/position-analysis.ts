/**
 * Position Analysis Panel Component
 * Renders the current position analysis with alternatives
 */

import type {
  StoredAnalysisData,
  StoredGameData,
  AnalyzedMove,
} from '../../../shared/analysis-types';
import { MOVE_SYMBOLS } from '../../../shared/analysis-types';

/**
 * Format evaluation in pawns
 */
export function formatEval(centipawns: number): string {
  if (Math.abs(centipawns) >= 10000) {
    const mateIn = Math.ceil((32768 - Math.abs(centipawns)) / 2);
    return centipawns > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const pawns = centipawns / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

/**
 * Format evaluation swing
 */
export function formatEvalSwing(before: number, after: number): string {
  const swing = (after - before) / 100;
  const sign = swing >= 0 ? '+' : '';
  return `${sign}${swing.toFixed(2)} pawns`;
}

/**
 * Get CSS class for eval change
 */
export function getEvalChangeClass(move: AnalyzedMove): string {
  const swing = move.evaluationAfter - move.evaluationBefore;
  if (swing > 50) return 'positive';
  if (swing < -50) return 'negative';
  return 'neutral';
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string | undefined | null): string {
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render position analysis panel
 */
export function renderPositionAnalysis(
  analysisData: StoredAnalysisData | null,
  gameData: StoredGameData | null,
  currentMoveIndex: number
): string {
  if (!analysisData || currentMoveIndex < 0) {
    return `
      <div class="position-placeholder">
        <p>Click on a move to see analysis</p>
      </div>
    `;
  }

  const move = analysisData.moveAnalysis[currentMoveIndex];
  if (!move) {
    return `
      <div class="position-placeholder">
        <p>Click on a move to see analysis</p>
      </div>
    `;
  }

  const isPlayerMove = gameData && move.color === gameData.metadata.playerColor;
  const symbol = MOVE_SYMBOLS[move.classification];
  const evalChangeClass = getEvalChangeClass(move);

  return `
    <div class="position-details">
      <div class="move-header">
        <span class="move-number">${move.moveNumber}${move.color === 'white' ? '.' : '...'}</span>
        <span class="move-san ${move.classification}">${move.san}${symbol}</span>
        ${isPlayerMove ? '<span class="player-badge">You</span>' : '<span class="opponent-badge">Opponent</span>'}
      </div>

      <div class="eval-info">
        <div class="eval-row">
          <span class="eval-label">Before:</span>
          <span class="eval-value">${formatEval(move.evaluationBefore)}</span>
        </div>
        <div class="eval-row">
          <span class="eval-label">After:</span>
          <span class="eval-value">${formatEval(move.evaluationAfter)}</span>
        </div>
        <div class="eval-row ${evalChangeClass}">
          <span class="eval-label">Change:</span>
          <span class="eval-value">${formatEvalSwing(move.evaluationBefore, move.evaluationAfter)}</span>
        </div>
      </div>

      <div class="classification-box ${move.classification}">
        <span class="classification-icon">${getClassificationIcon(move.classification)}</span>
        <span class="classification-text">${capitalizeFirst(move.classification)}</span>
        <span class="accuracy-text">${move.accuracy.toFixed(0)}% accurate</span>
      </div>

      ${
        move.bestMove !== move.uci
          ? `
        <div class="best-move-info">
          <span class="best-label">Best move was:</span>
          <span class="best-move">${move.bestMove}</span>
        </div>
      `
          : ''
      }

      ${
        move.alternativeMoves && move.alternativeMoves.length > 0
          ? `
        <button class="view-alternatives-btn" data-index="${currentMoveIndex}">
          View Alternative Moves (${move.alternativeMoves.length})
        </button>
      `
          : ''
      }
    </div>
  `;
}

/**
 * Get icon for classification
 */
function getClassificationIcon(classification: string): string {
  const icons: Record<string, string> = {
    excellent: '★',
    good: '✓',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
  };
  return icons[classification] || '';
}
