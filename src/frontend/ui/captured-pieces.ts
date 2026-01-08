/**
 * Captured Pieces Module
 * Handles displaying captured pieces and material advantage
 */

import type { ChessGame } from '../../shared/chess-logic';
import type { CollapsibleSection } from '../components/collapsible-section';

/**
 * Update captured pieces display
 * Per Task 2.3.3: Show captured pieces
 */
export function updateCapturedPieces(
  game: ChessGame,
  capturedPiecesSection: CollapsibleSection | null
): void {
  const capturedByWhite = document.getElementById('captured-by-white');
  const capturedByBlack = document.getElementById('captured-by-black');
  const whiteAdvantage = document.getElementById('white-advantage');
  const blackAdvantage = document.getElementById('black-advantage');

  if (!capturedByWhite || !capturedByBlack || !whiteAdvantage || !blackAdvantage) return;

  // Clear existing captured pieces
  capturedByWhite.innerHTML = '';
  capturedByBlack.innerHTML = '';

  // Piece values for material calculation
  const pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
  };

  // Track captured pieces from move history
  const history = game.getHistory();
  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];

  for (const move of history) {
    if (move.captured) {
      const capturedPieceType = move.captured;
      if (move.color === 'w') {
        // White captured a black piece
        whiteCaptured.push(capturedPieceType);
      } else {
        // Black captured a white piece
        blackCaptured.push(capturedPieceType);
      }
    }
  }

  // Render captured pieces for White
  whiteCaptured.forEach((pieceType) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'captured-piece';
    pieceEl.style.backgroundImage = `url('/assets/pieces/b${pieceType.toUpperCase()}.svg')`;
    capturedByWhite.appendChild(pieceEl);
  });

  // Render captured pieces for Black
  blackCaptured.forEach((pieceType) => {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'captured-piece';
    pieceEl.style.backgroundImage = `url('/assets/pieces/w${pieceType.toUpperCase()}.svg')`;
    capturedByBlack.appendChild(pieceEl);
  });

  // Calculate material advantage
  const whiteMaterial = whiteCaptured.reduce((sum, p) => sum + pieceValues[p], 0);
  const blackMaterial = blackCaptured.reduce((sum, p) => sum + pieceValues[p], 0);
  const materialDiff = whiteMaterial - blackMaterial;

  // Update advantage indicators
  whiteAdvantage.textContent = '';
  blackAdvantage.textContent = '';
  whiteAdvantage.className = 'material-advantage';
  blackAdvantage.className = 'material-advantage';

  if (materialDiff > 0) {
    whiteAdvantage.textContent = `+${materialDiff}`;
    whiteAdvantage.classList.add('positive');
  } else if (materialDiff < 0) {
    blackAdvantage.textContent = `+${Math.abs(materialDiff)}`;
    blackAdvantage.classList.add('positive');
  }

  // Refresh CollapsibleSection height after content update
  if (capturedPiecesSection) {
    capturedPiecesSection.refreshHeight();
  }
}
