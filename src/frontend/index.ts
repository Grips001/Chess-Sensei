/**
 * Chess-Sensei Frontend Entry Point
 *
 * This file initializes the Neutralino.js window and sets up the chess UI.
 * Includes IPC communication with the Bun backend for engine operations.
 *
 * @see source-docs/architecture.md - "Frontend Layer"
 */

import neutralino from '@neutralinojs/lib';
neutralino.init();
import * as buntralino from 'buntralino-client';
import {
  IPC_METHODS,
  isErrorResponse,
  STARTPOS_FEN,
  type BestMove,
  type BestMovesResponse,
  type EvaluationResponse,
  type EngineStatusResponse,
  type ErrorResponse,
} from '../shared/ipc-types';
import type { ExamGameRecord } from './exam-mode';
import { ChessGame, type Piece, type PieceSymbol, type Square } from '../shared/chess-logic';
import { SoundManager } from './sound-manager';
import { createTrainingMode, type TrainingConfig } from './training-mode';
import { createExamMode, type ExamConfig } from './exam-mode';
import { createMoveGuidance, type GuidanceMove } from './move-guidance';
import { createAnalysisUI } from './analysis-ui';
import { createProgressDashboard } from './progress-dashboard';
import { frontendLogger } from './frontend-logger';

console.log('Chess-Sensei Frontend initialized');
frontendLogger.info('App', 'Chess-Sensei Frontend initializing');

// Initialize chess game state
const game = new ChessGame();

// Initialize sound manager
const soundManager = new SoundManager();

// Initialize training mode
const { manager: trainingManager, ui: trainingUI } = createTrainingMode();

// Initialize exam mode (Phase 4)
const { manager: examManager, ui: examUI } = createExamMode();

// Initialize move guidance
const guidanceManager = createMoveGuidance();

// Initialize analysis UI (Phase 5)
const analysisUI = createAnalysisUI();

// Initialize progress dashboard (Phase 6)
const progressDashboard = createProgressDashboard();

// Current active game mode
type GameMode = 'none' | 'training' | 'exam';
let currentGameMode: GameMode = 'none';

// Track drag and selection state
let draggedPiece: { element: HTMLElement; square: string } | null = null;
let selectedSquare: string | null = null;
let boardFlipped: boolean = false;

// Track redo stack (for redo functionality)
let redoStack: string[] = [];

// Track pending game result timeout (to cancel on game reset)
let gameResultTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Update the turn indicator display
 * Per Task 2.3.1: Show current turn indicator
 */
function updateTurnIndicator(): void {
  const turnText = document.getElementById('turn-text');
  const turnPieceIcon = document.getElementById('turn-piece-icon');
  const turnDisplay = document.querySelector('.turn-display') as HTMLElement | null;

  if (!turnText || !turnPieceIcon || !turnDisplay) return;

  const currentTurn = game.getTurn();
  const isWhite = currentTurn === 'w';

  // Update text
  turnText.textContent = isWhite ? 'White to move' : 'Black to move';

  // Update piece icon (show king of current player)
  const kingPiece = isWhite ? 'wK' : 'bK';
  turnPieceIcon.style.backgroundImage = `url('/assets/pieces/${kingPiece}.svg')`;

  // Add animation
  turnDisplay.classList.remove('animate');
  // Force reflow to restart animation
  void turnDisplay.offsetWidth;
  turnDisplay.classList.add('animate');

  // Remove animation class after animation completes
  setTimeout(() => {
    turnDisplay.classList.remove('animate');
  }, 500);
}

/**
 * Update the move history display
 * Per Task 2.3.2: Display move history (notation list)
 */
function updateMoveHistory(): void {
  const moveListElement = document.getElementById('move-list');
  if (!moveListElement) return;

  // Clear existing moves
  moveListElement.innerHTML = '';

  // Get move history from game
  const history = game.getHistory();

  // Group moves into pairs (White + Black)
  for (let i = 0; i < history.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = history[i];
    const blackMove = history[i + 1];

    // Create move pair container
    const movePair = document.createElement('div');
    movePair.className = 'move-pair';

    // Move number
    const moveNum = document.createElement('div');
    moveNum.className = 'move-number';
    moveNum.textContent = `${moveNumber}.`;
    movePair.appendChild(moveNum);

    // Move notation container
    const moveNotation = document.createElement('div');
    moveNotation.className = 'move-notation';

    // White's move
    const whiteMoveEl = document.createElement('div');
    whiteMoveEl.className = 'move-white';
    whiteMoveEl.textContent = whiteMove.san;
    if (i === history.length - 1) {
      whiteMoveEl.classList.add('latest');
    }
    moveNotation.appendChild(whiteMoveEl);

    // Black's move (if exists)
    if (blackMove) {
      const blackMoveEl = document.createElement('div');
      blackMoveEl.className = 'move-black';
      blackMoveEl.textContent = blackMove.san;
      if (i + 1 === history.length - 1) {
        blackMoveEl.classList.add('latest');
      }
      moveNotation.appendChild(blackMoveEl);
    }

    movePair.appendChild(moveNotation);
    moveListElement.appendChild(movePair);
  }

  // Auto-scroll to bottom to show latest move
  const moveHistory = document.getElementById('move-history');
  if (moveHistory) {
    moveHistory.scrollTop = moveHistory.scrollHeight;
  }
}

/**
 * Update game alert display (check, checkmate, stalemate)
 * Per Task 2.3.4: Check/checkmate indicators
 */
