import { describe, test, expect } from 'bun:test';
import { generateExplanation } from '@/shared/explanation-generator';
import type { GuidanceMove } from '@/frontend/move-guidance';

describe('generateExplanation', () => {
  const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  describe('basic development moves', () => {
    test('generates development explanation for Nf3', () => {
      const move: GuidanceMove = {
        uci: 'g1f3',
        san: 'Nf3',
        from: 'g1',
        to: 'f3',
        score: 28,
        formattedScore: '+0.28',
        color: 'blue',
      };

      const explanation = generateExplanation(startingFen, move, 1, [move]);

      expect(explanation.notation).toBe('Nf3');
      expect(explanation.description).toBe('Knight moves to f3');
      expect(explanation.strengths).toContain('Develops a piece toward the center');
      expect(explanation.concepts).toContain('Development');
      expect(explanation.rank).toBe(1);
    });

    test('generates development explanation for Nc3', () => {
      const move: GuidanceMove = {
        uci: 'b1c3',
        san: 'Nc3',
        from: 'b1',
        to: 'c3',
        score: 25,
        formattedScore: '+0.25',
        color: 'blue',
      };

      const explanation = generateExplanation(startingFen, move, 1, [move]);

      expect(explanation.strengths).toContain('Develops a piece toward the center');
      expect(explanation.concepts).toContain('Development');
    });

    test('generates explanation for bishop development', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const move: GuidanceMove = {
        uci: 'f1c4',
        san: 'Bc4',
        from: 'f1',
        to: 'c4',
        score: 30,
        formattedScore: '+0.30',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.strengths).toContain('Develops a piece toward the center');
      expect(explanation.concepts).toContain('Development');
    });
  });

  describe('central control', () => {
    test('identifies central control for e4', () => {
      const move: GuidanceMove = {
        uci: 'e2e4',
        san: 'e4',
        from: 'e2',
        to: 'e4',
        score: 30,
        formattedScore: '+0.30',
        color: 'blue',
      };

      const explanation = generateExplanation(startingFen, move, 1, [move]);

      expect(explanation.strengths).toContain('Controls key central squares');
      expect(explanation.concepts).toContain('Central Control');
    });

    test('identifies central control for d4', () => {
      const move: GuidanceMove = {
        uci: 'd2d4',
        san: 'd4',
        from: 'd2',
        to: 'd4',
        score: 30,
        formattedScore: '+0.30',
        color: 'blue',
      };

      const explanation = generateExplanation(startingFen, move, 1, [move]);

      expect(explanation.strengths).toContain('Controls key central squares');
      expect(explanation.concepts).toContain('Central Control');
    });
  });

  describe('castling', () => {
    test('generates castling kingside explanation', () => {
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const move: GuidanceMove = {
        uci: 'e1g1',
        san: 'O-O',
        from: 'e1',
        to: 'g1',
        score: 35,
        formattedScore: '+0.35',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.strengths).toContain('Improves king safety by castling');
      expect(explanation.strengths).toContain('Connects the rooks');
      expect(explanation.concepts).toContain('King Safety');
    });

    test('generates castling queenside explanation', () => {
      const fen = 'rnb1kbnr/ppppqppp/8/4p3/4P3/8/PPPPQPPP/RNB1KBNR w KQkq - 4 4';
      const move: GuidanceMove = {
        uci: 'e1c1',
        san: 'O-O-O',
        from: 'e1',
        to: 'c1',
        score: 30,
        formattedScore: '+0.30',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.strengths).toContain('Improves king safety by castling');
      expect(explanation.concepts).toContain('King Safety');
    });
  });

  describe('captures', () => {
    test('identifies capture move', () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
      const move: GuidanceMove = {
        uci: 'e4d5',
        san: 'exd5',
        from: 'e4',
        to: 'd5',
        score: 50,
        formattedScore: '+0.50',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.strengths).toContain('Captures material, gaining an advantage');
      expect(explanation.concepts).toContain('Material Gain');
    });
  });

  describe('checks', () => {
    test('identifies check', () => {
      const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
      const move: GuidanceMove = {
        uci: 'f3f7',
        san: 'Qxf7+',
        from: 'f3',
        to: 'f7',
        score: 500,
        formattedScore: '+5.00',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      // This is a capturing move that gives check, so it should have both characteristics
      expect(explanation.strengths.some((s) => s.includes('Captures') || s.includes('king'))).toBe(
        true
      );
      expect(explanation.concepts.length).toBeGreaterThan(0);
    });
  });

  describe('ranking explanations', () => {
    test('explains #1 move correctly', () => {
      const moves: GuidanceMove[] = [
        {
          uci: 'e2e4',
          san: 'e4',
          from: 'e2',
          to: 'e4',
          score: 50,
          formattedScore: '+0.50',
          color: 'blue',
        },
        {
          uci: 'd2d4',
          san: 'd4',
          from: 'd2',
          to: 'd4',
          score: 30,
          formattedScore: '+0.30',
          color: 'green',
        },
      ];

      const explanation = generateExplanation(startingFen, moves[0], 1, moves);

      expect(explanation.ranking).toBe(
        'Best move in this position, offering the strongest continuation'
      );
    });

    test('explains #2 move correctly', () => {
      const moves: GuidanceMove[] = [
        {
          uci: 'e2e4',
          san: 'e4',
          from: 'e2',
          to: 'e4',
          score: 50,
          formattedScore: '+0.50',
          color: 'blue',
        },
        {
          uci: 'd2d4',
          san: 'd4',
          from: 'd2',
          to: 'd4',
          score: 45,
          formattedScore: '+0.45',
          color: 'green',
        },
      ];

      const explanation = generateExplanation(startingFen, moves[1], 2, moves);

      expect(explanation.ranking).toContain('alternative');
    });

    test('explains nearly equal moves', () => {
      const moves: GuidanceMove[] = [
        {
          uci: 'e2e4',
          san: 'e4',
          from: 'e2',
          to: 'e4',
          score: 50,
          formattedScore: '+0.50',
          color: 'blue',
        },
        {
          uci: 'd2d4',
          san: 'd4',
          from: 'd2',
          to: 'd4',
          score: 49,
          formattedScore: '+0.49',
          color: 'green',
        },
      ];

      const explanation = generateExplanation(startingFen, moves[0], 1, moves);

      expect(explanation.ranking).toContain('nearly equal');
    });
  });

  describe('fallback handling', () => {
    test('handles invalid FEN gracefully', () => {
      const move: GuidanceMove = {
        uci: 'e2e4',
        san: 'e4',
        from: 'e2',
        to: 'e4',
        score: 30,
        formattedScore: '+0.30',
        color: 'blue',
      };

      const explanation = generateExplanation('invalid_fen', move, 1, [move]);

      expect(explanation.notation).toBe('e4');
      expect(explanation.strengths.length).toBeGreaterThan(0);
    });

    test('handles invalid move gracefully', () => {
      const move: GuidanceMove = {
        uci: 'z9z9',
        san: 'invalid',
        from: 'z9',
        to: 'z9',
        score: 0,
        formattedScore: '0.00',
        color: 'blue',
      };

      const explanation = generateExplanation(startingFen, move, 1, [move]);

      expect(explanation.notation).toBe('invalid');
      // Should have at least one strength, even if it's generic
      expect(explanation.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('complex positions', () => {
    test('analyzes middlegame position', () => {
      const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5';
      const move: GuidanceMove = {
        uci: 'e1g1',
        san: 'O-O',
        from: 'e1',
        to: 'g1',
        score: 40,
        formattedScore: '+0.40',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.concepts).toContain('King Safety');
      expect(explanation.strengths).toContain('Improves king safety by castling');
    });

    test('analyzes tactical position', () => {
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4';
      const move: GuidanceMove = {
        uci: 'f6e4',
        san: 'Nxe4',
        from: 'f6',
        to: 'e4',
        score: 25,
        formattedScore: '+0.25',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.concepts).toContain('Material Gain');
      expect(explanation.concepts).toContain('Central Control');
    });
  });

  describe('default strengths', () => {
    test('provides default strength for quiet moves', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const move: GuidanceMove = {
        uci: 'h2h3',
        san: 'h3',
        from: 'h2',
        to: 'h3',
        score: 10,
        formattedScore: '+0.10',
        color: 'blue',
      };

      const explanation = generateExplanation(fen, move, 1, [move]);

      expect(explanation.strengths.length).toBeGreaterThan(0);
      expect(
        explanation.strengths.some((s) => s.includes('maintains') || s.includes('Solid move'))
      ).toBe(true);
    });
  });
});
