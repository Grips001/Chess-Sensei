/**
 * UCI Utilities
 *
 * Centralized utilities for UCI (Universal Chess Interface) move handling.
 * Reduces code duplication across frontend files.
 */

/**
 * Parsed UCI move with from and to squares.
 */
export interface UciMove {
  /** Source square (e.g., 'e2') */
  from: string;
  /** Destination square (e.g., 'e4') */
  to: string;
  /** Promotion piece if applicable (e.g., 'q' for queen) */
  promotion?: string;
}

/**
 * Parses a UCI move string into its component squares.
 *
 * UCI format: "e2e4" (from e2 to e4) or "e7e8q" (promotion to queen)
 *
 * @param uci - UCI move string (e.g., "e2e4", "e7e8q")
 * @returns Parsed move with from, to, and optional promotion
 *
 * @example
 * ```typescript
 * const move = parseUciMove('e2e4');
 * console.log(move.from); // 'e2'
 * console.log(move.to);   // 'e4'
 *
 * const promo = parseUciMove('e7e8q');
 * console.log(promo.promotion); // 'q'
 * ```
 */
export function parseUciMove(uci: string): UciMove {
  const result: UciMove = {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
  };

  // Check for promotion piece (5th character)
  if (uci.length > 4) {
    result.promotion = uci.substring(4, 5);
  }

  return result;
}

/**
 * Composes a UCI move string from component squares.
 *
 * @param from - Source square (e.g., 'e2')
 * @param to - Destination square (e.g., 'e4')
 * @param promotion - Optional promotion piece (e.g., 'q')
 * @returns UCI move string
 *
 * @example
 * ```typescript
 * composeUciMove('e2', 'e4');       // 'e2e4'
 * composeUciMove('e7', 'e8', 'q');  // 'e7e8q'
 * ```
 */
export function composeUciMove(from: string, to: string, promotion?: string): string {
  let uci = from + to;
  if (promotion) {
    uci += promotion.toLowerCase();
  }
  return uci;
}

/**
 * Validates a UCI move string format.
 *
 * @param uci - UCI move string to validate
 * @returns true if the format is valid
 *
 * @example
 * ```typescript
 * isValidUciFormat('e2e4');   // true
 * isValidUciFormat('e7e8q');  // true
 * isValidUciFormat('invalid'); // false
 * isValidUciFormat('e2');     // false
 * ```
 */
export function isValidUciFormat(uci: string): boolean {
  // Basic length check: 4 chars for normal moves, 5 for promotions
  if (uci.length < 4 || uci.length > 5) {
    return false;
  }

  // Check file (a-h) and rank (1-8) for both squares
  const fileRegex = /[a-h]/;
  const rankRegex = /[1-8]/;

  const fromFile = uci[0];
  const fromRank = uci[1];
  const toFile = uci[2];
  const toRank = uci[3];

  if (!fileRegex.test(fromFile) || !rankRegex.test(fromRank)) {
    return false;
  }

  if (!fileRegex.test(toFile) || !rankRegex.test(toRank)) {
    return false;
  }

  // Check promotion piece if present
  if (uci.length === 5) {
    const promotion = uci[4];
    if (!/[qrbn]/.test(promotion)) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts just the from square from a UCI move.
 *
 * @param uci - UCI move string
 * @returns From square (e.g., 'e2')
 */
export function getFromSquare(uci: string): string {
  return uci.substring(0, 2);
}

/**
 * Extracts just the to square from a UCI move.
 *
 * @param uci - UCI move string
 * @returns To square (e.g., 'e4')
 */
export function getToSquare(uci: string): string {
  return uci.substring(2, 4);
}

/**
 * Checks if a UCI move is a promotion.
 *
 * @param uci - UCI move string
 * @returns true if the move includes a promotion
 */
export function isPromotion(uci: string): boolean {
  return uci.length === 5;
}

/**
 * Gets the promotion piece from a UCI move.
 *
 * @param uci - UCI move string
 * @returns Promotion piece or undefined if not a promotion
 */
export function getPromotionPiece(uci: string): string | undefined {
  return uci.length === 5 ? uci[4] : undefined;
}
