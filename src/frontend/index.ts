/**
 * Chess-Sensei Frontend Entry Point
 *
 * This file initializes the Neutralino.js window and sets up the chess UI.
 * Orchestrates modules from board/, ui/, game/, and modes/ directories.
 */

import neutralino from '@neutralinojs/lib';
neutralino.init();

import { ipc, initializeIPC } from './websocket-ipc-client';
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
import { ChessGame } from '../shared/chess-logic';
import { SoundManager } from './sound-manager';
import { createTrainingMode } from './training-mode';
import { createExamMode } from './exam-mode';
import { createSandboxMode, type SandboxAnalysisResult } from './sandbox-mode';
import { createMoveGuidance } from './move-guidance';
import { BoardAnnotations } from './board-annotations';
import { ExplanationModal } from './components/explanation-modal';
import { ControlToolbar } from './components/control-toolbar';
import { CollapsibleSection } from './components/collapsible-section';
import { createAnalysisUI } from './analysis-ui';
import { createProgressDashboard } from './progress-dashboard';
import { createDataManagement } from './data-management';
import { frontendLogger } from './frontend-logger';
import { initializeNativeMenu, type MenuActionHandlers } from './native-menu';

// Import from extracted modules
import { renderChessboard as renderBoard, type BoardRenderOptions } from './board/board-renderer';
import { handleDragStart, handleDragOver, handleDrop, type DragState } from './board/board-events';
import {
  clearHighlights,
  clearSelection as clearSquareSelection,
  highlightLegalMoves,
} from './board/board-highlights';
import { updateTurnIndicator } from './ui/turn-indicator';
import { updateMoveHistory } from './ui/move-history';
import { updateCapturedPieces } from './ui/captured-pieces';
import { updateGameAlert } from './ui/game-alerts';
import { showConfirmDialog, isPromotionMove, showPromotionDialog } from './ui/dialogs';
import {
  executeMove as execMove,
  handleUndo as doUndo,
  handleRedo as doRedo,
  handleFlipBoard as doFlipBoard,
  updateUndoRedoButtons,
  handleResign as doResign,
  type GameControllerDeps,
} from './game/game-controller';
import {
  requestBotMove as reqBotMove,
  requestExamBotMove as reqExamBotMove,
  type BotIntegrationDeps,
} from './game/bot-integration';
import {
  showGuidancePanel,
  handleGuidanceHover as doGuidanceHover,
  updateGuidanceHighlights as doUpdateGuidanceHighlights,
  updateGuidance as doUpdateGuidance,
  type GuidanceControllerDeps,
} from './game/guidance-controller';
import { saveAndAnalyzeGame } from './game/save-analyze';
import {
  renderSandboxBoard as renderSandbox,
  updateSandboxValidation,
  renderSandboxAnalysisResults,
  type SandboxControllerDeps,
} from './game/sandbox-controller';
import { startTrainingGame, startExamGame, type GameMode } from './modes/mode-controller';

console.log('Chess-Sensei Frontend initialized');
frontendLogger.info('App', 'Chess-Sensei Frontend initializing');

// ============================================
// Global State
// ============================================

const game = new ChessGame();
const soundManager = new SoundManager();
const { manager: trainingManager, ui: trainingUI } = createTrainingMode();
const { manager: examManager, ui: examUI } = createExamMode();
const { manager: sandboxManager, ui: sandboxUI } = createSandboxMode();
const guidanceManager = createMoveGuidance();
const controlToolbar = new ControlToolbar('bottom');
const analysisUI = createAnalysisUI();
const progressDashboard = createProgressDashboard();
const dataManagement = createDataManagement();

let boardAnnotations: BoardAnnotations | null = null;
let explanationModal: ExplanationModal | null = null;
let moveHistorySection: CollapsibleSection | null = null;
let capturedPiecesSection: CollapsibleSection | null = null;
let currentGameMode: GameMode = 'none';
let draggedPiece: DragState | null = null;
let selectedSquare: string | null = null;
let boardFlipped: boolean = false;
let redoStack: string[] = [];
let gameResultTimeoutId: ReturnType<typeof setTimeout> | null = null;

