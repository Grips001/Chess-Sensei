/**
 * Integration Tests for Panel Layout (CS-003)
 *
 * Tests full panel layout integration including toolbar and collapsible sections.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ControlToolbar } from '../../src/frontend/components/control-toolbar';
import { CollapsibleSection } from '../../src/frontend/components/collapsible-section';

describe('Panel Layout Integration', () => {
  let toolbar: ControlToolbar;
  let moveHistorySection: CollapsibleSection;
  let capturedPiecesSection: CollapsibleSection;
  let container: HTMLElement;

  beforeEach(() => {
    // Set up basic HTML structure
    document.body.innerHTML = `
      <div id="app">
        <div id="right-panel">
          <div id="collapsible-sections-container"></div>
        </div>
      </div>
    `;

    container = document.getElementById('collapsible-sections-container')!;
  });

  afterEach(() => {
    // Clean up
    if (toolbar) {
      toolbar.unmount();
    }
    document.body.innerHTML = '';
  });

  describe('toolbar and sections initialization', () => {
    test('toolbar and sections can coexist', () => {
      // Initialize toolbar
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      // Initialize sections
      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      capturedPiecesSection = new CollapsibleSection({
        id: 'captured-pieces',
        title: 'Captured Pieces',
        icon: '♟',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
      container.appendChild(capturedPiecesSection.getElement());

      // Verify toolbar exists
      const toolbarElement = document.querySelector('.control-toolbar');
      expect(toolbarElement).not.toBeNull();

      // Verify sections exist
      const sections = container.querySelectorAll('.collapsible-section');
      expect(sections.length).toBe(2);
    });

    test('sections are properly contained', () => {
      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      capturedPiecesSection = new CollapsibleSection({
        id: 'captured-pieces',
        title: 'Captured Pieces',
        icon: '♟',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
      container.appendChild(capturedPiecesSection.getElement());

      const sectionsInContainer = container.querySelectorAll('.collapsible-section');
      expect(sectionsInContainer.length).toBe(2);
    });
  });

  describe('toolbar button functionality', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();
    });

    test('all toolbar buttons are accessible', () => {
      const buttons = toolbar.getButtons();

      expect(buttons?.newGame).toBeDefined();
      expect(buttons?.undo).toBeDefined();
      expect(buttons?.redo).toBeDefined();
      expect(buttons?.resign).toBeDefined();
      expect(buttons?.flipBoard).toBeDefined();
    });

    test('button state management works', () => {
      toolbar.updateButtonStates(false, false);

      const buttons = toolbar.getButtons();
      expect(buttons?.undo.disabled).toBe(true);
      expect(buttons?.redo.disabled).toBe(true);

      toolbar.updateButtonStates(true, true);

      expect(buttons?.undo.disabled).toBe(false);
      expect(buttons?.redo.disabled).toBe(false);
    });

    test('button clicks are registered', () => {
      let clicked = false;
      const buttons = toolbar.getButtons();

      buttons?.newGame.addEventListener('click', () => {
        clicked = true;
      });

      buttons?.newGame.click();

      expect(clicked).toBe(true);
    });
  });

  describe('section interaction', () => {
    beforeEach(() => {
      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      capturedPiecesSection = new CollapsibleSection({
        id: 'captured-pieces',
        title: 'Captured Pieces',
        icon: '♟',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
      container.appendChild(capturedPiecesSection.getElement());
    });

    test('sections can be toggled independently', () => {
      moveHistorySection.collapse();
      expect(moveHistorySection.isExpanded()).toBe(false);
      expect(capturedPiecesSection.isExpanded()).toBe(true);

      capturedPiecesSection.collapse();
      expect(moveHistorySection.isExpanded()).toBe(false);
      expect(capturedPiecesSection.isExpanded()).toBe(false);
    });

    test('section content can be updated independently', () => {
      moveHistorySection.setContent('<div>History content</div>');
      capturedPiecesSection.setContent('<div>Captured content</div>');

      const historyContent = moveHistorySection.getContent();
      const capturedContent = capturedPiecesSection.getContent();

      expect(historyContent.innerHTML).toBe('<div>History content</div>');
      expect(capturedContent.innerHTML).toBe('<div>Captured content</div>');
    });
  });

  describe('toolbar and section coordination', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      capturedPiecesSection = new CollapsibleSection({
        id: 'captured-pieces',
        title: 'Captured Pieces',
        icon: '♟',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
      container.appendChild(capturedPiecesSection.getElement());
    });

    test('toolbar actions do not affect section state', () => {
      const buttons = toolbar.getButtons();

      // Simulate toolbar button click
      buttons?.newGame.click();

      // Sections should maintain their state
      expect(moveHistorySection.isExpanded()).toBe(true);
      expect(capturedPiecesSection.isExpanded()).toBe(true);
    });

    test('section actions do not affect toolbar state', () => {
      toolbar.updateButtonStates(true, true);

      // Collapse section
      moveHistorySection.collapse();

      // Toolbar buttons should maintain their state
      const buttons = toolbar.getButtons();
      expect(buttons?.undo.disabled).toBe(false);
      expect(buttons?.redo.disabled).toBe(false);
    });

    test('toolbar visibility can be controlled', () => {
      toolbar.hide();
      const toolbarElement = document.querySelector('.control-toolbar') as HTMLElement;
      expect(toolbarElement.style.display).toBe('none');

      toolbar.show();
      expect(toolbarElement.style.display).not.toBe('none');
    });
  });

  describe('layout responsiveness', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
    });

    test('toolbar exists at bottom of page', () => {
      const toolbarElement = document.querySelector('.control-toolbar');
      expect(toolbarElement).not.toBeNull();
      expect(toolbarElement?.classList.contains('control-toolbar-bottom')).toBe(true);
    });

    test('sections maintain structure when collapsed', () => {
      moveHistorySection.collapse();

      const sectionElement = moveHistorySection.getElement();
      const header = sectionElement.querySelector('.section-header');
      const content = sectionElement.querySelector('.section-content');

      expect(header).not.toBeNull();
      expect(content).not.toBeNull();
    });
  });

  describe('accessibility in integrated layout', () => {
    beforeEach(() => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());
    });

    test('toolbar has proper ARIA attributes', () => {
      const toolbarElement = document.querySelector('.control-toolbar');
      expect(toolbarElement?.getAttribute('role')).toBe('toolbar');
      expect(toolbarElement?.getAttribute('aria-label')).toBe('Game controls');
    });

    test('sections have proper ARIA attributes', () => {
      const sectionElement = moveHistorySection.getElement();
      const header = sectionElement.querySelector('.section-header');
      const content = sectionElement.querySelector('.section-content');

      expect(header?.getAttribute('role')).toBe('button');
      expect(header?.getAttribute('tabindex')).toBe('0');
      expect(header?.hasAttribute('aria-expanded')).toBe(true);
      expect(content?.hasAttribute('aria-hidden')).toBe(true);
    });

    test('keyboard navigation works in sections', () => {
      const header = moveHistorySection
        .getElement()
        .querySelector('.section-header') as HTMLElement;
      const initialState = moveHistorySection.isExpanded();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      header.dispatchEvent(event);

      expect(moveHistorySection.isExpanded()).toBe(!initialState);
    });
  });

  describe('content migration', () => {
    beforeEach(() => {
      // Set up existing content structure
      document.body.innerHTML = `
        <div id="app">
          <div id="right-panel">
            <div id="move-history">
              <div id="move-list">
                <div class="move-pair">1. e4 e5</div>
              </div>
            </div>
            <div id="captured-pieces">
              <div class="captured-section">
                <div class="captured-label">White captured:</div>
                <div id="captured-by-white" class="captured-list"></div>
              </div>
            </div>
            <div id="collapsible-sections-container"></div>
          </div>
        </div>
      `;

      container = document.getElementById('collapsible-sections-container')!;
    });

    test('existing move history content can be migrated', () => {
      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      const existingMoveHistory = document.getElementById('move-history');
      const moveList = existingMoveHistory?.querySelector('#move-list');

      if (moveList) {
        moveHistorySection.getContent().appendChild(moveList);
      }

      container.appendChild(moveHistorySection.getElement());

      const migratedMoveList = moveHistorySection.getContent().querySelector('#move-list');
      expect(migratedMoveList).not.toBeNull();
      expect(migratedMoveList?.querySelector('.move-pair')?.textContent).toBe('1. e4 e5');
    });

    test('existing captured pieces content can be migrated', () => {
      capturedPiecesSection = new CollapsibleSection({
        id: 'captured-pieces',
        title: 'Captured Pieces',
        icon: '♟',
        expanded: true,
      });

      const existingCapturedPieces = document.getElementById('captured-pieces');

      if (existingCapturedPieces) {
        capturedPiecesSection.getContent().appendChild(existingCapturedPieces);
      }

      container.appendChild(capturedPiecesSection.getElement());

      const migratedContent = capturedPiecesSection.getContent();
      const capturedLabel = migratedContent.querySelector('.captured-label');
      expect(capturedLabel?.textContent).toBe('White captured:');
    });
  });

  describe('cleanup and teardown', () => {
    test('toolbar can be unmounted cleanly', (done) => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      toolbar.unmount();

      setTimeout(() => {
        const toolbarElement = document.querySelector('.control-toolbar');
        expect(toolbarElement).toBeNull();
        done();
      }, 250);
    });

    test('sections can be removed from DOM', () => {
      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());

      const sectionElement = moveHistorySection.getElement();
      sectionElement.remove();

      const sections = container.querySelectorAll('.collapsible-section');
      expect(sections.length).toBe(0);
    });

    test('complete layout can be cleaned up', (done) => {
      toolbar = new ControlToolbar('bottom');
      toolbar.mount();

      moveHistorySection = new CollapsibleSection({
        id: 'move-history',
        title: 'Move History',
        icon: '📜',
        expanded: true,
      });

      container.appendChild(moveHistorySection.getElement());

      // Cleanup
      toolbar.unmount();
      moveHistorySection.getElement().remove();

      setTimeout(() => {
        const toolbarElement = document.querySelector('.control-toolbar');
        const sections = container.querySelectorAll('.collapsible-section');

        expect(toolbarElement).toBeNull();
        expect(sections.length).toBe(0);
        done();
      }, 250);
    });
  });
});
