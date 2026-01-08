/**
 * Mode Controller Module
 * Handles starting Training and Exam mode games
 */

import type { ChessGame } from '../../shared/chess-logic';
import type { TrainingConfig } from '../training-mode';
import type { ExamConfig } from '../exam-mode';

export interface ModeControllerDeps {
  game: ChessGame;
  trainingManager: {
    isActive: () => boolean;
    stop: () => void;
  };
  examManager: {
    isActive: () => boolean;
    stop: () => void;
    getGameId: () => string | null;
  };
  getBoardFlipped: () => boolean;
  setBoardFlipped: (flipped: boolean) => void;
  setRedoStack: (stack: string[]) => void;
  renderChessboard: () => void;
  updateTurnIndicator: () => void;
  updateMoveHistory: () => void;
  updateCapturedPieces: () => void;
  updateGameAlert: () => void;
  updateUndoRedoButtons: () => void;
  showGuidancePanel: (show: boolean) => void;
  requestBotMove: () => Promise<void>;
  requestExamBotMove: () => Promise<void>;
  updateGuidance: () => Promise<void>;
  guidanceManager: {
    deactivate: () => void;
  };
}

export type GameMode = 'none' | 'training' | 'exam' | 'sandbox';

/**
 * Start a Training Mode game
 * Per Task 3.2.4: Create game initialization flow
 */
export async function startTrainingGame(
  deps: ModeControllerDeps,
  config: TrainingConfig,
  playerColor: 'white' | 'black',
  setCurrentGameMode: (mode: GameMode) => void
): Promise<void> {
  const {
    game,
    examManager,
    getBoardFlipped,
    setBoardFlipped,
    setRedoStack,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
    updateUndoRedoButtons,
    showGuidancePanel,
    requestBotMove,
    updateGuidance,
  } = deps;

  // Set current game mode
  setCurrentGameMode('training');

  // Make sure Exam Mode is stopped
  if (examManager.isActive()) {
    examManager.stop();
  }

  // Reset the game
  game.reset();
  setRedoStack([]);

  // Flip board if playing as black
  if (playerColor === 'black' && !getBoardFlipped()) {
    setBoardFlipped(true);
  } else if (playerColor === 'white' && getBoardFlipped()) {
    setBoardFlipped(false);
  }

  // Render the fresh board
  renderChessboard();
  updateTurnIndicator();
  updateMoveHistory();
  updateCapturedPieces();
  updateGameAlert();
  updateUndoRedoButtons();

  console.log(`Training Mode started: Playing as ${playerColor}`);

  // If playing as black, bot makes the first move
  if (playerColor === 'black') {
    // Hide guidance until it's player's turn
    showGuidancePanel(false);
    // Small delay before bot's first move
    setTimeout(async () => {
      await requestBotMove();
      // After bot's first move, update guidance for player
      await updateGuidance();
    }, 500);
  } else if (config.guidanceEnabled) {
    // Playing as white, show guidance immediately
    await updateGuidance();
  }
}

/**
 * Start an Exam Mode game
 * Per Task 4.1.2: Exam Mode setup flow
 * Per Task 4.1.3: Exam Mode state management
 * Per game-modes.md: Guidance is completely disabled
 */
export async function startExamGame(
  deps: ModeControllerDeps,
  _config: ExamConfig,
  playerColor: 'white' | 'black',
  setCurrentGameMode: (mode: GameMode) => void
): Promise<void> {
  const {
    game,
    trainingManager,
    examManager,
    getBoardFlipped,
    setBoardFlipped,
    setRedoStack,
    renderChessboard,
    updateTurnIndicator,
    updateMoveHistory,
    updateCapturedPieces,
    updateGameAlert,
    updateUndoRedoButtons,
    showGuidancePanel,
    requestExamBotMove,
    guidanceManager,
  } = deps;

  // Set current game mode
  setCurrentGameMode('exam');

  // Make sure Training Mode is stopped
  if (trainingManager.isActive()) {
    trainingManager.stop();
  }

  // Reset the game
  game.reset();
  setRedoStack([]);

  // Flip board if playing as black
  if (playerColor === 'black' && !getBoardFlipped()) {
    setBoardFlipped(true);
  } else if (playerColor === 'white' && getBoardFlipped()) {
    setBoardFlipped(false);
  }

  // Render the fresh board
  renderChessboard();
  updateTurnIndicator();
  updateMoveHistory();
  updateCapturedPieces();
  updateGameAlert();
  updateUndoRedoButtons();

  // IMPORTANT: Hide guidance panel - Exam Mode has NO guidance
  showGuidancePanel(false);
  guidanceManager.deactivate();

  console.log(`Exam Mode started: Playing as ${playerColor}, gameId: ${examManager.getGameId()}`);

  // If playing as black, bot makes the first move
  if (playerColor === 'black') {
    // Small delay before bot's first move
    setTimeout(async () => {
      await requestExamBotMove();
    }, 500);
  }
}