// ============================================
// State Accessors (for dependency injection)
// ============================================

const getSelectedSquare = () => selectedSquare;
const setSelectedSquare = (sq: string | null) => {
  selectedSquare = sq;
};
const getDraggedPiece = () => draggedPiece;
const setDraggedPiece = (state: DragState | null) => {
  draggedPiece = state;
};
const getBoardFlipped = () => boardFlipped;
const setBoardFlipped = (flipped: boolean) => {
  boardFlipped = flipped;
};
const getRedoStack = () => redoStack;
const setRedoStack = (stack: string[]) => {
  redoStack = stack;
};
const setGameResultTimeout = (id: ReturnType<typeof setTimeout> | null) => {
  gameResultTimeoutId = id;
};
const getBoardAnnotations = () => boardAnnotations;
const setBoardAnnotations = (annotations: BoardAnnotations | null) => {
  boardAnnotations = annotations;
};
const getExplanationModal = () => explanationModal;
const setExplanationModal = (modal: ExplanationModal | null) => {
  explanationModal = modal;
};
const setCurrentGameMode = (mode: GameMode) => {
  currentGameMode = mode;
};

// ============================================
// Wrapper Functions (bind state to modules)
// ============================================

function renderChessboard(): void {
  const boardElement = document.getElementById('chess-board');
  if (!boardElement) {
    console.error('chess-board element not found');
    return;
  }

  const options: BoardRenderOptions = {
    boardElement,
    fen: game.getFen(),
    boardFlipped,
    onSquareClick: handleSquareClick,
    onDragStart: (e, sq) =>
      handleDragStart(e, sq, setDraggedPiece, (square) => highlightLegalMoves(square, game)),
    onDragOver: handleDragOver,
    onDrop: (e, sq) =>
      handleDrop(e, sq, getDraggedPiece, setDraggedPiece, attemptMove, clearHighlights),
  };

  renderBoard(options);
}

function clearSelection(): void {
  clearSquareSelection(getSelectedSquare, setSelectedSquare);
}

function updateAllUI(): void {
  renderChessboard();
  updateTurnIndicator(game);
  updateMoveHistory(game, moveHistorySection);
  updateCapturedPieces(game, capturedPiecesSection);
  updateGameAlert(game);
  updateUndoRedoButtons(gameControllerDeps);
}

// ============================================
// Game Controller Dependencies
// ============================================

const gameControllerDeps: GameControllerDeps = {
  game,
  soundManager,
  controlToolbar,
  getRedoStack,
  setRedoStack,
  renderChessboard,
  updateTurnIndicator: () => updateTurnIndicator(game),
  updateMoveHistory: () => updateMoveHistory(game, moveHistorySection),
  updateCapturedPieces: () => updateCapturedPieces(game, capturedPiecesSection),
  updateGameAlert: () => updateGameAlert(game),
  clearSelection,
  showGameResult,
  getBoardFlipped,
  setBoardFlipped,
  setGameResultTimeout,
};

const botIntegrationDeps: BotIntegrationDeps = {
  game,
  soundManager,
  renderChessboard,
  updateTurnIndicator: () => updateTurnIndicator(game),
  updateMoveHistory: () => updateMoveHistory(game, moveHistorySection),
  updateCapturedPieces: () => updateCapturedPieces(game, capturedPiecesSection),
  updateGameAlert: () => updateGameAlert(game),
  showGameResult,
  setGameResultTimeout,
};

const guidanceControllerDeps: GuidanceControllerDeps = {
  game,
  guidanceManager,
  trainingManager,
  getBoardAnnotations,
  setBoardAnnotations,
  getExplanationModal,
  setExplanationModal,
  ExplanationModalClass: ExplanationModal,
};

const sandboxControllerDeps: SandboxControllerDeps = {
  sandboxManager,
};

// ============================================
// Core Game Functions
// ============================================