function updateGameAlert(): void {
  const gameAlert = document.getElementById('game-alert');
  if (!gameAlert) return;

  // Check game state
  const isCheck = game.isInCheck();
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();

  // Reset classes
  gameAlert.className = 'game-alert';
  gameAlert.innerHTML = '';

  if (isCheckmate) {
    // Checkmate
    const winner = game.getTurn() === 'w' ? 'Black' : 'White';
    gameAlert.classList.add('checkmate');
    gameAlert.innerHTML = `<span class="game-alert-icon">♔</span><span>Checkmate! ${winner} wins!</span>`;
  } else if (isStalemate) {
    // Stalemate
    gameAlert.classList.add('draw');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚖</span><span>Stalemate - Draw!</span>`;
  } else if (isDraw) {
    // Other draw conditions
    gameAlert.classList.add('draw');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚖</span><span>Draw!</span>`;
  } else if (isCheck) {
    // Check
    const player = game.getTurn() === 'w' ? 'White' : 'Black';
    gameAlert.classList.add('check');
    gameAlert.innerHTML = `<span class="game-alert-icon">⚠</span><span>${player} King in Check!</span>`;
  } else {
    // No alert - hide
    gameAlert.classList.add('hidden');
  }
}

/**
 * Convert frontend ExamGameRecord to backend ExamGameData format
 * The backend expects a different structure for analysis
 */
function convertToBackendFormat(record: ExamGameRecord): {
  gameId: string;
  timestamp: number;
  playerColor: 'white' | 'black';
  botPersonality: string;
  botElo: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  termination: string;
  duration: number;
  moves: Array<{
    moveNumber: number;
    color: 'white' | 'black';
    san: string;
    uci: string;
    fen: string;
    timestamp: number;
    timeSpent: number;
  }>;
  pgn: string;
  startingFen?: string;
} {
  return {
    gameId: record.gameId,
    timestamp: new Date(record.timestamp).getTime(),
    playerColor: record.metadata.playerColor,
    botPersonality: record.metadata.botPersonality,
    botElo: record.metadata.botElo,
    result: record.metadata.result as '1-0' | '0-1' | '1/2-1/2',
    termination: record.metadata.termination,
    duration: record.metadata.duration,
    moves: record.moves.map((m) => ({
      moveNumber: m.moveNumber,
      color: m.color,
      san: m.san,
      uci: m.uci,
      fen: m.fen,
      timestamp: m.timestamp,
      timeSpent: m.timeSpent,
    })),
    pgn: record.pgn,
  };
}

/**
 * Save and analyze an Exam Mode game
 * Per Task 5.1: Analysis launch flow
 */
async function saveAndAnalyzeGame(gameRecord: ExamGameRecord): Promise<boolean> {
  frontendLogger.separator('SaveAnalyze', 'Starting Game Save and Analysis');
  frontendLogger.info('SaveAnalyze', 'Starting save and analysis', {
    gameId: gameRecord.gameId,
    playerColor: gameRecord.metadata.playerColor,
    result: gameRecord.metadata.result,
    totalMoves: gameRecord.moves.length,
  });

  try {
    console.log('Starting game save and analysis for:', gameRecord.gameId);

    // Convert to backend format
    const gameData = convertToBackendFormat(gameRecord);
    frontendLogger.debug('SaveAnalyze', 'Converted to backend format', {
      gameId: gameData.gameId,
      moveCount: gameData.moves.length,
    });

    // Step 1: Analyze the game
    console.log('Analyzing game...');
    frontendLogger.info('SaveAnalyze', 'Step 1: Calling ANALYZE_GAME IPC');
    const analysisResponse = await buntralino.run(IPC_METHODS.ANALYZE_GAME, {
      gameData,
      deepAnalysis: false, // Quick analysis for now
    });

    if (isErrorResponse(analysisResponse)) {
      frontendLogger.error('SaveAnalyze', 'Analysis failed', undefined, {
        error: analysisResponse.error,
        code: analysisResponse.code,
      });
      console.error('Analysis failed:', analysisResponse.error);
      return false;
    }

    const analysis = (analysisResponse as { analysis: unknown; success: true }).analysis;
    frontendLogger.info('SaveAnalyze', 'Analysis complete', {
      gameId: gameRecord.gameId,
    });
    console.log('Analysis complete');

    // Step 2: Save the game data
    console.log('Saving game data...');
    frontendLogger.info('SaveAnalyze', 'Step 2: Calling SAVE_GAME IPC');
    const saveGameResponse = await buntralino.run(IPC_METHODS.SAVE_GAME, {
      gameData,
    });

    if (isErrorResponse(saveGameResponse)) {
      frontendLogger.error('SaveAnalyze', 'Save game failed', undefined, {
        error: saveGameResponse.error,
        code: saveGameResponse.code,
      });
      console.error('Save game failed:', saveGameResponse.error);
      return false;
    }
    const gamePath = (saveGameResponse as { path: string }).path;
    frontendLogger.info('SaveAnalyze', 'Game saved', { path: gamePath });
    console.log('Game saved to:', gamePath);

    // Step 3: Save the analysis
    console.log('Saving analysis...');
    frontendLogger.info('SaveAnalyze', 'Step 3: Calling SAVE_ANALYSIS IPC');
    const saveAnalysisResponse = await buntralino.run(IPC_METHODS.SAVE_ANALYSIS, {
      analysis,
    });

    if (isErrorResponse(saveAnalysisResponse)) {
      frontendLogger.error('SaveAnalyze', 'Save analysis failed', undefined, {
        error: saveAnalysisResponse.error,
        code: saveAnalysisResponse.code,
      });
      console.error('Save analysis failed:', saveAnalysisResponse.error);
      return false;
    }
    const analysisPath = (saveAnalysisResponse as { path: string }).path;
    frontendLogger.info('SaveAnalyze', 'Analysis saved', { path: analysisPath });
    console.log('Analysis saved to:', analysisPath);

    frontendLogger.info('SaveAnalyze', 'Game save and analysis complete', {
      gameId: gameRecord.gameId,
      gamePath,
      analysisPath,
    });
    console.log('Game save and analysis complete');
    return true;
  } catch (error) {
    frontendLogger.error('SaveAnalyze', 'Error in saveAndAnalyzeGame', error as Error);
    console.error('Error in saveAndAnalyzeGame:', error);
    return false;
  }
}

