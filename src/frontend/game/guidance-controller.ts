/**
 * Guidance Controller Module
 * Handles move guidance UI and highlighting
 */

import { ChessGame } from '../../shared/chess-logic';
import { parseSanToEnglish } from '../../shared/notation-parser';
import { generateExplanation } from '../../shared/explanation-generator';
import type { GuidanceMove } from '../move-guidance';
import type { BoardAnnotations } from '../board-annotations';
import type { ExplanationModal } from '../components/explanation-modal';
import { applyMultiColorHighlight } from '../board/board-highlights';

export interface GuidanceControllerDeps {
  game: ChessGame;
  guidanceManager: {
    isActive: () => boolean;
    activate: () => void;
    deactivate: () => void;
    getMoves: () => GuidanceMove[];
    getState: () => { hoveredIndex: number };
    setHoveredMove: (index: number) => void;
    clearGuidance: () => void;
    requestGuidance: (fen: string) => Promise<void>;
  };
  trainingManager: {
    isActive: () => boolean;
    isPlayerTurn: () => boolean;
    getConfig: () => { guidanceEnabled: boolean };
  };
  getBoardAnnotations: () => BoardAnnotations | null;
  setBoardAnnotations: (annotations: BoardAnnotations | null) => void;
  getExplanationModal: () => ExplanationModal | null;
  setExplanationModal: (modal: ExplanationModal | null) => void;
  ExplanationModalClass: new () => ExplanationModal;
}

/**
 * Show/hide guidance panel
 * Per Task 3.3.6: Guidance timing (player's turn only)
 */
export function showGuidancePanel(show: boolean): void {
  const panel = document.getElementById('guidance-panel');
  if (panel) {
    panel.classList.toggle('hidden', !show);
  }
}

/**
 * Update guidance loading state
 */
export function showGuidanceLoading(show: boolean): void {
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
export function renderGuidanceMoves(
  deps: GuidanceControllerDeps,
  moves: GuidanceMove[],
  handleGuidanceHover: (index: number) => void
): void {
  const { game } = deps;
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

      // Generate English description
      const englishDescription = parseSanToEnglish(san);

      const colorClass = `move-${move.color}`;
      const rankClass = `rank-${index + 1}`;

      return `
        <div class="guidance-move-entry"
             data-index="${index}"
             data-from="${move.from}"
             data-to="${move.to}">
          <div class="guidance-move-rank ${rankClass}">${index + 1}</div>
          <div class="guidance-move-content">
            <span class="guidance-move-notation ${colorClass}">${san}</span>
            <span class="guidance-move-description"> — ${englishDescription}</span>
          </div>
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
export function handleGuidanceHover(
  deps: GuidanceControllerDeps,
  index: number,
  updateGuidanceHighlights: () => void
): void {
  const { guidanceManager } = deps;

  guidanceManager.setHoveredMove(index);
  updateGuidanceHighlights();

  // Update hover state in panel
  const entries = document.querySelectorAll('.guidance-move-entry');
  entries.forEach((entry, i) => {
    entry.classList.toggle('hovered', i === index);
  });
}

/**
 * Handle bubble icon click - show explanation modal
 * Move Reasoning Explanations Feature - Phase 3
 */
export function handleBubbleClick(
  deps: GuidanceControllerDeps,
  square: string,
  move: GuidanceMove
): void {
  const { game, guidanceManager, getExplanationModal, setExplanationModal, ExplanationModalClass } =
    deps;

  // Initialize modal on first use
  let explanationModal = getExplanationModal();
  if (!explanationModal) {
    explanationModal = new ExplanationModalClass();
    setExplanationModal(explanationModal);
  }

  // Get move rank
  const moves = guidanceManager.getMoves();
  const rank = moves.findIndex((m) => m.to === square) + 1;

  // Generate real explanation using chess analysis
  const explanation = generateExplanation(game.getFen(), move, rank, moves);

  explanationModal.show(explanation);
}

/**
 * Update guidance highlights on the board
 * Per Task 3.3.2: Implement color-coded highlighting
 * Per Task 3.3.3: Implement three-way visual sync
 * Supports multiple colors on same square (nested highlights)
 */
export function updateGuidanceHighlights(deps: GuidanceControllerDeps): void {
  const {
    guidanceManager,
    trainingManager,
    getBoardAnnotations,
    setBoardAnnotations,
    getExplanationModal,
  } = deps;

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

  // Render bubble icons for Training Mode (Move Reasoning Explanations Feature - Phase 1)
  // Skip bubble rendering if explanation modal is currently open to prevent interference
  const explanationModal = getExplanationModal();
  if (trainingManager.isActive() && moves.length > 0) {
    let boardAnnotations = getBoardAnnotations();
    if (!boardAnnotations) {
      const boardElement = document.getElementById('chess-board');
      if (boardElement) {
        // Import BoardAnnotations class dynamically
        import('../board-annotations').then(({ BoardAnnotations }) => {
          boardAnnotations = new BoardAnnotations(boardElement, (square, guidanceMove) => {
            handleBubbleClick(deps, square, guidanceMove);
          });
          setBoardAnnotations(boardAnnotations);
          if (!explanationModal?.isOpen()) {
            boardAnnotations.renderBubbles(moves);
          }
        });
      }
    } else if (!explanationModal?.isOpen()) {
      boardAnnotations.renderBubbles(moves);
    }
  } else {
    // Clear bubbles when guidance is not active or in other modes (but not if modal is open)
    const boardAnnotations = getBoardAnnotations();
    if (!explanationModal?.isOpen()) {
      boardAnnotations?.clearBubbles();
    }
  }
}

/**
 * Request and update guidance for current position
 * Per Task 3.3.1: Calculate top 3 moves in real-time
 * Per Task 3.3.8: Optimize performance
 */
export async function updateGuidance(
  deps: GuidanceControllerDeps,
  updateGuidanceHighlightsFn: () => void,
  handleGuidanceHoverFn: (index: number) => void
): Promise<void> {
  const { game, guidanceManager, trainingManager } = deps;

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
    updateGuidanceHighlightsFn();
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
  renderGuidanceMoves(deps, guidanceManager.getMoves(), handleGuidanceHoverFn);
  updateGuidanceHighlightsFn();
}
