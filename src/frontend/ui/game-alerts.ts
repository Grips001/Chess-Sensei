/**
 * Game Alerts Module
 * Handles check, checkmate, and draw indicators
 */

import type { ChessGame } from '../../shared/chess-logic';

/**
 * Update game alert display (check, checkmate, stalemate)
 * Per Task 2.3.4: Check/checkmate indicators
 */
export function updateGameAlert(game: ChessGame): void {
  const gameAlert = document.getElementById('game-alert');
  if (!gameAlert) return;

  // Check game state
  const isCheck = game.isInCheck();
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();

  // Reset classes
  gameAlert.className = 'game-alert';
  gameAlert.innerHTML = '';

  if (isCheckmate) {
    // Checkmate
    const winner = game.getTurn() === 'w' ? 'Black' : 'White';
    gameAlert.classList.add('checkmate');
    gameAlert.innerHTML = `<span class="game-alert-icon">♔</span><span>Checkmate! ${winner} wins!</span>`;
  } else if (isStalemate) {
    // Stalemate
    gameAlert.classList.add('draw');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚖</span><span>Stalemate - Draw!</span>`;
  } else if (isDraw) {
    // Other draw conditions
    gameAlert.classList.add('draw');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚖</span><span>Draw!</span>`;
  } else if (isCheck) {
    // Check
    const player = game.getTurn() === 'w' ? 'White' : 'Black';
    gameAlert.classList.add('check');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚠</span><span>${player} King in Check!</span>`;
  } else {
    // No alert - hide
    gameAlert.classList.add('hidden');
  }
}
