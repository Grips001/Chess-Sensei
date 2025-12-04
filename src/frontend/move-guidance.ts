/**
 * Move Guidance System
 *
 * Provides real-time best-move guidance for Training Mode.
 * Shows top 3 moves with color-coded highlighting (Blue/Green/Yellow).
 *
 * @see source-docs/move-guidance.md - "Best-Move Guidance System"
 * @see source-docs/ui-ux-design.md - "Visual Highlighting System"
 */

import * as buntralino from 'buntralino-client';
import type { BestMove } from '../shared/engine-types';
import { formatScore } from '../shared/engine-types';
import { IPC_METHODS } from '../shared/ipc-types';
import type { BestMovesResponse, ErrorResponse } from '../shared/ipc-types';

/**
 * Guidance move colors per move-guidance.md
 */
export const GUIDANCE_COLORS = {
  BEST: 'blue',
  SECOND: 'green',
  THIRD: 'yellow',
} as const;

/**
 * Guidance move with color and parsed information
 */
export interface GuidanceMove {
  /** Move in UCI format (e.g., "e2e4") */
  uci: string;
  /** Move in SAN format (e.g., "e4") - set by frontend */
  san?: string;
  /** Source square (e.g., "e2") */
  from: string;
  /** Destination square (e.g., "e4") */
  to: string;
  /** Evaluation score in centipawns */
  score: number;
  /** Formatted score string (e.g., "+0.35", "M3") */
  formattedScore: string;
  /** Color for highlighting */
  color: 'blue' | 'green' | 'yellow';
  /** Principal variation */
  pv?: string[];
}

/**
 * Guidance state
 */
export interface GuidanceState {
  /** Whether guidance is currently active */
  isActive: boolean;
  /** Whether guidance is loading */
  isLoading: boolean;
  /** Current guidance moves (top 3) */
  moves: GuidanceMove[];
  /** Currently hovered move index (-1 if none) */
  hoveredIndex: number;
  /** Currently selected piece square (null if none) */
  selectedPieceSquare: string | null;
}

/**
 * Parse UCI move to extract source and destination squares
 */
function parseUciMove(uci: string): { from: string; to: string } {
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
  };
}

/**
 * Convert engine BestMove to GuidanceMove
 */
function toGuidanceMove(move: BestMove, index: number): GuidanceMove {
  const colors = [GUIDANCE_COLORS.BEST, GUIDANCE_COLORS.SECOND, GUIDANCE_COLORS.THIRD] as const;
  const { from, to } = parseUciMove(move.move);

  return {
    uci: move.move,
    from,
    to,
    score: move.score,
    formattedScore: formatScore(move.score),
    color: colors[index] || GUIDANCE_COLORS.THIRD,
    pv: move.pv,
  };
}

/**
 * Move Guidance Manager class
 *
 * Handles fetching and managing guidance moves for Training Mode.
 */
export class MoveGuidanceManager {
  private state: GuidanceState;
  private abortController: AbortController | null = null;

  // Callbacks for UI updates
  public onGuidanceUpdate?: (moves: GuidanceMove[]) => void;
  public onLoadingChange?: (isLoading: boolean) => void;
  public onHoverChange?: (index: number) => void;
  public onError?: (error: string) => void;

  constructor() {
    this.state = {
      isActive: false,
      isLoading: false,
      moves: [],
      hoveredIndex: -1,
      selectedPieceSquare: null,
    };
  }

  /**
   * Get current state
   */
  getState(): GuidanceState {
    return { ...this.state };
  }

  /**
   * Get current guidance moves
   */
  getMoves(): GuidanceMove[] {
    return [...this.state.moves];
  }

  /**
   * Check if guidance is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if guidance is loading
   */
  isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Activate guidance system
   */
  activate(): void {
    this.state.isActive = true;
  }

  /**
   * Deactivate guidance system
   */
  deactivate(): void {
    this.state.isActive = false;
    this.clearGuidance();
  }

