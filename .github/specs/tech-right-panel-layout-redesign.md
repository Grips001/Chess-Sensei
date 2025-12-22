# Tech Spec: Right Panel Layout Redesign

> **Status:** Approved
> **Author:** Grips001
> **Created:** 2025-12-22
> **Last Updated:** 2025-12-22
> **PRD:** [prd-right-panel-layout-redesign.md](prd-right-panel-layout-redesign.md)
> **Related Issues:** N/A

---

## Overview

### Summary

Redesign the right panel layout by extracting control buttons into a dedicated glassmorphic toolbar and reorganizing
the remaining panel content into collapsible, clearly-labeled sections. This reduces visual crowding,
improves information hierarchy, and maintains the board-centric layout while preserving the app's signature aesthetic.

### Goals

1. Create a dedicated control toolbar component with glassmorphic styling
2. Implement collapsible section system for panel content organization
3. Refactor right panel HTML structure into logical groupings
4. Maintain all existing functionality while improving usability
5. Ensure responsive behavior on screens down to 1280x720

### Non-Goals

1. Changing control button functionality or adding new buttons
2. Modifying game logic or state management
3. Adding customizable layouts or user-configurable panel arrangements
4. Redesigning other modes (Play Mode) beyond Training and Exam
5. Implementing panel width adjustments or resizable panels

## Background

### Current Architecture

The right panel is a fixed 350px wide container located in `index.html` (lines 27-99) with five vertically-stacked sections:

1. **Game Status** - Turn indicator, check/checkmate alerts, bot thinking indicator
2. **Best Moves (Guidance Panel)** - Training Mode only, shows top 3 engine recommendations
3. **Game Controls** - 5 control buttons in 2-column grid
4. **Move History** - Scrollable list of game moves
5. **Captured Pieces** - Shows material advantage

**Current Issues:**

- All sections compete for vertical space in single container
- Control buttons embedded within panel compete with informational content
- No visual separation between interactive controls and display-only information
- Scrolling required on smaller screens even with minimal content
- Visual hierarchy unclear (everything appears equal importance)

**Current Styling:**

- Glassmorphic aesthetic: `rgba(255, 255, 255, 0.7)` with `backdrop-filter: blur(20px)`
- Neomorphic soft shadows
- 16px vertical gaps between sections
- Each section: `rgba(255, 255, 255, 0.5)` background, 16px padding, 8px border radius

### Key Concepts

- **Glassmorphism**: Semi-transparent, blurred background aesthetic used throughout app
- **Collapsible Section**: Panel section with header that can be clicked to expand/collapse content
- **Toolbar**: Horizontal bar containing action buttons, positioned independently of main panel
- **Panel Section**: Logical grouping of related UI elements with header and content area
- **Board-Centric Layout**: Design principle where chessboard remains visually dominant

## Detailed Design

### Architecture

```text
┌──────────────────────────────────────────────┐
│  Control Toolbar (NEW)                       │
│  - Fixed position (top or bottom)            │
│  - Glassmorphic styling                      │
│  - Contains extracted control buttons        │
└──────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  Right Panel (REFACTORED)                    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Best Moves Section (collapsible)       │ │
│  │ - Guidance move list                   │ │
│  │ - Expanded by default in Training      │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Move History Section (collapsible)     │ │
│  │ - Move pairs with notation             │ │
│  │ - Expanded by default                  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Game Status Section (collapsible)      │ │
│  │ - Turn indicator                       │ │
│  │ - Check/checkmate alerts               │ │
│  │ - Collapsed by default                 │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Captured Pieces (collapsible)          │ │
│  │ - Material advantage display           │ │
│  │ - Collapsed by default                 │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Component Changes

#### 1. New Component: Control Toolbar

**File:** `src/frontend/components/control-toolbar.ts` (NEW)

**Purpose:** Manage control button toolbar independent of right panel

**New Class:**

```typescript
/**
 * Control toolbar component that houses game control buttons
 */
export class ControlToolbar {
  private toolbarElement: HTMLElement;
  private position: 'top' | 'bottom';

  constructor(position: 'top' | 'bottom' = 'top') {
    this.position = position;
    this.toolbarElement = this.createToolbar();
  }

