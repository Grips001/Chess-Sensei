/**
 * Bot Integration Module
 * Handles bot move requests for Training and Exam modes
 */

import type { ChessGame } from '../../shared/chess-logic';
import type { SoundManager } from '../sound-manager';

export interface BotIntegrationDeps {
  game: ChessGame;
  soundManager: SoundManager;
  renderChessboard: () => void;
  updateTurnIndicator: () => void;
  updateMoveHistory: () => void;
  updateCapturedPieces: () => void;
  updateGameAlert: () => void;
  showGameResult: () => void;
  setGameResultTimeout: (id: ReturnType<typeof setTimeout> | null) => void;
}

/**
 * Show/hide bot thinking indicator
 */
export function showBotThinking(show: boolean): void {
  const indicator = document.getElementById('bot-thinking-indicator');
  if (indicator) {
    indicator.classList.toggle('hidden', !show);
  }
}

/**
 * Request and execute a bot move in Training Mode
 * Per Task 3.2.5: Training Mode state management
 */
export async function requestBotMove(
  deps: BotIntegrationDeps,
  trainingManager: {
    isActive: () => boolean;
    isPlayerTurn: () => boolean;
    requestBotMove: (fen: string) => Promise<string | null>;
    updatePosition: (fen: string) => boolean;
  }
): Promise<void> {
  const {
    game,
    soundManager,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
    showGameResult,
    setGameResultTimeout,
  } = deps;

  if (!trainingManager.isActive() || trainingManager.isPlayerTurn()) {
    return;
  }

  // Show thinking indicator
  showBotThinking(true);

  try {
    const botMove = await trainingManager.requestBotMove(game.getFen());
    if (botMove) {
      // Execute the bot's move
      const move = game.makeMove(botMove);
      if (move) {
        console.log('Bot move:', move.san);

        // Play appropriate sound
        if (move.isCheckmate) {
          soundManager.play('checkmate');
        } else if (move.isCheck) {
          soundManager.play('check');
        } else if (move.isCastling) {
          soundManager.play('castle');
        } else if (move.captured) {
          soundManager.play('capture');
        } else {
          soundManager.play('move');
        }

        // Update UI
        renderChessboard();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
        updateGameAlert();

        // Show game result if game is over
        if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
          const timeoutId = setTimeout(() => {
            showGameResult();
          }, 1000);
          setGameResultTimeout(timeoutId);
        }

        // Update training mode state
        trainingManager.updatePosition(game.getFen());
      }
    }
  } catch (error) {
    console.error('Error getting bot move:', error);
  } finally {
    showBotThinking(false);
  }
}

/**
 * Request and execute a bot move in Exam Mode
 * Per Task 4.1: Exam Mode bot integration
 */
export async function requestExamBotMove(
  deps: BotIntegrationDeps,
  examManager: {
    isActive: () => boolean;
    isPlayerTurn: () => boolean;
    isPlayerWhite: () => boolean;
    requestBotMove: (fen: string) => Promise<string | null>;
    updatePosition: (fen: string) => boolean;
    recordMove: (san: string, uci: string, fen: string, color: 'white' | 'black') => void;
  }
): Promise<void> {
  const {
    game,
    soundManager,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
    showGameResult,
    setGameResultTimeout,
  } = deps;

  if (!examManager.isActive() || examManager.isPlayerTurn()) {
    return;
  }

  // Show thinking indicator
  showBotThinking(true);

  try {
    const botMove = await examManager.requestBotMove(game.getFen());
    if (botMove) {
      // Execute the bot's move
      const move = game.makeMove(botMove);
      if (move) {
        console.log('Exam Bot move:', move.san);

        // Record move for Exam Mode tracking
        const botColor = examManager.isPlayerWhite() ? 'black' : 'white';
        examManager.recordMove(move.san, botMove, game.getFen(), botColor);

        // Play appropriate sound
        if (move.isCheckmate) {
          soundManager.play('checkmate');
        } else if (move.isCheck) {
          soundManager.play('check');
        } else if (move.isCastling) {
          soundManager.play('castle');
        } else if (move.captured) {
          soundManager.play('capture');
        } else {
          soundManager.play('move');
        }

        // Update UI
        renderChessboard();
        updateTurnIndicator();
        updateMoveHistory();
        updateCapturedPieces();
        updateGameAlert();

        // Show game result if game is over
        if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
          const timeoutId = setTimeout(() => {
            showGameResult();
          }, 1000);
          setGameResultTimeout(timeoutId);
        }

        // Update exam mode state
        examManager.updatePosition(game.getFen());
      }
    }
  } catch (error) {
    console.error('Error getting exam bot move:', error);
  } finally {
    showBotThinking(false);
  }
}
