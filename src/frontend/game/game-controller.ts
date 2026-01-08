/**
 * Game Controller Module
 * Handles move execution, game state, and undo/redo
 */

import type { ChessGame } from '../../shared/chess-logic';
import type { SoundManager } from '../sound-manager';
import type { ControlToolbar } from '../components/control-toolbar';

export interface GameControllerDeps {
  game: ChessGame;
  soundManager: SoundManager;
  controlToolbar: ControlToolbar;
  getRedoStack: () => string[];
  setRedoStack: (stack: string[]) => void;
  renderChessboard: () => void;
  updateTurnIndicator: () => void;
  updateMoveHistory: () => void;
  updateCapturedPieces: () => void;
  updateGameAlert: () => void;
  clearSelection: () => void;
  showGameResult: () => void;
  getBoardFlipped: () => boolean;
  setBoardFlipped: (flipped: boolean) => void;
  setGameResultTimeout: (id: ReturnType<typeof setTimeout> | null) => void;
}

/**
 * Execute a move (with optional promotion piece)
 * Per Task 4.1.4: Full game recording for Exam Mode
 */
export function executeMove(
  deps: GameControllerDeps,
  from: string,
  to: string,
  promotion?: string,
  onMoveComplete?: () => Promise<void>,
  recordMove?: (san: string, uci: string, fen: string) => void
): void {
  const { game, soundManager, setRedoStack, clearSelection } = deps;

  try {
    const moveStr = promotion ? `${from}${to}${promotion}` : `${from}${to}`;
    const move = game.makeMove(moveStr);
    if (move) {
      console.log('Move made:', move.san);

      // Record move if callback provided
      if (recordMove) {
        recordMove(move.san, moveStr, game.getFen());
      }

      // Clear redo stack on new move (can't redo after making a new move)
      setRedoStack([]);

      // Play appropriate sound
      if (move.isCheckmate) {
        soundManager.play('checkmate');
      } else if (move.isCheck) {
        soundManager.play('check');
      } else if (move.isCastling) {
        soundManager.play('castle');
      } else if (move.promotion) {
        soundManager.play('promotion');
      } else if (move.captured) {
        soundManager.play('capture');
      } else {
        soundManager.play('move');
      }

      // Check for stalemate or draw
      if (game.isStalemate() || game.isDraw()) {
        soundManager.play('stalemate');
      }

      // Add animation to moving piece
      const toSquare = document.querySelector(`[data-square="${to}"]`);
      const fromSquare = document.querySelector(`[data-square="${from}"]`);

      if (toSquare && fromSquare) {
        const piece = fromSquare.querySelector('.piece') as HTMLElement;

        // If capture, animate the captured piece
        if (move.captured) {
          const capturedPiece = toSquare.querySelector('.piece') as HTMLElement;
          if (capturedPiece) {
            capturedPiece.classList.add('captured');
          }
        }

        // Animate the moving piece
        if (piece) {
          piece.classList.add('moving');
        }
      }

      // Render board after animation and handle post-move updates
      setTimeout(
        async () => {
          if (onMoveComplete) {
            await onMoveComplete();
          }
        },
        move.captured ? 250 : 300
      );
    }
  } catch (error) {
    console.error('Invalid move:', error);
    clearSelection();
  }
}

/**
 * Handle "Undo" button
 * Per Task 2.4.2: Undo last move
 */
export function handleUndo(deps: GameControllerDeps): void {
  const {
    game,
    getRedoStack,
    setRedoStack,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
  } = deps;

  const history = game.getHistory();
  if (history.length === 0) return;

  // Get the last move before undoing
  const lastMove = history[history.length - 1];

  // Store move in redo stack (in SAN format for easy replay)
  const redoStack = getRedoStack();
  redoStack.push(lastMove.san);
  setRedoStack(redoStack);

  // Undo the move
  game.undoMove();

  // Re-render everything
  renderChessboard();
  updateTurnIndicator();
  updateMoveHistory();
  updateCapturedPieces();
  updateGameAlert();
  updateUndoRedoButtons(deps);

  console.log('Move undone:', lastMove.san);
}

