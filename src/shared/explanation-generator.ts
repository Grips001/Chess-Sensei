/**
 * Explanation Generator
 *
 * Generates human-readable explanations for chess moves by analyzing
 * move characteristics and mapping them to chess concepts.
 */

import { Chess, type Move } from 'chess.js';
import { parseSanToEnglish } from './notation-parser';
import type { GuidanceMove } from '../frontend/move-guidance';
import type { ExplanationContent } from '../frontend/components/explanation-modal';

/**
 * Move characteristics extracted for explanation
 */
interface MoveCharacteristics {
  isDevelopment: boolean;
  isCapture: boolean;
  isCastling: boolean;
  controlsCenter: boolean;
  attacksKing: boolean;
  improvesKingSafety: boolean;
  createsThreat: boolean;
  scoreAdvantage: number; // In pawns
  // Tactical patterns (Phase 4)
  isPinning: boolean;
  isForking: boolean;
  isSkewer: boolean;
  isDiscoveredAttack: boolean;
}

/**
 * Generate explanation for a move
 */
export function generateExplanation(
  fen: string,
  move: GuidanceMove,
  rank: number,
  allMoves: GuidanceMove[]
): ExplanationContent {
  try {
    const chars = analyzeMoveCharacteristics(fen, move);

    return {
      notation: move.san || move.uci,
      description: parseSanToEnglish(move.san || move.uci),
      strengths: buildStrengthsList(chars, move),
      ranking: buildRankingExplanation(rank, move, allMoves, chars),
      rank,
      concepts: identifyConcepts(chars),
    };
  } catch (error) {
    console.error('Failed to generate explanation:', error);
    return getFallbackExplanation(move, rank);
  }
}

/**
 * Analyze move characteristics using chess.js
 */
function analyzeMoveCharacteristics(fen: string, move: GuidanceMove): MoveCharacteristics {
  try {
    const chess = new Chess(fen);
    const moveObj = chess.move(move.uci);

    if (!moveObj) {
      return getDefaultCharacteristics(move);
    }

    // Store position before move for tactical analysis
    const chessBefore = new Chess(fen);

    return {
      isDevelopment: isMinorPieceDevelopment(moveObj, fen),
      isCapture: moveObj.captured !== undefined,
      isCastling: moveObj.flags.includes('k') || moveObj.flags.includes('q'),
      controlsCenter: controlsCentralSquares(moveObj.to),
      attacksKing: attacksOpponentKing(chess, moveObj),
      improvesKingSafety: improvesKingSafety(moveObj),
      createsThreat: createsThreat(chess, moveObj),
      scoreAdvantage: move.score / 100, // Convert centipawns to pawns
      // Tactical patterns (Phase 4)
      isPinning: detectsPin(chess, moveObj, chessBefore),
      isForking: detectsFork(chess, moveObj),
      isSkewer: detectsSkewer(chess, moveObj, chessBefore),
      isDiscoveredAttack: detectsDiscoveredAttack(chess, moveObj, chessBefore),
    };
  } catch (error) {
    console.error('Error analyzing move characteristics:', error);
    return getDefaultCharacteristics(move);
  }
}

/**
 * Build list of strengths based on characteristics
 */
