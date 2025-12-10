/**
 * UI Constants
 *
 * Centralizes CSS class names, animation timings, and DOM element IDs.
 * Reduces magic strings scattered throughout the codebase.
 */

/**
 * CSS class names used throughout the application.
 * Using constants prevents typos and makes refactoring easier.
 */
export const CSS_CLASSES = {
  // Visibility
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  ACTIVE: 'active',
  DISABLED: 'disabled',

  // Selection states
  SELECTED: 'selected',
  HIGHLIGHTED: 'highlighted',
  FOCUSED: 'focused',

  // Chess board
  SQUARE: 'square',
  PIECE: 'piece',
  LIGHT_SQUARE: 'light',
  DARK_SQUARE: 'dark',
  LEGAL_MOVE: 'legal-move',
  LAST_MOVE: 'last-move',
  CHECK: 'in-check',

  // Piece states
  DRAGGING: 'dragging',
  MOVING: 'moving',
  CAPTURED: 'captured',

  // Guidance highlights
  GUIDANCE_BLUE: 'guidance-blue',
  GUIDANCE_GREEN: 'guidance-green',
  GUIDANCE_YELLOW: 'guidance-yellow',
  GUIDANCE_SOURCE: 'guidance-source',
  GUIDANCE_TARGET: 'guidance-target',

  // Move classifications
  MOVE_BEST: 'move-best',
  MOVE_EXCELLENT: 'move-excellent',
  MOVE_GOOD: 'move-good',
  MOVE_INACCURACY: 'move-inaccuracy',
  MOVE_MISTAKE: 'move-mistake',
  MOVE_BLUNDER: 'move-blunder',
  MOVE_BOOK: 'move-book',

  // UI states
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',

  // Overlays
  OVERLAY: 'overlay',
  MODAL: 'modal',

  // Keyboard navigation
  KEYBOARD_NAV: 'keyboard-nav',
  KEYBOARD_FOCUS: 'keyboard-focus',
} as const;

/**
 * Animation timing constants in milliseconds.
 * Matches CSS variable values for consistency.
 */
export const ANIMATION_TIMINGS = {
  /** Ultra-fast animations (50ms) */
  INSTANT: 50,

  /** Fast animations like hover effects (150ms) */
  FAST: 150,

  /** Normal animations like transitions (250ms) */
  NORMAL: 250,

  /** Slow animations like modals (300ms) */
  SLOW: 300,

  /** Capture animation delay */
  CAPTURE_DELAY: 250,

  /** Move animation delay */
  MOVE_DELAY: 300,

  /** Turn indicator animation (500ms) */
  TURN_INDICATOR: 500,

  /** Game result modal delay (1000ms) */
  GAME_RESULT_DELAY: 1000,

  /** Bot thinking minimum time (500ms) */
  BOT_THINKING_MIN: 500,

  /** Analysis auto-play interval (1500ms) */
  AUTOPLAY_INTERVAL: 1500,
} as const;

/**
 * DOM element IDs used throughout the application.
 */
export const ELEMENT_IDS = {
  // Main containers
  APP: 'app',
  CHESS_BOARD: 'chess-board',
  GAME_CONTAINER: 'game-container',

  // Turn and status
  TURN_INDICATOR: 'turn-indicator',
  GAME_ALERT: 'game-alert',

  // Move history
  MOVE_LIST: 'move-list',

  // Captured pieces
  CAPTURED_BY_WHITE: 'captured-by-white',
  CAPTURED_BY_BLACK: 'captured-by-black',
  WHITE_ADVANTAGE: 'white-advantage',
  BLACK_ADVANTAGE: 'black-advantage',

  // Control buttons
  NEW_GAME_BTN: 'new-game-btn',
  RESIGN_BTN: 'resign-btn',
  FLIP_BOARD_BTN: 'flip-board-btn',
  UNDO_BTN: 'undo-btn',
  REDO_BTN: 'redo-btn',
  VIEW_ANALYSIS_BTN: 'view-analysis-btn',

  // Overlays
  GAME_RESULT_OVERLAY: 'game-result-overlay',
  MODE_SELECTION_OVERLAY: 'mode-selection-overlay',
  TRAINING_SETUP_OVERLAY: 'training-setup-overlay',
  EXAM_SETUP_OVERLAY: 'exam-setup-overlay',
  SANDBOX_OVERLAY: 'sandbox-overlay',
  PROGRESS_DASHBOARD_OVERLAY: 'progress-dashboard-overlay',
  DATA_MGMT_OVERLAY: 'data-mgmt-overlay',
  CONFIRM_DIALOG: 'confirm-dialog',

  // Game result
  RESULT_TITLE: 'result-title',
  RESULT_SUBTITLE: 'result-subtitle',
  RESULT_REASON: 'result-reason',

  // Promotion dialog
  PROMOTION_DIALOG: 'promotion-dialog',

  // Guidance panel
  GUIDANCE_PANEL: 'guidance-panel',
  GUIDANCE_MOVES: 'guidance-moves',

  // Analysis
  ANALYSIS_OVERLAY: 'analysis-overlay',
  ANALYSIS_BOARD: 'analysis-board',
} as const;

/**
 * Data attribute names used on DOM elements.
 */
export const DATA_ATTRIBUTES = {
  SQUARE: 'data-square',
  PIECE: 'data-piece',
  COLOR: 'data-color',
  MOVE_INDEX: 'data-move-index',
  GAME_ID: 'data-game-id',
  PERSONALITY: 'data-personality',
  DIFFICULTY: 'data-difficulty',
} as const;
