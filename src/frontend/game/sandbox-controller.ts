/**
 * Sandbox Controller Module
 * Handles sandbox mode board editing and analysis
 */

import { ChessGame, type Square } from '../../shared/chess-logic';
import type { SandboxAnalysisResult, EditorPiece } from '../sandbox-mode';

export interface SandboxControllerDeps {
  sandboxManager: {
    getPosition: () => Map<string, EditorPiece>;
    getAnalysisResult: () => SandboxAnalysisResult | null;
    getSelectedPalettePiece: () => EditorPiece | null;
    placePiece: (square: string, piece: EditorPiece) => void;
    removePiece: (square: string) => void;
    movePiece: (from: string, to: string) => void;
    getFen: () => string;
    getValidation: () => { isValid: boolean; errors: string[]; warnings: string[] };
  };
}

/**
 * Render the Sandbox Mode board editor
 * Phase 7: Board editor for custom positions
 *
 * Click behavior:
 * - Left-click with palette piece selected: Place piece
 * - Left-click with no palette piece: Show legal moves for piece (if any)
 * - Right-click: Remove piece
 * - Drag: Move piece on board or from palette
 */
export function renderSandboxBoard(deps: SandboxControllerDeps): void {
  const { sandboxManager } = deps;

  const boardElement = document.getElementById('sandbox-board');
  if (!boardElement) {
    console.error('sandbox-board element not found');
    return;
  }

  boardElement.innerHTML = '';

  const position = sandboxManager.getPosition();
  const analysisResult = sandboxManager.getAnalysisResult();

  // Create 8x8 grid of squares
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = document.createElement('div');
      square.className = 'square';

      // Determine if square is light or dark
      const isLight = (rank + file) % 2 === 0;
      square.classList.add(isLight ? 'light' : 'dark');

      // Set data attributes
      const fileChar = String.fromCharCode(97 + file);
      const squareName = `${fileChar}${rank}`;
      square.dataset.square = squareName;

      // Add analysis highlights if analysis is complete (always show top 3)
      if (analysisResult) {
        analysisResult.topMoves.forEach((move, idx) => {
          if (move.from === squareName) {
            square.classList.add(
              idx === 0 ? 'best-move-from' : idx === 1 ? 'second-move-from' : 'third-move-from'
            );
          }
          if (move.to === squareName) {
            square.classList.add(
              idx === 0 ? 'best-move-to' : idx === 1 ? 'second-move-to' : 'third-move-to'
            );
          }
        });
      }

      // Get piece at this square
      const piece = position.get(squareName);

      if (piece) {
        const pieceImg = document.createElement('img');
        pieceImg.src = `/assets/pieces/${piece.color}${piece.type}.svg`;
        pieceImg.className = 'piece';
        pieceImg.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;

        // Always allow dragging pieces
        pieceImg.draggable = true;
        pieceImg.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('fromSquare', squareName);
          e.dataTransfer?.setData('pieceType', piece.type);
          e.dataTransfer?.setData('pieceColor', piece.color);
          pieceImg.classList.add('dragging');
        });
        pieceImg.addEventListener('dragend', () => {
          pieceImg.classList.remove('dragging');
        });

        square.appendChild(pieceImg);
      }

      // Left-click handler
      square.addEventListener('click', () => {
        const selectedPiece = sandboxManager.getSelectedPalettePiece();
        if (selectedPiece) {
          // Palette piece selected - place it on this square
          sandboxManager.placePiece(squareName, selectedPiece);
        } else if (piece) {
          // No palette piece selected and there's a piece here - show legal moves
          showSandboxLegalMoves(deps, squareName);
        }
        // If no palette piece and no piece on square, do nothing
      });

      // Right-click to remove piece
      square.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        sandboxManager.removePiece(squareName);
      });

      // Drop handlers for drag and drop
      square.addEventListener('dragover', (e) => {
        e.preventDefault();
        square.classList.add('drop-target');
      });

      square.addEventListener('dragleave', () => {
        square.classList.remove('drop-target');
      });

      square.addEventListener('drop', (e) => {
        e.preventDefault();
        square.classList.remove('drop-target');

        const fromPalette = e.dataTransfer?.getData('fromPalette');
        const fromSquare = e.dataTransfer?.getData('fromSquare');
        const pieceType = e.dataTransfer?.getData('pieceType') as EditorPiece['type'];
        const pieceColor = e.dataTransfer?.getData('pieceColor') as EditorPiece['color'];

        if (fromPalette === 'true' && pieceType && pieceColor) {
          // Dropped from palette - place new piece
          sandboxManager.placePiece(squareName, { type: pieceType, color: pieceColor });
        } else if (fromSquare && fromSquare !== squareName) {
          // Dropped from another square - move piece
          sandboxManager.movePiece(fromSquare, squareName);
        }
      });

      boardElement.appendChild(square);
    }
  }
}

