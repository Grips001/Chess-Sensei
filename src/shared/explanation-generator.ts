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

    return {
      isDevelopment: isMinorPieceDevelopment(moveObj, fen),
      isCapture: moveObj.captured !== undefined,
      isCastling: moveObj.flags.includes('k') || moveObj.flags.includes('q'),
      controlsCenter: controlsCentralSquares(moveObj.to),
      attacksKing: attacksOpponentKing(chess, moveObj),
      improvesKingSafety: improvesKingSafety(moveObj),
      createsThreat: createsThreat(chess, moveObj),
      scoreAdvantage: move.score / 100, // Convert centipawns to pawns
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
