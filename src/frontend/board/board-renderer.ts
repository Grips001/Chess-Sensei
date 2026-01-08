/**
 * Board Renderer Module
 * Handles rendering the chessboard and pieces
 */

import type { Piece, PieceSymbol } from '../../shared/chess-logic';

/**
 * Get piece image path for a given piece
 * Per Task 2.1.2: Render chess pieces using SVG assets
 */
export function getPieceImagePath(piece: Piece): string {
  const colorPrefix = piece.color === 'w' ? 'w' : 'b';
  const pieceSymbol = piece.type.toUpperCase();
  return `/assets/pieces/${colorPrefix}${pieceSymbol}.svg`;
}

/**
 * Parse FEN to create a 2D array of pieces
 */
export function parseFenToBoard(fen: string): (Piece | null)[][] {
  const fenParts = fen.split(' ');
  const boardFen = fenParts[0];
  const ranks = boardFen.split('/');
  const board: (Piece | null)[][] = [];

  for (const rankString of ranks) {
    const rank: (Piece | null)[] = [];
    for (const char of rankString) {
      if (/\d/.test(char)) {
        // Empty squares
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) {
          rank.push(null);
        }
      } else if (/[rnbqkpRNBQKP]/.test(char)) {
        // Piece
        const isWhite = char === char.toUpperCase();
        rank.push({
          color: isWhite ? 'w' : 'b',
          type: char.toLowerCase() as PieceSymbol,
        });
      }
    }
    board.push(rank);
  }

  return board;
}

export interface BoardRenderOptions {
  boardElement: HTMLElement;
  fen: string;
  boardFlipped: boolean;
  onSquareClick: (square: string) => void;
  onDragStart: (e: DragEvent, square: string) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, square: string) => void;
}

/**
 * Render the 8x8 chessboard grid with pieces
 * Per Task 2.1.1: Implement responsive chessboard layout
 * Per Task 2.1.2: Render chess pieces using SVG assets
 * Per Task 2.2.1: Drag-and-drop piece movement
 * Per Task 2.2.2: Click-to-move alternative
 */
export function renderChessboard(options: BoardRenderOptions): void {
  const { boardElement, fen, boardFlipped, onSquareClick, onDragStart, onDragOver, onDrop } =
    options;

  // Clear any existing squares
  boardElement.innerHTML = '';

  // Get current position from FEN
  const position = parseFenToBoard(fen);

  // Create 8x8 grid of squares (64 total)
  // Rows are numbered 8-1 (top to bottom)
  // Columns are a-h (left to right)
  // When flipped, iterate in reverse
  let squareCount = 0;
  const rankStart = boardFlipped ? 1 : 8;
  const rankEnd = boardFlipped ? 8 : 1;
  const rankStep = boardFlipped ? 1 : -1;
  const fileStart = boardFlipped ? 7 : 0;
  const fileEnd = boardFlipped ? -1 : 8;
  const fileStep = boardFlipped ? -1 : 1;

  for (let rank = rankStart; boardFlipped ? rank <= rankEnd : rank >= rankEnd; rank += rankStep) {
    for (let file = fileStart; boardFlipped ? file > fileEnd : file < fileEnd; file += fileStep) {
      const square = document.createElement('div');
      square.className = 'square';

      // Determine if square is light or dark
      // Light squares: even sum of rank + file
      const isLight = (rank + file) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      // Set data attributes for square identification
      const fileChar = String.fromCharCode(97 + file); // 'a' = 97
      const squareName = `${fileChar}${rank}`;
      square.dataset.square = squareName;

      // Add click handler for click-to-move
      square.addEventListener('click', () => onSquareClick(squareName));

      // Get piece at this position
      const rankIndex = 8 - rank; // Array index: rank 8 = index 0
      const piece = position[rankIndex][file];

      // Add piece if one exists on this square
      if (piece) {
        const pieceImg = document.createElement('img');
        pieceImg.src = getPieceImagePath(piece);
        pieceImg.className = 'piece';
        pieceImg.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
        pieceImg.draggable = true;

        // Drag-and-drop handlers
        pieceImg.addEventListener('dragstart', (e) => onDragStart(e, squareName));

        square.appendChild(pieceImg);
      }

      // Drop handlers for all squares
      square.addEventListener('dragover', onDragOver);
      square.addEventListener('drop', (e) => onDrop(e, squareName));

      boardElement.appendChild(square);
      squareCount++;
    }
  }

  console.log(`Chessboard rendered: ${squareCount} squares with pieces at starting position`);
}