/**
 * Show legal moves for a piece in Sandbox Mode
 * Uses chess.js to calculate legal moves from the current FEN
 */
export function showSandboxLegalMoves(deps: SandboxControllerDeps, square: string): void {
  const { sandboxManager } = deps;

  // Clear any existing highlights first
  const boardElement = document.getElementById('sandbox-board');
  if (!boardElement) return;

  // Remove previous legal move highlights
  boardElement.querySelectorAll('.legal-move, .legal-capture, .sandbox-selected').forEach((el) => {
    el.classList.remove('legal-move', 'legal-capture', 'sandbox-selected');
  });

  // Mark the selected square
  const selectedSquare = boardElement.querySelector(`[data-square="${square}"]`);
  if (selectedSquare) {
    selectedSquare.classList.add('sandbox-selected');
  }

  // Get FEN and use chess-logic to find legal moves
  const fen = sandboxManager.getFen();
  try {
    // Create a temporary chess instance to check legal moves
    const tempGame = new ChessGame(fen);
    const moves = tempGame.getLegalMoves({ square: square as Square, verbose: true });

    // Highlight legal moves
    moves.forEach((move: { to: string; captured?: string }) => {
      const targetSquare = boardElement.querySelector(`[data-square="${move.to}"]`);
      if (targetSquare) {
        if (move.captured) {
          targetSquare.classList.add('legal-capture');
        } else {
          targetSquare.classList.add('legal-move');
        }
      }
    });
  } catch {
    // Invalid position or piece can't move - that's OK in sandbox mode
    console.debug('Could not calculate legal moves for sandbox position');
  }
}

/**
 * Update sandbox validation display
 */
export function updateSandboxValidation(deps: SandboxControllerDeps): void {
  const { sandboxManager } = deps;

  const validation = sandboxManager.getValidation();
  const statusDiv = document.getElementById('sandbox-validation');
  const errorsDiv = document.getElementById('sandbox-validation-errors');
  const analyzeBtn = document.getElementById('sandbox-analyze-button') as HTMLButtonElement;

  if (statusDiv) {
    statusDiv.classList.remove('valid', 'invalid', 'warning');

    if (!validation.isValid) {
      statusDiv.classList.add('invalid');
      statusDiv.innerHTML = `
        <span class="validation-icon">✗</span>
        <span class="validation-text">Position is invalid</span>
      `;
    } else if (validation.warnings.length > 0) {
      statusDiv.classList.add('warning');
      statusDiv.innerHTML = `
        <span class="validation-icon">⚠</span>
        <span class="validation-text">Position has warnings</span>
      `;
    } else {
      statusDiv.classList.add('valid');
      statusDiv.innerHTML = `
        <span class="validation-icon">✓</span>
        <span class="validation-text">Position is valid</span>
      `;
    }
  }

  if (errorsDiv) {
    const issues = [...validation.errors, ...validation.warnings];
    if (issues.length > 0) {
      errorsDiv.classList.remove('hidden');
      errorsDiv.innerHTML = `<ul>${issues.map((e) => `<li>${e}</li>`).join('')}</ul>`;
    } else {
      errorsDiv.classList.add('hidden');
    }
  }

  if (analyzeBtn) {
    analyzeBtn.disabled = !validation.isValid;
  }
}

/**
 * Render sandbox analysis results
 */
export function renderSandboxAnalysisResults(result: SandboxAnalysisResult): void {
  const resultsDiv = document.getElementById('sandbox-analysis-results');
  const scoreDiv = document.getElementById('sandbox-eval-score');
  const barDiv = document.getElementById('sandbox-eval-bar');
  const movesDiv = document.getElementById('sandbox-best-moves');

  if (!resultsDiv) return;

  resultsDiv.classList.remove('hidden');

  // Update score display
  if (scoreDiv) {
    scoreDiv.textContent = result.formattedScore;
  }

  // Update eval bar (50% = equal, more = white advantage)
  if (barDiv) {
    // Convert centipawn score to percentage (sigmoid-like scaling)
    const score = result.score;
    const maxAdvantage = 400; // centipawns for ~95% bar
    const normalized = Math.max(-maxAdvantage, Math.min(maxAdvantage, score));
    const percentage = 50 + (normalized / maxAdvantage) * 45;
    barDiv.style.width = `${percentage}%`;
  }

  // Render best moves list (always show all 3)
  if (movesDiv) {
    movesDiv.innerHTML = result.topMoves
      .map(
        (move, idx) => `
      <div class="best-move-item rank-${idx + 1}">
        <div class="move-rank">${idx + 1}</div>
        <div class="best-move-notation">${move.move}</div>
        <div class="move-score">${move.formattedScore}</div>
      </div>
    `
      )
      .join('');
  }
}