  /**
   * Create and mount toolbar to DOM
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.id = 'control-toolbar';
    toolbar.className = `control-toolbar control-toolbar-${this.position}`;

    // Move existing buttons from panel to toolbar
    toolbar.innerHTML = `
      <div class="toolbar-container">
        <button class="toolbar-button toolbar-button-primary" id="new-game-control">
          New Game
        </button>
        <button class="toolbar-button" id="undo-button" disabled>
          Undo
        </button>
        <button class="toolbar-button" id="redo-button" disabled>
          Redo
        </button>
        <button class="toolbar-button" id="resign-button">
          Resign
        </button>
        <button class="toolbar-button" id="flip-board-button">
          Flip Board
        </button>
      </div>
    `;

    return toolbar;
  }

  /**
   * Mount toolbar to DOM
   */
  mount(): void {
    const appContainer = document.querySelector('.app-container');

    if (this.position === 'top') {
      appContainer?.insertBefore(
        this.toolbarElement,
        appContainer.firstChild
      );
    } else {
      appContainer?.appendChild(this.toolbarElement);
    }
  }

  /**
   * Get button elements for event handler binding
   */
  getButtons(): {
    newGame: HTMLButtonElement;
    undo: HTMLButtonElement;
    redo: HTMLButtonElement;
    resign: HTMLButtonElement;
    flipBoard: HTMLButtonElement;
  } {
    return {
      newGame: this.toolbarElement.querySelector('#new-game-control')!,
      undo: this.toolbarElement.querySelector('#undo-button')!,
      redo: this.toolbarElement.querySelector('#redo-button')!,
      resign: this.toolbarElement.querySelector('#resign-button')!,
      flipBoard: this.toolbarElement.querySelector('#flip-board-button')!,
    };
  }

  /**
   * Update button states (enabled/disabled)
   */
  updateButtonStates(canUndo: boolean, canRedo: boolean): void {
    const buttons = this.getButtons();
    buttons.undo.disabled = !canUndo;
    buttons.redo.disabled = !canRedo;
  }
}
```

#### 2. New Component: Collapsible Section

**File:** `src/frontend/components/collapsible-section.ts` (NEW)

**Purpose:** Reusable collapsible section component for panel organization

**New Class:**

```typescript
/**
 * Collapsible section component for organizing panel content
 */
export class CollapsibleSection {
  private sectionElement: HTMLElement;
  private headerElement: HTMLElement;
  private contentElement: HTMLElement;
  private isExpanded: boolean;
  private sectionId: string;

  constructor(
    title: string,
    contentId: string,
    defaultExpanded: boolean = true
  ) {
    this.sectionId = `section-${contentId}`;
    this.isExpanded = defaultExpanded;
    this.sectionElement = this.createSection(title, contentId);
    this.headerElement = this.sectionElement.querySelector('.section-header')!;
    this.contentElement = this.sectionElement.querySelector('.section-content')!;
    this.attachEventListeners();
  }

  /**
   * Create section DOM structure
   */
  private createSection(title: string, contentId: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel-section collapsible-section';
    section.dataset.sectionId = this.sectionId;

    section.innerHTML = `
      <div class="section-header" role="button" tabindex="0" aria-expanded="${this.isExpanded}">
        <h3 class="section-title">${title}</h3>
        <span class="section-toggle" aria-hidden="true">
          ${this.isExpanded ? '▼' : '▶'}
        </span>
      </div>
      <div class="section-content ${this.isExpanded ? 'expanded' : 'collapsed'}"
           id="${contentId}"
           aria-hidden="${!this.isExpanded}">
        <!-- Content will be moved here -->
      </div>
    `;

    return section;
  }

  /**
   * Attach click and keyboard event listeners
   */
  private attachEventListeners(): void {
    this.headerElement.addEventListener('click', () => this.toggle());

    this.headerElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Toggle section expanded/collapsed state
   */
  toggle(): void {
    this.isExpanded = !this.isExpanded;
    this.updateUI();
    this.saveState();
  }

  /**
   * Expand section
   */
  expand(): void {
    if (!this.isExpanded) {
      this.toggle();
    }
  }

  /**
   * Collapse section
   */
  collapse(): void {
    if (this.isExpanded) {
      this.toggle();
    }
  }

  /**
   * Update UI to reflect current state
   */
  private updateUI(): void {
    const toggleIcon = this.headerElement.querySelector('.section-toggle')!;
    toggleIcon.textContent = this.isExpanded ? '▼' : '▶';

    this.headerElement.setAttribute('aria-expanded', String(this.isExpanded));
    this.contentElement.setAttribute('aria-hidden', String(!this.isExpanded));

    if (this.isExpanded) {
      this.contentElement.classList.remove('collapsed');
      this.contentElement.classList.add('expanded');
    } else {
      this.contentElement.classList.remove('expanded');
      this.contentElement.classList.add('collapsed');
    }
  }

  /**
   * Save collapsed/expanded state to localStorage
   */
  private saveState(): void {
    const key = `section-state-${this.sectionId}`;
    localStorage.setItem(key, String(this.isExpanded));
  }

  /**
   * Load saved state from localStorage
   */
  static loadState(sectionId: string): boolean | null {
    const key = `section-state-section-${sectionId}`;
    const saved = localStorage.getItem(key);
    return saved === null ? null : saved === 'true';
  }

  /**
   * Get the section DOM element
   */
  getElement(): HTMLElement {
    return this.sectionElement;
  }

  /**
   * Get the content container for appending existing elements
   */
  getContentContainer(): HTMLElement {
    return this.contentElement;
  }
}
```

#### 3. HTML Structure Refactor

**File:** `index.html`

**Changes to Right Panel Structure:**

```html
<!-- BEFORE (old structure in lines 27-99) -->
<div id="right-panel">
  <div class="panel-section">
    <h3>Game Status</h3>
    <!-- Game status content -->
  </div>