/**
 * Show game result modal
 * Per Task 2.3.5: Game result display
 * Per Task 4.1.6: Generate PGN on game completion (Exam Mode)
 * Per Task 5.1.1: Enhanced game over screen with quick stats
 */
function showGameResult(): void {
  frontendLogger.separator('GameResult', 'Game Result Processing');
  frontendLogger.enter('GameResult', 'showGameResult');

  const overlay = document.getElementById('game-result-overlay');
  const title = document.getElementById('result-title');
  const subtitle = document.getElementById('result-subtitle');
  const reason = document.getElementById('result-reason');
  const viewAnalysisBtn = document.getElementById('view-analysis-button');
  const statsContainer = document.getElementById('game-over-stats');

  if (!overlay || !title || !subtitle || !reason) {
    frontendLogger.warn('GameResult', 'Missing required DOM elements');
    return;
  }

  // Hide View Analysis button and stats initially (will be shown after save completes)
  frontendLogger.debug('GameResult', 'Hiding View Analysis button and stats initially');
  if (viewAnalysisBtn) {
    viewAnalysisBtn.classList.add('hidden');
  }
  if (statsContainer) {
    statsContainer.classList.add('hidden');
  }

  // Check game state
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();
  frontendLogger.debug('GameResult', 'Game state', { isCheckmate, isStalemate, isDraw });

  // Determine result and termination for Exam Mode record
  let gameResult = '';
  let termination: 'checkmate' | 'stalemate' | 'resignation' | 'draw' | 'timeout' = 'draw';

  if (isCheckmate) {
    // Checkmate
    const winner = game.getTurn() === 'w' ? 'Black' : 'White';
    const loser = game.getTurn() === 'w' ? 'White' : 'Black';
    title.textContent = `${winner} Wins!`;
    subtitle.textContent = 'Checkmate';
    reason.textContent = `${loser} king has no legal moves`;
    overlay.classList.remove('hidden');

    // Set result for Exam Mode
    gameResult = game.getTurn() === 'w' ? '0-1' : '1-0';
    termination = 'checkmate';
  } else if (isStalemate) {
    // Stalemate
    title.textContent = 'Draw';
    subtitle.textContent = 'Stalemate';
    reason.textContent = 'No legal moves available';
    overlay.classList.remove('hidden');

    gameResult = '1/2-1/2';
    termination = 'stalemate';
  } else if (isDraw) {
    // Other draw conditions
    title.textContent = 'Draw';
    subtitle.textContent = 'Game Drawn';
    reason.textContent = 'By repetition, 50-move rule, or insufficient material';
    overlay.classList.remove('hidden');

    gameResult = '1/2-1/2';
    termination = 'draw';
  } else {
    // No game over - hide modal
    overlay.classList.add('hidden');
    return;
  }

  // Generate Exam Mode game record if in Exam Mode
  if (currentGameMode === 'exam' && examManager.isActive()) {
    frontendLogger.info('GameResult', 'Processing Exam Mode game completion');
    const pgn = game.getPgn();
    const gameRecord = examManager.generateGameRecord(
      gameResult,
      termination,
      pgn,
      'Unknown Opening' // Opening detection will be added in Phase 4.2
    );

    frontendLogger.info('GameResult', 'Exam Mode game record generated', {
      gameId: gameRecord.gameId,
      result: gameRecord.metadata.result,
      termination: gameRecord.metadata.termination,
      duration: gameRecord.metadata.duration,
      totalMoves: gameRecord.metadata.totalMoves,
    });
    console.log('Exam Mode game completed:', {
      gameId: gameRecord.gameId,
      result: gameRecord.metadata.result,
      termination: gameRecord.metadata.termination,
      duration: gameRecord.metadata.duration,
      totalMoves: gameRecord.metadata.totalMoves,
    });
    console.log('PGN:', pgn);

    // Emit game end callback
    examManager.onGameEnd?.(gameRecord);

    // Phase 5: Save game and run analysis, then show stats
    const playerColor = examManager.getPlayerColor();
    frontendLogger.info('GameResult', 'Starting async save and analysis', { playerColor });

    // Save and analyze the game (async operation)
    saveAndAnalyzeGame(gameRecord).then((success) => {
      frontendLogger.info('GameResult', 'Save and analysis completed', { success });
      if (success) {
        console.log('Game saved and analyzed successfully');
        frontendLogger.info('GameResult', 'Showing View Analysis button');
        // Show View Analysis button
        if (viewAnalysisBtn) {
          viewAnalysisBtn.classList.remove('hidden');
        }
        // Load and display quick stats from the saved analysis
        frontendLogger.info('GameResult', 'Calling showGameOverWithStats', {
          gameId: gameRecord.gameId,
          gameResult,
          termination,
          playerColor,
        });
        analysisUI.showGameOverWithStats(gameRecord.gameId, gameResult, termination, playerColor);
      } else {
        frontendLogger.error(
          'GameResult',
          'Failed to save/analyze game - analysis will not be available'
        );
        console.error('Failed to save/analyze game - analysis will not be available');
        // Hide View Analysis button since we couldn't save
        if (viewAnalysisBtn) {
          viewAnalysisBtn.classList.add('hidden');
        }
        if (statsContainer) {
          statsContainer.classList.add('hidden');
        }
      }
    });
  } else {
    // Hide analysis button for non-Exam Mode games
    if (viewAnalysisBtn) {
      viewAnalysisBtn.classList.add('hidden');
    }
    if (statsContainer) {
      statsContainer.classList.add('hidden');
    }
  }
}

/**
 * Show confirmation dialog
 * Per Task 2.4.1: Confirm if game in progress
 */