function handleSquareClick(squareName: string): void {
  const clickedSquare = document.querySelector(`[data-square="${squareName}"]`) as HTMLElement;
  if (!clickedSquare) return;

  const hasPiece = clickedSquare.querySelector('.piece');
  const currentTurn = game.getTurn();

  if (!selectedSquare) {
    if (hasPiece) {
      const piece = clickedSquare.querySelector('.piece') as HTMLElement;
      const alt = piece.getAttribute('alt') || '';
      const isWhitePiece = alt.includes('White');

      if ((currentTurn === 'w' && isWhitePiece) || (currentTurn === 'b' && !isWhitePiece)) {
        selectedSquare = squareName;
        clickedSquare.classList.add('selected');
        highlightLegalMoves(squareName, game);
      }
    }
  } else {
    if (selectedSquare === squareName) {
      clearSelection();
    } else if (hasPiece) {
      const piece = clickedSquare.querySelector('.piece') as HTMLElement;
      const alt = piece.getAttribute('alt') || '';
      const isWhitePiece = alt.includes('White');

      if ((currentTurn === 'w' && isWhitePiece) || (currentTurn === 'b' && !isWhitePiece)) {
        clearSelection();
        selectedSquare = squareName;
        clickedSquare.classList.add('selected');
        highlightLegalMoves(squareName, game);
      } else {
        attemptMove(selectedSquare, squareName);
      }
    } else {
      attemptMove(selectedSquare, squareName);
    }
  }
}

function attemptMove(from: string, to: string): void {
  if (
    currentGameMode === 'training' &&
    trainingManager.isActive() &&
    !trainingManager.isPlayerTurn()
  ) {
    console.log('Not your turn - waiting for bot');
    return;
  }

  if (currentGameMode === 'exam' && examManager.isActive() && !examManager.isPlayerTurn()) {
    console.log('Not your turn - waiting for bot');
    return;
  }

  if (isPromotionMove(game, from, to)) {
    showPromotionDialog(game, from, to, executeMove);
    return;
  }

  executeMove(from, to);
}

function executeMove(from: string, to: string, promotion?: string): void {
  const recordMove =
    currentGameMode === 'exam' && examManager.isActive()
      ? (san: string, uci: string, fen: string) => {
          const playerColor = examManager.getPlayerColor();
          examManager.recordMove(san, uci, fen, playerColor);
        }
      : undefined;

  execMove(gameControllerDeps, from, to, promotion, handlePostMoveUpdates, recordMove);
}

async function handlePostMoveUpdates(): Promise<void> {
  clearSelection();
  updateAllUI();

  if (game.isCheckmate() || game.isStalemate() || game.isDraw()) {
    showGuidancePanel(false);
    guidanceManager.clearGuidance();
    updateGuidanceHighlights();
    gameResultTimeoutId = setTimeout(() => {
      showGameResult();
    }, 1000);
    return;
  }

  if (currentGameMode === 'training' && trainingManager.isActive()) {
    const shouldBotMove = trainingManager.updatePosition(game.getFen());
    if (shouldBotMove) {
      showGuidancePanel(false);
      await requestBotMove();
      await updateGuidance();
    } else {
      await updateGuidance();
    }
  }

  if (currentGameMode === 'exam' && examManager.isActive()) {
    const shouldBotMove = examManager.updatePosition(game.getFen());
    if (shouldBotMove) {
      await requestExamBotMove();
    }
    showGuidancePanel(false);
  }
}

async function requestBotMove(): Promise<void> {
  await reqBotMove(botIntegrationDeps, trainingManager);
}

async function requestExamBotMove(): Promise<void> {
  await reqExamBotMove(botIntegrationDeps, examManager);
}

function updateGuidanceHighlights(): void {
  doUpdateGuidanceHighlights(guidanceControllerDeps);
}

async function updateGuidance(): Promise<void> {
  await doUpdateGuidance(guidanceControllerDeps, updateGuidanceHighlights, handleGuidanceHover);
}

