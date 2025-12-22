import { describe, test, expect } from 'bun:test';
import { parseSanToEnglish } from '@/shared/notation-parser';

describe('parseSanToEnglish', () => {
  describe('basic piece moves', () => {
    test('converts knight move', () => {
      expect(parseSanToEnglish('Nf3')).toBe('Knight moves to f3');
    });

    test('converts bishop move', () => {
      expect(parseSanToEnglish('Bc4')).toBe('Bishop moves to c4');
    });

    test('converts rook move', () => {
      expect(parseSanToEnglish('Ra3')).toBe('Rook moves to a3');
    });

    test('converts queen move', () => {
      expect(parseSanToEnglish('Qd5')).toBe('Queen moves to d5');
    });

    test('converts king move', () => {
      expect(parseSanToEnglish('Kh1')).toBe('King moves to h1');
    });
  });

  describe('pawn moves', () => {
    test('converts basic pawn move', () => {
      expect(parseSanToEnglish('e4')).toBe('Pawn moves to e4');
    });

    test('converts pawn advance', () => {
      expect(parseSanToEnglish('d4')).toBe('Pawn moves to d4');
    });

    test('converts pawn to e5', () => {
      expect(parseSanToEnglish('e5')).toBe('Pawn moves to e5');
    });
  });

  describe('captures', () => {
    test('converts piece capture', () => {
      expect(parseSanToEnglish('Qxd5')).toBe('Queen captures on d5');
    });

    test('converts knight capture', () => {
      expect(parseSanToEnglish('Nxe5')).toBe('Knight captures on e5');
    });

    test('converts pawn capture', () => {
      expect(parseSanToEnglish('exd5')).toBe('Pawn captures on d5');
    });

    test('converts rook capture', () => {
      expect(parseSanToEnglish('Rxh8')).toBe('Rook captures on h8');
    });
  });

  describe('special moves', () => {
    test('converts castling kingside', () => {
      expect(parseSanToEnglish('O-O')).toBe('Castle kingside');
    });

    test('converts castling queenside', () => {
      expect(parseSanToEnglish('O-O-O')).toBe('Castle queenside');
    });

    test('converts promotion to queen', () => {
      expect(parseSanToEnglish('e8=Q')).toBe('Pawn moves to e8, promotes to Queen');
    });

    test('converts promotion to knight', () => {
      expect(parseSanToEnglish('a1=N')).toBe('Pawn moves to a1, promotes to Knight');
    });

    test('converts promotion to rook', () => {
      expect(parseSanToEnglish('h8=R')).toBe('Pawn moves to h8, promotes to Rook');
    });

    test('converts promotion to bishop', () => {
      expect(parseSanToEnglish('b8=B')).toBe('Pawn moves to b8, promotes to Bishop');
    });

    test('converts capture with promotion', () => {
      expect(parseSanToEnglish('exd8=Q')).toBe('Pawn captures on d8, promotes to Queen');
    });
  });

  describe('checks and checkmate', () => {
    test('converts check correctly', () => {
      expect(parseSanToEnglish('Nf7+')).toBe('Knight moves to f7, check');
    });

    test('converts checkmate correctly', () => {
      expect(parseSanToEnglish('Qh8#')).toBe('Queen moves to h8, checkmate');
    });

    test('converts capture with check', () => {
      expect(parseSanToEnglish('Qxe5+')).toBe('Queen captures on e5, check');
    });

    test('converts capture with checkmate', () => {
      expect(parseSanToEnglish('Rxh7#')).toBe('Rook captures on h7, checkmate');
    });

    test('converts pawn move with check', () => {
      expect(parseSanToEnglish('e8=Q+')).toBe('Pawn moves to e8, promotes to Queen, check');
    });
  });

  describe('ambiguous notation', () => {
    test('converts knight from b-file', () => {
      expect(parseSanToEnglish('Nbd2')).toBe('Knight from b-file moves to d2');
    });

    test('converts knight from g-file', () => {
      expect(parseSanToEnglish('Ngf3')).toBe('Knight from g-file moves to f3');
    });

    test('converts rook from rank 1', () => {
      expect(parseSanToEnglish('R1a3')).toBe('Rook from rank 1 moves to a3');
    });

    test('converts rook from rank 8', () => {
      expect(parseSanToEnglish('R8h7')).toBe('Rook from rank 8 moves to h7');
    });

    test('converts queen from d-file', () => {
      expect(parseSanToEnglish('Qdd8')).toBe('Queen from d-file moves to d8');
    });

    test('converts ambiguous capture', () => {
      expect(parseSanToEnglish('Nbxd4')).toBe('Knight from b-file captures on d4');
    });
  });

  describe('complex combinations', () => {
    test('converts ambiguous move with check', () => {
      expect(parseSanToEnglish('Nbd2+')).toBe('Knight from b-file moves to d2, check');
    });

    test('converts ambiguous capture with check', () => {
      expect(parseSanToEnglish('Qh4xe1+')).toBe('Queen from h-file captures on e1, check');
    });

    test('converts promotion with checkmate', () => {
      expect(parseSanToEnglish('e8=Q#')).toBe('Pawn moves to e8, promotes to Queen, checkmate');
    });
  });

  describe('edge cases', () => {
    test('handles invalid notation gracefully', () => {
      const result = parseSanToEnglish('invalid');
      expect(result.length).toBeGreaterThan(0);
      // Should return some readable description, not throw error
      expect(result).toMatch(/moves|Move to/);
    });

    test('handles empty string gracefully', () => {
      const result = parseSanToEnglish('');
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles malformed notation', () => {
      const result = parseSanToEnglish('Zz9');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('regression tests', () => {
    test('handles standard opening moves', () => {
      expect(parseSanToEnglish('e4')).toBe('Pawn moves to e4');
      expect(parseSanToEnglish('d4')).toBe('Pawn moves to d4');
      expect(parseSanToEnglish('Nf3')).toBe('Knight moves to f3');
      expect(parseSanToEnglish('Nc3')).toBe('Knight moves to c3');
      expect(parseSanToEnglish('Bc4')).toBe('Bishop moves to c4');
    });

    test('handles common middlegame moves', () => {
      expect(parseSanToEnglish('Bxc6')).toBe('Bishop captures on c6');
      expect(parseSanToEnglish('Nxe5')).toBe('Knight captures on e5');
      expect(parseSanToEnglish('Qd2')).toBe('Queen moves to d2');
    });

    test('handles endgame scenarios', () => {
      expect(parseSanToEnglish('Kxf7')).toBe('King captures on f7');
      expect(parseSanToEnglish('Rd8+')).toBe('Rook moves to d8, check');
      expect(parseSanToEnglish('Qh7#')).toBe('Queen moves to h7, checkmate');
    });
  });
});
