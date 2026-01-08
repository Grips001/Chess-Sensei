/**
 * Navigation Controls Component
 * Renders navigation buttons and handles keyboard navigation
 */

/**
 * Render navigation controls HTML
 */
export function renderNavigationControls(): string {
  return `
    <div class="nav-controls">
      <button class="nav-button" id="nav-start" title="Go to start">
        <span>⏮</span>
      </button>
      <button class="nav-button" id="nav-prev" title="Previous move">
        <span>◀</span>
      </button>
      <button class="nav-button play-pause" id="nav-play" title="Auto-play">
        <span>▶</span>
      </button>
      <button class="nav-button" id="nav-next" title="Next move">
        <span>▶</span>
      </button>
      <button class="nav-button" id="nav-end" title="Go to end">
        <span>⏭</span>
      </button>
      <button class="nav-button" id="nav-flip" title="Flip board">
        <span>🔄</span>
      </button>
    </div>
    <div class="jump-controls">
      <button class="jump-button blunder" id="jump-prev-mistake" title="Previous mistake">
        ← Mistake
      </button>
      <button class="jump-button blunder" id="jump-next-mistake" title="Next mistake">
        Mistake →
      </button>
    </div>
  `;
}

/**
 * Navigation handler callbacks
 */
export interface NavigationHandlers {
  goToStart: () => void;
  goToPreviousMove: () => void;
  goToNextMove: () => void;
  goToEnd: () => void;
  toggleAutoPlay: () => void;
  flipBoard: () => void;
  jumpToPreviousMistake: () => void;
  jumpToNextMistake: () => void;
  closeAnalysis: () => void;
}

/**
 * Attach navigation event listeners
 */
export function attachNavigationListeners(handlers: NavigationHandlers): void {
  document.getElementById('nav-start')?.addEventListener('click', handlers.goToStart);
  document.getElementById('nav-prev')?.addEventListener('click', handlers.goToPreviousMove);
  document.getElementById('nav-play')?.addEventListener('click', handlers.toggleAutoPlay);
  document.getElementById('nav-next')?.addEventListener('click', handlers.goToNextMove);
  document.getElementById('nav-end')?.addEventListener('click', handlers.goToEnd);
  document.getElementById('nav-flip')?.addEventListener('click', handlers.flipBoard);
  document
    .getElementById('jump-prev-mistake')
    ?.addEventListener('click', handlers.jumpToPreviousMistake);
  document
    .getElementById('jump-next-mistake')
    ?.addEventListener('click', handlers.jumpToNextMistake);
}

/**
 * Create keyboard navigation handler
 */
export function createKeyboardHandler(
  handlers: NavigationHandlers,
  isActive: () => boolean
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (!isActive()) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handlers.goToPreviousMove();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handlers.goToNextMove();
        break;
      case 'Home':
        e.preventDefault();
        handlers.goToStart();
        break;
      case 'End':
        e.preventDefault();
        handlers.goToEnd();
        break;
      case ' ':
        e.preventDefault();
        handlers.toggleAutoPlay();
        break;
      case 'Escape':
        e.preventDefault();
        handlers.closeAnalysis();
        break;
    }
  };
}