  <div class="panel-section guidance-panel hidden" id="guidance-panel">
    <h3 class="guidance-panel-title">Best Moves</h3>
    <!-- Guidance content -->
  </div>

  <div class="panel-section">
    <h3>Game Controls</h3>
    <div class="game-controls">
      <!-- Control buttons - WILL BE MOVED TO TOOLBAR -->
    </div>
  </div>

  <div class="panel-section">
    <h3>Move History</h3>
    <!-- Move history content -->
  </div>

  <div class="panel-section">
    <h3>Captured Pieces</h3>
    <!-- Captured pieces content -->
  </div>
</div>

<!-- AFTER (new structure) -->
<div id="right-panel">
  <!-- Sections will be created dynamically by CollapsibleSection components -->
  <!-- Order: Best Moves, Move History, Game Status, Captured Pieces -->
</div>

<!-- Control toolbar will be injected by ControlToolbar component at app root -->
```

**Rationale:**

- Remove "Game Controls" section entirely (moved to toolbar)
- Keep existing content elements (don't change IDs or data attributes)
- Wrap sections dynamically with CollapsibleSection component
- Maintain backwards compatibility with existing JavaScript selectors

#### 4. Frontend Integration

**File:** `src/frontend/index.ts`

**Changes to Initialization:**

```typescript
// BEFORE (existing imports and globals):
// ... existing code ...

// AFTER (add new imports and globals):
import { ControlToolbar } from './components/control-toolbar.js';
import { CollapsibleSection } from './components/collapsible-section.js';

// Global toolbar instance
let controlToolbar: ControlToolbar;

// Global section instances
let bestMovesSection: CollapsibleSection;
let moveHistorySection: CollapsibleSection;
let gameStatusSection: CollapsibleSection;
let capturedPiecesSection: CollapsibleSection;

/**
 * Initialize new panel layout system (NEW FUNCTION)
 */
function initializePanelLayout(): void {
  // 1. Create and mount control toolbar
  controlToolbar = new ControlToolbar('top'); // or 'bottom' based on preference
  controlToolbar.mount();

  // 2. Re-bind button event listeners to toolbar buttons
  const buttons = controlToolbar.getButtons();
  buttons.newGame.addEventListener('click', () => showModeSelection());
  buttons.undo.addEventListener('click', handleUndo);
  buttons.redo.addEventListener('click', handleRedo);
  buttons.resign.addEventListener('click', handleResign);
  buttons.flipBoard.addEventListener('click', flipBoard);

  // 3. Create collapsible sections
  const panel = document.getElementById('right-panel')!;
  panel.innerHTML = ''; // Clear existing structure

  // Best Moves Section (Training Mode only, shown/hidden dynamically)
  bestMovesSection = new CollapsibleSection(
    'Best Moves',
    'guidance-content-container',
    CollapsibleSection.loadState('guidance-content-container') ?? true
  );

  // Move existing guidance panel content
  const guidancePanel = document.getElementById('guidance-panel');
  if (guidancePanel) {
    const guidanceContent = guidancePanel.querySelector('#guidance-content')!;
    bestMovesSection.getContentContainer().appendChild(guidanceContent);
  }

  // Move History Section
  moveHistorySection = new CollapsibleSection(
    'Move History',
    'move-history-container',
    CollapsibleSection.loadState('move-history-container') ?? true
  );

  const moveHistory = document.getElementById('move-history')!;
  moveHistorySection.getContentContainer().appendChild(moveHistory);

  // Game Status Section
  gameStatusSection = new CollapsibleSection(
    'Game Status',
    'game-status-container',
    CollapsibleSection.loadState('game-status-container') ?? false
  );

  const gameAlert = document.getElementById('game-alert')!;
  const botThinking = document.getElementById('bot-thinking-indicator')!;
  const turnIndicator = document.getElementById('turn-indicator')!;
  const statusContainer = gameStatusSection.getContentContainer();
  statusContainer.appendChild(gameAlert);
  statusContainer.appendChild(botThinking);
  statusContainer.appendChild(turnIndicator);

  // Captured Pieces Section
  capturedPiecesSection = new CollapsibleSection(
    'Captured Pieces',
    'captured-pieces-container',
    CollapsibleSection.loadState('captured-pieces-container') ?? false
  );

  const capturedPieces = document.getElementById('captured-pieces')!;
  capturedPiecesSection.getContentContainer().appendChild(capturedPieces);

  // 4. Mount sections to panel in order
  panel.appendChild(bestMovesSection.getElement());
  panel.appendChild(moveHistorySection.getElement());
  panel.appendChild(gameStatusSection.getElement());
  panel.appendChild(capturedPiecesSection.getElement());

  // 5. Initially hide Best Moves section (will be shown in Training Mode)
  bestMovesSection.getElement().classList.add('hidden');
}

// Call during app initialization (add to existing init function)
function init() {
  // ... existing initialization code ...

  initializePanelLayout(); // NEW: Initialize new panel layout

  // ... rest of existing initialization ...
}
```

**Changes to Guidance Panel Management:**

```typescript
// BEFORE (existing showGuidancePanel function around line 1272):
function showGuidancePanel(): void {
  const guidancePanel = document.getElementById('guidance-panel');
  if (!guidancePanel) return;
  guidancePanel.classList.remove('hidden');
}

// AFTER (update to work with collapsible sections):
function showGuidancePanel(): void {
  bestMovesSection?.getElement().classList.remove('hidden');
}

// BEFORE (existing hideGuidancePanel):
function hideGuidancePanel(): void {
  const guidancePanel = document.getElementById('guidance-panel');
  if (!guidancePanel) return;
  guidancePanel.classList.add('hidden');
}

// AFTER:
function hideGuidancePanel(): void {
  bestMovesSection?.getElement().classList.add('hidden');
}
```

**Changes to Button State Updates:**

```typescript
// BEFORE (scattered button state updates):
function updateUndoRedoButtons(): void {
  const undoButton = document.getElementById('undo-button') as HTMLButtonElement;
  const redoButton = document.getElementById('redo-button') as HTMLButtonElement;

  if (undoButton) {
    undoButton.disabled = !canUndo();
  }
  if (redoButton) {
    redoButton.disabled = !canRedo();
  }
}

// AFTER (use toolbar API):
function updateUndoRedoButtons(): void {
  controlToolbar?.updateButtonStates(canUndo(), canRedo());
}
```

#### 5. CSS Styling Updates

**File:** `src/frontend/styles/index.css`

**New Toolbar Styles:**

```css
/* Control Toolbar (NEW) */
.control-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 12px 20px;