  /**
   * Clear current guidance
   */
  clearGuidance(): void {
    this.state.moves = [];
    this.state.hoveredIndex = -1;
    this.state.selectedPieceSquare = null;
    this.onGuidanceUpdate?.([]);
  }

  /**
   * Request guidance moves for a position
   * Per Task 3.3.1: Calculate top 3 moves in real-time
   */
  async requestGuidance(fen: string, moves?: string[]): Promise<void> {
    if (!this.state.isActive) {
      return;
    }

    // Cancel any pending request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.state.isLoading = true;
    this.onLoadingChange?.(true);

    try {
      const response = (await buntralino.run(IPC_METHODS.GET_GUIDANCE_MOVES, {
        fen,
        moves,
        count: 3,
        depth: 15,
      })) as BestMovesResponse | ErrorResponse;

      // Check if request was aborted
      if (this.abortController?.signal.aborted) {
        return;
      }

      if (!response.success) {
        throw new Error((response as ErrorResponse).error || 'Failed to get guidance moves');
      }

      // Convert to GuidanceMove objects
      const guidanceMoves = (response as BestMovesResponse).moves
        .slice(0, 3)
        .map((move, index) => toGuidanceMove(move, index));

      this.state.moves = guidanceMoves;
      this.state.isLoading = false;
      this.onLoadingChange?.(false);
      this.onGuidanceUpdate?.(guidanceMoves);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      this.state.isLoading = false;
      this.onLoadingChange?.(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onError?.(errorMessage);
      console.error('Error getting guidance moves:', error);
    }
  }

  /**
   * Handle hover on a suggested move
   * Per Task 3.3.4: Implement hover interactions
   */
  setHoveredMove(index: number): void {
    this.state.hoveredIndex = index;
    this.onHoverChange?.(index);
  }

  /**
   * Clear hover state
   */
  clearHover(): void {
    this.state.hoveredIndex = -1;
    this.onHoverChange?.(-1);
  }

  /**
   * Handle piece selection on the board
   * Per Task 3.3.5: Implement piece selection behavior
   */
  setSelectedPiece(square: string | null): void {
    this.state.selectedPieceSquare = square;
  }

  /**
   * Get moves that involve the selected piece
   */
  getMovesForSelectedPiece(): GuidanceMove[] {
    if (!this.state.selectedPieceSquare) {
      return [];
    }
    return this.state.moves.filter((move) => move.from === this.state.selectedPieceSquare);
  }

  /**
   * Check if a square should be highlighted
   */
  shouldHighlightSquare(square: string): { highlight: boolean; color: string | null } {
    // Check if square is involved in any guidance move
    for (const move of this.state.moves) {
      if (move.from === square || move.to === square) {
        // If there's a hovered move, only highlight that one
        if (this.state.hoveredIndex >= 0) {
          const hoveredMove = this.state.moves[this.state.hoveredIndex];
          if (hoveredMove && (hoveredMove.from === square || hoveredMove.to === square)) {
            return { highlight: true, color: hoveredMove.color };
          }
          return { highlight: false, color: null };
        }

        // If there's a selected piece, emphasize moves for that piece
        if (this.state.selectedPieceSquare) {
          if (move.from === this.state.selectedPieceSquare) {
            return { highlight: true, color: move.color };
          }
          // Still show other moves but with reduced emphasis
          if (move.from !== this.state.selectedPieceSquare) {
            return { highlight: true, color: move.color };
          }
        }

        return { highlight: true, color: move.color };
      }
    }
    return { highlight: false, color: null };
  }

  /**
   * Get the guidance move for a specific square (if any)
   */
  getMoveForSquare(square: string): GuidanceMove | null {
    for (const move of this.state.moves) {
      if (move.from === square || move.to === square) {
        return move;
      }
    }
    return null;
  }
}

/**
 * Create a move guidance manager instance
 */
export function createMoveGuidance(): MoveGuidanceManager {
  return new MoveGuidanceManager();
}

export default MoveGuidanceManager;
