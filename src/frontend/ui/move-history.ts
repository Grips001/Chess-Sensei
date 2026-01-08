/**
 * Move History Module
 * Handles displaying the move history
 */

import type { ChessGame } from '../../shared/chess-logic';
import type { CollapsibleSection } from '../components/collapsible-section';

/**
 * Update the move history display
 * Per Task 2.3.2: Display move history (notation list)
 */
export function updateMoveHistory(
  game: ChessGame,
  moveHistorySection: CollapsibleSection | null
): void {
  const moveListElement = document.getElementById('move-list');
  if (!moveListElement) return;

  // Clear existing moves
  moveListElement.innerHTML = '';

  // Get move history from game
  const history = game.getHistory();

  // Group moves into pairs (White + Black)
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];

    // Create move pair container
    const movePair = document.createElement('div');
    movePair.className = 'move-pair';

    // Move number
    const moveNum = document.createElement('div');
    moveNum.className = 'move-number';
    moveNum.textContent = `${moveNumber}.`;
    movePair.appendChild(moveNum);

    // Move notation container
    const moveNotation = document.createElement('div');
    moveNotation.className = 'move-notation';

    // White's move
    const whiteMoveEl = document.createElement('div');
    whiteMoveEl.className = 'move-white';
    whiteMoveEl.textContent = whiteMove.san;
    if (i === history.length - 1) {
      whiteMoveEl.classList.add('latest');
    }
    moveNotation.appendChild(whiteMoveEl);

    // Black's move (if exists)
    if (blackMove) {
      const blackMoveEl = document.createElement('div');
      blackMoveEl.className = 'move-black';
      blackMoveEl.textContent = blackMove.san;
      if (i + 1 === history.length - 1) {
        blackMoveEl.classList.add('latest');
      }
      moveNotation.appendChild(blackMoveEl);
    }

    movePair.appendChild(moveNotation);
    moveListElement.appendChild(movePair);
  }

  // Auto-scroll to bottom to show latest move
  const moveHistory = document.getElementById('move-history');
  if (moveHistory) {
    moveHistory.scrollTop = moveHistory.scrollHeight;
  }

  // Refresh CollapsibleSection height after content update
  if (moveHistorySection) {
    moveHistorySection.refreshHeight();
  }
}