  /* Glassmorphic styling */
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.control-toolbar-top {
  top: 0;
  border-radius: 0 0 0 0; /* No rounding for edge placement */
}

.control-toolbar-bottom {
  bottom: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-bottom: none;
}

.toolbar-container {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  max-width: 1400px;
  margin: 0 auto;
}

/* Toolbar Buttons */
.toolbar-button {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  /* Neomorphic styling */
  background: linear-gradient(145deg, #f0f4f8, #d9e2ec);
  box-shadow:
    4px 4px 8px rgba(0, 0, 0, 0.1),
    -2px -2px 8px rgba(255, 255, 255, 0.7);
  color: var(--text-primary);
}

.toolbar-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    6px 6px 12px rgba(0, 0, 0, 0.15),
    -2px -2px 8px rgba(255, 255, 255, 0.8);
}

.toolbar-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    inset 2px 2px 4px rgba(0, 0, 0, 0.2),
    inset -2px -2px 4px rgba(255, 255, 255, 0.7);
}

.toolbar-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-button-primary {
  background: linear-gradient(145deg, #4682dc, #3a6ab8);
  color: white;
  box-shadow:
    4px 4px 12px rgba(70, 130, 220, 0.4),
    -2px -2px 8px rgba(255, 255, 255, 0.3);
}

.toolbar-button-primary:hover:not(:disabled) {
  box-shadow:
    6px 6px 16px rgba(70, 130, 220, 0.5),
    -2px -2px 8px rgba(255, 255, 255, 0.4);
}

/* Adjust app layout for toolbar */
.app-container {
  padding-top: 60px; /* Space for top toolbar */
}

.app-container.toolbar-bottom {
  padding-top: 0;
  padding-bottom: 60px;
}
```

**Collapsible Section Styles:**

```css
/* Collapsible Section Components (NEW) */
.collapsible-section {
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.3);
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.5);
}

