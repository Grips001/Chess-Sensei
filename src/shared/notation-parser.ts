/**
 * Notation Parser - Converts Standard Algebraic Notation to English descriptions
 *
 * This module provides utilities to translate chess notation (e.g., "Nf3", "Qxd5+")
 * into human-readable English descriptions (e.g., "Knight moves to f3", "Queen captures on d5, check")
 * to help newer players learn notation organically.
 */

/**
 * Flags indicating special move characteristics
 */
interface MoveFlags {
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isPromotion: boolean;
  promotionPiece?: string;
}

/**
 * Piece name mappings
 */
const PIECE_NAMES: Record<string, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
};

const PROMOTION_PIECES: Record<string, string> = {
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
};

/**
 * Converts Standard Algebraic Notation to English description
 * @param san - Standard algebraic notation (e.g., "Nf3", "Qxd5+", "O-O")
 * @returns English description (e.g., "Knight moves to f3", "Queen captures on d5, check")
 */
export function parseSanToEnglish(san: string): string {
  try {
    // Handle castling
    if (san === 'O-O') return 'Castle kingside';
    if (san === 'O-O-O') return 'Castle queenside';

    // Parse move flags (capture, check, checkmate, promotion)
    const flags = parseSpecialMoves(san);

    // Get piece name
    const piece = getPieceName(san);

    // Get disambiguation info (e.g., "b" in "Nbd2")
    const disambiguation = getDisambiguation(san);

    // Get target square
    const targetSquare = extractTargetSquare(san);

    // Build description
    let description = piece;

    // Add disambiguation if present
    if (disambiguation) {
      description += ` from ${disambiguation}`;
    }

    // Add action and target square
    if (flags.isCapture) {
      description += ` captures on ${targetSquare}`;
    } else {
      description += ` moves to ${targetSquare}`;
    }

    // Add promotion if applicable
    if (flags.isPromotion && flags.promotionPiece) {
      description += `, promotes to ${flags.promotionPiece}`;
    }

    // Add check/checkmate suffix
    if (flags.isCheckmate) {
      description += ', checkmate';
    } else if (flags.isCheck) {
      description += ', check';
    }

    return description;
  } catch (_error) {
    // Fallback for any parsing errors
    const targetSquare = extractTargetSquare(san);
    return `Move to ${targetSquare}`;
  }
}

/**
 * Parse special move flags from notation
 */
function parseSpecialMoves(san: string): MoveFlags {
  const flags: MoveFlags = {
    isCapture: san.includes('x'),
    isCheck: san.includes('+') && !san.includes('#'),
    isCheckmate: san.includes('#'),
    isPromotion: san.includes('='),
  };

  // Extract promotion piece if present
  if (flags.isPromotion) {
    const promotionMatch = san.match(/=([QRBN])/);
    if (promotionMatch) {
      flags.promotionPiece = PROMOTION_PIECES[promotionMatch[1]];
    }
  }

  return flags;
}

/**
 * Get piece name from notation
 * Returns "Pawn" if no piece letter is present
 */
function getPieceName(san: string): string {
  // Check if first character is a piece letter
  const firstChar = san[0];
  if (firstChar in PIECE_NAMES) {
    return PIECE_NAMES[firstChar];
  }
  // Default to pawn if no piece letter
  return 'Pawn';
}

/**
 * Get disambiguation information (file or rank)
 * Examples: "Nbd2" -> "b-file", "R1a3" -> "rank 1", "Qh4e1" -> "h-file"
 */
function getDisambiguation(san: string): string | null {
  const piece = getPieceName(san);

  // Only non-pawn pieces can have disambiguation
  if (piece === 'Pawn') {
    return null;
  }

  // Remove capture symbol and check/checkmate symbols for easier parsing
  const cleaned = san.replace(/[x+#]/g, '');

  // Pattern: Piece letter followed by disambiguator (file/rank or square), then target square
  // Examples: Nbd2 (N-b-d2), R1a3 (R-1-a3), Qh4e1 (Q-h4-e1)
  // Must have at least 4 chars: piece + disambiguator + target square (2 chars)
  if (cleaned.length < 4) {
    return null;
  }

  // Try to match: Piece + (file or rank or full square) + target square
  // Example: Qh4e1 -> Q + h4 + e1 or Nbd2 -> N + b + d2
  const disambiguationPattern = /^[KQRBN]([a-h][1-8]|[a-h]|[1-8])([a-h][1-8])/;
  const match = cleaned.match(disambiguationPattern);

  if (match) {
    const disambiguator = match[1];

    // Full square disambiguation (e.g., "h4" in "Qh4e1")
    if (disambiguator.length === 2) {
      return `${disambiguator[0]}-file`;
    }

    // Single file (e.g., "b" in "Nbd2")
    if (/^[a-h]$/.test(disambiguator)) {
      return `${disambiguator}-file`;
    }

    // Single rank (e.g., "1" in "R1a3")
    if (/^[1-8]$/.test(disambiguator)) {
      return `rank ${disambiguator}`;
    }
  }

  return null;
}

/**
 * Extract target square from notation
 * Handles various formats including captures, checks, promotions
 */
function extractTargetSquare(san: string): string {
  // Remove check/checkmate symbols
  let cleaned = san.replace(/[+#]/g, '');

  // Remove promotion notation
  cleaned = cleaned.replace(/=[QRBN]/g, '');

  // Find the target square (last occurrence of file+rank pattern)
  const squareMatch = cleaned.match(/([a-h][1-8])(?!.*[a-h][1-8])/);

  if (squareMatch) {
    return squareMatch[1];
  }

  // Fallback: return last 2 characters if they match square pattern
  const lastTwo = cleaned.slice(-2);
  if (/^[a-h][1-8]$/.test(lastTwo)) {
    return lastTwo;
  }

  return 'unknown square';
}