function showConfirmDialog(title: string, message: string, onConfirm: () => void): void {
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

// Pending promotion move state
let pendingPromotion: { from: string; to: string } | null = null;

/**
 * Check if a move is a pawn promotion
 * A pawn promotes when it reaches the last rank (rank 8 for white, rank 1 for black)
 */
function isPromotionMove(from: string, to: string): boolean {
  const piece = game.getPiece(from as Square);
  if (!piece || piece.type !== 'p') return false;

  const toRank = to[1];
  // White pawn promotes on rank 8, black pawn promotes on rank 1
  return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
}

/**
 * Show promotion dialog for piece selection
 */
function showPromotionDialog(from: string, to: string): void {
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

    pieceBtn.addEventListener('click', () => handlePromotionChoice(promo.symbol));
    piecesContainer.appendChild(pieceBtn);
  }

  // Show dialog
  overlay.classList.remove('hidden');
}

/**
 * Handle promotion piece selection
 */
function handlePromotionChoice(piece: string): void {
  const overlay = document.getElementById('promotion-dialog-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }

  if (!pendingPromotion) return;

  const { from, to } = pendingPromotion;
  pendingPromotion = null;

  // Execute the promotion move with the selected piece
  executeMove(from, to, piece);
}

/**
 * Execute a move (with optional promotion piece)
 * Per Task 4.1.4: Full game recording for Exam Mode
 */
function executeMove(from: string, to: string, promotion?: string): void {
  try {
    const moveStr = promotion ? `${from}${to}${promotion}` : `${from}${to}`;
    const move = game.makeMove(moveStr);
    if (move) {
      console.log('Move made:', move.san);

      // Record move in Exam Mode
      if (currentGameMode === 'exam' && examManager.isActive()) {
        const playerColor = examManager.getPlayerColor();
        examManager.recordMove(move.san, moveStr, game.getFen(), playerColor);
      }

      // Clear redo stack on new move (can't redo after making a new move)
      redoStack = [];

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

      // Render board after animation and handle Training Mode
      setTimeout(
        async () => {
          await handlePostMoveUpdates();
        },
        move.captured ? 250 : 300
      );
    }
  } catch (error) {
    console.error('Invalid move:', error);
    clearSelection();
  }
}

// Note: startNewGame() and handleNewGameControl() removed in favor of showModeSelection()
// which provides a complete "hard reset" when starting a new game (see line ~1965)

/**
 * Handle "Resign" button
 * Per Task 2.4.3: Resign button with confirmation
 */
function handleResign(): void {
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

/**
 * Handle "Flip Board" button
 * Per Task 2.4.4: Flip board 180 degrees
 */
function handleFlipBoard(): void {
  boardFlipped = !boardFlipped;
  renderChessboard();
}

/**
 * Update undo/redo button states
 * Per Task 2.4.2: Enable/disable based on available history
 */
function updateUndoRedoButtons(): void {
  const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
  const redoButton = document.getElementById('redo-button') as HTMLButtonElement;

  if (undoButton) {
    const history = game.getHistory();
    undoButton.disabled = history.length === 0;
  }

  if (redoButton) {
    redoButton.disabled = redoStack.length === 0;
  }
}

/**
 * Handle "Undo" button
 * Per Task 2.4.2: Undo last move
 */
function handleUndo(): void {
  const history = game.getHistory();
  if (history.length === 0) return;

  // Get the last move before undoing
  const lastMove = history[history.length - 1];

  // Store move in redo stack (in SAN format for easy replay)
  redoStack.push(lastMove.san);

  // Undo the move
  game.undoMove();

  // Re-render everything
  renderChessboard();
  updateTurnIndicator();
  updateMoveHistory();
  updateCapturedPieces();
  updateGameAlert();
  updateUndoRedoButtons();

  console.log('Move undone:', lastMove.san);
}

/**
 * Handle "Redo" button
 * Per Task 2.4.2: Redo undone move
 */
function handleRedo(): void {
  if (redoStack.length === 0) return;

  // Get the move from redo stack
  const moveToRedo = redoStack.pop()!;

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
      updateUndoRedoButtons();

      // Show game result modal if game is over
      if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
        gameResultTimeoutId = setTimeout(() => {
          showGameResult();
        }, 1000);
      }

      console.log('Move redone:', moveToRedo);
    }
  } catch (error) {
    console.error('Failed to redo move:', error);
    // Put move back in redo stack if it failed
    redoStack.push(moveToRedo);
  }
}

/**
 * Update captured pieces display
 * Per Task 2.3.3: Show captured pieces
 */
function updateCapturedPieces(): void {
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
}

/**
 * Get piece image path for a given piece
 * Per Task 2.1.2: Render chess pieces using SVG assets
 */
function getPieceImagePath(piece: Piece): string {
  const colorPrefix = piece.color === 'w' ? 'w' : 'b';
  const pieceSymbol = piece.type.toUpperCase();
  return `/assets/pieces/${colorPrefix}${pieceSymbol}.svg`;
}

/**
 * Parse FEN to create a 2D array of pieces
 */
