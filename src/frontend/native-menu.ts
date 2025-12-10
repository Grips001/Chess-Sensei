/**
 * Native Window Menu System for Chess-Sensei
 *
 * Provides native application menus with keyboard shortcuts for:
 * - File operations (New Game, Import/Export PGN, Exit)
 * - Game controls (Undo, Redo, Flip Board, Resign)
 * - View options (Dashboard, Data Management, Inspector)
 * - Help resources (User Guide, About)
 *
 * Uses Neutralino 6.1.0+ window.setMainMenu API
 * @see https://neutralino.js.org/docs/api/window/#windowsetmainmenumenu
 */

import { window as neuWindow, os, app } from '@neutralinojs/lib';
import { frontendLogger } from './frontend-logger';

/**
 * Menu action handlers interface
 * These handlers will be provided by the main application
 */
export interface MenuActionHandlers {
  onNewGame: () => void;
  onImportPGN: () => void;
  onExportPGN: () => void;
  onExit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFlipBoard: () => void;
  onResign: () => void;
  onViewDashboard: () => void;
  onViewDataManagement: () => void;
  onToggleInspector: () => void;
  onUserGuide: () => void;
  onAbout: () => void;
}

/**
 * Platform detection for platform-specific menu behavior
 */
function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * Create the application menu structure
 * macOS gets native menu bar integration, other platforms get in-window menus
 */
function createMenuStructure() {
  const isMac = isMacOS();

  // macOS uses Cmd, others use Ctrl
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  // Neutralino expects an array of menu items with nested menuItems
  return [
    {
      text: 'File',
      menuItems: [
        { id: 'new-game', text: 'New Game', shortcut: `${modKey}+N` },
        { id: 'import-pgn', text: 'Import PGN...', shortcut: `${modKey}+O` },
        { id: 'export-pgn', text: 'Export PGN...', shortcut: `${modKey}+S` },
        { text: '-' }, // separator
        { id: 'exit', text: isMac ? 'Quit Chess-Sensei' : 'Exit', shortcut: `${modKey}+Q` },
      ],
    },
    {
      text: 'Game',
      menuItems: [
        { id: 'undo', text: 'Undo Move', shortcut: `${modKey}+Z` },
        { id: 'redo', text: 'Redo Move', shortcut: `${modKey}+Y` },
        { id: 'flip', text: 'Flip Board', shortcut: `${modKey}+F` },
        { text: '-' }, // separator
        { id: 'resign', text: 'Resign', shortcut: `${modKey}+R` },
      ],
    },
    {
      text: 'View',
      menuItems: [
        { id: 'dashboard', text: 'Progress Dashboard', shortcut: `${modKey}+D` },
        { id: 'data-mgmt', text: 'Data Management', shortcut: `${modKey}+M` },
        { text: '-' }, // separator
        { id: 'inspector', text: 'Toggle Inspector', shortcut: `${modKey}+I` },
      ],
    },
    {
      text: 'Help',
      menuItems: [
        { id: 'guide', text: 'User Guide' },
        { text: '-' }, // separator
        { id: 'about', text: 'About Chess-Sensei' },
      ],
    },
  ];
}

/**
 * Handle menu item click events
 * NOTE: Currently unused as Neutralino 6.4.0 doesn't support menu event callbacks yet
 * Exported for future use when API supports it
 */
export function handleMenuAction(itemId: string, handlers: MenuActionHandlers): void {
  frontendLogger.debug('Menu', `Menu action: ${itemId}`);

  switch (itemId) {
    // File menu
    case 'new-game':
      handlers.onNewGame();
      break;
    case 'import-pgn':
      handlers.onImportPGN();
      break;
    case 'export-pgn':
      handlers.onExportPGN();
      break;
    case 'exit':
      handlers.onExit();
      break;

    // Game menu
    case 'undo':
      handlers.onUndo();
      break;
    case 'redo':
      handlers.onRedo();
      break;
    case 'flip':
      handlers.onFlipBoard();
      break;
    case 'resign':
      handlers.onResign();
      break;

    // View menu
    case 'dashboard':
      handlers.onViewDashboard();
      break;
    case 'data-mgmt':
      handlers.onViewDataManagement();
      break;
    case 'inspector':
      handlers.onToggleInspector();
      break;

    // Help menu
    case 'guide':
      handlers.onUserGuide();
      break;
    case 'about':
      handlers.onAbout();
      break;

    default:
      frontendLogger.warn('Menu', `Unknown menu action: ${itemId}`);
  }
}

/**
 * Show the About dialog
 */
async function showAboutDialog(): Promise<void> {
  try {
    const osInfo = await os.getEnv('OS');
    const message = `Chess-Sensei v1.0.0

A modern chess training application with real-time AI-assisted move guidance.

Built with:
- Neutralino.js 6.4.0
- Bun Runtime 1.3.4
- Stockfish 17.1 WASM

Platform: ${osInfo || 'Unknown'}

© 2025 Jhon D. Vise
Licensed under GPL-3.0`;

    // Use native OS notification for about dialog
    // Note: Neutralino doesn't have a native dialog API yet, so we use a simple alert
    // eslint-disable-next-line no-alert
    alert(message);
  } catch (error) {
    frontendLogger.error('Menu', 'Failed to show about dialog:', error);
    // eslint-disable-next-line no-alert
    alert('Chess-Sensei v1.0.0\n\nA modern chess training application.');
  }
}

