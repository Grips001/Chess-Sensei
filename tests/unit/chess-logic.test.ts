/**
 * Chess Logic Test Suite
 *
 * Phase 9: Comprehensive tests for core chess functionality.
 * Tests the ChessGame class, move validation, game state detection,
 * and various chess scenarios.
 *
 * @see src/shared/chess-logic.ts
 * @see source-docs/development.md - "Testing Strategy"
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ChessGame, createGame, STARTPOS_FEN } from '../../src/shared/chess-logic';

describe('Chess Logic', () => {
  describe('ChessGame Creation', () => {
    test('should create game with standard starting position', () => {
      const game = new ChessGame();
      expect(game.getFen()).toBe(STARTPOS_FEN);
      expect(game.getTurn()).toBe('w');
    });

    test('should create game from custom FEN', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const game = new ChessGame(fen);
      expect(game.getFen()).toBe(fen);
    });

    test('createGame factory function works', () => {
      const game = createGame();
      expect(game.getFen()).toBe(STARTPOS_FEN);
    });

    test('createGame factory with custom FEN', () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const game = createGame(fen);
      expect(game.getFen()).toBe(fen);
    });
  });

  describe('Move Making', () => {
    let game: ChessGame;

    beforeEach(() => {
      game = new ChessGame();
    });

    test('should make legal move in UCI format', () => {
      const result = game.makeMove('e2e4');
      expect(result.uci).toBe('e2e4');
      expect(result.san).toBe('e4');
      expect(result.from).toBe('e2');
      expect(result.to).toBe('e4');
    });

    test('should make legal move in SAN format', () => {
      const result = game.makeMove('e4');
      expect(result.san).toBe('e4');
      expect(result.uci).toBe('e2e4');
    });

    test('should throw for illegal move', () => {
      expect(() => game.makeMove('e2e5')).toThrow('Illegal move');
    });

    test('should update turn after move', () => {
      expect(game.getTurn()).toBe('w');
      game.makeMove('e4');
      expect(game.getTurn()).toBe('b');
      game.makeMove('e5');
      expect(game.getTurn()).toBe('w');
    });

    test('should track move history in SAN format', () => {
      game.makeMove('e4');
      game.makeMove('e5');
      game.makeMove('Nf3');
      const history = game.getMoveHistorySan();
      expect(history).toEqual(['e4', 'e5', 'Nf3']);
    });

    test('should track move history in UCI format', () => {
      game.makeMove('e4');
      game.makeMove('e5');
      game.makeMove('Nf3');
      const history = game.getMoveHistoryUci();
      expect(history).toEqual(['e2e4', 'e7e5', 'g1f3']);
    });

    test('should handle pawn promotion', () => {
      // Set up position one move from promotion
      const game = new ChessGame('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      const result = game.makeMove('a7a8q');
      expect(result.promotion).toBe('q');
      expect(result.san).toContain('=Q');
    });

    test('should handle castling kingside', () => {
      const game = new ChessGame('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const result = game.makeMove('e1g1');
      expect(result.san).toBe('O-O');
      expect(result.isCastling).toBe(true);
    });

    test('should handle castling queenside', () => {
      const game = new ChessGame('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      const result = game.makeMove('e1c1');
      expect(result.san).toBe('O-O-O');
      expect(result.isCastling).toBe(true);
    });

    test('should detect capture moves', () => {
      const game = new ChessGame('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
      const result = game.makeMove('e4d5');
      expect(result.captured).toBe('p');
    });

    test('should detect en passant', () => {
      const game = new ChessGame('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
      const result = game.makeMove('e5d6');
      expect(result.isEnPassant).toBe(true);
      expect(result.captured).toBe('p');
    });
  });

  describe('Legal Move Detection', () => {
    test('should return all legal moves from starting position', () => {
      const game = new ChessGame();
      const moves = game.getLegalMovesUci();
      // 20 legal moves: 16 pawn moves + 4 knight moves
      expect(moves.length).toBe(20);
      expect(moves).toContain('e2e4');
      expect(moves).toContain('g1f3');
    });

    test('should return legal moves for specific square', () => {
      const game = new ChessGame();
      const moves = game.getLegalMoves({ square: 'e2' });
      expect(moves.length).toBe(2);
      expect(moves.map((m) => m.to)).toContain('e3');
      expect(moves.map((m) => m.to)).toContain('e4');
    });

    test('isLegalMove should validate legal moves', () => {
      const game = new ChessGame();
      expect(game.isLegalMove('e2e4')).toBe(true);
      expect(game.isLegalMove('e4')).toBe(true);
    });

    test('isLegalMove should reject illegal moves', () => {
      const game = new ChessGame();
      expect(game.isLegalMove('e2e5')).toBe(false);
      expect(game.isLegalMove('e1e2')).toBe(false); // King blocked
    });
  });

  describe('Game State Detection', () => {
    test('should detect check', () => {
      // Position with white king in check from black queen
      const game = new ChessGame('rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3');
      game.makeMove('Qh5');
      game.makeMove('Nc6');
      game.makeMove('Qxf7');
      // Now black is in check
      expect(game.isInCheck()).toBe(true);
    });

    test('should detect checkmate (fools mate)', () => {
      const game = new ChessGame();
      game.makeMove('f3');
      game.makeMove('e5');
      game.makeMove('g4');
      game.makeMove('Qh4');
      expect(game.isCheckmate()).toBe(true);
      expect(game.isGameOver()).toBe(true);
      expect(game.getStatus()).toBe('checkmate');
    });

    test('should detect stalemate', () => {
      // Stalemate position where black has no legal moves
      const game = new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
      // Black to move but has no legal moves (stalemate)
      expect(game.isStalemate()).toBe(true);
      expect(game.isGameOver()).toBe(true);
      expect(game.getStatus()).toBe('stalemate');
    });

    test('should detect insufficient material - K vs K', () => {
      const game = new ChessGame('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
      expect(game.isInsufficientMaterial()).toBe(true);
      expect(game.getStatus()).toBe('draw_insufficient');
    });

    test('should detect insufficient material - K+B vs K', () => {
      const game = new ChessGame('8/8/8/4k3/8/8/8/4KB2 w - - 0 1');
      expect(game.isInsufficientMaterial()).toBe(true);
    });

    test('should detect insufficient material - K+N vs K', () => {
      const game = new ChessGame('8/8/8/4k3/8/8/8/4KN2 w - - 0 1');
      expect(game.isInsufficientMaterial()).toBe(true);
    });

    test('should return playing status for ongoing game', () => {
      const game = new ChessGame();
      expect(game.getStatus()).toBe('playing');
      expect(game.isGameOver()).toBe(false);
    });
  });

  describe('Undo Operations', () => {
    let game: ChessGame;

    beforeEach(() => {
      game = new ChessGame();
      game.makeMove('e4');
      game.makeMove('e5');
      game.makeMove('Nf3');
    });

    test('should undo last move', () => {
      const fenBefore = game.getFen();
      const undone = game.undoMove();
      expect(undone).not.toBeNull();
      expect(undone?.san).toBe('Nf3');
      expect(game.getFen()).not.toBe(fenBefore);
      expect(game.getTurn()).toBe('w');
    });

    test('should return null when no moves to undo', () => {
      const freshGame = new ChessGame();
      expect(freshGame.undoMove()).toBeNull();
    });

    test('should handle multiple undos', () => {
      game.undoMove();
      game.undoMove();
      game.undoMove();
      expect(game.getFen()).toBe(STARTPOS_FEN);
    });
  });

  describe('Board State', () => {
    test('should get piece at square', () => {
      const game = new ChessGame();
      const piece = game.getPiece('e2');
      expect(piece).not.toBeNull();
      expect(piece?.type).toBe('p');
      expect(piece?.color).toBe('w');
    });

    test('should return null for empty square', () => {
      const game = new ChessGame();
      expect(game.getPiece('e4')).toBeNull();
    });

    test('should get full board state', () => {
      const game = new ChessGame();
      game.makeMove('e4');
      const state = game.getBoardState();

      expect(state.turn).toBe('b');
      expect(state.fullMoveNumber).toBe(1);
      expect(state.inCheck).toBe(false);
      expect(state.status).toBe('playing');
      expect(state.sanHistory).toEqual(['e4']);
    });

    test('should track castling rights', () => {
      const game = new ChessGame();
      const state = game.getBoardState();
      expect(state.castling.whiteKingside).toBe(true);
      expect(state.castling.whiteQueenside).toBe(true);
      expect(state.castling.blackKingside).toBe(true);
      expect(state.castling.blackQueenside).toBe(true);
    });

    test('castling rights update after rook move', () => {
      // Position with clear path for rook move
      const game = new ChessGame('r3k2r/pppppppp/8/8/8/8/1PPPPPPP/R3K2R w KQkq - 0 1');
      game.makeMove('Ra3'); // Move white queenside rook to a3
      const state = game.getBoardState();
      expect(state.castling.whiteQueenside).toBe(false);
      expect(state.castling.whiteKingside).toBe(true);
    });
  });

  describe('PGN Export/Import', () => {
    test('should generate valid PGN', () => {
      const game = new ChessGame();
      game.makeMove('e4');
      game.makeMove('e5');
      game.makeMove('Nf3');
      const pgn = game.getPgn();
      expect(pgn).toContain('1. e4 e5 2. Nf3');
    });

    test('should load position from FEN', () => {
      const game = new ChessGame();
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      game.loadFen(fen);
      expect(game.getFen()).toBe(fen);
    });
  });

  describe('Reset and New Game', () => {
    test('should reset to starting position via loadFen', () => {
      const game = new ChessGame();
      game.makeMove('e4');
      game.makeMove('e5');
      game.loadFen(STARTPOS_FEN);
      expect(game.getFen()).toBe(STARTPOS_FEN);
    });
  });

  describe('Edge Cases', () => {
    test('should handle long games', () => {
      const game = new ChessGame();
      // Play several moves without error
      const moves = [
        'e4',
        'e5',
        'Nf3',
        'Nc6',
        'Bb5',
        'a6',
        'Ba4',
        'Nf6',
        'O-O',
        'Be7',
        'Re1',
        'b5',
        'Bb3',
        'd6',
        'c3',
        'O-O',
      ];
      for (const move of moves) {
        game.makeMove(move);
      }
      expect(game.getMoveHistorySan().length).toBe(16);
    });

    test('should handle positions with many legal moves', () => {
      // Middle game position with many pieces
      const game = new ChessGame(
        'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5'
      );
      const moves = game.getLegalMoves();
      expect(moves.length).toBeGreaterThan(25);
    });

    test('should handle positions with no legal moves (checkmate)', () => {
      // Checkmate position - fools mate
      const game = new ChessGame();
      game.makeMove('f3');
      game.makeMove('e5');
      game.makeMove('g4');
      game.makeMove('Qh4');
      const moves = game.getLegalMoves();
      expect(moves.length).toBe(0);
      expect(game.isCheckmate()).toBe(true);
    });
  });
});