.section-header:focus {
  outline: 2px solid rgba(70, 130, 220, 0.5);
  outline-offset: 2px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.section-toggle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: transform 0.2s ease;
  display: inline-block;
  min-width: 16px;
  text-align: center;
}

.section-content {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
}

.section-content.expanded {
  max-height: 1000px; /* Arbitrary large value */
  opacity: 1;
  padding: 16px;
}

.section-content.collapsed {
  max-height: 0;
  opacity: 0;
  padding: 0 16px;
}

/* Ensure smooth animations */
.section-content > * {
  transition: opacity 0.2s ease;
}

.section-content.collapsed > * {
  opacity: 0;
}
```

**Right Panel Adjustments:**

```css
/* Update existing #right-panel styles */
#right-panel {
  width: 350px;
  height: 100%; /* Was calc(100vh - XX) */
  overflow-y: auto;
  padding: 16px;

  /* Existing glassmorphic styles remain */
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  box-shadow:
    -4px 0 16px rgba(0, 0, 0, 0.1),
    inset 1px 0 0 rgba(255, 255, 255, 0.9);

  display: flex;
  flex-direction: column;
  gap: 12px; /* Reduced from 16px for tighter sections */
}

/* Remove Game Controls section styles (no longer needed) */
.game-controls {
  /* DELETE THIS ENTIRE BLOCK */
}

/* Update panel-section for collapsible wrapper */
.panel-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  box-shadow:
    2px 2px 8px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);

  /* Remove padding (now in section-content) */
  padding: 0;
}

