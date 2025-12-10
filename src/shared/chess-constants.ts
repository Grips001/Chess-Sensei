/**
 * Chess Constants
 *
 * Centralized constants for chess-related values.
 * Single source of truth for FEN strings, field indices, and other chess constants.
 */

/**
 * Starting position FEN (Forsyth-Edwards Notation)
 * Standard chess starting position
 */
export const STARTPOS_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * FEN field indices for parsing
 * FEN format: "pieces activeColor castling enPassant halfmove fullmove"
 */
export const FEN_FIELD = {
  /** Piece placement (index 0) */
  PIECES: 0,
  /** Active color - 'w' or 'b' (index 1) */
  ACTIVE_COLOR: 1,
  /** Castling availability - e.g., 'KQkq' (index 2) */
  CASTLING: 2,
  /** En passant target square - e.g., 'e3' or '-' (index 3) */
  EN_PASSANT: 3,
  /** Halfmove clock for 50-move rule (index 4) */
  HALFMOVE_CLOCK: 4,
  /** Fullmove number (index 5) */
  FULLMOVE_NUMBER: 5,
} as const;

/**
 * Parsed FEN fields interface
 */
export interface ParsedFen {
  /** Piece placement string */
  pieces: string;
  /** Active color */
  activeColor: 'w' | 'b';
  /** Castling availability string */
  castling: string;
  /** En passant target square or '-' */
  enPassant: string;
  /** Halfmove clock value */
  halfmoveClock: number;
  /** Fullmove number */
  fullmoveNumber: number;
}

/**
 * Parses a FEN string into its component fields.
 *
 * @param fen - FEN string to parse
 * @returns Parsed FEN fields
 * @throws Error if FEN string is invalid
 *
 * @example
 * ```typescript
 * const parsed = parseFen(STARTPOS_FEN);
 * console.log(parsed.activeColor); // 'w'
 * console.log(parsed.fullmoveNumber); // 1
 * ```
 */
export function parseFen(fen: string): ParsedFen {
  const parts = fen.split(' ');
  if (parts.length !== 6) {
    throw new Error(`Invalid FEN: expected 6 fields, got ${parts.length}`);
  }

  return {
    pieces: parts[FEN_FIELD.PIECES],
    activeColor: parts[FEN_FIELD.ACTIVE_COLOR] as 'w' | 'b',
    castling: parts[FEN_FIELD.CASTLING],
    enPassant: parts[FEN_FIELD.EN_PASSANT],
    halfmoveClock: parseInt(parts[FEN_FIELD.HALFMOVE_CLOCK], 10),
    fullmoveNumber: parseInt(parts[FEN_FIELD.FULLMOVE_NUMBER], 10),
  };
}

/**
 * Gets the active color from a FEN string.
 *
 * @param fen - FEN string
 * @returns 'w' for white or 'b' for black
 */
export function getActiveColor(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return parts[FEN_FIELD.ACTIVE_COLOR] as 'w' | 'b';
}

/**
 * Gets the halfmove clock from a FEN string.
 *
 * @param fen - FEN string
 * @returns Halfmove clock value
 */
export function getHalfmoveClock(fen: string): number {
  const parts = fen.split(' ');
  return parseInt(parts[FEN_FIELD.HALFMOVE_CLOCK], 10);
}

/**
 * Gets the fullmove number from a FEN string.
 *
 * @param fen - FEN string
 * @returns Fullmove number
 */
export function getFullmoveNumber(fen: string): number {
  const parts = fen.split(' ');
  return parseInt(parts[FEN_FIELD.FULLMOVE_NUMBER], 10);
}

/**
 * Piece values for material calculation (in pawns)
 */
export const PIECE_VALUES = {
  p: 1, // Pawn
  n: 3, // Knight
  b: 3, // Bishop
  r: 5, // Rook
  q: 9, // Queen
  k: 0, // King (infinite, but 0 for material count)
} as const;

/**
 * Board dimensions
 */
export const BOARD = {
  /** Number of files (columns) */
  FILES: 8,
  /** Number of ranks (rows) */
  RANKS: 8,
  /** Total number of squares */
  SQUARES: 64,
  /** File labels (a-h) */
  FILE_LABELS: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const,
  /** Rank labels (1-8) */
  RANK_LABELS: ['1', '2', '3', '4', '5', '6', '7', '8'] as const,
} as const;