function buildStrengthsList(chars: MoveCharacteristics, _move: GuidanceMove): string[] {
  const strengths: string[] = [];

  if (chars.isCastling) {
    strengths.push('Improves king safety by castling');
    strengths.push('Connects the rooks');
  }

  if (chars.isDevelopment) {
    strengths.push('Develops a piece toward the center');
  }

  if (chars.controlsCenter) {
    strengths.push('Controls key central squares');
  }

  if (chars.isCapture) {
    strengths.push('Captures material, gaining an advantage');
  }

  // Tactical patterns (Phase 4)
  if (chars.isPinning) {
    strengths.push('Pins an opponent piece, restricting their options');
  }

  if (chars.isForking) {
    strengths.push('Attacks multiple pieces simultaneously (fork)');
  }

  if (chars.isSkewer) {
    strengths.push('Forces a valuable piece to move, exposing another (skewer)');
  }

  if (chars.isDiscoveredAttack) {
    strengths.push('Creates a discovered attack by unveiling another piece');
  }

  if (chars.attacksKing) {
    strengths.push("Puts pressure on the opponent's king");
  }

  if (chars.createsThreat) {
    strengths.push('Creates a tactical threat');
  }

  if (chars.improvesKingSafety && !chars.isCastling) {
    strengths.push('Improves king safety');
  }

  // Default if no specific strengths identified
  if (strengths.length === 0) {
    if (chars.scoreAdvantage > 0.2) {
      strengths.push('Maintains a positional advantage');
    } else {
      strengths.push('Solid move that maintains position');
    }
  }

  return strengths;
}

/**
 * Build explanation for why move is ranked at this position
 */
function buildRankingExplanation(
  rank: number,
  move: GuidanceMove,
  allMoves: GuidanceMove[],
  _chars: MoveCharacteristics
): string {
  const scoreDiff = allMoves.length > rank ? (move.score - allMoves[rank].score) / 100 : 0;

  switch (rank) {
    case 1:
      if (Math.abs(scoreDiff) < 0.1 && allMoves.length > 1) {
        return 'Best move, though alternatives are nearly equal in strength';
      }
      return 'Best move in this position, offering the strongest continuation';

    case 2:
      if (Math.abs(scoreDiff) < 0.1) {
        return 'Nearly equal to the best move, a valid alternative';
      }
      return 'Strong alternative, though slightly inferior to the top choice';

    case 3:
      return 'Good move, but less optimal than higher-ranked options';

    default:
      return 'Solid move for this position';
  }
}

/**
 * Identify chess concepts demonstrated by move
 */
function identifyConcepts(chars: MoveCharacteristics): string[] {
  const concepts: string[] = [];

  if (chars.isDevelopment) concepts.push('Development');
  if (chars.controlsCenter) concepts.push('Central Control');
  if (chars.isCastling) concepts.push('King Safety');
  // Tactical patterns (Phase 4)
  if (chars.isPinning) concepts.push('Pin');
  if (chars.isForking) concepts.push('Fork');
  if (chars.isSkewer) concepts.push('Skewer');
  if (chars.isDiscoveredAttack) concepts.push('Discovered Attack');
  if (chars.attacksKing) concepts.push('King Attack');
  if (chars.isCapture) concepts.push('Material Gain');
  if (chars.createsThreat) concepts.push('Tactical Pressure');

  return concepts;
}

/**
 * Check if move is minor piece development
 */
function isMinorPieceDevelopment(moveObj: Move, _fen: string): boolean {
  const piece = moveObj.piece;

  // Only knights and bishops
  if (piece !== 'n' && piece !== 'b') {
    return false;
  }

  // Check if moving from back rank (development)
  const fromRank = moveObj.from[1];
  const backRank = moveObj.color === 'w' ? '1' : '8';

  return fromRank === backRank;
}

/**
 * Check if move improves king safety
 */
function improvesKingSafety(moveObj: Move): boolean {
  // Castling always improves king safety
  if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
    return true;
  }

  // King moves that are not toward the center
  if (moveObj.piece === 'k') {
    const toFile = moveObj.to[0];
    // Moving toward edges is generally safer
    return toFile === 'a' || toFile === 'b' || toFile === 'g' || toFile === 'h';
  }

  return false;
}

/**
 * Check if square controls center (e4, d4, e5, d5)
 */
function controlsCentralSquares(square: string): boolean {
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  return centerSquares.includes(square);
}

/**
 * Check if move attacks opponent's king
 */
function attacksOpponentKing(chess: Chess, _moveObj: Move): boolean {
  // Check if the move gives check
  return chess.inCheck();
}

/**
 * Check if move creates a threat
 */
