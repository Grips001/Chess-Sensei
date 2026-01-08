# Tech Spec: Move Notation with English Descriptions

> **Status:** Implemented **Author:** Grips001 **Created:** 2025-12-22 **Last
> Updated:** 2025-12-22 **PRD:**
> [prd-move-notation-english-descriptions.md](prd-move-notation-english-descriptions.md)
> **Related Issues:** N/A

---

## Overview

### Summary

Add English descriptions alongside chess notation in the Best Moves panel by
creating a notation-to-English parser utility and updating the rendering logic
to display dual-format move text (e.g., "Nf3 — Knight moves to f3").

### Goals

1. Create a robust SAN-to-English notation parser that handles all standard
   algebraic notation patterns
2. Integrate English descriptions into the existing Best Moves panel rendering
   flow with minimal performance impact
3. Maintain visual hierarchy (notation primary, description secondary) through
   CSS styling
4. Ensure the solution is maintainable and extensible for future notation
   features

### Non-Goals

1. Adding English descriptions to move history or game review features (separate
   future work)
2. Implementing user toggles between notation formats (not in scope)
3. Internationalization/localization to non-English languages
4. Changing the underlying move data structures or IPC protocol

## Background

### Current Architecture

The Best Moves panel system consists of:

1. **Backend Engine Integration**
   ([src/backend/index.ts:612-638](src/backend/index.ts#L612-L638)):
   - `getGuidanceMoves()` IPC method receives position and returns top 3 moves
     from engine
   - Returns moves in UCI format (e.g., "e2e4", "g1f3") with evaluation scores

2. **Frontend Move Guidance Manager**
   ([src/frontend/move-guidance.ts](src/frontend/move-guidance.ts)):
   - Manages guidance state and move data
   - Converts UCI moves to internal `GuidanceMove` format
   - Handles board highlighting and interactions

3. **Frontend Rendering**
   ([src/frontend/index.ts:1299-1359](src/frontend/index.ts#L1299-L1359)):
   - `renderGuidanceMoves()` function displays moves in the panel
   - Converts UCI to SAN using `ChessGame.uciToSan()`
   - Creates HTML with rank badge, notation, and evaluation score

4. **Chess Logic Utilities**
   ([src/shared/chess-logic.ts:417-425](src/shared/chess-logic.ts#L417-L425)):
   - `uciToSan()` method converts UCI format to Standard Algebraic Notation
   - Uses chess.js library for move validation and conversion

**Current Display Format:**

```text
[1] e4    +0.35
[2] Nf3   +0.28
[3] d4    +0.20
```

**Target Display Format:**

```text
[1] e4 — Pawn moves to e4           +0.35
[2] Nf3 — Knight moves to f3        +0.28
[3] d4 — Pawn moves to d4           +0.20
```

### Key Concepts

- **SAN (Standard Algebraic Notation)**: Chess notation like "Nf3", "Qxd5+",
  "O-O"
- **UCI (Universal Chess Interface)**: Engine format like "e2e4", "g1f3"
- **GuidanceMove**: Internal data structure containing move details (UCI, SAN,
  squares, score, color)
- **Glassmorphic Design**: Semi-transparent, blurred panels with rounded corners

## Detailed Design

### Architecture

```text
┌─────────────────────────┐
│  Frontend Rendering     │
│  (index.ts)             │
│                         │
│  1. Receive GuidanceMove│
│  2. Convert UCI to SAN  │
│  3. Parse SAN to English│◄──┐
│  4. Render dual format  │   │
└─────────────────────────┘   │
                              │
                              │ Uses
                              │
┌─────────────────────────────┴─────┐
│  New: SAN Parser Utility          │
│  (src/shared/notation-parser.ts)  │
│                                    │
│  parseSanToEnglish(san: string)   │
│  - Identifies piece type          │
│  - Detects captures/checks/etc    │
│  - Returns English description    │
└────────────────────────────────────┘
```

### Component Changes

#### 1. New Utility: Notation Parser

**File:** `src/shared/notation-parser.ts` (NEW)

**Purpose:** Convert Standard Algebraic Notation to human-readable English
descriptions

**New Functions:**

```typescript
/**
 * Converts Standard Algebraic Notation to English description
 * @param san - Standard algebraic notation (e.g., "Nf3", "Qxd5+", "O-O")
 * @returns English description (e.g., "Knight moves to f3", "Queen captures on d5, check")
 */
export function parseSanToEnglish(san: string): string;

/**
 * Helper: Identifies piece type from SAN notation
 * @param san - Standard algebraic notation
 * @returns Piece name or "Pawn" if no prefix
 */
function getPieceName(san: string): string;

/**
 * Helper: Extracts disambiguation information (file/rank)
 * @param san - Standard algebraic notation
 * @returns Disambiguation text or empty string
 */
function getDisambiguation(san: string): string;

/**
 * Helper: Checks for special move types
 * @param san - Standard algebraic notation
 * @returns Object with flags: isCapture, isCheck, isCheckmate, isCastling, isPromotion
 */
function parseSpecialMoves(san: string): MoveFlags;
```

**Implementation Details:**

The parser will use regex patterns to identify move components:

1. **Castling**: `O-O` (kingside) or `O-O-O` (queenside)
2. **Piece moves**: `[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#]?`
3. **Promotions**: `[a-h][1-8]=[NBRQ]`
4. **Captures**: Contains `x`
5. **Check/Checkmate**: Ends with `+` or `#`

**Example Parsing Logic:**

```typescript
export function parseSanToEnglish(san: string): string {
  // Handle castling
  if (san === 'O-O') return 'Castle kingside';
  if (san === 'O-O-O') return 'Castle queenside';

  const flags = parseSpecialMoves(san);
  const piece = getPieceName(san);
  const disambiguation = getDisambiguation(san);
  const targetSquare = extractTargetSquare(san);

  // Build description
  let description = piece;

  if (disambiguation) {
    description += ` from ${disambiguation}`;
  }

  if (flags.isCapture) {
    description += ' captures';
  } else {
    description += ' moves';
  }

  if (flags.isPromotion) {
    const promotionPiece = extractPromotionPiece(san);
    description += ` to ${targetSquare}, promotes to ${promotionPiece}`;
  } else {
    description += ` to ${targetSquare}`;
  }

  if (flags.isCheckmate) {
    description += ', checkmate';
  } else if (flags.isCheck) {
    description += ', check';
  }

  return description;
}
```

**Edge Cases Handled:**

- Ambiguous notation: `Nbd2` → "Knight from b-file moves to d2"
- Captures: `Qxd5` → "Queen captures on d5"
- En passant: `exd6` → "Pawn captures on d6" (no special handling needed)
- Promotions: `e8=Q` → "Pawn moves to e8, promotes to Queen"
- Checks: `Nf7+` → "Knight moves to f7, check"
- Checkmate: `Qh8#` → "Queen moves to h8, checkmate"

#### 2. Frontend Rendering Updates

**File:** `src/frontend/index.ts`

**Function:** `renderGuidanceMoves()` (lines 1299-1359)

**Changes:**

```typescript
// BEFORE (current code around line 1322):
const san = ChessGame.uciToSan(gameState.fen, move.uci);
if (!san) {
  console.warn('Failed to convert UCI to SAN:', move.uci);
  continue;
}

const entryHTML = `
  <div class="guidance-move-entry" data-index="${i}" data-from="${move.from}" data-to="${move.to}">
    <div class="guidance-move-rank rank-${i + 1}">${i + 1}</div>
    <div class="guidance-move-notation move-${move.color}">${san}</div>
    <div class="guidance-move-eval">${move.formattedScore}</div>
  </div>
`;

// AFTER (with English descriptions):
import { parseSanToEnglish } from '../shared/notation-parser.js';

const san = ChessGame.uciToSan(gameState.fen, move.uci);
if (!san) {
  console.warn('Failed to convert UCI to SAN:', move.uci);
  continue;
}

const englishDescription = parseSanToEnglish(san);

const entryHTML = `
  <div class="guidance-move-entry" data-index="${i}" data-from="${move.from}" data-to="${move.to}">
    <div class="guidance-move-rank rank-${i + 1}">${i + 1}</div>
    <div class="guidance-move-content">
      <span class="guidance-move-notation move-${move.color}">${san}</span>
      <span class="guidance-move-description"> — ${englishDescription}</span>
    </div>
    <div class="guidance-move-eval">${move.formattedScore}</div>
  </div>
`;
```

**Rationale for Changes:**

- Wrap notation and description in a container (`.guidance-move-content`) for
  better layout control
- Keep notation as primary visual element with strong color
- Add description with secondary styling (lighter color, smaller font)
- Maintain existing data attributes for hover interactions

#### 3. CSS Styling Updates

**File:** `src/frontend/styles/index.css`

**Section:** `.guidance-move-entry` styles (lines 904-986)

**Changes:**

```css
/* MODIFY existing .guidance-move-entry to use flex-wrap */
.guidance-move-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
  flex-wrap: nowrap; /* Prevent wrapping by default */
}

/* NEW: Container for notation + description */
.guidance-move-content {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  flex: 1;
  min-width: 0; /* Allow text truncation if needed */
  flex-wrap: wrap; /* Allow wrapping on small screens */
}

/* MODIFY existing notation styles to work inline */
.guidance-move-notation {
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0; /* Notation never truncates */
}

/* NEW: Description styling */
.guidance-move-description {
  font-size: 0.875rem; /* Slightly smaller than notation */
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7); /* Secondary text color */
  flex-shrink: 1; /* Can truncate if space is tight */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* MODIFY eval to stay right-aligned */
.guidance-move-eval {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
  min-width: 3.5rem; /* Ensure consistent width */
  flex-shrink: 0; /* Never truncate score */
}

/* Responsive: On very small widths, allow description to wrap */
@media (max-width: 1366px) {
  .guidance-move-content {
    flex-wrap: wrap;
  }

  .guidance-move-description {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
}
```

**Visual Hierarchy Maintained:**

- Notation: Bold, full opacity, colored (blue/green/yellow)
- Description: Regular weight, 70% opacity, smaller font
- Score: Monospace, 60% opacity, right-aligned

### Data Model

No changes to existing data structures. The `GuidanceMove` interface remains
unchanged:

```typescript
// src/frontend/move-guidance.ts (existing)
interface GuidanceMove {
  uci: string; // "e2e4"
  san?: string; // "e4" (set during rendering)
  from: string; // "e2"
  to: string; // "e4"
  score: number; // 35 (centipawns)
  formattedScore: string; // "+0.35"
  color: 'blue' | 'green' | 'yellow';
  pv?: string[]; // Principal variation
}
```

**New Types** (in `src/shared/notation-parser.ts`):

```typescript
/**
 * Flags indicating special move characteristics
 */
interface MoveFlags {
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastling: boolean;
  isPromotion: boolean;
  isEnPassant: boolean;
}

/**
 * Piece name mapping
 */
type PieceMap = {
  K: 'King';
  Q: 'Queen';
  R: 'Rook';
  B: 'Bishop';
  N: 'Knight';
  '': 'Pawn'; // Empty prefix = pawn
};
```

### API Changes

#### IPC Methods

No new IPC methods required. Existing `getGuidanceMoves` remains unchanged.

### UI Changes

**Affected Files:**

- [src/frontend/index.ts](src/frontend/index.ts) - Rendering logic
- [src/frontend/styles/index.css](src/frontend/styles/index.css) - Visual
  styling
- [index.html](index.html) - No structural changes needed

**Visual Changes:**

**Before:**

```text
┌─────────────────────────────────────┐
│ Best Moves                          │
├─────────────────────────────────────┤
│ [1] e4              +0.35           │
│ [2] Nf3             +0.28           │
│ [3] d4              +0.20           │
└─────────────────────────────────────┘
```

**After:**

```text
┌─────────────────────────────────────────────────┐
│ Best Moves                                      │
├─────────────────────────────────────────────────┤
│ [1] e4 — Pawn moves to e4           +0.35      │
│ [2] Nf3 — Knight moves to f3        +0.28      │
│ [3] d4 — Pawn moves to d4           +0.20      │
└─────────────────────────────────────────────────┘
```

### State Management

No state management changes required. The notation parser is a pure function
with no side effects. English descriptions are generated on-demand during
rendering.

### Error Handling

| Error Condition              | Handling Strategy                              | User Feedback                       |
| ---------------------------- | ---------------------------------------------- | ----------------------------------- |
| Invalid SAN input to parser  | Return fallback description "Move to [square]" | Degraded display, no error shown    |
| Failed UCI to SAN conversion | Skip move or show UCI only                     | Console warning (existing behavior) |
| Malformed notation patterns  | Graceful fallback to basic description         | No user-facing error                |

**Error Handling in Parser:**

```typescript
export function parseSanToEnglish(san: string): string {
  try {
    // Main parsing logic
    // ...
  } catch (error) {
    console.warn('Failed to parse SAN to English:', san, error);
    // Fallback: extract target square and show minimal description
    const targetSquare = san.match(/[a-h][1-8]/)?.[0];
    return targetSquare ? `Move to ${targetSquare}` : 'Move';
  }
}
```

## Implementation Plan

### Phase Breakdown

#### Phase 1: Core Notation Parser

**Scope:**

- Create `src/shared/notation-parser.ts` file
- Implement `parseSanToEnglish()` function
- Handle basic move types (piece moves, pawn moves)
- Handle captures and checks/checkmate
- Write unit tests for common patterns

**Files Changed:**

- `src/shared/notation-parser.ts` (CREATE)
- `tests/unit/notation-parser.test.ts` (CREATE)

**Dependencies:** None

**Estimated Complexity:** Medium

#### Phase 2: Special Move Handling

**Scope:**

- Add castling support (O-O, O-O-O)
- Add promotion support (e8=Q)
- Handle ambiguous notation (Nbd2, R1a3)
- Add en passant detection (no special display needed)
- Expand unit test coverage

**Files Changed:**

- `src/shared/notation-parser.ts` (MODIFY)
- `tests/unit/notation-parser.test.ts` (MODIFY)

**Dependencies:** Phase 1

**Estimated Complexity:** Medium

#### Phase 3: Frontend Integration

**Scope:**

- Import parser into `src/frontend/index.ts`
- Update `renderGuidanceMoves()` to call parser
- Modify HTML template to include description
- Update CSS for new layout
- Test with various positions

**Files Changed:**

- `src/frontend/index.ts` (MODIFY)
- `src/frontend/styles/index.css` (MODIFY)

**Dependencies:** Phase 1, Phase 2

**Estimated Complexity:** Low

#### Phase 4: Polish & Edge Cases

**Scope:**

- Responsive design testing (various screen sizes)
- Visual hierarchy refinement
- Performance testing with rapid move changes
- Accessibility testing (screen readers)
- Integration testing in Training Mode

**Files Changed:**

- `src/frontend/styles/index.css` (MODIFY)
- `tests/integration/training-mode.test.ts` (MODIFY)

**Dependencies:** Phase 3

**Estimated Complexity:** Low

### File Changes Summary

| File                                      | Action | Description                                                              |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `src/shared/notation-parser.ts`           | Create | New parser utility for SAN-to-English conversion                         |
| `src/frontend/index.ts`                   | Modify | Update `renderGuidanceMoves()` to use parser                             |
| `src/frontend/styles/index.css`           | Modify | Add styles for `.guidance-move-content` and `.guidance-move-description` |
| `tests/unit/notation-parser.test.ts`      | Create | Unit tests for parser function                                           |
| `tests/integration/training-mode.test.ts` | Modify | Add tests for dual-format display                                        |

## Testing Strategy

### Unit Tests

| Test Case          | File                      | Description                                         |
| ------------------ | ------------------------- | --------------------------------------------------- |
| Basic piece moves  | `notation-parser.test.ts` | Test "Nf3" → "Knight moves to f3"                   |
| Pawn moves         | `notation-parser.test.ts` | Test "e4" → "Pawn moves to e4"                      |
| Captures           | `notation-parser.test.ts` | Test "Qxd5" → "Queen captures on d5"                |
| Checks             | `notation-parser.test.ts` | Test "Nf7+" → "Knight moves to f7, check"           |
| Checkmate          | `notation-parser.test.ts` | Test "Qh8#" → "Queen moves to h8, checkmate"        |
| Castling kingside  | `notation-parser.test.ts` | Test "O-O" → "Castle kingside"                      |
| Castling queenside | `notation-parser.test.ts` | Test "O-O-O" → "Castle queenside"                   |
| Promotions         | `notation-parser.test.ts` | Test "e8=Q" → "Pawn moves to e8, promotes to Queen" |
| Ambiguous notation | `notation-parser.test.ts` | Test "Nbd2" → "Knight from b-file moves to d2"      |
| Capture with check | `notation-parser.test.ts` | Test "Qxe5+" → "Queen captures on e5, check"        |
| Invalid input      | `notation-parser.test.ts` | Test fallback behavior for malformed SAN            |

**Example Unit Test:**

```typescript
import { describe, test, expect } from 'bun:test';
import { parseSanToEnglish } from '@/shared/notation-parser';

describe('parseSanToEnglish', () => {
  describe('basic piece moves', () => {
    test('converts knight move correctly', () => {
      expect(parseSanToEnglish('Nf3')).toBe('Knight moves to f3');
    });

    test('converts pawn move correctly', () => {
      expect(parseSanToEnglish('e4')).toBe('Pawn moves to e4');
    });
  });

  describe('captures', () => {
    test('converts queen capture correctly', () => {
      expect(parseSanToEnglish('Qxd5')).toBe('Queen captures on d5');
    });

    test('converts pawn capture correctly', () => {
      expect(parseSanToEnglish('exd5')).toBe('Pawn captures on d5');
    });
  });

  describe('special moves', () => {
    test('converts castling kingside', () => {
      expect(parseSanToEnglish('O-O')).toBe('Castle kingside');
    });

    test('converts promotion', () => {
      expect(parseSanToEnglish('e8=Q')).toBe(
        'Pawn moves to e8, promotes to Queen'
      );
    });
  });

  describe('checks and checkmate', () => {
    test('converts check correctly', () => {
      expect(parseSanToEnglish('Nf7+')).toBe('Knight moves to f7, check');
    });

    test('converts checkmate correctly', () => {
      expect(parseSanToEnglish('Qh8#')).toBe('Queen moves to h8, checkmate');
    });
  });

  describe('ambiguous notation', () => {
    test('converts file disambiguation', () => {
      expect(parseSanToEnglish('Nbd2')).toBe('Knight from b-file moves to d2');
    });

    test('converts rank disambiguation', () => {
      expect(parseSanToEnglish('R1a3')).toBe('Rook from rank 1 moves to a3');
    });
  });

  describe('error handling', () => {
    test('handles invalid input gracefully', () => {
      const result = parseSanToEnglish('INVALID');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

### Integration Tests

| Test Case             | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| Training Mode display | Verify Best Moves panel shows dual-format moves in Training Mode |
| Move list update      | Verify descriptions update when position changes                 |
| Hover interactions    | Ensure hover still works with new HTML structure                 |
| Screen size handling  | Test panel on various resolutions (1280x720 to 4K)               |

**Example Integration Test:**

```typescript
import { describe, test, expect } from 'bun:test';

describe('Training Mode - Best Moves Display', () => {
  test('displays move notation with English descriptions', async () => {
    // Start game in Training Mode
    // Make a move
    // Wait for engine analysis

    const moveEntries = document.querySelectorAll('.guidance-move-entry');
    expect(moveEntries.length).toBe(3);

    const firstMove = moveEntries[0];
    const notation = firstMove.querySelector('.guidance-move-notation');
    const description = firstMove.querySelector('.guidance-move-description');

    expect(notation?.textContent).toBeDefined();
    expect(description?.textContent).toContain('—');
    expect(description?.textContent).toMatch(/moves|captures/);
  });
});
```

### Manual Test Cases

| ID    | Steps                               | Expected Result                                    |
| ----- | ----------------------------------- | -------------------------------------------------- |
| MT-1  | Start Training Mode, make move "e4" | Best move shows "e4 — Pawn moves to e4"            |
| MT-2  | Position with knight move "Nf3"     | Shows "Nf3 — Knight moves to f3"                   |
| MT-3  | Position with capture "Qxd5"        | Shows "Qxd5 — Queen captures on d5"                |
| MT-4  | Position leading to check "Nf7+"    | Shows "Nf7+ — Knight moves to f7, check"           |
| MT-5  | Position with castling "O-O"        | Shows "O-O — Castle kingside"                      |
| MT-6  | Position with promotion "e8=Q"      | Shows "e8=Q — Pawn moves to e8, promotes to Queen" |
| MT-7  | Hover over move entry               | Board highlights still work correctly              |
| MT-8  | Resize window to 1280x720           | Descriptions wrap cleanly or truncate              |
| MT-9  | Rapid position changes              | No lag or visual glitches in panel updates         |
| MT-10 | Screen reader test                  | Both notation and description read aloud           |

## Performance Considerations

### Expected Impact

- **CPU**: Negligible. String parsing is lightweight (~0.1ms per move).
- **Memory**: Minimal increase (~50 bytes per move for description string).
- **Rendering**: No measurable impact. HTML generation already occurs on every
  move update.
- **Startup Time**: No impact. Parser is loaded as part of frontend bundle.

### Benchmarks

**Parser Performance Target:**

- Single `parseSanToEnglish()` call: < 0.1ms
- 3 moves (full panel update): < 0.3ms
- Test with 1000 random positions to verify consistency

**Benchmark Test:**

```typescript
import { describe, test } from 'bun:test';
import { parseSanToEnglish } from '@/shared/notation-parser';

describe('Parser Performance', () => {
  test('parses 1000 moves in reasonable time', () => {
    const testMoves = ['Nf3', 'e4', 'Qxd5', 'O-O', 'e8=Q', 'Nf7+', ...];

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      parseSanToEnglish(testMoves[i % testMoves.length]);
    }
    const end = performance.now();

    const timePerMove = (end - start) / 1000;
    console.log(`Average time per move: ${timePerMove.toFixed(3)}ms`);
    expect(timePerMove).toBeLessThan(0.1);
  });
});
```

## Security Considerations

- [x] No user data exposed - parser operates on engine-generated SAN notation
      only
- [x] Input validation added - parser handles malformed input gracefully with
      fallbacks
- [x] No new attack vectors - pure string parsing function with no external
      dependencies
- [x] No XSS risk - output is text content, not HTML (properly escaped in
      template)

**XSS Prevention:**

```typescript
// In renderGuidanceMoves(), ensure description is escaped
const entryHTML = `
  <span class="guidance-move-description"> — ${sanitizeText(englishDescription)}</span>
`;

// Or use textContent assignment instead of innerHTML (preferred)
descriptionElement.textContent = ` — ${englishDescription}`;
```

## Rollout Plan

### Feature Flags

Not required. Feature is low-risk and improves user experience unconditionally.
Can be deployed directly to production.

### Rollback Plan

If issues arise post-deployment:

1. **Quick Fix**: Modify `renderGuidanceMoves()` to skip parser call and show
   notation only
2. **Revert Commit**: Use git to revert to previous version
3. **CSS Fallback**: Remove `.guidance-move-description` styles to hide
   descriptions

**Rollback Code:**

```typescript
// Emergency rollback: comment out these lines in renderGuidanceMoves()
// const englishDescription = parseSanToEnglish(san);
// <span class="guidance-move-description"> — ${englishDescription}</span>
```

## Alternatives Considered

### Option 1: Generate Descriptions on Backend

**Approach:** Add English description to `BestMove` interface and generate on
backend.

**Pros:**

- Backend has full position context
- Could use engine annotations

**Cons:**

- Increases IPC payload size
- Backend shouldn't handle UI formatting concerns
- Harder to iterate on description format
- Violates separation of concerns

**Why rejected:** Frontend is the appropriate layer for UI formatting. Backend
should remain focused on chess logic and engine communication.

### Option 2: Use chess.js Move Object Directly

**Approach:** Parse chess.js's internal move object for piece/square info
instead of parsing SAN strings.

**Pros:**

- Avoids string parsing
- Structured data access

**Cons:**

- Requires passing chess.js objects through rendering pipeline
- Current architecture uses SAN strings as canonical format
- Would need to maintain chess.js instance state
- More complex than string parsing

**Why rejected:** Current architecture already converts to SAN for display.
Adding a parallel data path is unnecessary complexity.

### Option 3: Tooltip-Based Descriptions

**Approach:** Show descriptions only on hover via tooltips.

**Pros:**

- Keeps panel visually clean
- No layout changes needed

**Cons:**

- Reduces learning effectiveness (not always visible)
- Poor discoverability
- Doesn't work on touch screens
- Requires mouse precision

**Why rejected:** PRD explicitly calls for always-visible descriptions to
facilitate organic notation learning through repeated exposure.

## Dependencies

### External Dependencies

None. Implementation uses only existing dependencies:

| Dependency | Version | License      | Purpose                                |
| ---------- | ------- | ------------ | -------------------------------------- |
| chess.js   | ^1.0.0  | BSD-2-Clause | Already used for UCI-to-SAN conversion |

### Internal Dependencies

- **Chess Logic Module**
  ([src/shared/chess-logic.ts](src/shared/chess-logic.ts)): Provides
  `uciToSan()` for notation conversion
- **Frontend Rendering** ([src/frontend/index.ts](src/frontend/index.ts)):
  Existing `renderGuidanceMoves()` function
- **CSS System**
  ([src/frontend/styles/index.css](src/frontend/styles/index.css)): Existing
  glassmorphic design system
- **Move Guidance Manager**
  ([src/frontend/move-guidance.ts](src/frontend/move-guidance.ts)):
- Provides `GuidanceMove` data structure

## Open Questions

1. ~~Should we add a user preference to hide descriptions if they find them
   distracting?~~
   - **Answer**: No, not in initial implementation. Can add later if user
     feedback indicates demand.

2. ~~What should the exact text format be for ambiguous moves? "Knight from
   b-file" vs "Knight on b-file" vs "b-knight"?~~
   - **Answer**: Use "Knight from b-file" for clarity and consistency with
     "moves to" phrasing.

3. ~~Should we cache parsed descriptions to avoid re-parsing identical moves?~~
   - **Answer**: Not necessary. Parsing is fast enough (<0.1ms) that caching
     adds complexity without meaningful benefit.

4. ~~Should descriptions be added to the move history panel in this
   implementation?~~
   - **Answer**: No, PRD explicitly marks that as future work. Focus on Best
     Moves panel only.

## Risks

| Risk                                       | Likelihood | Impact | Mitigation                                                                              |
| ------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------- |
| Panel becomes too wide on small screens    | Low        | Low    | Responsive CSS with text wrapping/truncation; test on 1280x720                          |
| Parser misses edge case notation           | Low        | Low    | Comprehensive unit tests; fallback to basic description on parse failure                |
| Performance degradation on slower machines | Very Low   | Low    | Benchmark tests; parser is simple string manipulation with no heavy computation         |
| Users find dual format cluttered           | Low        | Medium | Use clear visual hierarchy (secondary color/size for description); gather user feedback |
| Description translations needed later      | Medium     | Low    | Keep English descriptions in separate function for easy i18n later                      |

---

## Approval

| Role       | Name | Date | Status  |
| ---------- | ---- | ---- | ------- |
| Tech Lead  |      |      | Pending |
| Reviewer 1 |      |      | Pending |
| Reviewer 2 |      |      | Pending |

## Revision History

| Version | Date       | Author   | Changes       |
| ------- | ---------- | -------- | ------------- |
| 0.1     | 2025-12-22 | Grips001 | Initial draft |
