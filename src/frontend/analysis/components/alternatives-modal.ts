/**
 * Alternatives Modal Component
 * Shows alternative moves for a position
 */

import type { AnalyzedMove } from '../../../shared/analysis-types';

/**
 * Format evaluation in pawns
 */
function formatEval(centipawns: number): string {
  if (Math.abs(centipawns) >= 10000) {
    const mateIn = Math.ceil((32768 - Math.abs(centipawns)) / 2);
    return centipawns > 0 ? `M${mateIn}` : `-M${mateIn}`;
  }
  const pawns = centipawns / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

/**
 * Show alternatives modal
 */
export function showAlternativesModal(
  move: AnalyzedMove,
  _moveIndex: number,
  onOpenSandbox?: (fen: string) => void
): void {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'alternatives-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'alternatives-modal';

  modal.innerHTML = `
    <div class="alternatives-header">
      <h3>Alternative Moves</h3>
      <button class="close-alternatives-btn">×</button>
    </div>
    <div class="alternatives-content">
      <div class="played-move">
        <span class="alt-label">Played:</span>
        <span class="alt-move ${move.classification}">${move.san}</span>
        <span class="alt-eval">${formatEval(move.evaluationAfter)}</span>
      </div>
      <div class="best-move">
        <span class="alt-label">Best:</span>
        <span class="alt-move excellent">${move.bestMove}</span>
        <span class="alt-eval">${formatEval(move.evaluationBefore)}</span>
      </div>
      ${
        move.alternativeMoves.length > 0
          ? `
        <div class="other-alternatives">
          <h4>Other Alternatives:</h4>
          ${move.alternativeMoves
            .map(
              (alt) => `
            <div class="alt-row">
              <span class="alt-move">${alt.move}</span>
              <span class="alt-eval">${formatEval(alt.evaluation)}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
      ${
        onOpenSandbox
          ? `
        <button class="analyze-in-sandbox-btn">
          🔬 Analyze in Sandbox
        </button>
      `
          : ''
      }
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close handlers
  const closeModal = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  modal.querySelector('.close-alternatives-btn')?.addEventListener('click', closeModal);

  // Sandbox button handler
  if (onOpenSandbox) {
    modal.querySelector('.analyze-in-sandbox-btn')?.addEventListener('click', () => {
      closeModal();
      // Get FEN before the move (we'd need to calculate this)
      // For now, just signal to open sandbox
      onOpenSandbox('');
    });
  }

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    modal.classList.add('visible');
  });
}

/**
 * Hide alternatives modal
 */
export function hideAlternativesModal(): void {
  const overlay = document.querySelector('.alternatives-modal-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }
}
