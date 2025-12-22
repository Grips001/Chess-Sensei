/**
 * Board Annotations - Bubble Icon Overlay System
 *
 * Manages explanation bubble icons overlaid on the chessboard.
 * Provides visual indicators for guidance move explanations in Training Mode.
 */

import type { GuidanceMove } from './move-guidance';

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

  /**
   * Remove highlight from a specific bubble
   */
  unhighlightBubble(square: string): void {
    const bubble = this.bubbles.get(square);
    if (bubble) {
      bubble.classList.remove('bubble-highlighted');
    }
  }

  /**
   * Remove all bubble highlights
   */
  clearHighlights(): void {
    this.bubbles.forEach((bubble) => {
      bubble.classList.remove('bubble-highlighted');
    });
  }
}