/* Legacy panel sections that aren't collapsible get padding */
.panel-section:not(.collapsible-section) {
  padding: 16px;
}
```

**Responsive Adjustments:**

```css
/* Adjust for toolbar on smaller screens */
@media (max-width: 1366px) {
  .toolbar-container {
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-button {
    padding: 8px 16px;
    font-size: 0.875rem;
  }
}

@media (max-width: 1024px) {
  .control-toolbar {
    padding: 8px 16px;
  }

  .toolbar-button {
    padding: 6px 12px;
    font-size: 0.8125rem;
  }

  .app-container {
    padding-top: 52px;
  }
}
```

### Data Model

**No changes to existing data structures.** The refactor is purely presentational and does not modify:

- Game state management
- Move history tracking
- Guidance move data structures
- Button event handling logic

**New State (localStorage):**

```typescript
// Section collapsed/expanded states stored per user preference
interface SectionState {
  'section-guidance-content-container': boolean;
  'section-move-history-container': boolean;
  'section-game-status-container': boolean;
  'section-captured-pieces-container': boolean;
}

// Accessed via localStorage.getItem('section-state-{id}')
```

### API Changes

#### IPC Methods

No new IPC methods required. This is a pure frontend layout refactor.

### UI Changes

**Affected Files:**

- [index.html](index.html) - Simplified panel structure
- [src/frontend/index.ts](src/frontend/index.ts) - Panel initialization, button binding
- [src/frontend/components/control-toolbar.ts](src/frontend/components/control-toolbar.ts) - NEW: Toolbar component
- [src/frontend/components/collapsible-section.ts](src/frontend/components/collapsible-section.ts) - NEW: Section component
- [src/frontend/styles/index.css](src/frontend/styles/index.css) - New toolbar and section styles

**Visual Changes:**

**Before:**

```text
┌──────────────────────────────────┐
│ [Game Status]                    │
│ White to move                    │
├──────────────────────────────────┤
│ [Best Moves - Training]          │
│ 1. e4   +0.35                    │
│ 2. Nf3  +0.28                    │
├──────────────────────────────────┤
│ [Game Controls]                  │
│ [New Game] [Undo]                │
│ [Redo] [Resign] [Flip]           │
├──────────────────────────────────┤
│ [Move History]                   │
│ 1. e4 c5                         │
├──────────────────────────────────┤
│ [Captured Pieces]                │
│ White: ♟♟                        │
└──────────────────────────────────┘
```

**After:**

```text
┌──────────────────────────────────┐
│ [Control Toolbar - Glassmorphic] │
│ [New] [Undo] [Redo] [Resign] ... │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Best Moves ▼                     │
│ 1. e4 — Pawn moves to e4  +0.35  │
│ 2. Nf3 — Knight to f3     +0.28  │
├──────────────────────────────────┤
│ Move History ▼                   │
│ 1. e4 c5                         │
│ 2. Nf3 d6                        │
├──────────────────────────────────┤
│ Game Status ▶                    │
│ (collapsed)                      │
├──────────────────────────────────┤
│ Captured Pieces ▶                │
│ (collapsed)                      │
└──────────────────────────────────┘
```

### State Management

**ControlToolbar State:**

- Manages button enable/disable states
- No game state modification
- References to buttons for external event binding

**CollapsibleSection State:**

- Tracks expanded/collapsed state per section
- Persists state to localStorage
- Loads saved state on initialization
- Independent per section instance

**No global state changes.** Components manage their own UI state only.

### Error Handling

| Error Condition            | Handling Strategy                     | User Feedback                                  |
| -------------------------- | ------------------------------------- | ---------------------------------------------- |
| Toolbar mount fails        | Log error, fallback to inline buttons | Buttons remain in panel (graceful degradation) |
| Section creation fails     | Log error, show unstyled content      | Content displays without collapsible wrapper   |
| localStorage unavailable   | Use default states                    | Sections always reset to defaults              |
| Button event binding fails | Log error, continue initialization    | Specific button may not work                   |

**Error Handling in Components:**

```typescript
// In ControlToolbar.mount():
try {
  const appContainer = document.querySelector('.app-container');
  if (!appContainer) {
    throw new Error('App container not found');
  }
  // ... mount logic ...
} catch (error) {
  console.error('Failed to mount control toolbar:', error);
  // Fallback: leave buttons in original panel location
}

// In CollapsibleSection constructor:
try {
  this.sectionElement = this.createSection(title, contentId);
  // ... setup logic ...
} catch (error) {
  console.error('Failed to create collapsible section:', error);
  // Fallback: return basic div without collapse functionality
}
```

## Implementation Plan

### Phase Breakdown

#### Phase 1: Control Toolbar Component

**Scope:**

- Create `ControlToolbar` class
- Implement toolbar DOM creation and mounting
- Add glassmorphic CSS styling
- Test toolbar positioning (top vs bottom)
- Migrate button event listeners

**Files Changed:**

- `src/frontend/components/control-toolbar.ts` (CREATE)
- `src/frontend/styles/index.css` (MODIFY - add toolbar styles)
- `src/frontend/index.ts` (MODIFY - import and initialize toolbar)

**Dependencies:** None

**Estimated Complexity:** Low-Medium

#### Phase 2: Collapsible Section Component

**Scope:**

- Create `CollapsibleSection` class
- Implement expand/collapse logic with animations
- Add localStorage persistence
- Keyboard navigation (Enter/Space to toggle)
- ARIA attributes for accessibility

**Files Changed:**

- `src/frontend/components/collapsible-section.ts` (CREATE)
- `src/frontend/styles/index.css` (MODIFY - add section styles)

**Dependencies:** None (can be parallel with Phase 1)

**Estimated Complexity:** Medium

#### Phase 3: Panel Refactor

**Scope:**

- Update `index.html` to simplify panel structure
- Create `initializePanelLayout()` function
- Wrap existing panel content with CollapsibleSection components
- Update existing panel-related functions to use new structure
- Test content migration and section toggling

**Files Changed:**

- `index.html` (MODIFY - simplify panel)
- `src/frontend/index.ts` (MODIFY - add panel initialization)

**Dependencies:** Phase 1, Phase 2

**Estimated Complexity:** Medium

#### Phase 4: Integration & Testing

**Scope:**

- Connect toolbar and sections in `index.ts`
- Test Training Mode vs Exam Mode behavior
- Verify all button functionality preserved
- Test section state persistence
- Responsive design testing (1280x720 to 4K)
- Accessibility testing

**Files Changed:**

- `src/frontend/index.ts` (MODIFY - final integration)
- `tests/integration/panel-layout.test.ts` (CREATE)

**Dependencies:** Phase 3

**Estimated Complexity:** Medium

#### Phase 5: Polish & Edge Cases

**Scope:**

- Smooth animation tuning
- Visual hierarchy refinement
- Performance testing with rapid section toggling
- Edge case handling (missing content, empty sections)
- Documentation updates

**Files Changed:**

- `src/frontend/styles/index.css` (MODIFY - polish)
- `documents/troubleshooting.md` (MODIFY if needed)

**Dependencies:** Phase 4

**Estimated Complexity:** Low

### File Changes Summary

| File                                             | Action | Description                            |
| ------------------------------------------------ | ------ | -------------------------------------- |
| `src/frontend/components/control-toolbar.ts`     | Create | Toolbar component for control buttons  |
| `src/frontend/components/collapsible-section.ts` | Create | Reusable collapsible section component |
| `index.html`                                     | Modify | Simplify right panel structure         |
| `src/frontend/index.ts`                          | Modify | Initialize new layout, bind events     |
| `src/frontend/styles/index.css`                  | Modify | Add toolbar and section styles         |
| `tests/integration/panel-layout.test.ts`         | Create | Integration tests                      |

## Testing Strategy

### Unit Tests

| Test Case           | File                          | Description                                |
| ------------------- | ----------------------------- | ------------------------------------------ |
| Toolbar creation    | `control-toolbar.test.ts`     | Test toolbar DOM structure and button refs |
| Toolbar positioning | `control-toolbar.test.ts`     | Test top vs bottom mounting                |
| Section creation    | `collapsible-section.test.ts` | Test section DOM structure                 |
| Section toggle      | `collapsible-section.test.ts` | Test expand/collapse functionality         |
| State persistence   | `collapsible-section.test.ts` | Test localStorage save/load                |
| Keyboard navigation | `collapsible-section.test.ts` | Test Enter/Space key handling              |

**Example Unit Test:**

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { CollapsibleSection } from '@/frontend/components/collapsible-section';

describe('CollapsibleSection', () => {
  let section: CollapsibleSection;

  beforeEach(() => {
    section = new CollapsibleSection('Test Section', 'test-content', true);
  });

  test('creates section with correct structure', () => {
    const element = section.getElement();

    expect(element.classList.contains('collapsible-section')).toBe(true);
    expect(element.querySelector('.section-header')).toBeDefined();
    expect(element.querySelector('.section-content')).toBeDefined();
  });

  test('toggles between expanded and collapsed', () => {
    const content = section.getElement().querySelector('.section-content');

    expect(content?.classList.contains('expanded')).toBe(true);

    section.toggle();
    expect(content?.classList.contains('collapsed')).toBe(true);

    section.toggle();
    expect(content?.classList.contains('expanded')).toBe(true);
  });
});
```

### Integration Tests

| Test Case                  | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| Toolbar buttons functional | Verify all toolbar buttons trigger correct actions           |
| Section content preserved  | Verify existing panel content displays correctly in sections |
| Training Mode guidance     | Verify Best Moves section shows/hides in Training Mode       |
| Exam Mode layout           | Verify Best Moves section hidden in Exam Mode                |
| State persistence          | Verify section states persist across page reloads            |
| Responsive behavior        | Verify layout adapts to different screen sizes               |

### Manual Test Cases

| ID    | Steps                                | Expected Result                                                    |
| ----- | ------------------------------------ | ------------------------------------------------------------------ |
| MT-1  | Load app in Training Mode            | Toolbar visible at top, Best Moves expanded, Move History expanded |
| MT-2  | Click Best Moves header              | Section collapses smoothly                                         |
| MT-3  | Click collapsed section header       | Section expands smoothly                                           |
| MT-4  | Click toolbar buttons                | All buttons function identically to before                         |
| MT-5  | Reload page after collapsing section | Section remains collapsed                                          |
| MT-6  | Switch to Exam Mode                  | Best Moves section hidden, others visible                          |
| MT-7  | Resize window to 1280x720            | Layout remains usable, toolbar wraps if needed                     |
| MT-8  | Tab through sections                 | Headers receive focus, Enter/Space toggles                         |
| MT-9  | Make moves, undo, redo               | All functionality works correctly                                  |
| MT-10 | Test on 4K display                   | Layout scales appropriately                                        |

## Performance Considerations

### Expected Impact

- **CPU**: Negligible additional overhead
  - Section toggle: ~2ms for DOM class changes
  - localStorage operations: <1ms
- **Memory**: Minimal increase (~5KB for component classes)
- **Rendering**: Smooth 60fps animations with CSS transitions
- **Startup Time**: +5-10ms for component initialization

### Benchmarks

**Performance Targets:**

- Section toggle animation: 300ms total, 60fps
- Toolbar mount: <10ms
- Panel initialization: <50ms

**Benchmark Test:**

```typescript
import { describe, test } from 'bun:test';
import { CollapsibleSection } from '@/frontend/components/collapsible-section';

describe('CollapsibleSection Performance', () => {
  test('toggles 100 times in reasonable time', () => {
    const section = new CollapsibleSection('Test', 'test', true);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      section.toggle();
    }
    const end = performance.now();

    const avgTime = (end - start) / 100;
    console.log(`Average toggle time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(5); // Should be < 5ms per toggle
  });
});
```

## Security Considerations

- [x] No user data exposed - purely UI layout changes
- [x] Input validation not applicable - no user input
- [x] No new attack vectors - localStorage only stores UI preferences
- [x] XSS prevention - all content from existing trusted sources
- [x] localStorage data is non-sensitive (boolean flags for UI state)

## Rollout Plan

### Feature Flags

Not required. Layout changes can be deployed directly. If rollback needed, can be done via git revert.

### Rollback Plan

If issues arise post-deployment:

1. **Quick Revert**: Git revert to previous commit
2. **Partial Disable**: Add flag to skip new layout initialization, fall back to old structure
3. **CSS Fallback**: Hide toolbar and show inline buttons with CSS

**Emergency Rollback Code:**

```typescript
// In index.ts
const USE_NEW_LAYOUT = false; // Set to false to disable