/**
 * Open user guide
 *
 * Shows an in-app guide with key features and controls.
 * This approach works offline and doesn't require an external URL.
 */
async function openUserGuide(): Promise<void> {
  try {
    const guide = `Chess-Sensei User Guide

GAME MODES
• Training Mode: Practice with AI guidance showing top 3 moves
• Exam Mode: Test your skills without hints, review afterward
• Sandbox Mode: Set up any position and analyze freely

CONTROLS
• New Game: Start a fresh game against the AI
• Undo/Redo: Step through your game history
• Flip Board: Switch perspective to black's view
• Resign: End current game

FEATURES
• Move Guidance: Blue (best), Green (2nd), Yellow (3rd) highlights
• Progress Dashboard: Track your improvement over time
• Post-Game Analysis: Review accuracy and find mistakes
• Data Management: Export/import games and settings

KEYBOARD SHORTCUTS
• Ctrl+N: New Game
• Ctrl+Z: Undo Move
• Ctrl+Y: Redo Move
• Ctrl+F: Flip Board
• Ctrl+D: Progress Dashboard
• Ctrl+M: Data Management

For more information, see the README.md file in the project folder.`;

    // eslint-disable-next-line no-alert
    alert(guide);
    frontendLogger.info('Menu', 'Displayed user guide');
  } catch (error) {
    frontendLogger.error('Menu', 'Failed to show user guide:', error);
  }
}

/**
 * Toggle developer inspector
 */
async function toggleInspector(): Promise<void> {
  try {
    // Neutralino doesn't expose inspector toggle via API
    // This is typically controlled by --dev flag or config
    frontendLogger.info('Menu', 'Inspector toggle requested (requires --dev flag)');
    // eslint-disable-next-line no-alert
    alert(
      'Developer Inspector\n\n' +
        'The inspector is available when running with the --dev flag.\n' +
        'Right-click on the window and select "Inspect" to open it.'
    );
  } catch (error) {
    frontendLogger.error('Menu', 'Failed to toggle inspector:', error);
  }
}

/**
 * Exit the application
 */
async function exitApplication(): Promise<void> {
  try {
    frontendLogger.info('Menu', 'Application exit requested');
    await app.exit(0);
  } catch (error) {
    frontendLogger.error('Menu', 'Failed to exit application:', error);
    // Fallback: close window
    window.close();
  }
}

/**
 * Initialize the native menu system
 * Call this once during application startup
 */
export async function initializeNativeMenu(handlers: MenuActionHandlers): Promise<void> {
  try {
    // Create enhanced handlers that include built-in actions
    const enhancedHandlers: MenuActionHandlers = {
      ...handlers,
      onAbout: () => showAboutDialog(),
      onUserGuide: () => openUserGuide(),
      onToggleInspector: () => toggleInspector(),
      onExit: () => exitApplication(),
    };

    // Create menu structure
    const menu = createMenuStructure();

    // Set the native menu
    await neuWindow.setMainMenu(menu);

    frontendLogger.info('Menu', 'Native window menu initialized');

    // Subscribe to menu item click events
    // Note: Neutralino doesn't have a direct event subscription API yet
    // We'll need to handle keyboard shortcuts manually in the meantime
    setupKeyboardShortcuts(enhancedHandlers);
  } catch (error) {
    frontendLogger.error('Menu', 'Failed to initialize native menu:', error);
    // Non-fatal: application can continue without native menus
    console.warn('Native menus not available, using keyboard shortcuts only');
    setupKeyboardShortcuts(handlers);
  }
}

/**
 * Setup keyboard shortcuts as fallback/supplement to native menus
 * This ensures shortcuts work even if native menus aren't supported
 */
function setupKeyboardShortcuts(handlers: MenuActionHandlers): void {
  const isMac = isMacOS();
  const modKey = isMac ? 'metaKey' : 'ctrlKey';

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Check if the modifier key is pressed (Cmd on Mac, Ctrl otherwise)
    if (!event[modKey]) {
      return;
    }

    // Prevent default browser behavior for our shortcuts
    const key = event.key.toLowerCase();

    switch (key) {
      case 'n':
        event.preventDefault();
        handlers.onNewGame();
        break;
      case 'o':
        event.preventDefault();
        handlers.onImportPGN();
        break;
      case 's':
        event.preventDefault();
        handlers.onExportPGN();
        break;
      case 'q':
        event.preventDefault();
        handlers.onExit();
        break;
      case 'z':
        event.preventDefault();
        handlers.onUndo();
        break;
      case 'y':
        event.preventDefault();
        handlers.onRedo();
        break;
      case 'f':
        event.preventDefault();
        handlers.onFlipBoard();
        break;
      case 'r':
        event.preventDefault();
        handlers.onResign();
        break;
      case 'd':
        event.preventDefault();
        handlers.onViewDashboard();
        break;
      case 'm':
        event.preventDefault();
        handlers.onViewDataManagement();
        break;
      case 'i':
        event.preventDefault();
        handlers.onToggleInspector();
        break;
    }
  });

  frontendLogger.info('Menu', 'Keyboard shortcuts registered');
}