function parseFenToBoard(fen: string): (Piece | null)[][] {
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

/**
 * Handle square click for click-to-move
 * Per Task 2.2.2: Click-to-move alternative
 */
function handleSquareClick(squareName: string): void {
  const clickedSquare = document.querySelector(`[data-square="${squareName}"]`) as HTMLElement;
  if (!clickedSquare) return;

  const hasPiece = clickedSquare.querySelector('.piece');
  const currentTurn = game.getTurn();

  // If no square is selected
  if (!selectedSquare) {
    // Only allow selecting pieces of the current player
    if (hasPiece) {
      const piece = clickedSquare.querySelector('.piece') as HTMLElement;
      const alt = piece.getAttribute('alt') || '';
      const isWhitePiece = alt.includes('White');

      if ((currentTurn === 'w' && isWhitePiece) || (currentTurn === 'b' && !isWhitePiece)) {
        selectedSquare = squareName;
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
        selectedSquare = squareName;
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

/**
 * Clear square selection and highlights
 */
function clearSelection(): void {
  if (selectedSquare) {
    const square = document.querySelector(`[data-square="${selectedSquare}"]`);
    square?.classList.remove('selected');
    selectedSquare = null;
  }
  clearHighlights();
}

/**
 * Clear all legal move highlights
 */
function clearHighlights(): void {
  document.querySelectorAll('.square.legal-move, .square.legal-capture').forEach((sq) => {
    sq.classList.remove('legal-move', 'legal-capture');
  });
}

/**
 * Highlight legal moves for a piece
 * Per Task 2.2.3: Legal move highlighting
 */
function highlightLegalMoves(fromSquare: string): void {
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
 * Handle post-move updates and check if bot should play
 * Per Task 3.2.5: Training Mode state management
 * Per Task 4.1: Exam Mode state management (no guidance)
 */
async function handlePostMoveUpdates(): Promise<void> {
  clearSelection();
  renderChessboard();
  updateTurnIndicator();
  updateMoveHistory();
  updateCapturedPieces();
  updateGameAlert();
  updateUndoRedoButtons();

  // Show game result modal if game is over
  if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
    // Hide guidance on game over
    showGuidancePanel(false);
    guidanceManager.clearGuidance();
    updateGuidanceHighlights();
    gameResultTimeoutId = setTimeout(() => {
      showGameResult();
    }, 1000);
    return;
  }

  // Handle Training Mode
  if (currentGameMode === 'training' && trainingManager.isActive()) {
    const shouldBotMove = trainingManager.updatePosition(game.getFen());
    if (shouldBotMove) {
      // Hide guidance during bot's turn
      showGuidancePanel(false);
      await requestBotMove();
      // Update guidance after bot move (it will now be player's turn)
      await updateGuidance();
    } else {
      // It's player's turn, update guidance
      await updateGuidance();
    }
  }

  // Handle Exam Mode (NO guidance - per game-modes.md)
  if (currentGameMode === 'exam' && examManager.isActive()) {
    const shouldBotMove = examManager.updatePosition(game.getFen());
    if (shouldBotMove) {
      await requestExamBotMove();
    }
    // Guidance is NEVER shown in Exam Mode
    showGuidancePanel(false);
  }
}

/**
 * Request and execute a bot move in Exam Mode
 * Per Task 4.1: Exam Mode bot integration
 */
async function requestExamBotMove(): Promise<void> {
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
          gameResultTimeoutId = setTimeout(() => {
            showGameResult();
          }, 1000);
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

/**
 * Request and execute a bot move
 * Per Task 3.2.5: Training Mode state management
 */
async function requestBotMove(): Promise<void> {
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
          gameResultTimeoutId = setTimeout(() => {
            showGameResult();
          }, 1000);
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
 * Show/hide bot thinking indicator
 */
function showBotThinking(show: boolean): void {
  const indicator = document.getElementById('bot-thinking-indicator');
  if (indicator) {
    indicator.classList.toggle('hidden', !show);
  }
}

// ========================================
// Move Guidance UI Functions
// Per Task 3.3: Best-Move Guidance System
// ========================================

/**
 * Show/hide guidance panel
 * Per Task 3.3.6: Guidance timing (player's turn only)
 */
function showGuidancePanel(show: boolean): void {
  const panel = document.getElementById('guidance-panel');
  if (panel) {
    panel.classList.toggle('hidden', !show);
  }
}

/**
 * Update guidance loading state
 */
function showGuidanceLoading(show: boolean): void {
  const loading = document.getElementById('guidance-loading');
  const moveList = document.getElementById('guidance-move-list');
  const empty = document.getElementById('guidance-empty');

  if (loading) loading.classList.toggle('hidden', !show);
  if (moveList) moveList.classList.toggle('hidden', show);
  if (empty) empty.classList.add('hidden');
}

/**
 * Render guidance moves in the panel
 * Per Task 3.4.2: Add best-move notation display
 */
function renderGuidanceMoves(moves: GuidanceMove[]): void {
  const moveList = document.getElementById('guidance-move-list');
  const empty = document.getElementById('guidance-empty');

  if (!moveList) return;

  if (moves.length === 0) {
    moveList.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  moveList.innerHTML = moves
    .map((move, index) => {
      // Convert UCI to SAN for display
      const san = ChessGame.uciToSan(game.getFen(), move.uci) || move.uci;
      const colorClass = `move-${move.color}`;
      const rankClass = `rank-${index + 1}`;

      return `
        <div class="guidance-move-entry"
             data-index="${index}"
             data-from="${move.from}"
             data-to="${move.to}">
          <div class="guidance-move-rank ${rankClass}">${index + 1}</div>
          <div class="guidance-move-notation ${colorClass}">${san}</div>
          <div class="guidance-move-eval">${move.formattedScore}</div>
        </div>
      `;
    })
    .join('');

  // Add hover listeners for guidance moves
  const entries = moveList.querySelectorAll('.guidance-move-entry');
  entries.forEach((entry) => {
    entry.addEventListener('mouseenter', () => {
      const index = parseInt(entry.getAttribute('data-index') || '-1');
      handleGuidanceHover(index);
    });
    entry.addEventListener('mouseleave', () => {
      handleGuidanceHover(-1);
    });
  });
}

/**
 * Handle hover on guidance move
 * Per Task 3.3.4: Implement hover interactions
 */
function handleGuidanceHover(index: number): void {
  guidanceManager.setHoveredMove(index);
  updateGuidanceHighlights();

  // Update hover state in panel
  const entries = document.querySelectorAll('.guidance-move-entry');
  entries.forEach((entry, i) => {
    entry.classList.toggle('hovered', i === index);
  });
}

/**
 * Update guidance highlights on the board
 * Per Task 3.3.2: Implement color-coded highlighting
 * Per Task 3.3.3: Implement three-way visual sync
 * Supports multiple colors on same square (nested highlights)
 */
function updateGuidanceHighlights(): void {
  // Remove all existing guidance highlights
  const squares = document.querySelectorAll('.square');
  squares.forEach((square) => {
    square.classList.remove(
      'guidance-highlight',
      'guidance-blue',
      'guidance-green',
      'guidance-yellow',
      'guidance-secondary-blue',
      'guidance-secondary-green',
      'guidance-secondary-yellow',
      'guidance-source',
      'guidance-hovered'
    );
    // Remove any tertiary highlight elements
    const tertiary = square.querySelector('.guidance-tertiary');
    if (tertiary) tertiary.remove();
  });

  // Remove guidance classes from pieces
  const pieces = document.querySelectorAll('.piece');
  pieces.forEach((piece) => {
    piece.classList.remove(
      'guidance-piece',
      'guidance-piece-blue',
      'guidance-piece-green',
      'guidance-piece-yellow',
      'guidance-emphasized'
    );
  });

  if (!guidanceManager.isActive()) return;

  const moves = guidanceManager.getMoves();
  const state = guidanceManager.getState();

  // Track colors per square for multi-color support
  const squareColors: Map<string, string[]> = new Map();

  // First pass: collect all colors for each square
  moves.forEach((move) => {
    // Source squares
    if (!squareColors.has(move.from)) {
      squareColors.set(move.from, []);
    }
    squareColors.get(move.from)!.push(move.color);

    // Destination squares
    if (!squareColors.has(move.to)) {
      squareColors.set(move.to, []);
    }
    squareColors.get(move.to)!.push(move.color);
  });

  // Second pass: apply highlights with multi-color support
  moves.forEach((move) => {
    // Highlight source square (piece location)
    const sourceSquare = document.querySelector(`.square[data-square="${move.from}"]`);
    if (sourceSquare) {
      const colors = squareColors.get(move.from) || [];
      applyMultiColorHighlight(sourceSquare, colors, true);

      if (state.hoveredIndex >= 0 && moves[state.hoveredIndex]?.from === move.from) {
        sourceSquare.classList.add('guidance-hovered');
      }

      // Highlight the piece itself (use primary color)
      const piece = sourceSquare.querySelector('.piece');
      if (piece) {
        piece.classList.add('guidance-piece', `guidance-piece-${colors[0]}`);
        if (state.hoveredIndex >= 0 && moves[state.hoveredIndex]?.from === move.from) {
          piece.classList.add('guidance-emphasized');
        }
      }
    }

    // Highlight destination square
    const destSquare = document.querySelector(`.square[data-square="${move.to}"]`);
    if (destSquare) {
      const colors = squareColors.get(move.to) || [];
      applyMultiColorHighlight(destSquare, colors, false);

      if (state.hoveredIndex >= 0 && moves[state.hoveredIndex]?.to === move.to) {
        destSquare.classList.add('guidance-hovered');
      }
    }
  });
}

/**
 * Apply multi-color highlight to a square
 * Uses nested rings: outer (::before), middle (::after), inner (injected element)
 */
function applyMultiColorHighlight(square: Element, colors: string[], isSource: boolean): void {
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

/**
 * Request and update guidance for current position
 * Per Task 3.3.1: Calculate top 3 moves in real-time
 * Per Task 3.3.8: Optimize performance
 */
async function updateGuidance(): Promise<void> {
  // Only show guidance in Training Mode when guidance is enabled
  const config = trainingManager.getConfig();
  if (!trainingManager.isActive() || !config.guidanceEnabled) {
    showGuidancePanel(false);
    guidanceManager.deactivate();
    return;
  }

  // Hide guidance on opponent's turn or game over
  if (!trainingManager.isPlayerTurn() || game.isGameOver()) {
    showGuidancePanel(false);
    guidanceManager.clearGuidance();
    updateGuidanceHighlights();
    return;
  }

  // Activate and show guidance
  guidanceManager.activate();
  showGuidancePanel(true);
  showGuidanceLoading(true);

  // Request guidance moves
  await guidanceManager.requestGuidance(game.getFen());

  // Update UI
  showGuidanceLoading(false);
  renderGuidanceMoves(guidanceManager.getMoves());
  updateGuidanceHighlights();
}

/**
 * Attempt to make a move
 * Per Task 2.2.4: Piece animation on move
 * Per Task 2.2.5: Move sound effects
 * Per Task 3.2.5: Training Mode integration
 * Per Task 4.1: Exam Mode integration (move recording, no guidance)
 */
function attemptMove(from: string, to: string): void {
  // In Training Mode, only allow moves on player's turn
  if (
    currentGameMode === 'training' &&
    trainingManager.isActive() &&
    !trainingManager.isPlayerTurn()
  ) {
    console.log('Not your turn - waiting for bot');
    return;
  }

  // In Exam Mode, only allow moves on player's turn
  if (currentGameMode === 'exam' && examManager.isActive() && !examManager.isPlayerTurn()) {
    console.log('Not your turn - waiting for bot');
    return;
  }

  // Check if this is a pawn promotion - show dialog to let user choose piece
  if (isPromotionMove(from, to)) {
    showPromotionDialog(from, to);
    return;
  }

  // Execute the move normally
  executeMove(from, to);
}

/**
 * Handle drag start
 * Per Task 2.2.1: Drag-and-drop piece movement
 */
function handleDragStart(e: DragEvent, squareName: string): void {
  const target = e.target as HTMLElement;
  draggedPiece = { element: target, square: squareName };

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
function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Handle drop
 * Per Task 2.2.1: Drag-and-drop piece movement
 */
function handleDrop(e: DragEvent, targetSquare: string): void {
  e.preventDefault();

  if (!draggedPiece) return;

  const fromSquare = draggedPiece.square;

  // Reset opacity
  draggedPiece.element.style.opacity = '1';

  // Try to make the move
  attemptMove(fromSquare, targetSquare);

  draggedPiece = null;
  clearHighlights();
}

/**
 * Render the 8x8 chessboard grid with pieces
 * Per Task 2.1.1: Implement responsive chessboard layout
 * Per Task 2.1.2: Render chess pieces using SVG assets
 * Per Task 2.2.1: Drag-and-drop piece movement
 * Per Task 2.2.2: Click-to-move alternative
 */
function renderChessboard(): void {
  const boardElement = document.getElementById('chess-board');
  if (!boardElement) {
    console.error('chess-board element not found');
    return;
  }

  // Clear any existing squares
  boardElement.innerHTML = '';

  // Get current position from game
  const fen = game.getFen();
  const position = parseFenToBoard(fen);

  console.log('Position:', position);

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
      square.addEventListener('click', () => handleSquareClick(squareName));

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
        pieceImg.addEventListener('dragstart', (e) => handleDragStart(e, squareName));

        square.appendChild(pieceImg);
      }

      // Drop handlers for all squares
      square.addEventListener('dragover', handleDragOver);
      square.addEventListener('drop', (e) => handleDrop(e, squareName));

      boardElement.appendChild(square);
      squareCount++;
    }
  }

  console.log(`Chessboard rendered: ${squareCount} squares with pieces at starting position`);
}

// Results display element
const resultsDiv: HTMLDivElement | null = null;

/**
 * Display results in the UI
 */
function displayResults(title: string, data: unknown): void {
  if (!resultsDiv) return;

  const resultItem = document.createElement('div');
  resultItem.style.cssText =
    'background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; text-align: left;';
  resultItem.innerHTML = `
    <strong>${title}</strong>
    <pre style="margin: 5px 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
  `;
  resultsDiv.prepend(resultItem);
}

/**
 * Test IPC communication with backend
 * Per Task 1.4.3: Test frontend-backend communication
 */
async function testIPCCommunication(): Promise<void> {
  console.log('Testing IPC communication...');

  // Test 1: Health check
  console.log('1. Testing sayHello...');
  const helloResult = await buntralino.run(IPC_METHODS.SAY_HELLO, {
    message: 'Hello from frontend!',
  });
  console.log('   Response:', helloResult);
  displayResults('1. sayHello', helloResult);

  // Test 2: Engine status
  console.log('2. Testing getEngineStatus...');
  const statusResult = (await buntralino.run(
    IPC_METHODS.GET_ENGINE_STATUS
  )) as EngineStatusResponse;
  console.log('   Engine initialized:', statusResult.initialized);
  displayResults('2. getEngineStatus', statusResult);

  // Test 3: Start new game
  console.log('3. Testing startNewGame...');
  const newGameResult = await buntralino.run(IPC_METHODS.START_NEW_GAME);
  console.log('   Result:', newGameResult);
  displayResults('3. startNewGame', newGameResult);

  // Test 4: Get best moves from starting position
  console.log('4. Testing requestBestMoves...');
  const bestMovesResult = (await buntralino.run(IPC_METHODS.REQUEST_BEST_MOVES, {
    fen: STARTPOS_FEN,
    depth: 10,
    count: 3,
  })) as BestMovesResponse | ErrorResponse;

  if (isErrorResponse(bestMovesResult)) {
    console.error('   Error:', bestMovesResult.error);
  } else {
    console.log('   Top 3 moves:', bestMovesResult.moves.map((m: BestMove) => m.move).join(', '));
  }
  displayResults('4. requestBestMoves (top 3)', bestMovesResult);

  // Test 5: Evaluate position
  console.log('5. Testing evaluatePosition...');
  const evalResult = (await buntralino.run(IPC_METHODS.EVALUATE_POSITION, {
    fen: STARTPOS_FEN,
    depth: 12,
  })) as EvaluationResponse;

  if (!isErrorResponse(evalResult)) {
    console.log('   Evaluation:', evalResult.formattedScore);
    console.log('   Best move:', evalResult.evaluation.bestMove);
  }
  displayResults('5. evaluatePosition', evalResult);

  // Test 6: Get guidance moves (for Training Mode)
  console.log('6. Testing getGuidanceMoves...');
  const guidanceResult = (await buntralino.run(IPC_METHODS.GET_GUIDANCE_MOVES, {
    fen: STARTPOS_FEN,
    depth: 12,
  })) as BestMovesResponse;

  if (!isErrorResponse(guidanceResult)) {
    console.log('   Guidance moves (Blue/Green/Yellow):');
    guidanceResult.moves.forEach((m, i) => {
      const color = ['Blue', 'Green', 'Yellow'][i];
      console.log(`     ${color}: ${m.move}`);
    });
  }
  displayResults('6. getGuidanceMoves', guidanceResult);

  // Test 7: Analyze a move
  console.log('7. Testing analyzeMove...');
  const analysisResult = await buntralino.run(IPC_METHODS.ANALYZE_MOVE, {
    fen: STARTPOS_FEN,
    playedMove: 'g2g4', // Bad move for testing
    depth: 10,
  });
  displayResults('7. analyzeMove (g4 from start)', analysisResult);

  console.log('\n=== IPC Communication Tests Complete ===');
}

/**
 * Start a Training Mode game
 * Per Task 3.2.4: Create game initialization flow
 */
async function startTrainingGame(
  config: TrainingConfig,
  playerColor: 'white' | 'black'
): Promise<void> {
  // Set current game mode
  currentGameMode = 'training';

  // Make sure Exam Mode is stopped
  if (examManager.isActive()) {
    examManager.stop();
  }

  // Reset the game
  game.reset();
  redoStack = [];

  // Flip board if playing as black
  if (playerColor === 'black' && !boardFlipped) {
    boardFlipped = true;
  } else if (playerColor === 'white' && boardFlipped) {
    boardFlipped = false;
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
async function startExamGame(_config: ExamConfig, playerColor: 'white' | 'black'): Promise<void> {
  // Set current game mode
  currentGameMode = 'exam';

  // Make sure Training Mode is stopped
  if (trainingManager.isActive()) {
    trainingManager.stop();
  }

  // Reset the game
  game.reset();
  redoStack = [];

  // Flip board if playing as black
  if (playerColor === 'black' && !boardFlipped) {
    boardFlipped = true;
  } else if (playerColor === 'white' && boardFlipped) {
    boardFlipped = false;
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

// Initialize application
(async () => {
  // Render the chessboard immediately
  renderChessboard();

  // Initialize UI elements
  updateTurnIndicator();
  updateGameAlert();

  // Initialize Training Mode UI
  trainingUI.initialize();

  // Initialize Exam Mode UI (Phase 4)
  examUI.initialize();

  // Set up Training Mode callbacks
  trainingUI.onGameStart = (config, playerColor) => {
    startTrainingGame(config, playerColor);
  };

  // Set up Exam Mode callbacks (Phase 4)
  examUI.onGameStart = (config, playerColor) => {
    startExamGame(config, playerColor);
  };

  // Helper to show mode selection - resets entire game to fresh state
  const showModeSelection = () => {
    // Cancel any pending game result timeout (prevents stale results from showing)
    if (gameResultTimeoutId !== null) {
      clearTimeout(gameResultTimeoutId);
      gameResultTimeoutId = null;
    }

    // Stop any active game mode
    if (trainingManager.isActive()) {
      trainingManager.stop();
    }
    if (examManager.isActive()) {
      examManager.stop();
    }
    currentGameMode = 'none';

    // Reset game to starting position (clean slate)
    game.reset();
    redoStack = [];

    // Reset board orientation to default (white at bottom)
    boardFlipped = false;

    // Hide all overlays
    const resultOverlay = document.getElementById('game-result-overlay');
    if (resultOverlay) {
      resultOverlay.classList.add('hidden');
    }
    const confirmOverlay = document.getElementById('confirm-dialog-overlay');
    if (confirmOverlay) {
      confirmOverlay.classList.add('hidden');
    }

    // Hide guidance panel
    showGuidancePanel(false);
    guidanceManager.deactivate();

    // Re-render everything fresh
    renderChessboard();
    updateTurnIndicator();
    updateMoveHistory();
    updateCapturedPieces();
    updateGameAlert();
    updateUndoRedoButtons();

    // Show mode selection
    trainingUI.show();
  };

  // Wire up "New Game" buttons
  const newGameButton = document.getElementById('new-game-button');
  if (newGameButton) {
    newGameButton.addEventListener('click', () => {
      showModeSelection();
    });
  }

  // Phase 5: Wire up "View Analysis" button
  const viewAnalysisButton = document.getElementById('view-analysis-button');
  if (viewAnalysisButton) {
    viewAnalysisButton.addEventListener('click', () => {
      const gameId = examManager.getGameId();
      if (gameId) {
        // Hide game result overlay and open analysis
        const resultOverlay = document.getElementById('game-result-overlay');
        if (resultOverlay) {
          resultOverlay.classList.add('hidden');
        }
        analysisUI.openAnalysis(gameId);
      }
    });
  }

  // Phase 5: Set up analysis UI callbacks
  analysisUI.onClose = () => {
    // Re-show mode selection when analysis is closed
    showModeSelection();
  };

  const newGameControl = document.getElementById('new-game-control');
  if (newGameControl) {
    newGameControl.addEventListener('click', () => {
      // Show confirmation if game is in progress
      if (game.getHistory().length > 0) {
        showConfirmDialog(
          'Start New Game?',
          'Current game progress will be lost. Continue?',
          showModeSelection
        );
      } else {
        // No game in progress, show mode selection directly
        showModeSelection();
      }
    });
  }

  // Wire up "Resign" button
  const resignButton = document.getElementById('resign-button');
  if (resignButton) {
    resignButton.addEventListener('click', handleResign);
  }

  // Wire up "Flip Board" button
  const flipBoardButton = document.getElementById('flip-board-button');
  if (flipBoardButton) {
    flipBoardButton.addEventListener('click', handleFlipBoard);
  }

  // Wire up "Undo" button
  const undoButton = document.getElementById('undo-button');
  if (undoButton) {
    undoButton.addEventListener('click', handleUndo);
  }

  // Wire up "Redo" button
  const redoButton = document.getElementById('redo-button');
  if (redoButton) {
    redoButton.addEventListener('click', handleRedo);
  }

  // Set initial button states
  updateUndoRedoButtons();

  // Add keyboard shortcuts for undo/redo (Ctrl+Z, Ctrl+Y)
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' || event.key === 'Z') {
        event.preventDefault();
        handleUndo();
      } else if (event.key === 'y' || event.key === 'Y') {
        event.preventDefault();
        handleRedo();
      }
    }
  });

  // Wait for Buntralino connection
  await buntralino.ready;
  console.log('Buntralino connection established');
  frontendLogger.info('App', 'Buntralino connection established');

  // Initialize the frontend logger (checks if dev mode is enabled)
  await frontendLogger.initialize();
  if (frontendLogger.isEnabled()) {
    frontendLogger.separator('App', 'Chess-Sensei Frontend Session Started');
    frontendLogger.info('App', 'Debug logging enabled', {
      logPath: frontendLogger.getLogPath(),
    });
  }

  // Make test function available globally for debugging (Phase 1 tests)
  (window as unknown as { testIPC: () => Promise<void> }).testIPC = testIPCCommunication;

  // Phase 6: Setup Progress Dashboard button
  const viewProgressBtn = document.getElementById('view-progress-btn');
  if (viewProgressBtn) {
    viewProgressBtn.addEventListener('click', () => {
      frontendLogger.info('App', 'Opening Progress Dashboard');
      progressDashboard.open();
    });
  }

  // Setup dashboard callbacks
  progressDashboard.onClose = () => {
    frontendLogger.info('App', 'Progress Dashboard closed');
  };

  progressDashboard.onViewGame = (gameId: string) => {
    frontendLogger.info('App', 'Opening game from dashboard', { gameId });
    progressDashboard.close();
    // Open analysis for the selected game
    analysisUI.openAnalysis(gameId);
  };

  frontendLogger.info('App', 'Phase 6: Progress Dashboard UI initialized');
  console.log('Phase 6: Progress Dashboard UI initialized');
})();
