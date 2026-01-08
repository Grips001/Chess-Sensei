/**
 * Analysis Board Renderer
 * Handles rendering the analysis board and move highlighting
 */

import { ChessGame } from '../../../shared/chess-logic';
import type { AnalyzedMove, StoredAnalysisData } from '../../../shared/analysis-types';

/**
 * Board rendering state
 */
export interface BoardState {
  currentMoveIndex: number;
  boardFlipped: boolean;
  analysisData: StoredAnalysisData | null;
}

/**
 * Parse FEN to board array
 */
export function parseFenToBoard(fen: string): ({ color: string; type: string } | null)[][] {
  const fenParts = fen.split(' ');
  const boardFen = fenParts[0];
  const ranks = boardFen.split('/');
  const board: ({ color: string; type: string } | null)[][] = [];

  for (const rankString of ranks) {
    const rank: ({ color: string; type: string } | null)[] = [];
    for (const char of rankString) {
      if (/\d/.test(char)) {
        const emptyCount = parseInt(char, 10);
        for (let i = 0; i < emptyCount; i++) {
          rank.push(null);
        }
      } else if (/[rnbqkpRNBQKP]/.test(char)) {
        const isWhite = char === char.toUpperCase();
        rank.push({
          color: isWhite ? 'w' : 'b',
          type: char.toLowerCase(),
        });
      }
    }
    board.push(rank);
  }

  return board;
}

/**
 * Render board HTML from FEN
 */
export function renderBoardHTML(fen: string, boardFlipped: boolean): string {
  const position = parseFenToBoard(fen);
  let html = '';

  const rankStart = boardFlipped ? 1 : 8;
  const rankEnd = boardFlipped ? 9 : 0;
  const rankStep = boardFlipped ? 1 : -1;
  const fileStart = boardFlipped ? 7 : 0;
  const fileEnd = boardFlipped ? -1 : 8;
  const fileStep = boardFlipped ? -1 : 1;

  for (let rank = rankStart; boardFlipped ? rank < rankEnd : rank > rankEnd; rank += rankStep) {
    for (let file = fileStart; boardFlipped ? file > fileEnd : file < fileEnd; file += fileStep) {
      const isLight = (rank + file) % 2 === 0;
      const fileChar = String.fromCharCode(97 + file);
      const squareName = `${fileChar}${rank}`;
      const rankIndex = 8 - rank;
      const piece = position[rankIndex]?.[file];

      html += `
        <div class="analysis-square ${isLight ? 'light' : 'dark'}" data-square="${squareName}">
          ${piece ? `<img class="analysis-piece" src="/assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg" alt="${piece.color}${piece.type}" />` : ''}
        </div>
      `;
    }
  }

  return html;
}

/**
 * Highlight move on board with classification color
 */
export function highlightMove(move: AnalyzedMove): void {
  // Clear previous highlights
  document.querySelectorAll('.analysis-square').forEach((sq) => {
    sq.classList.remove(
      'highlight-from',
      'highlight-to',
      'highlight-excellent',
      'highlight-good',
      'highlight-inaccuracy',
      'highlight-mistake',
      'highlight-blunder'
    );
  });

  // Get from and to squares from UCI
  const from = move.uci.substring(0, 2);
  const to = move.uci.substring(2, 4);

  const fromSquare = document.querySelector(`.analysis-square[data-square="${from}"]`);
  const toSquare = document.querySelector(`.analysis-square[data-square="${to}"]`);

  if (fromSquare) {
    fromSquare.classList.add('highlight-from', `highlight-${move.classification}`);
  }
  if (toSquare) {
    toSquare.classList.add('highlight-to', `highlight-${move.classification}`);
  }
}

/**
 * Render the analysis board for a given state
 */
export function renderAnalysisBoard(
  game: ChessGame,
  state: BoardState,
  boardElement: HTMLElement
): void {
  // Reset game to get to current position
  game.reset();
  if (state.analysisData) {
    for (
      let i = 0;
      i <= state.currentMoveIndex && i < state.analysisData.moveAnalysis.length;
      i++
    ) {
      const move = state.analysisData.moveAnalysis[i];
      try {
        game.makeMove(move.uci);
      } catch (e) {
        console.error('Error making move:', move.uci, e);
      }
    }
  }

  // Render the board
  const fen = game.getFen();
  boardElement.innerHTML = renderBoardHTML(fen, state.boardFlipped);

  // Highlight the last move if any
  if (state.currentMoveIndex >= 0 && state.analysisData) {
    const move = state.analysisData.moveAnalysis[state.currentMoveIndex];
    if (move) {
      highlightMove(move);
    }
  }
}