function init() {
  if (USE_NEW_LAYOUT) {
    initializePanelLayout();
  } else {
    // Use legacy panel structure
  }
}
```

## Alternatives Considered

### Option 1: Tabbed Panel Interface

**Approach:** Replace sections with tabs (Best Moves, History, Status, Captured)

**Pros:**

- Maximum space efficiency
- Familiar UI pattern

**Cons:**

- Can only view one section at a time
- Reduces information density
- Requires clicking to switch context

**Why rejected:** PRD explicitly requires seeing multiple information types simultaneously

### Option 2: Floating/Draggable Toolbar

**Approach:** Allow users to position toolbar anywhere on screen

**Pros:**

- Ultimate flexibility
- User control

**Cons:**

- Complex implementation
- Can obstruct board
- State management complexity

**Why rejected:** Adds unnecessary complexity, fixed position simpler and predictable

### Option 3: Horizontal Accordion Panels

**Approach:** Expand sections horizontally instead of vertically

**Pros:**

- Novel approach
- More screen width utilization

**Cons:**

- Breaks established vertical panel pattern
- Would require panel width changes (violates constraint)
- Harder to read horizontal text

**Why rejected:** Violates board-centric layout and panel width constraint

### Option 4: Keep Buttons in Panel, Only Add Collapsing

**Approach:** Add collapsible sections but keep buttons embedded

**Pros:**

- Simpler implementation
- Fewer component changes

**Cons:**

- Doesn't solve core problem of buttons competing for space
- Buttons would still be part of scrollable panel

**Why rejected:** PRD explicitly requires detaching control buttons to dedicated toolbar

## Dependencies

### External Dependencies

None. Implementation uses only existing technologies.

### Internal Dependencies

- **Right Panel System** ([index.html:27-99](index.html#L27-L99)): Existing panel structure
- **Game Controls** ([src/frontend/index.ts:763-880](src/frontend/index.ts#L763-L880)): Button event handlers
- **CSS Glassmorphic System** ([src/frontend/styles/index.css](src/frontend/styles/index.css)): Visual styling
- **Guidance Panel Logic** ([src/frontend/move-guidance.ts](src/frontend/move-guidance.ts)): Best Moves display

## Open Questions

1. ~~Should toolbar be positioned at top or bottom of screen?~~
   - **Answer**: Top position (more conventional for controls, doesn't obstruct captured pieces)

2. ~~What should default expanded/collapsed states be for each section?~~
   - **Answer**: Best Moves (expanded), Move History (expanded), Game Status (collapsed), Captured (collapsed)

3. ~~Should we animate section content height or use max-height?~~
   - **Answer**: Use max-height with large value for simpler CSS animation

4. ~~Should section states sync across browser tabs?~~
   - **Answer**: No, localStorage is per-tab which is fine for independent sessions

5. ~~Should we add "Expand All" / "Collapse All" button?~~
   - **Answer**: No, not in initial implementation. Can add later if user feedback indicates need

6. ~~What icon to use for collapse indicator (▼ vs ▾ vs chevron)?~~
   - **Answer**: Unicode triangles (▼/▶) for simplicity, can upgrade to icons later

## Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                          |
| ---------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------- |
| Toolbar position feels awkward                 | Low        | Medium | User testing for top vs bottom; ensure translucency doesn't obscure |
| Users accidentally collapse important sections | Medium     | Low    | Sensible defaults; state persistence; clear visual affordances      |
| Animation performance on older hardware        | Low        | Low    | Use CSS transitions (GPU-accelerated); test on range of hardware    |
| Breaking existing button event handlers        | Low        | High   | Careful migration of event listeners; comprehensive testing         |
| localStorage quota exceeded                    | Very Low   | Low    | Only storing small booleans; clear old data if needed               |
| Section content overflow issues                | Medium     | Medium | Proper max-height, scrolling within sections; responsive testing    |

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