/**
 * Handle "Redo" button
 * Per Task 2.4.2: Redo undone move
 */
export function handleRedo(deps: GameControllerDeps): void {
  const {
    game,
    soundManager,
    getRedoStack,
    setRedoStack,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
    showGameResult,
    setGameResultTimeout,
  } = deps;

  const redoStack = getRedoStack();
  if (redoStack.length === 0) return;

  // Get the move from redo stack
  const moveToRedo = redoStack.pop()!;
  setRedoStack(redoStack);

  try {
    // Make the move again
    const move = game.makeMove(moveToRedo);

    if (move) {
      // Play appropriate sound
      if (move.isCheckmate) {
        soundManager.play('checkmate');
      } else if (move.isCheck) {
        soundManager.play('check');
      } else if (move.isCastling) {
        soundManager.play('castle');
      } else if (move.promotion) {
        soundManager.play('promotion');
      } else if (move.captured) {
        soundManager.play('capture');
      } else {
        soundManager.play('move');
      }

      // Check for stalemate or draw
      if (game.isStalemate() || game.isDraw()) {
        soundManager.play('stalemate');
      }

      // Re-render everything
      renderChessboard();
      updateTurnIndicator();
      updateMoveHistory();
      updateCapturedPieces();
      updateGameAlert();
      updateUndoRedoButtons(deps);

      // Show game result modal if game is over
      if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
        const timeoutId = setTimeout(() => {
          showGameResult();
        }, 1000);
        setGameResultTimeout(timeoutId);
      }

      console.log('Move redone:', moveToRedo);
    }
  } catch (error) {
    console.error('Failed to redo move:', error);
    // Put move back in redo stack if it failed
    redoStack.push(moveToRedo);
    setRedoStack(redoStack);
  }
}

/**
 * Handle "Flip Board" button
 * Per Task 2.4.4: Flip board 180 degrees
 */
export function handleFlipBoard(deps: GameControllerDeps): void {
  const { getBoardFlipped, setBoardFlipped, renderChessboard } = deps;
  setBoardFlipped(!getBoardFlipped());
  renderChessboard();
}

/**
 * Update undo/redo button states
 * Per Task 2.4.2: Enable/disable based on available history
 */
export function updateUndoRedoButtons(deps: GameControllerDeps): void {
  const { game, controlToolbar, getRedoStack } = deps;

  const history = game.getHistory();
  const canUndo = history.length > 0;
  const canRedo = getRedoStack().length > 0;

  // Update toolbar buttons (CS-003)
  controlToolbar.updateButtonStates(canUndo, canRedo);

  // Legacy: Also update any standalone buttons (for backward compatibility)
  const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
  const redoButton = document.getElementById('redo-button') as HTMLButtonElement;

  if (undoButton) {
    undoButton.disabled = !canUndo;
  }

  if (redoButton) {
    redoButton.disabled = !canRedo;
  }
}

/**
 * Handle "Resign" button
 * Per Task 2.4.3: Resign button with confirmation
 */
export function handleResign(
  deps: GameControllerDeps,
  showConfirmDialog: (title: string, message: string, onConfirm: () => void) => void
): void {
  const { game } = deps;

  const history = game.getHistory();

  // Only allow resignation if game is in progress
  if (history.length === 0) {
    return;
  }

  // Check if game is already over
  if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
    return;
  }

  showConfirmDialog('Resign Game?', 'You will lose this game. Are you sure?', () => {
    // Show game result as if opponent won
    const overlay = document.getElementById('game-result-overlay');
    const title = document.getElementById('result-title');
    const subtitle = document.getElementById('result-subtitle');
    const reason = document.getElementById('result-reason');

    if (!overlay || !title || !subtitle || !reason) return;

    const currentTurn = game.getTurn();
    const winner = currentTurn === 'w' ? 'Black' : 'White';
    const resigner = currentTurn === 'w' ? 'White' : 'Black';

    title.textContent = `${winner} Wins!`;
    subtitle.textContent = 'Resignation';
    reason.textContent = `${resigner} resigned`;
    overlay.classList.remove('hidden');
  });
}
