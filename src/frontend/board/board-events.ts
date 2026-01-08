/**
 * Board Events Module
 * Handles drag-and-drop and click interactions on the board
 */

import type { ChessGame } from '../../shared/chess-logic';

export interface DragState {
  element: HTMLElement;
  square: string;
}

/**
 * Handle drag start
 * Per Task 2.2.1: Drag-and-drop piece movement
 */
export function handleDragStart(
  e: DragEvent,
  squareName: string,
  setDraggedPiece: (state: DragState | null) => void,
  highlightLegalMoves: (square: string) => void
): void {
  const target = e.target as HTMLElement;
  setDraggedPiece({ element: target, square: squareName });

  // Set drag image
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', squareName);
  }

  // Add visual feedback
  setTimeout(() => {
    target.style.opacity = '0.5';
  }, 0);

  // Highlight legal moves
  highlightLegalMoves(squareName);
}

/**
 * Handle drag over
 */
export function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Handle drop
 * Per Task 2.2.1: Drag-and-drop piece movement
 */
export function handleDrop(
  e: DragEvent,
  targetSquare: string,
  getDraggedPiece: () => DragState | null,
  setDraggedPiece: (state: DragState | null) => void,
  attemptMove: (from: string, to: string) => void,
  clearHighlights: () => void
): void {
  e.preventDefault();

  const draggedPiece = getDraggedPiece();
  if (!draggedPiece) return;

  const fromSquare = draggedPiece.square;

  // Reset opacity
  draggedPiece.element.style.opacity = '1';

  // Try to make the move
  attemptMove(fromSquare, targetSquare);

  setDraggedPiece(null);
  clearHighlights();
}

/**
 * Handle square click for click-to-move
 * Per Task 2.2.2: Click-to-move alternative
 */
export function handleSquareClick(
  squareName: string,
  game: ChessGame,
  getSelectedSquare: () => string | null,
  setSelectedSquare: (square: string | null) => void,
  highlightLegalMoves: (square: string) => void,
  clearSelection: () => void,
  attemptMove: (from: string, to: string) => void
): void {
  const clickedSquare = document.querySelector(`[data-square="${squareName}"]`) as HTMLElement;
  if (!clickedSquare) return;

  const hasPiece = clickedSquare.querySelector('.piece');
  const currentTurn = game.getTurn();
  const selectedSquare = getSelectedSquare();

  // If no square is selected
  if (!selectedSquare) {
    // Only allow selecting pieces of the current player
    if (hasPiece) {
      const piece = clickedSquare.querySelector('.piece') as HTMLElement;
      const alt = piece.getAttribute('alt') || '';
      const isWhitePiece = alt.includes('White');

      if ((currentTurn === 'w' && isWhitePiece) || (currentTurn === 'b' && !isWhitePiece)) {
        setSelectedSquare(squareName);
        clickedSquare.classList.add('selected');
        highlightLegalMoves(squareName);
      }
    }
  } else {
    // Square already selected - try to move or reselect
    if (selectedSquare === squareName) {
      // Clicking same square - deselect
      clearSelection();
    } else if (hasPiece) {
      // Clicking another piece of same color - reselect
      const piece = clickedSquare.querySelector('.piece') as HTMLElement;
      const alt = piece.getAttribute('alt') || '';
      const isWhitePiece = alt.includes('White');

      if ((currentTurn === 'w' && isWhitePiece) || (currentTurn === 'b' && !isWhitePiece)) {
        // Same color piece - reselect
        clearSelection();
        setSelectedSquare(squareName);
        clickedSquare.classList.add('selected');
        highlightLegalMoves(squareName);
      } else {
        // Opponent's piece - try to capture
        attemptMove(selectedSquare, squareName);
      }
    } else {
      // Empty square - try to move
      attemptMove(selectedSquare, squareName);
    }
  }
}
