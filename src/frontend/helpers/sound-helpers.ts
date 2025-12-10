/**
 * Sound Helpers
 *
 * Centralizes sound playing logic for chess moves.
 * Reduces code duplication across 3+ locations in index.ts.
 */

import type { SoundManager, SoundType } from '../sound-manager';
import type { MoveResult } from '../../shared/chess-logic';

/**
 * Move information needed to determine the appropriate sound.
 * Compatible with both MoveResult and chess.js Move types.
 */
export interface MoveSoundInfo {
  /** Whether the move results in checkmate */
  isCheckmate?: boolean;
  /** Whether the move results in check */
  isCheck?: boolean;
  /** Whether the move is castling */
  isCastling?: boolean;
  /** Promotion piece (if pawn promoted) */
  promotion?: string;
  /** Captured piece (if any) */
  captured?: string;
}

/**
 * Game state information for determining game-end sounds.
 */
export interface GameStateInfo {
  /** Whether the game is in stalemate */
  isStalemate: boolean;
  /** Whether the game is a draw */
  isDraw: boolean;
}

/**
 * Determines and plays the appropriate sound for a chess move.
 *
 * Sound priority (highest to lowest):
 * 1. Checkmate
 * 2. Check
 * 3. Castling
 * 4. Promotion
 * 5. Capture
 * 6. Normal move
 *
 * @param soundManager - The SoundManager instance
 * @param move - Move information
 * @param gameState - Optional game state for stalemate/draw sounds
 *
 * @example
 * ```typescript
 * playMoveSound(soundManager, move);
 * // Or with game state check:
 * playMoveSound(soundManager, move, {
 *   isStalemate: game.isStalemate(),
 *   isDraw: game.isDraw()
 * });
 * ```
 */
export function playMoveSound(
  soundManager: SoundManager,
  move: MoveSoundInfo,
  gameState?: GameStateInfo
): void {
  // Determine sound type based on move properties (priority order)
  let soundType: SoundType;

  if (move.isCheckmate) {
    soundType = 'checkmate';
  } else if (move.isCheck) {
    soundType = 'check';
  } else if (move.isCastling) {
    soundType = 'castle';
  } else if (move.promotion) {
    soundType = 'promotion';
  } else if (move.captured) {
    soundType = 'capture';
  } else {
    soundType = 'move';
  }

  soundManager.play(soundType);

  // Play stalemate sound if game ended in stalemate or draw
  if (gameState && (gameState.isStalemate || gameState.isDraw)) {
    soundManager.play('stalemate');
  }
}

/**
 * Plays the appropriate sound for a MoveResult from ChessGame.
 * This is a convenience wrapper that extracts the needed properties.
 *
 * @param soundManager - The SoundManager instance
 * @param moveResult - MoveResult from ChessGame.makeMove()
 * @param gameState - Optional game state for stalemate/draw sounds
 */
export function playMoveSoundFromResult(
  soundManager: SoundManager,
  moveResult: MoveResult,
  gameState?: GameStateInfo
): void {
  playMoveSound(
    soundManager,
    {
      isCheckmate: moveResult.isCheckmate,
      isCheck: moveResult.isCheck,
      isCastling: moveResult.isCastling,
      promotion: moveResult.promotion,
      captured: moveResult.captured,
    },
    gameState
  );
}