function createsThreat(chess: Chess, moveObj: Move): boolean {
  // Simple heuristic: move gives check or attacks valuable pieces
  if (chess.inCheck()) {
    return true;
  }

  // Check if moved piece attacks any opponent pieces
  const board = chess.board();
  const attacks = getSquareAttacks(chess, moveObj.to);

  // Check if any attacked squares contain opponent pieces
  for (const square of attacks) {
    const file = square[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    const piece = board[rank][file];

    if (piece && piece.color !== moveObj.color) {
      return true;
    }
  }

  return false;
}

/**
 * Get squares attacked by a piece on a given square
 */
function getSquareAttacks(chess: Chess, square: string): string[] {
  const attacks: string[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moves = chess.moves({ square: square as any, verbose: true });

    for (const move of moves) {
      attacks.push(move.to);
    }
  } catch (_error) {
    // If square is invalid, return empty array
    return [];
  }

  return attacks;
}

/**
 * Detect if move creates a pin
 * A pin occurs when a piece cannot move without exposing a more valuable piece behind it
 */
function detectsPin(chess: Chess, moveObj: Move, _chessBefore: Chess): boolean {
  // After the move, check if we're now attacking an opponent piece that's pinned
  const board = chess.board();
  const ourColor = moveObj.color;

  // Get all opponent pieces that the moved piece now attacks
  const attackedSquares = getSquareAttacks(chess, moveObj.to);

  for (const attackedSquare of attackedSquares) {
    // Get the piece on the attacked square
    const file = attackedSquare[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(attackedSquare[1]);
    const attackedPiece = board[rank][file];

    if (!attackedPiece || attackedPiece.color === ourColor) {
      continue;
    }

    // Check if there's a more valuable piece behind it in the same line
    // This is a simplified pin detection - it checks if moving the attacked piece
    // would expose a more valuable piece to the same attacker
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    const attackedValue = pieceValues[attackedPiece.type];

    // Check line direction from our piece to attacked piece
    const direction = getDirection(moveObj.to, attackedSquare);
    if (!direction) continue;

    // Check if there's another piece behind it
    const behindSquare = getSquareInDirection(attackedSquare, direction);
    if (!behindSquare) continue;

    const behindFile = behindSquare[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const behindRank = 8 - parseInt(behindSquare[1]);
    const behindPiece = board[behindRank][behindFile];

    if (behindPiece && behindPiece.color !== ourColor) {
      const behindValue = pieceValues[behindPiece.type];
      // Pin detected if behind piece is more valuable
      if (behindValue > attackedValue) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect if move creates a fork
 * A fork attacks 2+ valuable pieces simultaneously
 */
function detectsFork(chess: Chess, moveObj: Move): boolean {
  const board = chess.board();
  const ourColor = moveObj.color;

  // Get all squares the moved piece attacks
  const attackedSquares = getSquareAttacks(chess, moveObj.to);

  let valuablePiecesAttacked = 0;

  for (const square of attackedSquares) {
    const file = square[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    const piece = board[rank][file];

    // Count opponent pieces that are not pawns
    if (piece && piece.color !== ourColor && piece.type !== 'p') {
      valuablePiecesAttacked++;
    }
  }

  // Fork if attacking 2 or more valuable pieces
  return valuablePiecesAttacked >= 2;
}

/**
 * Detect if move creates a skewer
 * A skewer forces a valuable piece to move, exposing another behind it
 */
function detectsSkewer(chess: Chess, moveObj: Move, _chessBefore: Chess): boolean {
  // Similar to pin, but the front piece is MORE valuable than the back piece
  const board = chess.board();
  const ourColor = moveObj.color;

  const attackedSquares = getSquareAttacks(chess, moveObj.to);

  for (const attackedSquare of attackedSquares) {
    const file = attackedSquare[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(attackedSquare[1]);
    const attackedPiece = board[rank][file];

    if (!attackedPiece || attackedPiece.color === ourColor) {
      continue;
    }

    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    const attackedValue = pieceValues[attackedPiece.type];

    // Check line direction from our piece to attacked piece
    const direction = getDirection(moveObj.to, attackedSquare);
    if (!direction) continue;

    // Check if there's another piece behind it
    const behindSquare = getSquareInDirection(attackedSquare, direction);
    if (!behindSquare) continue;

    const behindFile = behindSquare[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const behindRank = 8 - parseInt(behindSquare[1]);
    const behindPiece = board[behindRank][behindFile];

    if (behindPiece && behindPiece.color !== ourColor) {
      const behindValue = pieceValues[behindPiece.type];
      // Skewer detected if front piece is more valuable
      if (attackedValue > behindValue) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect if move creates a discovered attack
 * Moving a piece unveils an attack from another piece behind it
 */
function detectsDiscoveredAttack(chess: Chess, _moveObj: Move, chessBefore: Chess): boolean {
  // Compare what pieces were attacking before vs after the move
  const board = chess.board();

  // Check all squares for new attacks that appeared after the move
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode('a'.charCodeAt(0) + file) + (8 - rank);
      const piece = board[rank][file];

      if (!piece) continue;

      // Get attacks before and after
      const attacksBefore = getSquareAttacks(chessBefore, square);
      const attacksAfter = getSquareAttacks(chess, square);

      // Check if this piece is now attacking new squares (discovered attack)
      for (const attackedSquare of attacksAfter) {
        if (!attacksBefore.includes(attackedSquare)) {
          // New attack discovered - check if it's attacking an opponent piece
          const targetFile = attackedSquare[0].charCodeAt(0) - 'a'.charCodeAt(0);
          const targetRank = 8 - parseInt(attackedSquare[1]);
          const targetPiece = board[targetRank][targetFile];

          if (targetPiece && targetPiece.color !== piece.color) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Get direction vector between two squares
 * Returns null if squares are not in a straight line
 */
function getDirection(from: string, to: string): { df: number; dr: number } | null {
  const fromFile = from[0].charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRank = 8 - parseInt(from[1]);
  const toFile = to[0].charCodeAt(0) - 'a'.charCodeAt(0);
  const toRank = 8 - parseInt(to[1]);

  const df = toFile - fromFile;
  const dr = toRank - fromRank;

  // Check if in straight line (same file, rank, or diagonal)
  if (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) {
    return {
      df: df === 0 ? 0 : df > 0 ? 1 : -1,
      dr: dr === 0 ? 0 : dr > 0 ? 1 : -1,
    };
  }

  return null;
}

/**
 * Get the next square in a direction
 */
function getSquareInDirection(
  square: string,
  direction: { df: number; dr: number }
): string | null {
  const file = square[0].charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(square[1]);

  const newFile = file + direction.df;
  const newRank = rank + direction.dr;

  // Check bounds
  if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) {
    return null;
  }

  return String.fromCharCode('a'.charCodeAt(0) + newFile) + (8 - newRank);
}

/**
 * Get default characteristics when analysis fails
 */
function getDefaultCharacteristics(move: GuidanceMove): MoveCharacteristics {
  return {
    isDevelopment: false,
    isCapture: move.uci.includes('x') || move.san?.includes('x') || false,
    isCastling: move.san === 'O-O' || move.san === 'O-O-O' || false,
    controlsCenter: false,
    attacksKing: false,
    improvesKingSafety: false,
    createsThreat: false,
    scoreAdvantage: move.score / 100,
    // Tactical patterns (Phase 4)
    isPinning: false,
    isForking: false,
    isSkewer: false,
    isDiscoveredAttack: false,
  };
}

/**
 * Get fallback explanation when generation fails
 */
function getFallbackExplanation(move: GuidanceMove, rank: number): ExplanationContent {
  return {
    notation: move.san || move.uci,
    description: undefined,
    strengths: ['Recommended by the engine'],
    ranking: `Ranked #${rank} by evaluation`,
    rank,
    concepts: [],
  };
}