function handleGuidanceHover(index: number): void {
  doGuidanceHover(guidanceControllerDeps, index, updateGuidanceHighlights);
}

function handleUndo(): void {
  doUndo(gameControllerDeps);
}

function handleRedo(): void {
  doRedo(gameControllerDeps);
}

function handleFlipBoard(): void {
  doFlipBoard(gameControllerDeps);
}

function handleResign(): void {
  doResign(gameControllerDeps, showConfirmDialog);
}

// ============================================
// Game Result Handling
// ============================================

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

  frontendLogger.debug('GameResult', 'Hiding View Analysis button and stats initially');
  if (viewAnalysisBtn) viewAnalysisBtn.classList.add('hidden');
  if (statsContainer) statsContainer.classList.add('hidden');

  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();
  frontendLogger.debug('GameResult', 'Game state', { isCheckmate, isStalemate, isDraw });

  let gameResult = '';
  let termination: 'checkmate' | 'stalemate' | 'resignation' | 'draw' | 'timeout' = 'draw';

  if (isCheckmate) {
    const winner = game.getTurn() === 'w' ? 'Black' : 'White';
    const loser = game.getTurn() === 'w' ? 'White' : 'Black';
    title.textContent = `${winner} Wins!`;
    subtitle.textContent = 'Checkmate';
    reason.textContent = `${loser} king has no legal moves`;
    overlay.classList.remove('hidden');
    gameResult = game.getTurn() === 'w' ? '0-1' : '1-0';
    termination = 'checkmate';
  } else if (isStalemate) {
    title.textContent = 'Draw';
    subtitle.textContent = 'Stalemate';
    reason.textContent = 'No legal moves available';
    overlay.classList.remove('hidden');
    gameResult = '1/2-1/2';
    termination = 'stalemate';
  } else if (isDraw) {
    title.textContent = 'Draw';
    subtitle.textContent = 'Game Drawn';
    reason.textContent = 'By repetition, 50-move rule, or insufficient material';
    overlay.classList.remove('hidden');
    gameResult = '1/2-1/2';
    termination = 'draw';
  } else {
    overlay.classList.add('hidden');
    return;
  }

  if (currentGameMode === 'exam' && examManager.isActive()) {
    frontendLogger.info('GameResult', 'Processing Exam Mode game completion');
    const pgn = game.getPgn();
    const gameRecord = examManager.generateGameRecord(
      gameResult,
      termination,
      pgn,
      'Unknown Opening'
    );

    frontendLogger.info('GameResult', 'Exam Mode game record generated', {
      gameId: gameRecord.gameId,
      result: gameRecord.metadata.result,
      termination: gameRecord.metadata.termination,
      duration: gameRecord.metadata.duration,
      totalMoves: gameRecord.metadata.totalMoves,
    });

    examManager.onGameEnd?.(gameRecord);
    const playerColor = examManager.getPlayerColor();
    frontendLogger.info('GameResult', 'Starting async save and analysis', { playerColor });

    saveAndAnalyzeGame(gameRecord).then((success) => {
      frontendLogger.info('GameResult', 'Save and analysis completed', { success });
      if (success) {
        if (viewAnalysisBtn) viewAnalysisBtn.classList.remove('hidden');
        analysisUI.showGameOverWithStats(gameRecord.gameId, gameResult, termination, playerColor);
      } else {
        frontendLogger.error('GameResult', 'Failed to save/analyze game');
        if (viewAnalysisBtn) viewAnalysisBtn.classList.add('hidden');
        if (statsContainer) statsContainer.classList.add('hidden');
      }
    });
  } else {
    if (viewAnalysisBtn) viewAnalysisBtn.classList.add('hidden');
    if (statsContainer) statsContainer.classList.add('hidden');
  }
}

// ============================================
// Sandbox Mode Functions
// ============================================

function renderSandboxBoard(): void {
  renderSandbox(sandboxControllerDeps);
}

// ============================================
// Mode Selection Helper
// ============================================

