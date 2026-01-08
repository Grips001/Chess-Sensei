/**
 * Board Highlights Module
 * Handles legal move highlighting and selection state
 */

import type { ChessGame, Square } from '../../shared/chess-logic';

/**
 * Clear all legal move highlights
 */
export function clearHighlights(): void {
  document.querySelectorAll('.square.legal-move, .square.legal-capture').forEach((sq) => {
    sq.classList.remove('legal-move', 'legal-capture');
  });
}

/**
 * Clear square selection and highlights
 */
export function clearSelection(
  getSelectedSquare: () => string | null,
  setSelectedSquare: (square: string | null) => void
): void {
  const selectedSquare = getSelectedSquare();
  if (selectedSquare) {
    const square = document.querySelector(`[data-square="${selectedSquare}"]`);
    square?.classList.remove('selected');
    setSelectedSquare(null);
  }
  clearHighlights();
}

/**
 * Highlight legal moves for a piece
 * Per Task 2.2.3: Legal move highlighting
 */
export function highlightLegalMoves(fromSquare: string, game: ChessGame): void {
  clearHighlights();

  const legalMoves = game.getLegalMoves({ square: fromSquare as Square });

  legalMoves.forEach((move) => {
    const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
    if (targetSquare) {
      if (move.captured) {
        targetSquare.classList.add('legal-capture');
      } else {
        targetSquare.classList.add('legal-move');
      }
    }
  });
}

/**
 * Apply multi-color highlight to a square
 * Uses nested rings: outer (::before), middle (::after), inner (injected element)
 */
export function applyMultiColorHighlight(
  square: Element,
  colors: string[],
  isSource: boolean
): void {
  // Always add base highlight class
  square.classList.add('guidance-highlight');

  if (isSource) {
    square.classList.add('guidance-source');
  }

  // Deduplicate colors while preserving order (first occurrence wins)
  const uniqueColors = [...new Set(colors)];

  // Primary color (outermost ring via ::before)
  if (uniqueColors.length >= 1) {
    square.classList.add(`guidance-${uniqueColors[0]}`);
  }

  // Secondary color (middle ring via ::after)
  if (uniqueColors.length >= 2) {
    square.classList.add(`guidance-secondary-${uniqueColors[1]}`);
  }

  // Tertiary color (innermost ring via injected element)
  if (uniqueColors.length >= 3) {
    const tertiary = document.createElement('div');
    tertiary.className = `guidance-tertiary tertiary-${uniqueColors[2]}`;
    square.appendChild(tertiary);
  }
}
