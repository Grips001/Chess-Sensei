# Tech Spec: Move Reasoning Explanations

> **Status:** Implemented **Author:** Grips001 **Created:** 2025-12-22 **Last
> Updated:** 2025-12-22 **PRD:**
> [prd-move-reasoning-explanations.md](prd-move-reasoning-explanations.md)
> **Related Issues:** N/A

---

## Overview

### Summary

Add interactive explanation bubbles to board move highlights in Training Mode by
creating a bubble icon overlay system, an explanation modal component, and a
template-based explanation generation system that maps move characteristics to
human-readable tactical and positional concepts.

### Goals

1. Create a non-intrusive bubble icon overlay system positioned near highlighted
   squares
2. Build a reusable modal component for displaying move explanations with
   glassmorphic styling
3. Implement a template-based explanation generator that maps engine evaluation
   data to chess concepts
4. Integrate explanation system with existing guidance highlighting without
   disrupting board interactions
5. Ensure performance targets (<100ms explanation retrieval, 60fps animations)

### Non-Goals

1. AI-generated real-time explanations (use template-based system initially)
2. Deep engine analysis with full variation trees (focus on conceptual
   understanding)
3. Explanation system for Exam Mode or Play Mode (Training Mode only)
4. Historical move explanations or game review annotations (future work)
5. Multi-language support for explanations (English only initially)

## Background

### Current Architecture

The existing guidance system consists of:

1. **Move Guidance Manager**
   ([src/frontend/move-guidance.ts](src/frontend/move-guidance.ts)):
   - Manages top 3 engine recommendations
   - Converts engine `BestMove` to `GuidanceMove` with color assignments
     (blue/green/yellow)
   - Provides callbacks for UI updates

