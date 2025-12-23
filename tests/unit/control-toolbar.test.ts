/**
 * Unit Tests for ControlToolbar Component (CS-003)
 *
 * Tests toolbar creation, mounting, button state management, and visibility.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ControlToolbar } from '../../src/frontend/components/control-toolbar';

describe('ControlToolbar', () => {
  let toolbar: ControlToolbar;

  afterEach(() => {
    // Clean up DOM after each test
    if (toolbar) {
      toolbar.unmount();
    }
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('creates toolbar with default bottom position', () => {
      toolbar = new ControlToolbar();
      expect(toolbar).toBeDefined();
    });

    test('creates toolbar with top position', () => {
      toolbar = new ControlToolbar('top');
      expect(toolbar).toBeDefined();
    });

    test('creates toolbar with bottom position', () => {
      toolbar = new ControlToolbar('bottom');
      expect(toolbar).toBeDefined();
    });
  });

  describe('mount', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('bottom');
    });

    test('mounts toolbar to document body', () => {
      toolbar.mount();

      const toolbarElement = document.querySelector('.control-toolbar');
      expect(toolbarElement).not.toBeNull();
    });

    test('applies correct position class', () => {
      toolbar.mount();

      const toolbarElement = document.querySelector('.control-toolbar-bottom');
      expect(toolbarElement).not.toBeNull();
    });

    test('creates all five control buttons', () => {
      toolbar.mount();

      const newGameButton = document.getElementById('new-game-control');
      const undoButton = document.getElementById('undo-button');
      const redoButton = document.getElementById('redo-button');
      const resignButton = document.getElementById('resign-button');
      const flipButton = document.getElementById('flip-board-button');

      expect(newGameButton).not.toBeNull();
      expect(undoButton).not.toBeNull();
      expect(redoButton).not.toBeNull();
      expect(resignButton).not.toBeNull();
      expect(flipButton).not.toBeNull();
    });

    test('sets correct button text', () => {
      toolbar.mount();

      const newGameButton = document.getElementById('new-game-control');
      const undoButton = document.getElementById('undo-button');
      const redoButton = document.getElementById('redo-button');
      const resignButton = document.getElementById('resign-button');
      const flipButton = document.getElementById('flip-board-button');

      expect(newGameButton?.textContent).toBe('New Game');
      expect(undoButton?.textContent).toBe('Undo');
      expect(redoButton?.textContent).toBe('Redo');
      expect(resignButton?.textContent).toBe('Resign');
      expect(flipButton?.textContent).toBe('Flip Board');
    });

    test('disables undo and redo buttons by default', () => {
      toolbar.mount();

      const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
      const redoButton = document.getElementById('redo-button') as HTMLButtonElement;

      expect(undoButton?.disabled).toBe(true);
      expect(redoButton?.disabled).toBe(true);
    });

    test('does not mount twice if already mounted', () => {
      toolbar.mount();
      const firstElement = document.querySelector('.control-toolbar');

      toolbar.mount();
      const allToolbars = document.querySelectorAll('.control-toolbar');

      expect(allToolbars.length).toBe(1);
      expect(firstElement).toBe(allToolbars[0]);
    });

    test('sets ARIA attributes for accessibility', () => {
      toolbar.mount();

      const toolbarElement = document.querySelector('.control-toolbar');
      expect(toolbarElement?.getAttribute('role')).toBe('toolbar');
      expect(toolbarElement?.getAttribute('aria-label')).toBe('Game controls');
    });
  });

  describe('unmount', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
      toolbar.mount();
    });

    test('removes toolbar from document', (done) => {
      toolbar.unmount();

      // Wait for animation to complete
      setTimeout(() => {
        const toolbarElement = document.querySelector('.control-toolbar');
        expect(toolbarElement).toBeNull();
        done();
      }, 250);
    });

    test('handles unmount when not mounted', () => {
      toolbar.unmount();
      toolbar.unmount(); // Should not throw
      expect(true).toBe(true);
    });

    test('nullifies button references after unmount', (done) => {
      toolbar.unmount();

      setTimeout(() => {
        const buttons = toolbar.getButtons();
        expect(buttons).toBeNull();
        done();
      }, 250);
    });
  });

  describe('getButtons', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
    });

    test('returns null when not mounted', () => {
      const buttons = toolbar.getButtons();
      expect(buttons).toBeNull();
    });

    test('returns button references when mounted', () => {
      toolbar.mount();

      const buttons = toolbar.getButtons();
      expect(buttons).not.toBeNull();
      expect(buttons?.newGame).toBeDefined();
      expect(buttons?.undo).toBeDefined();
      expect(buttons?.redo).toBeDefined();
      expect(buttons?.resign).toBeDefined();
      expect(buttons?.flipBoard).toBeDefined();
    });

    test('returns HTMLButtonElement instances', () => {
      toolbar.mount();

      const buttons = toolbar.getButtons();
      expect(buttons?.newGame).toBeInstanceOf(HTMLButtonElement);
      expect(buttons?.undo).toBeInstanceOf(HTMLButtonElement);
      expect(buttons?.redo).toBeInstanceOf(HTMLButtonElement);
      expect(buttons?.resign).toBeInstanceOf(HTMLButtonElement);
      expect(buttons?.flipBoard).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('updateButtonStates', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
      toolbar.mount();
    });

    test('enables undo button when canUndo is true', () => {
      toolbar.updateButtonStates(true, false);

      const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
      expect(undoButton.disabled).toBe(false);
    });

    test('disables undo button when canUndo is false', () => {
      toolbar.updateButtonStates(false, false);

      const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
      expect(undoButton.disabled).toBe(true);
    });

    test('enables redo button when canRedo is true', () => {
      toolbar.updateButtonStates(false, true);

      const redoButton = document.getElementById('redo-button') as HTMLButtonElement;
      expect(redoButton.disabled).toBe(false);
    });

    test('disables redo button when canRedo is false', () => {
      toolbar.updateButtonStates(false, false);

      const redoButton = document.getElementById('redo-button') as HTMLButtonElement;
      expect(redoButton.disabled).toBe(true);
    });

    test('enables both undo and redo buttons', () => {
      toolbar.updateButtonStates(true, true);

      const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
      const redoButton = document.getElementById('redo-button') as HTMLButtonElement;

      expect(undoButton.disabled).toBe(false);
      expect(redoButton.disabled).toBe(false);
    });

    test('does not affect other buttons', () => {
      const buttons = toolbar.getButtons();
      const newGameInitialState = buttons?.newGame.disabled ?? false;
      const resignInitialState = buttons?.resign.disabled ?? false;
      const flipInitialState = buttons?.flipBoard.disabled ?? false;

      toolbar.updateButtonStates(true, true);

      expect(buttons?.newGame.disabled ?? false).toBe(newGameInitialState);
      expect(buttons?.resign.disabled ?? false).toBe(resignInitialState);
      expect(buttons?.flipBoard.disabled ?? false).toBe(flipInitialState);
    });

    test('handles update when not mounted gracefully', () => {
      toolbar.unmount();
      toolbar.updateButtonStates(true, true); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('show', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
      toolbar.mount();
    });

    test('makes toolbar visible', () => {
      toolbar.hide();
      toolbar.show();

      const toolbarElement = document.querySelector('.control-toolbar') as HTMLElement;
      expect(toolbarElement.style.display).not.toBe('none');
    });

    test('handles show when not mounted', () => {
      toolbar.unmount();
      toolbar.show(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('hide', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
      toolbar.mount();
    });

    test('hides toolbar', () => {
      toolbar.hide();

      const toolbarElement = document.querySelector('.control-toolbar') as HTMLElement;
      // hide() removes the 'visible' class, it doesn't set display: none
      expect(toolbarElement.classList.contains('visible')).toBe(false);
    });

    test('handles hide when not mounted', () => {
      toolbar.unmount();
      toolbar.hide(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('top position toolbar', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('top');
    });

    test('applies top position class', () => {
      toolbar.mount();

      const toolbarElement = document.querySelector('.control-toolbar-top');
      expect(toolbarElement).not.toBeNull();
    });

    test('does not apply bottom position class', () => {
      toolbar.mount();

      const toolbarElement = document.querySelector('.control-toolbar-bottom');
      expect(toolbarElement).toBeNull();
    });
  });

  describe('button styling', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar();
      toolbar.mount();
    });

    test('new game button has primary styling class', () => {
      const newGameButton = document.getElementById('new-game-control');
      expect(newGameButton?.classList.contains('toolbar-button-primary')).toBe(true);
    });

    test('all buttons have base toolbar-button class', () => {
      const buttons = toolbar.getButtons();

      expect(buttons?.newGame.classList.contains('toolbar-button')).toBe(true);
      expect(buttons?.undo.classList.contains('toolbar-button')).toBe(true);
      expect(buttons?.redo.classList.contains('toolbar-button')).toBe(true);
      expect(buttons?.resign.classList.contains('toolbar-button')).toBe(true);
      expect(buttons?.flipBoard.classList.contains('toolbar-button')).toBe(true);
    });
  });
});
