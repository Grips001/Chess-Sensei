/**
 * Control Toolbar Component
 *
 * Provides a glassmorphic toolbar housing all control buttons.
 * Detached from the right panel for better visual hierarchy.
 */

/**
 * Button references for external state management
 */
export interface ToolbarButtons {
  newGame: HTMLButtonElement;
  undo: HTMLButtonElement;
  redo: HTMLButtonElement;
  resign: HTMLButtonElement;
  flipBoard: HTMLButtonElement;
}

/**
 * Control toolbar component for Training/Exam modes
 */
export class ControlToolbar {
  private toolbar: HTMLElement | null = null;
  private buttons: ToolbarButtons | null = null;
  private position: 'top' | 'bottom';

  /**
   * Create a new control toolbar
   * @param position - Where to position the toolbar ('top' or 'bottom')
   */
  constructor(position: 'top' | 'bottom' = 'bottom') {
    this.position = position;
  }

  /**
   * Create the toolbar DOM structure
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = `control-toolbar control-toolbar-${this.position}`;
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Game controls');

    // Create toolbar container
    const container = document.createElement('div');
    container.className = 'toolbar-container';

    // New Game button
    const newGameButton = document.createElement('button');
    newGameButton.id = 'new-game-control';
    newGameButton.className = 'toolbar-button toolbar-button-primary';
    newGameButton.textContent = 'New Game';

    // Undo button
    const undoButton = document.createElement('button');
    undoButton.id = 'undo-button';
    undoButton.className = 'toolbar-button';
    undoButton.textContent = 'Undo';
    undoButton.disabled = true;

    // Redo button
    const redoButton = document.createElement('button');
    redoButton.id = 'redo-button';
    redoButton.className = 'toolbar-button';
    redoButton.textContent = 'Redo';
    redoButton.disabled = true;

    // Resign button
    const resignButton = document.createElement('button');
    resignButton.id = 'resign-button';
    resignButton.className = 'toolbar-button';
    resignButton.textContent = 'Resign';

    // Flip Board button
    const flipButton = document.createElement('button');
    flipButton.id = 'flip-board-button';
    flipButton.className = 'toolbar-button';
    flipButton.textContent = 'Flip Board';

    // Append buttons to container
    container.appendChild(newGameButton);
    container.appendChild(undoButton);
    container.appendChild(redoButton);
    container.appendChild(resignButton);
    container.appendChild(flipButton);

    toolbar.appendChild(container);

    // Store button references
    this.buttons = {
      newGame: newGameButton,
      undo: undoButton,
      redo: redoButton,
      resign: resignButton,
      flipBoard: flipButton,
    };

    return toolbar;
  }

  /**
   * Mount the toolbar to the document
   */
  mount(): void {
    if (this.toolbar) {
      // Already mounted
      return;
    }

    this.toolbar = this.createToolbar();
    document.body.appendChild(this.toolbar);

    // Trigger animation
    requestAnimationFrame(() => {
      this.toolbar?.classList.add('visible');
    });
  }

  /**
   * Unmount the toolbar from the document
   */
  unmount(): void {
    if (!this.toolbar) {
      return;
    }

    this.toolbar.classList.remove('visible');
    setTimeout(() => {
      this.toolbar?.remove();
      this.toolbar = null;
      this.buttons = null;
    }, 200); // Match CSS transition duration
  }

  /**
   * Get button references for attaching event listeners
   */
  getButtons(): ToolbarButtons | null {
    return this.buttons;
  }

  /**
   * Update button enabled/disabled states
   */
  updateButtonStates(canUndo: boolean, canRedo: boolean): void {
    if (!this.buttons) {
      return;
    }

    this.buttons.undo.disabled = !canUndo;
    this.buttons.redo.disabled = !canRedo;
  }

  /**
   * Show the toolbar with animation
   */
  show(): void {
    if (!this.toolbar) {
      this.mount();
      return;
    }

    this.toolbar.classList.add('visible');
  }

  /**
   * Hide the toolbar with animation
   */
  hide(): void {
    if (!this.toolbar) {
      return;
    }

    this.toolbar.classList.remove('visible');
  }

  /**
   * Check if toolbar is currently visible
   */
  isVisible(): boolean {
    return this.toolbar?.classList.contains('visible') ?? false;
  }
}