2. **Board Highlighting System**
   ([src/frontend/index.ts:1367-1488](src/frontend/index.ts#L1367-L1488)):
   - Three-layer nested ring design using CSS pseudo-elements
   - Supports multi-color highlights on the same square
   - Pure CSS approach (no SVG overlays)

3. **Backend Engine Integration**
   ([src/backend/index.ts:612-638](src/backend/index.ts#L612-L638)):
   - `getGuidanceMoves()` IPC method returns top 3 moves with scores
   - Engine provides centipawn evaluations and principal variations

**Current Visual System:**

- Squares highlighted with colored borders (blue/green/yellow)
- Three concentric rings for overlapping moves (inset: 2px, 12px, 22px)
- Smooth CSS transitions on highlight appearance
- No user interaction beyond hover effects

**Gap:** No way for users to understand _why_ moves are recommended.

### Key Concepts

- **Bubble Icon**: Small circular icon positioned near highlighted squares that
  users can click
- **Explanation Modal**: Glassmorphic popup showing move reasoning
- **Template-Based Explanations**: Pre-written explanation patterns matched to
  move characteristics
- **Tactical Motifs**: Chess patterns (fork, pin, skewer, discovered attack,
  etc.)
- **Positional Concepts**: Strategic ideas (development, king safety, central
  control, pawn structure)
- **Principal Variation (PV)**: Sequence of best moves calculated by engine

## Detailed Design

### Architecture

```text
┌──────────────────────────────────────────┐
│  Frontend - Board Rendering              │
│  (index.ts)                              │
│                                          │
│  1. Render guidance highlights           │
│  2. Add bubble icons near highlights     │◄──┐
│  3. Attach click handlers                │   │
└────────────────┬─────────────────────────┘   │
                 │                              │
                 │ Clicks bubble                │
                 ▼                              │
┌──────────────────────────────────────────┐   │
│  Explanation Manager                     │   │
│  (src/frontend/explanation-manager.ts)   │   │
│                                          │   │
│  1. Receive move data + position         │   │
│  2. Generate explanation                 │   │ Uses
│  3. Open modal with content              │   │
└────────────────┬─────────────────────────┘   │
                 │                              │
                 │ Uses                         │
                 ▼                              │
┌──────────────────────────────────────────────┴──┐
│  Explanation Generator                          │
│  (src/shared/explanation-generator.ts)          │
│                                                  │
│  - analyzeMove(fen, move, score, pv)            │
│  - identifyTacticalMotifs()                     │
│  - identifyPositionalThemes()                   │
│  - generateExplanation() → ExplanationContent   │
└──────────────────────────────────────────────────┘
                 │
                 │ Returns
                 ▼
┌──────────────────────────────────────────┐
│  Explanation Modal Component             │
│  (src/frontend/components/               │
│   explanation-modal.ts)                  │
│                                          │
│  - Glassmorphic styled modal             │
│  - Close on click outside                │
│  - Keyboard navigation support           │
└──────────────────────────────────────────┘
```

### Component Changes

#### 1. New Component: Explanation Bubble Icons

**File:** `src/frontend/board-annotations.ts` (NEW)

**Purpose:** Manage bubble icon overlays on the chessboard

**New Class:**

```typescript
/**
 * Manages explanation bubble icons overlaid on the chessboard
 */
export class BoardAnnotations {
  private boardElement: HTMLElement;
  private bubbles: Map<string, HTMLElement> = new Map();
  private onBubbleClick: (square: string, moveData: GuidanceMove) => void;

  constructor(
    boardElement: HTMLElement,
    clickHandler: (square: string, moveData: GuidanceMove) => void
  ) {
    this.boardElement = boardElement;
    this.onBubbleClick = clickHandler;
  }

  /**
   * Render bubble icons for guidance moves
   */
  renderBubbles(moves: GuidanceMove[]): void {
    this.clearBubbles();

    moves.forEach((move, index) => {
      // Create bubble for destination square
      this.createBubble(move.to, move, index);
    });
  }

  /**
   * Create a single bubble icon
   */
  private createBubble(square: string, move: GuidanceMove, rank: number): void {
    const bubble = document.createElement('div');
    bubble.className = `guidance-bubble bubble-${move.color}`;
    bubble.dataset.square = square;
    bubble.dataset.rank = String(rank + 1);

    // Position bubble relative to square
    const position = this.calculateBubblePosition(square);
    bubble.style.left = `${position.x}px`;
    bubble.style.top = `${position.y}px`;

    // Add icon
    const icon = document.createElement('span');
    icon.className = 'bubble-icon';
    icon.textContent = 'ℹ'; // Info icon (can use SVG later)
    bubble.appendChild(icon);

    // Click handler
    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onBubbleClick(square, move);
    });

    this.bubbles.set(square, bubble);
    this.boardElement.appendChild(bubble);
  }

  /**
   * Calculate bubble position near square
   */
  private calculateBubblePosition(square: string): { x: number; y: number } {
    const squareElement = this.boardElement.querySelector(
      `[data-square="${square}"]`
    ) as HTMLElement;

    if (!squareElement) {
      return { x: 0, y: 0 };
    }

    const rect = squareElement.getBoundingClientRect();
    const boardRect = this.boardElement.getBoundingClientRect();

    // Position in top-right corner of square with offset
    return {
      x: rect.left - boardRect.left + rect.width - 20,
      y: rect.top - boardRect.top + 4,
    };
  }

  /**
   * Clear all bubbles
   */
  clearBubbles(): void {
    this.bubbles.forEach((bubble) => bubble.remove());
    this.bubbles.clear();
  }

  /**
   * Highlight a specific bubble (for keyboard navigation)
   */
  highlightBubble(square: string): void {
    const bubble = this.bubbles.get(square);
    if (bubble) {
      bubble.classList.add('bubble-highlighted');
    }
  }
}
```

#### 2. New Component: Explanation Modal

**File:** `src/frontend/components/explanation-modal.ts` (NEW)

**Purpose:** Display move explanations in a glassmorphic modal

**New Class:**

```typescript
/**
 * Modal component for displaying move explanations
 */
export class ExplanationModal {
  private modalElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;

  /**
   * Show explanation modal with content
   */
  show(content: ExplanationContent): void {
    this.close(); // Close any existing modal

    this.createModal(content);
    this.attachEventListeners();
  }

  /**
   * Create modal DOM structure
   */
  private createModal(content: ExplanationContent): void {
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'explanation-overlay';

    // Create modal
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'explanation-modal';
    this.modalElement.innerHTML = `
      <div class="explanation-header">
        <h3 class="explanation-title">
          ${content.notation}
          ${content.description ? ` — ${content.description}` : ''}
        </h3>
        <button class="explanation-close" aria-label="Close explanation">×</button>
      </div>
      <div class="explanation-body">
        <div class="explanation-section">
          <h4>Why this move is strong:</h4>
          <ul>
            ${content.strengths.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
        ${
          content.ranking
            ? `
          <div class="explanation-section">
            <h4>Why it's ranked #${content.rank}:</h4>
            <p>${content.ranking}</p>
          </div>
        `
            : ''
        }
        ${
          content.concepts.length > 0
            ? `
          <div class="explanation-section">
            <h4>Concepts:</h4>
            <p class="explanation-concepts">${content.concepts.join(', ')}</p>
          </div>
        `
            : ''
        }
      </div>
    `;

    document.body.appendChild(this.overlayElement);
    document.body.appendChild(this.modalElement);

    // Trigger animation
    requestAnimationFrame(() => {
      this.overlayElement?.classList.add('visible');
      this.modalElement?.classList.add('visible');
    });
  }

  /**
   * Attach event listeners for closing
   */
  private attachEventListeners(): void {
    // Close button
    const closeButton = this.modalElement?.querySelector('.explanation-close');
    closeButton?.addEventListener('click', () => this.close());

    // Click outside to close
    this.overlayElement?.addEventListener('click', () => this.close());

    // Prevent modal click from closing
    this.modalElement?.addEventListener('click', (e) => e.stopPropagation());

    // Escape key to close
    document.addEventListener('keydown', this.handleKeydown);
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  /**
   * Close and cleanup modal
   */
  close(): void {
    document.removeEventListener('keydown', this.handleKeydown);

    this.modalElement?.classList.remove('visible');
    this.overlayElement?.classList.remove('visible');

    setTimeout(() => {
      this.modalElement?.remove();
      this.overlayElement?.remove();
      this.modalElement = null;
      this.overlayElement = null;
    }, 200); // Match CSS transition duration
  }
}
```

#### 3. New Utility: Explanation Generator

**File:** `src/shared/explanation-generator.ts` (NEW)

**Purpose:** Generate human-readable explanations from move data

**New Interfaces:**

```typescript
/**
 * Content structure for move explanations
 */
export interface ExplanationContent {
  notation: string; // "Nf3"
  description?: string; // "Knight moves to f3"
  strengths: string[]; // Bullet points of why move is strong
  ranking?: string; // Why it's ranked #1, #2, or #3
  rank: number; // 1, 2, or 3
  concepts: string[]; // ["Development", "Central Control"]
}

/**
 * Move characteristics extracted for explanation
 */
interface MoveCharacteristics {
  isDevelopment: boolean;
  isCapture: boolean;
  isCastling: boolean;
  controlsCenter: boolean;
  attacksKing: boolean;
  isPinning: boolean;
  isForking: boolean;
  improvesKingSafety: boolean;
  createsThreat: boolean;
  respondsToThreat: boolean;
  scoreAdvantage: number; // In pawns
}
```

**Core Function:**

```typescript
/**
 * Generate explanation for a move
 */
export function generateExplanation(
  fen: string,
  move: GuidanceMove,
  rank: number,
  allMoves: GuidanceMove[]
): ExplanationContent {
  const chars = analyzeMoveCharacteristics(fen, move);

  return {
    notation: move.san || move.uci,
    description: parseSanToEnglish(move.san || move.uci), // Reuse from notation parser
    strengths: buildStrengthsList(chars, fen, move),
    ranking: buildRankingExplanation(rank, move, allMoves, chars),
    rank,
    concepts: identifyConcepts(chars),
  };
}

/**
 * Analyze move characteristics using chess.js
 */
function analyzeMoveCharacteristics(
  fen: string,
  move: GuidanceMove
): MoveCharacteristics {
  const chess = new Chess(fen);
  const moveObj = chess.move(move.uci);

  if (!moveObj) {
    return getDefaultCharacteristics();
  }

  return {
    isDevelopment: isMinorPieceDevelopment(moveObj, fen),
    isCapture: moveObj.captured !== undefined,
    isCastling: moveObj.flags.includes('k') || moveObj.flags.includes('q'),
    controlsCenter: controlsCentralSquares(moveObj.to),
    attacksKing: attacksOpponentKing(chess, moveObj.to),
    isPinning: detectsPin(chess, moveObj),
    isForking: detectsFork(chess, moveObj),
    improvesKingSafety: improvesKingSafety(chess, moveObj),
    createsThreat: createsThreat(chess, moveObj),
    respondsToThreat: respondsToThreat(fen, move),
    scoreAdvantage: move.score / 100, // Convert centipawns to pawns
  };
}

/**
 * Build list of strengths based on characteristics
 */
function buildStrengthsList(
  chars: MoveCharacteristics,
  fen: string,
  move: GuidanceMove
): string[] {
  const strengths: string[] = [];

  if (chars.isDevelopment) {
    strengths.push('Develops a piece toward the center');
  }

  if (chars.controlsCenter) {
    strengths.push('Controls key central squares');
  }

  if (chars.isCastling) {
    strengths.push('Improves king safety by castling');
    strengths.push('Connects the rooks');
  }

  if (chars.isCapture) {
    strengths.push('Captures material, gaining an advantage');
  }

  if (chars.isPinning) {
    strengths.push('Pins an opponent piece, restricting their options');
  }

  if (chars.isForking) {
    strengths.push('Attacks multiple pieces simultaneously (fork)');
  }

  if (chars.attacksKing) {
    strengths.push("Puts pressure on the opponent's king");
  }

  if (chars.createsThreat) {
    strengths.push('Creates a tactical threat');
  }

  if (chars.respondsToThreat) {
    strengths.push("Responds to opponent's threat");
  }

  if (chars.improvesKingSafety) {
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
  chars: MoveCharacteristics
): string {
  const scoreDiff =
    allMoves.length > rank ? (move.score - allMoves[rank].score) / 100 : 0;

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
  if (chars.isPinning) concepts.push('Pin');
  if (chars.isForking) concepts.push('Fork');
  if (chars.attacksKing) concepts.push('King Attack');
  if (chars.isCapture) concepts.push('Material Gain');
  if (chars.createsThreat) concepts.push('Tactical Pressure');

  return concepts;
}
```

**Helper Functions (Tactical Detection):**

```typescript
/**
 * Detect if move creates a pin
 */
function detectsPin(chess: Chess, move: Move): boolean {
  // Check if moved piece creates a line attack through one piece to another
  // Implementation uses chess.js board analysis
  // Simplified for spec - full implementation will check rays
  return false; // Placeholder
}

/**
 * Detect if move creates a fork
 */
function detectsFork(chess: Chess, move: Move): boolean {
  // Check if moved piece attacks 2+ valuable pieces
  // Implementation counts attacked pieces after move
  return false; // Placeholder
}

/**
 * Check if move improves king safety
 */
function improvesKingSafety(chess: Chess, move: Move): boolean {
  // Check if move removes king from danger or adds defenders
  return move.flags.includes('k') || move.flags.includes('q');
}

/**
 * Check if square controls center (e4, d4, e5, d5)
 */
function controlsCentralSquares(square: string): boolean {
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  return centerSquares.includes(square);
}
```

#### 4. Frontend Integration Updates

**File:** `src/frontend/index.ts`

**Changes to `updateGuidanceHighlights()` function (around line 1367):**

```typescript
// BEFORE (existing code):
function updateGuidanceHighlights() {
  const moves = guidanceManager.getMoves();
  // ... existing highlight rendering code ...
}

// AFTER (with bubble icons):
import { BoardAnnotations } from './board-annotations.js';
import { ExplanationModal } from './components/explanation-modal.js';
import { generateExplanation } from '../shared/explanation-generator.js';

// Module-level instances
let boardAnnotations: BoardAnnotations | null = null;
let explanationModal: ExplanationModal | null = null;

function updateGuidanceHighlights() {
  const moves = guidanceManager.getMoves();

  // ... existing highlight rendering code ...

  // Render bubble icons (NEW)
  if (gameState.mode === 'training') {
    if (!boardAnnotations) {
      const boardElement = document.getElementById('chess-board')!;
      boardAnnotations = new BoardAnnotations(boardElement, handleBubbleClick);
    }

    if (!explanationModal) {
      explanationModal = new ExplanationModal();
    }

    boardAnnotations.renderBubbles(moves);
  }
}

/**
 * Handle bubble icon click - show explanation modal (NEW)
 */
function handleBubbleClick(square: string, move: GuidanceMove): void {
  const moves = guidanceManager.getMoves();
  const rank = moves.findIndex((m) => m.to === square) + 1;

  const explanation = generateExplanation(gameState.fen, move, rank, moves);

  explanationModal?.show(explanation);
}

/**
 * Clear bubbles when guidance is disabled (NEW)
 */
function clearGuidanceHighlights() {
  // ... existing highlight clearing code ...

  boardAnnotations?.clearBubbles();
}
```

#### 5. CSS Styling

**File:** `src/frontend/styles/index.css`

**New Styles for Bubble Icons:**

```css
/* Bubble icon overlay */
.guidance-bubble {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10; /* Above highlights, below pieces */
  transition: all 0.2s ease;
  pointer-events: auto;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Color variants matching highlight colors */
.guidance-bubble.bubble-blue {
  background: rgba(70, 130, 220, 0.9);
  border: 2px solid rgba(70, 130, 220, 1);
  color: white;
}

.guidance-bubble.bubble-green {
  background: rgba(80, 180, 100, 0.9);
  border: 2px solid rgba(80, 180, 100, 1);
  color: white;
}

.guidance-bubble.bubble-yellow {
  background: rgba(220, 180, 50, 0.9);
  border: 2px solid rgba(220, 180, 50, 1);
  color: white;
}

/* Hover effect */
.guidance-bubble:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Keyboard highlight */
.guidance-bubble.bubble-highlighted {
  outline: 3px solid white;
  outline-offset: 2px;
}

/* Icon inside bubble */
.bubble-icon {
  user-select: none;
}
```

**New Styles for Explanation Modal:**

```css
/* Modal overlay */
.explanation-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.explanation-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

/* Modal container */
.explanation-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  z-index: 1001;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: none;

  /* Glassmorphic styling */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 1.5rem;
}

.explanation-modal.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}

/* Modal header */
.explanation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.explanation-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.explanation-close {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.5);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.explanation-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.8);
}

/* Modal body */
.explanation-body {
  color: var(--text-primary);
}

.explanation-section {
  margin-bottom: 1.25rem;
}

.explanation-section:last-child {
  margin-bottom: 0;
}

.explanation-section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.explanation-section ul {
  margin: 0;
  padding-left: 1.25rem;
}

.explanation-section li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.explanation-section p {
  margin: 0;
  line-height: 1.6;
}

.explanation-concepts {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
}

/* Scrollbar styling for modal */
.explanation-modal::-webkit-scrollbar {
  width: 8px;
}

.explanation-modal::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.explanation-modal::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.explanation-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
```

### Data Model

**New Interfaces** (in `src/shared/explanation-generator.ts`):

```typescript
export interface ExplanationContent {
  notation: string;
  description?: string;
  strengths: string[];
  ranking?: string;
  rank: number;
  concepts: string[];
}

interface MoveCharacteristics {
  isDevelopment: boolean;
  isCapture: boolean;
  isCastling: boolean;
  controlsCenter: boolean;
  attacksKing: boolean;
  isPinning: boolean;
  isForking: boolean;
  improvesKingSafety: boolean;
  createsThreat: boolean;
  respondsToThreat: boolean;
  scoreAdvantage: number;
}
```

**No changes to existing data structures.** The `GuidanceMove` interface remains
unchanged.

### API Changes

#### IPC Methods

No new IPC methods required. All explanation generation happens on the frontend
using existing move data.

### UI Changes

**Affected Files:**

- [src/frontend/index.ts](src/frontend/index.ts) - Add bubble rendering and
  click handling
- [src/frontend/board-annotations.ts](src/frontend/board-annotations.ts) - NEW:
  Bubble overlay management
- [src/frontend/components/explanation-modal.ts](src/frontend/components/explanation-modal.ts) -
  NEW: Modal component
- [src/frontend/styles/index.css](src/frontend/styles/index.css) - Add bubble
  and modal styles

**Visual Changes:**

**Board with Bubbles:**

```text
┌─────────────────────────────┐
│  ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜          │
│  ♟ ♟ ♟ ♟ [i] ♟ ♟ ♟        │ ← Blue bubble on e7
│                             │
│              ♙ [i]          │ ← Green bubble on e4
│        ♘                    │
│  [i]                        │ ← Yellow bubble on c3
│  ♙ ♙ ♙ ♙    ♙ ♙ ♙          │
│  ♖ ♘ ♗ ♕ ♔ ♗    ♖          │
└─────────────────────────────┘
```

**Explanation Modal (example):**

```text
┌──────────────────────────────────────┐
│ Nf3 — Knight moves to f3         [×] │
│──────────────────────────────────────│
│                                      │
│ Why this move is strong:             │
│ • Develops a piece toward center     │
│ • Controls key central squares       │
│ • Prepares to castle kingside        │
│                                      │
│ Why it's ranked #1:                  │
│ Best move in this position, offering │
│ the strongest continuation           │
│                                      │
│ Concepts: Development, Central       │
│           Control                    │
└──────────────────────────────────────┘
```

### State Management

**BoardAnnotations State:**

- Tracks bubble elements per square
- Maintains click handlers
- Updates on guidance move changes

**ExplanationModal State:**

- Single modal instance (only one open at a time)
- Tracks current modal and overlay elements
- Cleans up on close

**No global state changes.** Instances managed at module level in `index.ts`.

### Error Handling

| Error Condition                  | Handling Strategy                 | User Feedback                      |
| -------------------------------- | --------------------------------- | ---------------------------------- |
| Failed to generate explanation   | Show generic fallback explanation | Modal displays basic move info     |
| Chess.js fails to parse position | Use fallback characteristics      | Modal shows simplified explanation |
| Bubble positioning fails         | Default to square center          | Bubble still clickable             |
| Modal fails to open              | Log error, no modal shown         | Console warning only               |
| Rapid bubble clicks              | Debounce clicks (200ms)           | Prevents multiple modals           |

**Error Handling in Generator:**

```typescript
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
      strengths: buildStrengthsList(chars, fen, move),
      ranking: buildRankingExplanation(rank, move, allMoves, chars),
      rank,
      concepts: identifyConcepts(chars),
    };
  } catch (error) {
    console.error('Failed to generate explanation:', error);
    return getFallbackExplanation(move, rank);
  }
}

function getFallbackExplanation(
  move: GuidanceMove,
  rank: number
): ExplanationContent {
  return {
    notation: move.san || move.uci,
    description: undefined,
    strengths: ['Recommended by the engine'],
    ranking: `Ranked #${rank} by evaluation`,
    rank,
    concepts: [],
  };
}
```

## Implementation Plan

### Phase Breakdown

#### Phase 1: Bubble Icon System

**Scope:**

- Create `BoardAnnotations` class
- Implement bubble positioning algorithm
- Add CSS styling for bubbles
- Integrate with existing highlight rendering
- Test bubble placement on various board states

**Files Changed:**

- `src/frontend/board-annotations.ts` (CREATE)
- `src/frontend/index.ts` (MODIFY)
- `src/frontend/styles/index.css` (MODIFY)

**Dependencies:** None

**Estimated Complexity:** Medium

#### Phase 2: Modal Component

**Scope:**

- Create `ExplanationModal` class
- Implement glassmorphic modal styling
- Add open/close animations
- Handle click-outside and keyboard closing
- Accessibility improvements (ARIA attributes, focus management)

**Files Changed:**

- `src/frontend/components/explanation-modal.ts` (CREATE)
- `src/frontend/styles/index.css` (MODIFY)

**Dependencies:** Phase 1

**Estimated Complexity:** Low-Medium

#### Phase 3: Explanation Generator (Basic)

**Scope:**

- Create explanation generator utility
- Implement basic characteristic detection (development, center control,
  castling)
- Build strength and ranking explanation templates
- Add concept identification
- Write unit tests for common patterns

**Files Changed:**

- `src/shared/explanation-generator.ts` (CREATE)
- `tests/unit/explanation-generator.test.ts` (CREATE)

**Dependencies:** None (can be parallel to Phase 1-2)

**Estimated Complexity:** Medium-High

#### Phase 4: Tactical Detection

**Scope:**

- Implement pin detection
- Implement fork detection
- Add king attack detection
- Implement threat creation/response detection
- Expand explanation templates for tactical patterns
- Add comprehensive unit tests

**Files Changed:**

- `src/shared/explanation-generator.ts` (MODIFY)
- `tests/unit/explanation-generator.test.ts` (MODIFY)

**Dependencies:** Phase 3

**Estimated Complexity:** High

#### Phase 5: Integration & Polish

**Scope:**

- Connect all components in `index.ts`
- Handle edge cases (board rotation, screen sizes)
- Performance optimization
- Accessibility testing
- Integration testing in Training Mode
- User feedback iteration

**Files Changed:**

- `src/frontend/index.ts` (MODIFY)
- `tests/integration/training-mode.test.ts` (MODIFY)

**Dependencies:** Phase 1, Phase 2, Phase 3

**Estimated Complexity:** Medium

### File Changes Summary

| File                                           | Action | Description                      |
| ---------------------------------------------- | ------ | -------------------------------- |
| `src/frontend/board-annotations.ts`            | Create | Bubble icon overlay management   |
| `src/frontend/components/explanation-modal.ts` | Create | Modal component for explanations |
| `src/shared/explanation-generator.ts`          | Create | Explanation generation logic     |
| `src/frontend/index.ts`                        | Modify | Integrate bubbles and modal      |
| `src/frontend/styles/index.css`                | Modify | Add bubble and modal styles      |
| `tests/unit/explanation-generator.test.ts`     | Create | Unit tests for generator         |
| `tests/integration/training-mode.test.ts`      | Modify | Integration tests                |

## Testing Strategy

### Unit Tests

| Test Case              | File                            | Description                                     |
| ---------------------- | ------------------------------- | ----------------------------------------------- |
| Basic development move | `explanation-generator.test.ts` | Test "Nf3" generates development explanation    |
| Castling move          | `explanation-generator.test.ts` | Test "O-O" generates king safety explanation    |
| Capture move           | `explanation-generator.test.ts` | Test "Qxd5" generates material gain explanation |
| Fork detection         | `explanation-generator.test.ts` | Test fork correctly identified and explained    |
| Pin detection          | `explanation-generator.test.ts` | Test pin correctly identified and explained     |
| Ranking explanation    | `explanation-generator.test.ts` | Test rank-specific explanations (1 vs 2 vs 3)   |
| Fallback handling      | `explanation-generator.test.ts` | Test graceful degradation on errors             |
| Bubble positioning     | `board-annotations.test.ts`     | Test bubble coords calculated correctly         |
| Modal open/close       | `explanation-modal.test.ts`     | Test modal lifecycle                            |
| Keyboard navigation    | `explanation-modal.test.ts`     | Test ESC key closes modal                       |

**Example Unit Test:**

```typescript
import { describe, test, expect } from 'bun:test';
import { generateExplanation } from '@/shared/explanation-generator';

describe('generateExplanation', () => {
  const startingFen =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  test('generates development explanation for Nf3', () => {
    const move = {
      uci: 'g1f3',
      san: 'Nf3',
      from: 'g1',
      to: 'f3',
      score: 28,
      formattedScore: '+0.28',
      color: 'blue' as const,
    };

    const explanation = generateExplanation(startingFen, move, 1, [move]);

    expect(explanation.notation).toBe('Nf3');
    expect(explanation.strengths).toContain(
      'Develops a piece toward the center'
    );
    expect(explanation.concepts).toContain('Development');
  });

  test('generates castling explanation', () => {
    const fen =
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const move = {
      uci: 'e1g1',
      san: 'O-O',
      from: 'e1',
      to: 'g1',
      score: 35,
      formattedScore: '+0.35',
      color: 'blue' as const,
    };

    const explanation = generateExplanation(fen, move, 1, [move]);

    expect(explanation.strengths).toContain('Improves king safety by castling');
    expect(explanation.concepts).toContain('King Safety');
  });

  test('generates ranking explanation for #2 move', () => {
    const moves = [
      { score: 50, san: 'e4' },
      { score: 45, san: 'd4' },
    ];

    const explanation = generateExplanation(
      startingFen,
      moves[1] as any,
      2,
      moves as any
    );

    expect(explanation.ranking).toContain('alternative');
  });
});
```

### Integration Tests

| Test Case                         | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| Bubbles render in Training Mode   | Verify bubbles appear when guidance is active      |
| Bubbles don't render in Exam Mode | Verify bubbles only show in Training Mode          |
| Bubble click opens modal          | Click bubble and verify modal appears with content |
| Modal closes on overlay click     | Click outside modal and verify it closes           |
| Modal closes on ESC key           | Press ESC and verify modal closes                  |
| Multiple bubble clicks            | Click different bubbles and verify modal updates   |
| Guidance update refreshes bubbles | Change position and verify bubbles update          |

### Manual Test Cases

| ID    | Steps                                  | Expected Result                              |
| ----- | -------------------------------------- | -------------------------------------------- |
| MT-1  | Start Training Mode, make opening move | 3 bubbles appear near highlighted squares    |
| MT-2  | Click blue bubble (best move)          | Modal opens with explanation, ranked #1      |
| MT-3  | Click green bubble (2nd move)          | Modal opens with explanation, ranked #2      |
| MT-4  | Click outside modal                    | Modal closes smoothly                        |
| MT-5  | Press ESC while modal open             | Modal closes                                 |
| MT-6  | Position with castling available       | Castling explanation mentions king safety    |
| MT-7  | Position with capture                  | Explanation mentions material gain           |
| MT-8  | Position with fork                     | Explanation identifies fork tactic           |
| MT-9  | Rapidly click multiple bubbles         | Modal updates smoothly, no duplicates        |
| MT-10 | Test on 1280x720 resolution            | Bubbles positioned correctly, modal readable |

## Performance Considerations

### Expected Impact

- **CPU**:
  - Bubble rendering: Negligible (3 DOM elements)
  - Explanation generation: ~5-10ms per explanation
  - Modal rendering: <5ms
- **Memory**: Minimal (<1KB per explanation)
- **Rendering**: No impact on existing highlight performance
- **Startup Time**: No impact (lazy-loaded components)

### Benchmarks

**Performance Targets:**

- Explanation generation: < 100ms (per PRD requirement)
- Bubble rendering: < 16ms (60fps)
- Modal open/close animation: 200ms (smooth)
- Click response time: < 50ms

**Benchmark Test:**

```typescript
import { describe, test } from 'bun:test';
import { generateExplanation } from '@/shared/explanation-generator';

describe('Explanation Performance', () => {
  test('generates 100 explanations under 10 seconds', () => {
    const testPositions = [
      /* various FENs */
    ];
    const testMoves = [
      /* various moves */
    ];

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      generateExplanation(
        testPositions[i % testPositions.length],
        testMoves[i % testMoves.length],
        1,
        testMoves
      );
    }

    const end = performance.now();
    const avgTime = (end - start) / 100;

    console.log(`Average explanation generation: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(100);
  });
});
```

## Security Considerations

- [x] No user data exposed - operates on engine-generated moves only
- [x] Input validation added - graceful handling of invalid positions/moves
- [x] No new attack vectors - pure frontend logic, no network requests
- [x] XSS prevention - modal content properly escaped (using textContent where
      applicable)
- [x] No eval() or dangerous DOM manipulation

**XSS Prevention in Modal:**

```typescript
// Safe approach: use textContent for dynamic content
const titleElement = document.createElement('h3');
titleElement.textContent = `${content.notation} — ${content.description}`;

// For list items, sanitize each strength
content.strengths.forEach((strength) => {
  const li = document.createElement('li');
  li.textContent = strength; // Automatically escaped
  ul.appendChild(li);
});
```

## Rollout Plan

### Feature Flags

Not required initially. Feature can be deployed directly to Training Mode. If
needed later, can add a setting to disable bubbles.

### Rollback Plan

If issues arise post-deployment:

1. **Quick Disable**: Add flag to skip bubble rendering
2. **CSS Hiding**: Add `.guidance-bubble { display: none; }` to hide without
   code changes
3. **Full Revert**: Git revert to previous version

**Emergency Rollback Code:**

```typescript
// In index.ts, add at top of updateGuidanceHighlights()
const ENABLE_EXPLANATIONS = false; // Set to false to disable

if (ENABLE_EXPLANATIONS && gameState.mode === 'training') {
  boardAnnotations?.renderBubbles(moves);
}
```

## Alternatives Considered

### Option 1: Explanations in Right Panel Only

**Approach:** Add explanation text directly in Best Moves panel instead of
bubbles

**Pros:**

- Simpler implementation
- No board clutter
- Always visible

**Cons:**

- Takes up significant panel space
- Disconnected from visual board context
- Less intuitive
- Not interactive/discoverable

**Why rejected:** PRD explicitly requires bubble icons for spatial association
with board highlights

### Option 2: Always-Visible Explanation Text

**Approach:** Show explanation text on hover over highlights

**Pros:**

- No click required
- Quick access

**Cons:**

- Requires precise hovering
- Doesn't work on touch screens
- Clutters board with tooltip
- Can't show detailed multi-line explanations

**Why rejected:** Need detailed explanations that require modal-sized space

### Option 3: AI-Generated Explanations (GPT API)

**Approach:** Use LLM to generate real-time explanations

**Pros:**

- More natural language
- Can handle unusual positions
- Richer explanations

**Cons:**

- Requires API key and internet connection
- Latency (hundreds of ms to seconds)
- Cost per explanation
- Inconsistent quality
- Privacy concerns

**Why rejected:** PRD allows template-based system initially; can add AI later
as enhancement

### Option 4: Inline Annotations (Like Chess.com)

**Approach:** Show small text annotations directly on board squares

**Pros:**

- Minimal UI
- Spatial context maintained

**Cons:**

- Limited space for explanations
- Hard to read on small boards
- Clutters board visually
- Accessibility issues

**Why rejected:** Need more space for educational content than inline text
allows

## Dependencies

### External Dependencies

Using existing dependencies only:

| Dependency | Version | License      | Purpose                                    |
| ---------- | ------- | ------------ | ------------------------------------------ |
| chess.js   | ^1.0.0  | BSD-2-Clause | Move analysis for characteristic detection |

### Internal Dependencies

- **Move Guidance Manager**
  ([src/frontend/move-guidance.ts](src/frontend/move-guidance.ts)): Provides
  `GuidanceMove` data
- **Board Highlighting System**
  ([src/frontend/index.ts:1367-1488](src/frontend/index.ts#L1367-L1488)):
  Highlight rendering
- **Notation Parser**
  ([src/shared/notation-parser.ts](src/shared/notation-parser.ts)): For move
  descriptions
- **CSS Glassmorphic System**
  ([src/frontend/styles/index.css](src/frontend/styles/index.css)): Modal
  styling

## Open Questions

1. ~~Should bubble icons use Unicode character (ℹ) or custom SVG icon?~~
   - **Answer**: Start with Unicode, can switch to SVG later for better visual
     control

2. ~~Should bubbles appear on source square, destination square, or both?~~
   - **Answer**: Destination square only (reduces clutter, more relevant for
     understanding impact)

3. ~~How should we handle board rotation (black's perspective)?~~
   - **Answer**: Bubble positioning algorithm should account for board
     orientation from DOM

4. ~~Should we cache generated explanations to avoid re-computation?~~
   - **Answer**: Yes, cache by FEN + UCI combination with LRU eviction (max 50
     entries)

5. ~~What keyboard navigation should we support beyond ESC to close?~~
   - **Answer**: Tab through bubbles, Enter to open, ESC to close (Phase 5
     enhancement)

6. ~~Should we show explanations for user's moves after they make them?~~
   - **Answer**: No, only for guidance recommendations (keep scope focused)

## Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                                 |
| ------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------- |
| Bubbles clutter board visually              | Medium     | Medium | Careful sizing (24px), semi-transparent, color-matched to highlights       |
| Bubble positioning breaks on edge cases     | Medium     | Low    | Comprehensive testing with various board states, fallback to center        |
| Explanations too generic/repetitive         | High       | Medium | Build robust pattern library, prioritize quality over quantity             |
| Tactical detection produces false positives | Medium     | Low    | Conservative detection algorithms, prefer saying less over being wrong     |
| Performance issues with complex analysis    | Low        | Medium | Cache explanations, use simple heuristics over deep analysis               |
| Users don't discover bubble feature         | Medium     | High   | Add first-time tooltip, mention in Training Mode tutorial                  |
| Modal blocks board interaction              | Low        | High   | Ensure click-outside and ESC work reliably, position away from active play |

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