function showModeSelection(): void {
  if (gameResultTimeoutId !== null) {
    clearTimeout(gameResultTimeoutId);
    gameResultTimeoutId = null;
  }

  if (trainingManager.isActive()) trainingManager.stop();
  if (examManager.isActive()) examManager.stop();
  if (sandboxManager.isActive()) sandboxManager.stop();
  currentGameMode = 'none';

  game.reset();
  redoStack = [];
  boardFlipped = false;

  const resultOverlay = document.getElementById('game-result-overlay');
  if (resultOverlay) resultOverlay.classList.add('hidden');
  const confirmOverlay = document.getElementById('confirm-dialog-overlay');
  if (confirmOverlay) confirmOverlay.classList.add('hidden');

  showGuidancePanel(false);
  guidanceManager.deactivate();

  updateAllUI();
  trainingUI.show();
}

// ============================================
// IPC Test Function (for debugging)
// ============================================

async function testIPCCommunication(): Promise<void> {
  console.log('Testing IPC communication...');

  console.log('1. Testing sayHello...');
  const helloResult = await ipc.call(IPC_METHODS.SAY_HELLO, { message: 'Hello from frontend!' });
  console.log('   Response:', helloResult);

  console.log('2. Testing getEngineStatus...');
  const statusResult = (await ipc.call(IPC_METHODS.GET_ENGINE_STATUS)) as EngineStatusResponse;
  console.log('   Engine initialized:', statusResult.initialized);

  console.log('3. Testing startNewGame...');
  const newGameResult = await ipc.call(IPC_METHODS.START_NEW_GAME);
  console.log('   Result:', newGameResult);

  console.log('4. Testing requestBestMoves...');
  const bestMovesResult = (await ipc.call(IPC_METHODS.REQUEST_BEST_MOVES, {
    fen: STARTPOS_FEN,
    depth: 10,
    count: 3,
  })) as BestMovesResponse | ErrorResponse;

  if (isErrorResponse(bestMovesResult)) {
    console.error('   Error:', bestMovesResult.error);
  } else {
    console.log('   Top 3 moves:', bestMovesResult.moves.map((m: BestMove) => m.move).join(', '));
  }

  console.log('5. Testing evaluatePosition...');
  const evalResult = (await ipc.call(IPC_METHODS.EVALUATE_POSITION, {
    fen: STARTPOS_FEN,
    depth: 12,
  })) as EvaluationResponse;

  if (!isErrorResponse(evalResult)) {
    console.log('   Evaluation:', evalResult.formattedScore);
    console.log('   Best move:', evalResult.evaluation.bestMove);
  }

  console.log('6. Testing getGuidanceMoves...');
  const guidanceResult = (await ipc.call(IPC_METHODS.GET_GUIDANCE_MOVES, {
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

  console.log('7. Testing analyzeMove...');
  const analysisResult = await ipc.call(IPC_METHODS.ANALYZE_MOVE, {
    fen: STARTPOS_FEN,
    playedMove: 'g2g4',
    depth: 10,
  });
  console.log('   Result:', analysisResult);

  console.log('\n=== IPC Communication Tests Complete ===');
}

// ============================================
// Control Toolbar Initialization
// ============================================

function initializeControlToolbar(): void {
  controlToolbar.mount();
  controlToolbar.show();

  const buttons = controlToolbar.getButtons();
  if (buttons) {
    buttons.newGame.addEventListener('click', () => {
      if (game.getHistory().length > 0) {
        showConfirmDialog(
          'Start New Game?',
          'Current game progress will be lost. Continue?',
          showModeSelection
        );
      } else {
        showModeSelection();
      }
    });

    buttons.undo.addEventListener('click', handleUndo);
    buttons.redo.addEventListener('click', handleRedo);
    buttons.resign.addEventListener('click', handleResign);
    buttons.flipBoard.addEventListener('click', handleFlipBoard);
  }

  frontendLogger.info('App', 'CS-003: Control Toolbar initialized');
}

// ============================================
// Collapsible Sections Initialization
// ============================================

function initializeCollapsibleSections(): void {
  const container = document.getElementById('collapsible-sections-container');
  if (!container) {
    frontendLogger.error('App', 'CS-003: Collapsible sections container not found');
    return;
  }

  moveHistorySection = new CollapsibleSection({
    id: 'move-history',
    title: 'Move History',
    icon: '📜',
    expanded: true,
  });

  const moveList = document.createElement('div');
  moveList.id = 'move-list';
  moveHistorySection.getContent().appendChild(moveList);
  container.appendChild(moveHistorySection.getElement());

  capturedPiecesSection = new CollapsibleSection({
    id: 'captured-pieces',
    title: 'Captured Pieces',
    icon: '♟',
    expanded: true,
  });

  const capturedPiecesContent = document.createElement('div');
  capturedPiecesContent.className = 'captured-pieces-content';

  const whiteCapturedSection = document.createElement('div');
  whiteCapturedSection.className = 'captured-section';
  whiteCapturedSection.innerHTML = `
    <div class="captured-label">White captured:</div>
    <div id="captured-by-white" class="captured-list"></div>
    <div class="material-advantage" id="white-advantage"></div>
  `;

  const blackCapturedSection = document.createElement('div');
  blackCapturedSection.className = 'captured-section';
  blackCapturedSection.innerHTML = `
    <div class="captured-label">Black captured:</div>
    <div id="captured-by-black" class="captured-list"></div>
    <div class="material-advantage" id="black-advantage"></div>
  `;

  capturedPiecesContent.appendChild(whiteCapturedSection);
  capturedPiecesContent.appendChild(blackCapturedSection);
  capturedPiecesSection.getContent().appendChild(capturedPiecesContent);
  container.appendChild(capturedPiecesSection.getElement());

  frontendLogger.info('App', 'CS-003: Collapsible sections initialized');
}

// ============================================
// Application Initialization
// ============================================

(async () => {
  // Initialize WebSocket IPC connection
  try {
    await initializeIPC();
    frontendLogger.info('App', 'WebSocket IPC connection established');
    console.log('[IPC] Connection established successfully');
  } catch (error) {
    frontendLogger.error('App', 'Failed to initialize IPC connection', { error });
    console.error('[IPC] Failed to connect:', error);
  }

  // Render the chessboard immediately
  renderChessboard();

  // Initialize UI elements
  updateTurnIndicator(game);
  updateGameAlert(game);

  // Initialize mode UIs
  trainingUI.initialize();
  examUI.initialize();
  sandboxUI.initialize();

  // Set up Training Mode callbacks
  trainingUI.onGameStart = (config, playerColor) => {
    const modeDeps = {
      game,
      trainingManager,
      examManager,
      getBoardFlipped,
      setBoardFlipped,
      setRedoStack,
      renderChessboard,
      updateTurnIndicator: () => updateTurnIndicator(game),
      updateMoveHistory: () => updateMoveHistory(game, moveHistorySection),
      updateCapturedPieces: () => updateCapturedPieces(game, capturedPiecesSection),
      updateGameAlert: () => updateGameAlert(game),
      updateUndoRedoButtons: () => updateUndoRedoButtons(gameControllerDeps),
      showGuidancePanel,
      requestBotMove,
      requestExamBotMove,
      updateGuidance,
      guidanceManager,
    };
    startTrainingGame(modeDeps, config, playerColor, setCurrentGameMode);
  };

  // Set up Exam Mode callbacks
  examUI.onGameStart = (config, playerColor) => {
    const modeDeps = {
      game,
      trainingManager,
      examManager,
      getBoardFlipped,
      setBoardFlipped,
      setRedoStack,
      renderChessboard,
      updateTurnIndicator: () => updateTurnIndicator(game),
      updateMoveHistory: () => updateMoveHistory(game, moveHistorySection),
      updateCapturedPieces: () => updateCapturedPieces(game, capturedPiecesSection),
      updateGameAlert: () => updateGameAlert(game),
      updateUndoRedoButtons: () => updateUndoRedoButtons(gameControllerDeps),
      showGuidancePanel,
      requestBotMove,
      requestExamBotMove,
      updateGuidance,
      guidanceManager,
    };
    startExamGame(modeDeps, config, playerColor, setCurrentGameMode);
  };

  // Set up Sandbox Mode callbacks
  sandboxUI.onModeStart = () => {
    currentGameMode = 'sandbox';
    frontendLogger.info('App', 'Sandbox Mode started');
    renderSandboxBoard();
  };

  sandboxUI.onBack = () => {
    currentGameMode = 'none';
    frontendLogger.info('App', 'Sandbox Mode exited');
  };

  // Set up Sandbox Manager callbacks
  sandboxManager.onPositionChange = () => {
    renderSandboxBoard();
    sandboxUI.updateFenDisplay();
    updateSandboxValidation(sandboxControllerDeps);
  };

  sandboxManager.onValidationChange = () => {
    updateSandboxValidation(sandboxControllerDeps);
  };

  sandboxManager.onAnalysisStart = () => {
    const analyzeBtn = document.getElementById('sandbox-analyze-button');
    const resultsDiv = document.getElementById('sandbox-analysis-results');
    const scoreDiv = document.getElementById('sandbox-eval-score');
    const movesDiv = document.getElementById('sandbox-best-moves');

    if (analyzeBtn) {
      analyzeBtn.textContent = 'Analyzing...';
      (analyzeBtn as HTMLButtonElement).disabled = true;
    }
    if (resultsDiv) resultsDiv.classList.remove('hidden');
    if (scoreDiv) scoreDiv.textContent = '...';
    if (movesDiv) {
      movesDiv.innerHTML = `
        <div class="analyzing-indicator">
          <div class="spinner"></div>
          <span>Analyzing position...</span>
        </div>
      `;
    }
  };

  sandboxManager.onAnalysisComplete = (result: SandboxAnalysisResult) => {
    const analyzeBtn = document.getElementById('sandbox-analyze-button');
    if (analyzeBtn) {
      analyzeBtn.textContent = 'Re-analyze';
      (analyzeBtn as HTMLButtonElement).disabled = false;
    }
    renderSandboxBoard();
    renderSandboxAnalysisResults(result);
  };

  sandboxManager.onAnalysisError = (error: string) => {
    const analyzeBtn = document.getElementById('sandbox-analyze-button');
    const movesDiv = document.getElementById('sandbox-best-moves');

    if (analyzeBtn) {
      analyzeBtn.textContent = 'Analyze Position';
      (analyzeBtn as HTMLButtonElement).disabled = false;
    }
    if (movesDiv) {
      movesDiv.innerHTML = `
        <div class="analysis-error">
          <span class="error-icon">⚠️</span>
          <span>${error}</span>
        </div>
      `;
    }
  };

  // Wire up buttons
  const newGameButton = document.getElementById('new-game-button');
  if (newGameButton) {
    newGameButton.addEventListener('click', showModeSelection);
  }

  const viewAnalysisButton = document.getElementById('view-analysis-button');
  if (viewAnalysisButton) {
    viewAnalysisButton.addEventListener('click', () => {
      const gameId = examManager.getGameId();
      if (gameId) {
        const resultOverlay = document.getElementById('game-result-overlay');
        if (resultOverlay) resultOverlay.classList.add('hidden');
        analysisUI.openAnalysis(gameId);
      }
    });
  }

  analysisUI.onClose = showModeSelection;

  const newGameControl = document.getElementById('new-game-control');
  if (newGameControl) {
    newGameControl.addEventListener('click', () => {
      if (game.getHistory().length > 0) {
        showConfirmDialog(
          'Start New Game?',
          'Current game progress will be lost. Continue?',
          showModeSelection
        );
      } else {
        showModeSelection();
      }
    });
  }

  const resignButton = document.getElementById('resign-button');
  if (resignButton) resignButton.addEventListener('click', handleResign);

  const flipBoardButton = document.getElementById('flip-board-button');
  if (flipBoardButton) flipBoardButton.addEventListener('click', handleFlipBoard);

  const undoButton = document.getElementById('undo-button');
  if (undoButton) undoButton.addEventListener('click', handleUndo);

  const redoButton = document.getElementById('redo-button');
  if (redoButton) redoButton.addEventListener('click', handleRedo);

  // Initialize toolbar and sections
  initializeControlToolbar();
  initializeCollapsibleSections();
  updateUndoRedoButtons(gameControllerDeps);

  // Initialize frontend logger
  await frontendLogger.initialize();
  if (frontendLogger.isEnabled()) {
    frontendLogger.separator('App', 'Chess-Sensei Frontend Session Started');
    frontendLogger.info('App', 'Debug logging enabled', { logPath: frontendLogger.getLogPath() });
  }

  // Make test function available globally
  (window as unknown as { testIPC: () => Promise<void> }).testIPC = testIPCCommunication;

  // Progress Dashboard setup
  const viewProgressBtn = document.getElementById('view-progress-btn');
  if (viewProgressBtn) {
    viewProgressBtn.addEventListener('click', () => {
      frontendLogger.info('App', 'Opening Progress Dashboard');
      progressDashboard.open();
    });
  }

  progressDashboard.onClose = () => {
    frontendLogger.info('App', 'Progress Dashboard closed');
  };

  progressDashboard.onViewGame = (gameId: string) => {
    frontendLogger.info('App', 'Opening game from dashboard', { gameId });
    progressDashboard.close();
    analysisUI.openAnalysis(gameId);
  };

  frontendLogger.info('App', 'Phase 6: Progress Dashboard UI initialized');

  // Data Management setup
  dataManagement.initialize('data-mgmt-overlay');

  const viewDataMgmtBtn = document.getElementById('view-data-mgmt-btn');
  if (viewDataMgmtBtn) {
    viewDataMgmtBtn.addEventListener('click', () => {
      frontendLogger.info('App', 'Opening Data Management');
      dataManagement.show();
    });
  }

  frontendLogger.info('App', 'Phase 8: Data Management UI initialized');

  // Native menu initialization
  const menuHandlers: MenuActionHandlers = {
    onNewGame: () => {
      frontendLogger.info('Menu', 'New Game requested via menu');
      showModeSelection();
    },
    onImportPGN: () => {
      frontendLogger.info('Menu', 'Import PGN requested via menu');
      dataManagement.show();
    },
    onExportPGN: () => {
      frontendLogger.info('Menu', 'Export PGN requested via menu');
      dataManagement.show();
    },
    onExit: () => {
      frontendLogger.info('Menu', 'Exit requested via menu');
    },
    onUndo: () => {
      frontendLogger.info('Menu', 'Undo requested via menu');
      handleUndo();
    },
    onRedo: () => {
      frontendLogger.info('Menu', 'Redo requested via menu');
      handleRedo();
    },
    onFlipBoard: () => {
      frontendLogger.info('Menu', 'Flip Board requested via menu');
      handleFlipBoard();
    },
    onResign: () => {
      frontendLogger.info('Menu', 'Resign requested via menu');
      handleResign();
    },
    onViewDashboard: () => {
      frontendLogger.info('Menu', 'View Dashboard requested via menu');
      progressDashboard.open();
    },
    onViewDataManagement: () => {
      frontendLogger.info('Menu', 'View Data Management requested via menu');
      dataManagement.show();
    },
    onToggleInspector: () => {
      frontendLogger.info('Menu', 'Toggle Inspector requested via menu');
    },
    onUserGuide: () => {
      frontendLogger.info('Menu', 'User Guide requested via menu');
    },
    onAbout: () => {
      frontendLogger.info('Menu', 'About requested via menu');
    },
  };

  await initializeNativeMenu(menuHandlers);
  frontendLogger.info('App', 'Native window menus initialized');
  console.log('Chess-Sensei Frontend ready');
})();
