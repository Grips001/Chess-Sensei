/**
 * Dialogs Module
 * Handles confirmation and promotion dialogs
 */

import type { ChessGame, Square } from '../../shared/chess-logic';

/**
 * Show confirmation dialog
 * Per Task 2.4.1: Confirm if game in progress
 */
export function showConfirmDialog(title: string, message: string, onConfirm: () => void): void {
  const overlay = document.getElementById('confirm-dialog-overlay');
  const titleEl = document.getElementById('confirm-title');
  const messageEl = document.getElementById('confirm-message');
  const yesBtn = document.getElementById('confirm-yes');
  const cancelBtn = document.getElementById('confirm-cancel');

  if (!overlay || !titleEl || !messageEl || !yesBtn || !cancelBtn) return;

  titleEl.textContent = title;
  messageEl.textContent = message;

  // Show overlay
  overlay.classList.remove('hidden');

  // Handle confirmation
  const handleYes = () => {
    overlay.classList.add('hidden');
    onConfirm();
    yesBtn.removeEventListener('click', handleYes);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  const handleCancel = () => {
    overlay.classList.add('hidden');
    yesBtn.removeEventListener('click', handleYes);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  yesBtn.addEventListener('click', handleYes);
  cancelBtn.addEventListener('click', handleCancel);
}

/**
 * Check if a move is a pawn promotion
 * A pawn promotes when it reaches the last rank (rank 8 for white, rank 1 for black)
 */
export function isPromotionMove(game: ChessGame, from: string, to: string): boolean {
  const piece = game.getPiece(from as Square);
  if (!piece || piece.type !== 'p') return false;

  const toRank = to[1];
  // White pawn promotes on rank 8, black pawn promotes on rank 1
  return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
}

// Pending promotion move state
let pendingPromotion: { from: string; to: string } | null = null;

/**
 * Show promotion dialog for piece selection
 */
export function showPromotionDialog(
  game: ChessGame,
  from: string,
  to: string,
  onPromotionChoice: (from: string, to: string, piece: string) => void
): void {
  const overlay = document.getElementById('promotion-dialog-overlay');
  const piecesContainer = document.getElementById('promotion-pieces');

  if (!overlay || !piecesContainer) return;

  // Store pending promotion
  pendingPromotion = { from, to };

  // Determine piece color
  const piece = game.getPiece(from as Square);
  const colorPrefix = piece?.color === 'w' ? 'w' : 'b';

  // Promotion options: Queen, Rook, Bishop, Knight
  const promotionPieces = [
    { symbol: 'q', name: 'Queen' },
    { symbol: 'r', name: 'Rook' },
    { symbol: 'b', name: 'Bishop' },
    { symbol: 'n', name: 'Knight' },
  ];

  // Clear and populate pieces
  piecesContainer.innerHTML = '';
  for (const promo of promotionPieces) {
    const pieceBtn = document.createElement('button');
    pieceBtn.className = 'promotion-piece';
    pieceBtn.title = promo.name;
    pieceBtn.dataset.piece = promo.symbol;

    // Create piece image
    const img = document.createElement('img');
    img.src = `/assets/pieces/${colorPrefix}${promo.symbol.toUpperCase()}.svg`;
    img.alt = promo.name;
    img.style.width = '44px';
    img.style.height = '44px';
    pieceBtn.appendChild(img);

    pieceBtn.addEventListener('click', () => {
      handlePromotionChoice(promo.symbol, onPromotionChoice);
    });
    piecesContainer.appendChild(pieceBtn);
  }

  // Show dialog
  overlay.classList.remove('hidden');
}

/**
 * Handle promotion piece selection
 */
function handlePromotionChoice(
  piece: string,
  onPromotionChoice: (from: string, to: string, piece: string) => void
): void {
  const overlay = document.getElementById('promotion-dialog-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }

  if (!pendingPromotion) return;

  const { from, to } = pendingPromotion;
  pendingPromotion = null;

  // Execute the promotion move with the selected piece
  onPromotionChoice(from, to, piece);
}
