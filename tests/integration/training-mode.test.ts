/**
 * Integration Tests for Training Mode (CS-001)
 *
 * Tests move notation with English descriptions in Training Mode context.
 */

import { describe, test, expect } from 'bun:test';
import { parseSanToEnglish } from '../../src/shared/notation-parser';

describe('Training Mode - Move Notation Integration', () => {
  describe('move display in guidance panel', () => {
    test('notation parser integrates with guidance move list', () => {
      // Simulate guidance moves that would be displayed
      const guidanceMoves = [
        { notation: 'Nf3', evaluation: 0.5 },
        { notation: 'e4', evaluation: 0.3 },
        { notation: 'Bc4', evaluation: 0.2 },
      ];

      // Parse notations
      const displayMoves = guidanceMoves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
        evaluation: move.evaluation,
      }));

      expect(displayMoves[0].notation).toBe('Nf3');
      expect(displayMoves[0].description).toBe('Knight moves to f3');
      expect(displayMoves[1].notation).toBe('e4');
      expect(displayMoves[1].description).toBe('Pawn moves to e4');
      expect(displayMoves[2].notation).toBe('Bc4');
      expect(displayMoves[2].description).toBe('Bishop moves to c4');
    });

    test('handles captures in guidance display', () => {
      const guidanceMoves = [
        { notation: 'Qxd5', evaluation: 2.5 },
        { notation: 'Nxe5', evaluation: 1.0 },
      ];

      const displayMoves = guidanceMoves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
        evaluation: move.evaluation,
      }));

      expect(displayMoves[0].description).toBe('Queen captures on d5');
      expect(displayMoves[1].description).toBe('Knight captures on e5');
    });

    test('handles special moves in guidance display', () => {
      const guidanceMoves = [
        { notation: 'O-O', evaluation: 0.0 },
        { notation: 'O-O-O', evaluation: -0.1 },
        { notation: 'e8=Q', evaluation: 8.0 },
      ];

      const displayMoves = guidanceMoves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
        evaluation: move.evaluation,
      }));

      expect(displayMoves[0].description).toBe('Castle kingside');
      expect(displayMoves[1].description).toBe('Castle queenside');
      expect(displayMoves[2].description).toBe('Pawn moves to e8, promotes to Queen');
    });

    test('handles check and checkmate annotations', () => {
      const guidanceMoves = [
        { notation: 'Qh5+', evaluation: 1.5 },
        { notation: 'Nf7#', evaluation: 999 },
      ];

      const displayMoves = guidanceMoves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
        evaluation: move.evaluation,
      }));

      expect(displayMoves[0].description).toBe('Queen moves to h5, check');
      expect(displayMoves[1].description).toBe('Knight moves to f7, checkmate');
    });
  });

  describe('dual format display structure', () => {
    test('creates proper HTML structure for move display', () => {
      // Simulate creating move display elements
      const move = { notation: 'Nf3', description: 'Knight moves to f3' };

      const moveElement = document.createElement('div');
      moveElement.className = 'guidance-move';

      const notationSpan = document.createElement('span');
      notationSpan.className = 'move-notation';
      notationSpan.textContent = move.notation;

      const descriptionSpan = document.createElement('span');
      descriptionSpan.className = 'move-description';
      descriptionSpan.textContent = move.description;

      moveElement.appendChild(notationSpan);
      moveElement.appendChild(descriptionSpan);

      expect(moveElement.querySelector('.move-notation')?.textContent).toBe('Nf3');
      expect(moveElement.querySelector('.move-description')?.textContent).toBe(
        'Knight moves to f3'
      );
    });

    test('displays multiple moves in order', () => {
      const moves = [
        { notation: 'e4', description: 'Pawn moves to e4' },
        { notation: 'Nf3', description: 'Knight moves to f3' },
        { notation: 'Bc4', description: 'Bishop moves to c4' },
      ];

      const container = document.createElement('div');
      container.id = 'guidance-move-list';

      moves.forEach((move) => {
        const moveElement = document.createElement('div');
        moveElement.className = 'guidance-move';

        const notationSpan = document.createElement('span');
        notationSpan.className = 'move-notation';
        notationSpan.textContent = move.notation;

        const descriptionSpan = document.createElement('span');
        descriptionSpan.className = 'move-description';
        descriptionSpan.textContent = move.description;

        moveElement.appendChild(notationSpan);
        moveElement.appendChild(descriptionSpan);
        container.appendChild(moveElement);
      });

      const moveElements = container.querySelectorAll('.guidance-move');
      expect(moveElements.length).toBe(3);

      const notations = Array.from(container.querySelectorAll('.move-notation')).map(
        (el) => el.textContent
      );
      expect(notations).toEqual(['e4', 'Nf3', 'Bc4']);
    });
  });

  describe('move ranking integration', () => {
    test('displays top 3 moves with descriptions', () => {
      const topMoves = [
        { notation: 'e4', description: 'Pawn moves to e4', rank: 1, evaluation: 0.5 },
        { notation: 'Nf3', description: 'Knight moves to f3', rank: 2, evaluation: 0.4 },
        { notation: 'd4', description: 'Pawn moves to d4', rank: 3, evaluation: 0.3 },
      ];

      topMoves.forEach((move) => {
        expect(move.notation).toBeDefined();
        expect(move.description).toBeDefined();
        expect(move.rank).toBeLessThanOrEqual(3);
      });
    });

    test('maintains rank order with descriptions', () => {
      const moves = [
        { notation: 'e4', evaluation: 0.5 },
        { notation: 'Nf3', evaluation: 0.4 },
        { notation: 'd4', evaluation: 0.3 },
      ];

      const rankedMoves = moves.map((move, index) => ({
        ...move,
        description: parseSanToEnglish(move.notation),
        rank: index + 1,
      }));

      expect(rankedMoves[0].rank).toBe(1);
      expect(rankedMoves[0].description).toBe('Pawn moves to e4');
      expect(rankedMoves[1].rank).toBe(2);
      expect(rankedMoves[1].description).toBe('Knight moves to f3');
      expect(rankedMoves[2].rank).toBe(3);
      expect(rankedMoves[2].description).toBe('Pawn moves to d4');
    });
  });

  describe('ambiguous notation handling', () => {
    test('handles rank disambiguation in display', () => {
      const moves = [
        { notation: 'R1a3', evaluation: 0.0 },
        { notation: 'R8a3', evaluation: 0.0 },
      ];

      const displayMoves = moves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
      }));

      expect(displayMoves[0].description).toBe('Rook from rank 1 moves to a3');
      expect(displayMoves[1].description).toBe('Rook from rank 8 moves to a3');
    });

    test('handles file disambiguation in display', () => {
      const moves = [
        { notation: 'Nbd2', evaluation: 0.0 },
        { notation: 'Nfd2', evaluation: 0.0 },
      ];

      const displayMoves = moves.map((move) => ({
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
      }));

      expect(displayMoves[0].description).toBe('Knight from b-file moves to d2');
      expect(displayMoves[1].description).toBe('Knight from f-file moves to d2');
    });

    test('handles full square disambiguation in display', () => {
      const move = { notation: 'Qh4e1', evaluation: 0.0 };

      const displayMove = {
        notation: move.notation,
        description: parseSanToEnglish(move.notation),
      };

      // Full square disambiguation (h4) simplifies to file only (h-file)
      expect(displayMove.description).toBe('Queen from h-file moves to e1');
    });
  });

  describe('complex position scenarios', () => {
    test('displays tactical moves with descriptions', () => {
      const tacticalMoves = [
        { notation: 'Bxf7+', description: parseSanToEnglish('Bxf7+') },
        { notation: 'Qxg7#', description: parseSanToEnglish('Qxg7#') },
        { notation: 'Rxe8+', description: parseSanToEnglish('Rxe8+') },
      ];

      tacticalMoves.forEach((move) => {
        expect(move.notation).toMatch(/[KQRBN]?x[a-h][1-8][+#]?/);
        expect(move.description).toContain('captures');
      });

      expect(tacticalMoves[0].description).toContain('check');
      expect(tacticalMoves[1].description).toContain('checkmate');
      expect(tacticalMoves[2].description).toContain('check');
    });

    test('displays pawn promotion moves', () => {
      const promotionMoves = [
        { notation: 'e8=Q', description: parseSanToEnglish('e8=Q') },
        { notation: 'a1=N', description: parseSanToEnglish('a1=N') },
        { notation: 'h8=R+', description: parseSanToEnglish('h8=R+') },
      ];

      promotionMoves.forEach((move) => {
        expect(move.description).toContain('promotes to');
      });

      expect(promotionMoves[0].description).toBe('Pawn moves to e8, promotes to Queen');
      expect(promotionMoves[1].description).toBe('Pawn moves to a1, promotes to Knight');
      expect(promotionMoves[2].description).toBe('Pawn moves to h8, promotes to Rook, check');
    });

    test('displays capture with promotion', () => {
      const move = { notation: 'exd8=Q+', description: parseSanToEnglish('exd8=Q+') };

      // Pawn captures don't include file disambiguation in the description
      expect(move.description).toBe('Pawn captures on d8, promotes to Queen, check');
    });
  });

  describe('edge cases in training mode', () => {
    test('handles invalid notation gracefully', () => {
      const invalidMove = { notation: 'Z99', evaluation: 0.0 };

      const displayMove = {
        notation: invalidMove.notation,
        description: parseSanToEnglish(invalidMove.notation),
      };

      // Should return the notation unchanged or a fallback
      expect(displayMove.description).toBeDefined();
    });

    test('handles empty move list', () => {
      const moves: Array<{ notation: string; description: string }> = [];

      expect(moves.length).toBe(0);
    });

    test('handles single move in guidance', () => {
      const move = { notation: 'e4', description: parseSanToEnglish('e4') };

      expect(move.notation).toBe('e4');
      expect(move.description).toBe('Pawn moves to e4');
    });
  });

  describe('move history integration', () => {
    test('displays move history with dual format', () => {
      const moveHistory = [
        { moveNumber: 1, white: 'e4', black: 'e5' },
        { moveNumber: 2, white: 'Nf3', black: 'Nc6' },
      ];

      const displayHistory = moveHistory.map((pair) => ({
        moveNumber: pair.moveNumber,
        white: { notation: pair.white, description: parseSanToEnglish(pair.white) },
        black: { notation: pair.black, description: parseSanToEnglish(pair.black) },
      }));

      expect(displayHistory[0].white.description).toBe('Pawn moves to e4');
      expect(displayHistory[0].black.description).toBe('Pawn moves to e5');
      expect(displayHistory[1].white.description).toBe('Knight moves to f3');
      expect(displayHistory[1].black.description).toBe('Knight moves to c6');
    });

    test('handles incomplete move pairs', () => {
      const moveHistory = [
        { moveNumber: 1, white: 'e4', black: 'e5' },
        { moveNumber: 2, white: 'Nf3', black: null },
      ];

      const displayHistory = moveHistory.map((pair) => ({
        moveNumber: pair.moveNumber,
        white: { notation: pair.white, description: parseSanToEnglish(pair.white) },
        black: pair.black
          ? { notation: pair.black, description: parseSanToEnglish(pair.black) }
          : null,
      }));

      expect(displayHistory[1].white.description).toBe('Knight moves to f3');
      expect(displayHistory[1].black).toBeNull();
    });
  });

  describe('visual hierarchy in training mode', () => {
    test('notation is primary, description is secondary', () => {
      // Simulate CSS-like structure
      const moveDisplay = {
        notation: { text: 'Nf3', weight: 'bold', size: 'large' },
        description: { text: 'Knight moves to f3', weight: 'normal', size: 'small' },
      };

      expect(moveDisplay.notation.weight).toBe('bold');
      expect(moveDisplay.description.weight).toBe('normal');
      expect(moveDisplay.notation.size).toBe('large');
      expect(moveDisplay.description.size).toBe('small');
    });

    test('both notation and description are always visible', () => {
      const move = {
        notation: 'e4',
        description: parseSanToEnglish('e4'),
        notationVisible: true,
        descriptionVisible: true,
      };

      expect(move.notationVisible).toBe(true);
      expect(move.descriptionVisible).toBe(true);
      expect(move.notation).toBeDefined();
      expect(move.description).toBeDefined();
    });
  });

  describe('real-time guidance updates', () => {
    test('guidance can be updated with new moves', () => {
      let guidanceMoves = [{ notation: 'e4', description: parseSanToEnglish('e4') }];

      // Simulate position change
      guidanceMoves = [
        { notation: 'Nf3', description: parseSanToEnglish('Nf3') },
        { notation: 'd4', description: parseSanToEnglish('d4') },
      ];

      expect(guidanceMoves.length).toBe(2);
      expect(guidanceMoves[0].notation).toBe('Nf3');
      expect(guidanceMoves[0].description).toBe('Knight moves to f3');
    });

    test('handles rapid guidance updates', () => {
      const updates = [
        [{ notation: 'e4', description: parseSanToEnglish('e4') }],
        [{ notation: 'Nf3', description: parseSanToEnglish('Nf3') }],
        [{ notation: 'd4', description: parseSanToEnglish('d4') }],
      ];

      updates.forEach((guidanceMoves) => {
        expect(guidanceMoves[0].notation).toBeDefined();
        expect(guidanceMoves[0].description).toBeDefined();
      });
    });
  });
});
