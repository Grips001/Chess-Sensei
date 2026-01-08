/**
 * Move List Component
 * Renders the move list with annotations
 */

import type {
  StoredAnalysisData,
  StoredGameData,
  AnalyzedMove,
} from '../../../shared/analysis-types';
import { MOVE_SYMBOLS } from '../../../shared/analysis-types';

/**
 * Render a single move entry
 */
function renderMoveEntry(
  move: AnalyzedMove,
  index: number,
  isPlayerMove: boolean,
  currentMoveIndex: number
): string {
  const symbol = MOVE_SYMBOLS[move.classification];
  const isSelected = index === currentMoveIndex;

  return `
    <span
      class="move-entry ${move.classification} ${isSelected ? 'selected' : ''} ${isPlayerMove ? 'player-move' : 'opponent-move'}"
      data-index="${index}"
      title="${move.classification}"
    >
      ${move.moveNumber}${move.color === 'white' ? '.' : '...'} ${move.san}${symbol}
    </span>
  `;
}

/**
 * Render the complete move list
 */
export function renderMoveList(
  analysisData: StoredAnalysisData | null,
  gameData: StoredGameData | null,
  currentMoveIndex: number
): string {
  if (!analysisData || !gameData) return '';

  const moves = analysisData.moveAnalysis;
  const playerColor = gameData.metadata.playerColor;

  return `
    <div class="move-list-header">
      <span class="column-move">Move</span>
      <span class="column-eval">Eval</span>
    </div>
    <div class="move-list-content">
      ${moves
        .map((move, index) => {
          const isPlayerMove = move.color === playerColor;
          return renderMoveEntry(move, index, isPlayerMove, currentMoveIndex);
        })
        .join('')}
    </div>
  `;
}

/**
 * Update move list selection
 */
export function updateMoveListSelection(index: number): void {
  document.querySelectorAll('.move-entry').forEach((entry) => {
    const entryIndex = parseInt((entry as HTMLElement).dataset.index || '-2');
    entry.classList.toggle('selected', entryIndex === index);
  });

  // Auto-scroll move list
  const selectedMove = document.querySelector('.move-entry.selected');
  if (selectedMove) {
    selectedMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
