/**
 * Chess Logic Module
 *
 * Wrapper module for chess.js providing move validation, board state management,
 * FEN/PGN parsing, and game state detection.
 *
 * @see source-docs/data-storage.md for game data formats
 * @see source-docs/player-progress.md for move classification thresholds
 */

import { Chess, type Move, type Square, type PieceSymbol, type Color } from 'chess.js';

// Re-export types and constants from chess.js
export { type Move, type Square, type PieceSymbol, type Color };
export { WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from 'chess.js';

/**
 * Starting position FEN
 */
export const STARTPOS_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Piece on a square
 */
export interface Piece {
  type: PieceSymbol;
  color: Color;
}

/**
 * Game termination status
 */
export type GameStatus =
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'draw_insufficient'
  | 'draw_50_move'
  | 'draw_repetition'
  | 'draw_agreement';

/**
 * Board state representing a position and game state
 */
export interface BoardState {
  /** Current position in FEN notation */
  fen: string;
  /** Move history in UCI format */
  moveHistory: string[];
  /** Move history in SAN format */
  sanHistory: string[];
  /** Current turn ('w' or 'b') */
  turn: Color;
  /** Full move number */
  fullMoveNumber: number;
  /** Halfmove clock (for 50-move rule) */
  halfMoveClock: number;
  /** Whether current player is in check */
  inCheck: boolean;
  /** Game status */
  status: GameStatus;
  /** Castling rights */
  castling: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
}

/**
 * Move result containing details about an executed move
 */
export interface MoveResult {
  /** Move in UCI format (e.g., "e2e4") */
  uci: string;
  /** Move in SAN format (e.g., "e4") */
  san: string;
  /** Source square */
  from: Square;
  /** Destination square */
  to: Square;
  /** Piece that moved */
  piece: PieceSymbol;
  /** Captured piece (if any) */
  captured?: PieceSymbol;
  /** Promotion piece (if pawn promoted) */
  promotion?: PieceSymbol;
  /** Whether move gives check */
  isCheck: boolean;
  /** Whether move gives checkmate */
  isCheckmate: boolean;
  /** Whether move is castling */
  isCastling: boolean;
  /** Whether move is en passant */
  isEnPassant: boolean;
  /** Resulting FEN after the move */
  resultingFen: string;
}

/**
 * Convert chess.js Move to UCI format
 */
function moveToUci(move: Move): string {
  let uci = move.from + move.to;
  if (move.promotion) {
    uci += move.promotion;
  }
  return uci;
}

/**
 * ChessGame class providing chess logic functionality
 *
 * Wraps chess.js with additional convenience methods and type safety.
 */
export class ChessGame {
  private chess: Chess;
  private uciHistory: string[] = [];

  /**
   * Create a new chess game
   * @param fen - Optional starting position (defaults to standard starting position)
   */
  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  /**
   * Get the current position as FEN
   */
  getFen(): string {
    return this.chess.fen();
  }

  /**
   * Get whose turn it is
   */
  getTurn(): Color {
    return this.chess.turn();
  }

  /**
   * Check if the current player is in check
   */
  isInCheck(): boolean {
    return this.chess.inCheck();
  }

  /**
   * Check if the game is over
   */
  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  /**
   * Check if the position is checkmate
   */
  isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  /**
   * Check if the position is stalemate
   */
  isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  /**
   * Check if the position is a draw
   */
  isDraw(): boolean {
    return this.chess.isDraw();
  }

  /**
   * Check for insufficient material
   */
  isInsufficientMaterial(): boolean {
    return this.chess.isInsufficientMaterial();
  }

  /**
   * Check for threefold repetition
   */
  isThreefoldRepetition(): boolean {
    return this.chess.isThreefoldRepetition();
  }

  /**
   * Get the game status
   */
  getStatus(): GameStatus {
    if (this.chess.isCheckmate()) {
      return 'checkmate';
    }
    if (this.chess.isStalemate()) {
      return 'stalemate';
    }
    if (this.chess.isInsufficientMaterial()) {
      return 'draw_insufficient';
    }
    if (this.chess.isThreefoldRepetition()) {
      return 'draw_repetition';
    }
    // Check 50-move rule (halfmove clock >= 100)
    const fen = this.chess.fen();
    const halfMoveClock = parseInt(fen.split(' ')[4], 10);
    if (halfMoveClock >= 100) {
      return 'draw_50_move';
    }
    return 'playing';
  }

  /**
   * Get all legal moves from current position
   * @param options - Filter options
   * @returns Array of legal moves
   */
  getLegalMoves(options?: { square?: Square; verbose?: boolean }): Move[] {
    if (options?.square) {
      return this.chess.moves({ square: options.square, verbose: true });
    }
    return this.chess.moves({ verbose: true });
  }

  /**
   * Get legal moves in UCI format
   */
  getLegalMovesUci(): string[] {
    return this.getLegalMoves().map(moveToUci);
  }

  /**
   * Get legal moves in SAN format
   */
  getLegalMovesSan(): string[] {
    return this.chess.moves();
  }

  /**
   * Check if a move is legal
   * @param move - Move in UCI or SAN format
   */
  isLegalMove(move: string): boolean {
    // Try to make the move and see if it succeeds
    const testChess = new Chess(this.chess.fen());
    try {
      testChess.move(move);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make a move
   * @param move - Move in UCI or SAN format
   * @returns MoveResult with details about the move
   * @throws Error if move is illegal
   */
  makeMove(move: string): MoveResult {
    const _beforeFen = this.chess.fen();

    // Try to make the move
    let result: Move;
    try {
      result = this.chess.move(move);
    } catch (_error) {
      throw new Error(`Illegal move: ${move}`);
    }

    const uci = moveToUci(result);
    this.uciHistory.push(uci);

    return {
      uci,
      san: result.san,
      from: result.from,
      to: result.to,
      piece: result.piece,
      captured: result.captured,
      promotion: result.promotion,
      isCheck: this.chess.inCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isCastling: result.flags.includes('k') || result.flags.includes('q'),
      isEnPassant: result.flags.includes('e'),
      resultingFen: this.chess.fen(),
    };
  }

  /**
   * Undo the last move
   * @returns The undone move, or null if no moves to undo
   */
  undoMove(): Move | null {
    const undone = this.chess.undo();
    if (undone) {
      this.uciHistory.pop();
    }
    return undone;
  }

  /**
   * Reset to starting position
   */
  reset(): void {
    this.chess.reset();
    this.uciHistory = [];
  }

  /**
   * Load a position from FEN
   * @param fen - Position in FEN notation
   */
  loadFen(fen: string): void {
    this.chess.load(fen);
    this.uciHistory = [];
  }

  /**
   * Load a game from PGN
   * @param pgn - Game in PGN notation
   */
  loadPgn(pgn: string): void {
    this.chess.loadPgn(pgn);
    // Rebuild UCI history
    this.uciHistory = this.chess.history({ verbose: true }).map(moveToUci);
  }

  /**
   * Get the game as PGN
   */
  getPgn(): string {
    return this.chess.pgn();
  }

  /**
   * Get move history in UCI format
   */
  getMoveHistoryUci(): string[] {
    return [...this.uciHistory];
  }

  /**
   * Get move history in SAN format
   */
  getMoveHistorySan(): string[] {
    return this.chess.history();
  }

  /**
   * Get piece at a square
   * @param square - Square to check
   * @returns Piece at square, or null if empty
   */
  getPiece(square: Square): Piece | null {
    const piece = this.chess.get(square);
    return piece ? { type: piece.type, color: piece.color } : null;
  }

  /**
   * Get the full board state
   */
  getBoardState(): BoardState {
    const fen = this.chess.fen();
    const fenParts = fen.split(' ');

    return {
      fen,
      moveHistory: this.getMoveHistoryUci(),
      sanHistory: this.getMoveHistorySan(),
      turn: this.chess.turn(),
      fullMoveNumber: parseInt(fenParts[5], 10),
      halfMoveClock: parseInt(fenParts[4], 10),
      inCheck: this.chess.inCheck(),
      status: this.getStatus(),
      castling: {
        whiteKingside: fenParts[2].includes('K'),
        whiteQueenside: fenParts[2].includes('Q'),
        blackKingside: fenParts[2].includes('k'),
        blackQueenside: fenParts[2].includes('q'),
      },
    };
  }

  /**
   * Get ASCII representation of the board
   */
  ascii(): string {
    return this.chess.ascii();
  }

  /**
   * Validate a FEN string
   * @param fen - FEN string to validate
   * @returns null if valid, error message if invalid
   */
  static validateFen(fen: string): string | null {
    try {
      new Chess(fen);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid FEN';
    }
  }

  /**
   * Convert UCI move to SAN in a given position
   * @param fen - Position FEN
   * @param uci - Move in UCI format
   * @returns Move in SAN format, or null if invalid
   */
  static uciToSan(fen: string, uci: string): string | null {
    try {
      const chess = new Chess(fen);
      const move = chess.move(uci);
      return move.san;
    } catch {
      return null;
    }
  }

  /**
   * Convert SAN move to UCI in a given position
   * @param fen - Position FEN
   * @param san - Move in SAN format
   * @returns Move in UCI format, or null if invalid
   */
  static sanToUci(fen: string, san: string): string | null {
    try {
      const chess = new Chess(fen);
      const move = chess.move(san);
      return moveToUci(move);
    } catch {
      return null;
    }
  }
}

/**
 * Create a new chess game instance
 * Convenience function for simple usage
 */
export function createGame(fen?: string): ChessGame {
  return new ChessGame(fen);
}

export default ChessGame;
