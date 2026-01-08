/**
 * Turn Indicator Module
 * Handles displaying the current player's turn
 */

import type { ChessGame } from '../../shared/chess-logic';

/**
 * Update the turn indicator display
 * Per Task 2.3.1: Show current turn indicator
 */
export function updateTurnIndicator(game: ChessGame): void {
  const turnText = document.getElementById('turn-text');
  const turnPieceIcon = document.getElementById('turn-piece-icon');
  const turnDisplay = document.querySelector('.turn-display') as HTMLElement | null;

  if (!turnText || !turnPieceIcon || !turnDisplay) return;

  const currentTurn = game.getTurn();
  const isWhite = currentTurn === 'w';

  // Update text
  turnText.textContent = isWhite ? 'White to move' : 'Black to move';

  // Update piece icon (show king of current player)
  const kingPiece = isWhite ? 'wK' : 'bK';
  turnPieceIcon.style.backgroundImage = `url('/assets/pieces/${kingPiece}.svg')`;

  // Add animation
  turnDisplay.classList.remove('animate');
  // Force reflow to restart animation
  void turnDisplay.offsetWidth;
  turnDisplay.classList.add('animate');

  // Remove animation class after animation completes
  setTimeout(() => {
    turnDisplay.classList.remove('animate');
  }, 500);
}
