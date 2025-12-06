/**
 * Sandbox Mode Manager
 *
 * Handles Sandbox Mode for position exploration and analysis.
 * Unlike Training/Exam modes, Sandbox Mode:
 * - Provides a board editor for custom positions
 * - Allows single-position analysis (no game progression)
 * - No metrics or game state persistence
 * - Pure exploration and analysis tool
 *
 * @see source-docs/game-modes.md - "Sandbox Mode"
 * @see source-docs/TASKS.md - Phase 7
 */

import * as buntralino from 'buntralino-client';
import { IPC_METHODS } from '../shared/ipc-types';
import type { BestMovesResponse, ErrorResponse } from '../shared/ipc-types';
import { formatScore } from '../shared/engine-types';
import { frontendLogger } from './frontend-logger';

// Create a scoped logger for SandboxMode
const logger = {
  info: (message: string, data?: Record<string, unknown>) =>
    frontendLogger.info('SandboxMode', message, data),
  debug: (message: string, data?: Record<string, unknown>) =>
    frontendLogger.debug('SandboxMode', message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    frontendLogger.warn('SandboxMode', message, data),
  error: (message: string, data?: Record<string, unknown>) =>
    frontendLogger.error('SandboxMode', message, data),
};

/**
 * Chess piece types
 */
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type PieceColor = 'w' | 'b';

/**
 * Piece definition for board editor
 */
export interface EditorPiece {
  type: PieceType;
  color: PieceColor;
}

/**
 * Board position represented as a map of squares to pieces
 */
export type BoardPosition = Map<string, EditorPiece>;

/**
 * Position validation result
 */
export interface PositionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Analysis result for a position
 */
export interface SandboxAnalysisResult {
  bestMove: string | null;
  bestMoveFrom: string | null;
  bestMoveTo: string | null;
  score: number;
  formattedScore: string;
  topMoves: Array<{
    move: string;
    from: string;
    to: string;
    score: number;
    formattedScore: string;
    color: 'blue' | 'green' | 'yellow';
  }>;
}

/**
 * Sandbox Mode state
 */
export interface SandboxState {
  /** Whether Sandbox Mode is active */
  isActive: boolean;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Current board position */
  position: BoardPosition;
  /** Color to move ('w' = white, 'b' = black) */
  colorToMove: PieceColor;
  /** Castling rights (KQkq format) */
  castlingRights: string;
  /** En passant target square (or '-') */
  enPassant: string;
  /** Halfmove clock */
  halfmoveClock: number;
  /** Fullmove number */
  fullmoveNumber: number;
  /** Currently selected piece for placement (from palette) */
  selectedPalettePiece: EditorPiece | null;
  /** Last validation result */
  validation: PositionValidation;
  /** Last analysis result */
  analysisResult: SandboxAnalysisResult | null;
}

/**
 * Default starting position as a map
 */
function getStartingPosition(): BoardPosition {
  const position: BoardPosition = new Map();

  // White pieces (rank 1 and 2)
  position.set('a1', { type: 'R', color: 'w' });
  position.set('b1', { type: 'N', color: 'w' });
  position.set('c1', { type: 'B', color: 'w' });
  position.set('d1', { type: 'Q', color: 'w' });
  position.set('e1', { type: 'K', color: 'w' });
  position.set('f1', { type: 'B', color: 'w' });
  position.set('g1', { type: 'N', color: 'w' });
  position.set('h1', { type: 'R', color: 'w' });
  for (const file of 'abcdefgh') {
    position.set(`${file}2`, { type: 'P', color: 'w' });
  }

  // Black pieces (rank 7 and 8)
  position.set('a8', { type: 'R', color: 'b' });
  position.set('b8', { type: 'N', color: 'b' });
  position.set('c8', { type: 'B', color: 'b' });
  position.set('d8', { type: 'Q', color: 'b' });
  position.set('e8', { type: 'K', color: 'b' });
  position.set('f8', { type: 'B', color: 'b' });
  position.set('g8', { type: 'N', color: 'b' });
  position.set('h8', { type: 'R', color: 'b' });
  for (const file of 'abcdefgh') {
    position.set(`${file}7`, { type: 'P', color: 'b' });
  }

  return position;
}

/**
 * Get empty board position
 */
function getEmptyPosition(): BoardPosition {
  return new Map();
}

/**
 * Common endgame templates
 */
export const POSITION_TEMPLATES = {
  starting: {
    name: 'Starting Position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  empty: {
    name: 'Empty Board',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
  },
  kqVsK: {
    name: 'K+Q vs K',
    fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1',
  },
  krVsK: {
    name: 'K+R vs K',
    fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
  },
  kbnVsK: {
    name: 'K+B+N vs K',
    fen: '8/8/8/4k3/8/8/8/4KBN1 w - - 0 1',
  },
  kpVsK: {
    name: 'K+P vs K',
    fen: '8/4P3/8/4k3/8/8/8/4K3 w - - 0 1',
  },
  lucena: {
    name: 'Lucena Position',
    fen: '1K1k4/1P6/8/8/8/8/r7/4R3 w - - 0 1',
  },
  philidor: {
    name: 'Philidor Position',
    fen: '8/8/1k6/8/1PK5/8/6r1/5R2 w - - 0 1',
  },
} as const;

/**
 * Convert piece to FEN character
 */
function pieceToFen(piece: EditorPiece): string {
  const char = piece.type;
  return piece.color === 'w' ? char.toUpperCase() : char.toLowerCase();
}

/**
 * Convert FEN character to piece
 */
function fenToPiece(char: string): EditorPiece | null {
  if (char === '' || char === ' ') return null;
  const isWhite = char === char.toUpperCase();
  const type = char.toUpperCase() as PieceType;
  if (!['K', 'Q', 'R', 'B', 'N', 'P'].includes(type)) return null;
  return { type, color: isWhite ? 'w' : 'b' };
}

/**
 * Convert board position to FEN string
 */
export function positionToFen(
  position: BoardPosition,
  colorToMove: PieceColor = 'w',
  castling: string = '-',
  enPassant: string = '-',
  halfmove: number = 0,
  fullmove: number = 1
): string {
  const ranks: string[] = [];

  for (let rank = 8; rank >= 1; rank--) {
    let rankStr = '';
    let emptyCount = 0;

    for (const file of 'abcdefgh') {
      const square = `${file}${rank}`;
      const piece = position.get(square);

      if (piece) {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        rankStr += pieceToFen(piece);
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }

    ranks.push(rankStr);
  }

  return `${ranks.join('/')} ${colorToMove} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
}

/**
 * Parse FEN string to board position
 */
export function fenToPosition(fen: string): {
  position: BoardPosition;
  colorToMove: PieceColor;
  castling: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
} | null {
  try {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 1) return null;

    const position: BoardPosition = new Map();
    const ranks = parts[0].split('/');
    if (ranks.length !== 8) return null;

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      const rank = 8 - rankIdx;
      let file = 0;

      for (const char of ranks[rankIdx]) {
        if (file >= 8) break;

        if (/[1-8]/.test(char)) {
          file += parseInt(char, 10);
        } else {
          const piece = fenToPiece(char);
          if (piece) {
            const fileChar = String.fromCharCode(97 + file);
            position.set(`${fileChar}${rank}`, piece);
          }
          file++;
        }
      }
    }

    return {
      position,
      colorToMove: (parts[1] === 'b' ? 'b' : 'w') as PieceColor,
      castling: parts[2] || '-',
      enPassant: parts[3] || '-',
      halfmove: parseInt(parts[4], 10) || 0,
      fullmove: parseInt(parts[5], 10) || 1,
    };
  } catch (error) {
    logger.error('Error parsing FEN', { fen, error });
    return null;
  }
}

/**
 * Validate a chess position
 */
export function validatePosition(position: BoardPosition): PositionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count pieces
  let whiteKings = 0;
  let blackKings = 0;
  let whitePawns = 0;
  let blackPawns = 0;
  let whitePieces = 0;
  let blackPieces = 0;

  let whiteKingSquare: string | null = null;
  let blackKingSquare: string | null = null;

  position.forEach((piece, square) => {
    if (piece.color === 'w') {
      whitePieces++;
      if (piece.type === 'K') {
        whiteKings++;
        whiteKingSquare = square;
      }
      if (piece.type === 'P') whitePawns++;
    } else {
      blackPieces++;
      if (piece.type === 'K') {
        blackKings++;
        blackKingSquare = square;
      }
      if (piece.type === 'P') blackPawns++;
    }

    // Check for pawns on 1st or 8th rank
    const rank = parseInt(square[1], 10);
    if (piece.type === 'P' && (rank === 1 || rank === 8)) {
      errors.push(`Pawn on invalid rank: ${square}`);
    }
  });

  // Validate kings
  if (whiteKings === 0) {
    errors.push('White king is missing');
  } else if (whiteKings > 1) {
    errors.push(`Too many white kings: ${whiteKings}`);
  }

  if (blackKings === 0) {
    errors.push('Black king is missing');
  } else if (blackKings > 1) {
    errors.push(`Too many black kings: ${blackKings}`);
  }

  // Check kings not adjacent
  if (whiteKingSquare !== null && blackKingSquare !== null) {
    const wKingSquare = whiteKingSquare as string;
    const bKingSquare = blackKingSquare as string;
    const wFile = wKingSquare.charCodeAt(0) - 97;
    const wRank = parseInt(wKingSquare[1], 10);
    const bFile = bKingSquare.charCodeAt(0) - 97;
    const bRank = parseInt(bKingSquare[1], 10);

    const fileDiff = Math.abs(wFile - bFile);
    const rankDiff = Math.abs(wRank - bRank);

    if (fileDiff <= 1 && rankDiff <= 1) {
      errors.push('Kings cannot be adjacent');
    }
  }

  // Check piece counts
  if (whitePieces > 16) {
    warnings.push(`Too many white pieces: ${whitePieces}`);
  }
  if (blackPieces > 16) {
    warnings.push(`Too many black pieces: ${blackPieces}`);
  }
  if (whitePawns > 8) {
    warnings.push(`Too many white pawns: ${whitePawns}`);
  }
  if (blackPawns > 8) {
    warnings.push(`Too many black pawns: ${blackPawns}`);
  }

  logger.debug('Position validation', { errors, warnings });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse UCI move to get from and to squares
 */
function parseUciMove(uci: string): { from: string; to: string } {
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
  };
}

/**
 * Sandbox Mode Manager class
 */
export class SandboxModeManager {
  private state: SandboxState;

  // Callbacks for UI updates
  public onPositionChange?: (position: BoardPosition) => void;
  public onValidationChange?: (validation: PositionValidation) => void;
  public onAnalysisStart?: () => void;
  public onAnalysisComplete?: (result: SandboxAnalysisResult) => void;
  public onAnalysisError?: (error: string) => void;
  public onStateChange?: (state: SandboxState) => void;

  constructor() {
    this.state = {
      isActive: false,
      isAnalyzing: false,
      position: getStartingPosition(),
      colorToMove: 'w',
      castlingRights: 'KQkq',
      enPassant: '-',
      halfmoveClock: 0,
      fullmoveNumber: 1,
      selectedPalettePiece: null,
      validation: { isValid: true, errors: [], warnings: [] },
      analysisResult: null,
    };
  }

  /**
   * Get current state
   */
  getState(): SandboxState {
    return { ...this.state };
  }

  /**
   * Check if Sandbox Mode is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if analysis is in progress
   */
  isAnalyzing(): boolean {
    return this.state.isAnalyzing;
  }

  /**
   * Start Sandbox Mode
   */
  start(): void {
    logger.info('Starting Sandbox Mode');
    this.state.isActive = true;
    this.state.analysisResult = null;
    this.onStateChange?.(this.state);
  }

  /**
   * Stop Sandbox Mode
   */
  stop(): void {
    logger.info('Stopping Sandbox Mode');
    this.state.isActive = false;
    this.state.analysisResult = null;
    this.onStateChange?.(this.state);
  }

  /**
   * Clear analysis results (called when position changes)
   */
  clearAnalysisResult(): void {
    if (this.state.analysisResult !== null) {
      this.state.analysisResult = null;
      logger.debug('Cleared analysis result due to position change');
      this.onStateChange?.(this.state);
    }
  }

  /**
   * Get current board position
   */
  getPosition(): BoardPosition {
    return new Map(this.state.position);
  }

  /**
   * Get current FEN
   */
  getFen(): string {
    return positionToFen(
      this.state.position,
      this.state.colorToMove,
      this.state.castlingRights,
      this.state.enPassant,
      this.state.halfmoveClock,
      this.state.fullmoveNumber
    );
  }

  /**
   * Set color to move
   */
  setColorToMove(color: PieceColor): void {
    logger.debug('Set color to move', { color });
    this.state.colorToMove = color;
    this.onStateChange?.(this.state);
  }

  /**
   * Toggle color to move
   */
  toggleColorToMove(): void {
    this.state.colorToMove = this.state.colorToMove === 'w' ? 'b' : 'w';
    // Clear analysis when color changes since it affects who's moving
    this.clearAnalysisResult();
    logger.debug('Toggled color to move', { colorToMove: this.state.colorToMove });
    this.onStateChange?.(this.state);
  }

  /**
   * Get color to move
   */
  getColorToMove(): PieceColor {
    return this.state.colorToMove;
  }

  /**
   * Select a piece from the palette
   */
  selectPalettePiece(piece: EditorPiece | null): void {
    this.state.selectedPalettePiece = piece;
    logger.debug('Selected palette piece', { piece });
    this.onStateChange?.(this.state);
  }

  /**
   * Get selected palette piece
   */
  getSelectedPalettePiece(): EditorPiece | null {
    return this.state.selectedPalettePiece;
  }

  /**
   * Place a piece on a square
   */
  placePiece(square: string, piece: EditorPiece): void {
    logger.debug('Placing piece', { square, piece });
    this.state.position.set(square, piece);
    this.validateCurrentPosition();
    this.clearAnalysisResult();
    this.onPositionChange?.(this.state.position);
    this.onStateChange?.(this.state);
  }

  /**
   * Remove a piece from a square
   */
  removePiece(square: string): void {
    if (this.state.position.has(square)) {
      logger.debug('Removing piece', { square });
      this.state.position.delete(square);
      this.validateCurrentPosition();
      this.clearAnalysisResult();
      this.onPositionChange?.(this.state.position);
      this.onStateChange?.(this.state);
    }
  }

  /**
   * Move a piece from one square to another
   */
  movePiece(from: string, to: string): void {
    const piece = this.state.position.get(from);
    if (piece) {
      logger.debug('Moving piece', { from, to, piece });
      this.state.position.delete(from);
      this.state.position.set(to, piece);
      this.validateCurrentPosition();
      this.clearAnalysisResult();
      this.onPositionChange?.(this.state.position);
      this.onStateChange?.(this.state);
    }
  }

  /**
   * Clear the board
   */
  clearBoard(): void {
    logger.info('Clearing board');
    this.state.position = getEmptyPosition();
    this.state.castlingRights = '-';
    this.state.enPassant = '-';
    this.validateCurrentPosition();
    this.clearAnalysisResult();
    this.onPositionChange?.(this.state.position);
    this.onStateChange?.(this.state);
  }

  /**
   * Load a position from FEN
   */
  loadFen(fen: string): boolean {
    logger.info('Loading FEN', { fen });
    const parsed = fenToPosition(fen);
    if (!parsed) {
      logger.error('Failed to parse FEN', { fen });
      return false;
    }

    this.state.position = parsed.position;
    this.state.colorToMove = parsed.colorToMove;
    this.state.castlingRights = parsed.castling;
    this.state.enPassant = parsed.enPassant;
    this.state.halfmoveClock = parsed.halfmove;
    this.state.fullmoveNumber = parsed.fullmove;

    this.validateCurrentPosition();
    this.clearAnalysisResult();
    this.onPositionChange?.(this.state.position);
    this.onStateChange?.(this.state);
    return true;
  }

  /**
   * Load a position template
   */
  loadTemplate(templateKey: keyof typeof POSITION_TEMPLATES): void {
    const template = POSITION_TEMPLATES[templateKey];
    logger.info('Loading template', { templateKey, template: template.name });
    this.loadFen(template.fen);
  }

  /**
   * Validate current position
   */
  private validateCurrentPosition(): void {
    this.state.validation = validatePosition(this.state.position);
    this.onValidationChange?.(this.state.validation);
  }

  /**
   * Get current validation result
   */
  getValidation(): PositionValidation {
    return { ...this.state.validation };
  }

  /**
   * Analyze current position
   */
  async analyzePosition(): Promise<SandboxAnalysisResult | null> {
    if (!this.state.validation.isValid) {
      logger.warn('Cannot analyze invalid position', { errors: this.state.validation.errors });
      this.onAnalysisError?.('Position is invalid: ' + this.state.validation.errors.join(', '));
      return null;
    }

    this.state.isAnalyzing = true;
    this.onAnalysisStart?.();

    const fen = this.getFen();
    logger.info('Analyzing position', { fen });

    try {
      // Always request 3 moves for display
      const response = (await buntralino.run(IPC_METHODS.GET_GUIDANCE_MOVES, {
        fen,
        count: 3,
        depth: 18,
      })) as BestMovesResponse | ErrorResponse;

      if (!response.success) {
        throw new Error((response as ErrorResponse).error || 'Analysis failed');
      }

      const moves = (response as BestMovesResponse).moves;
      const colors = ['blue', 'green', 'yellow'] as const;

      const topMoves = moves.slice(0, 3).map((move, idx) => {
        const { from, to } = parseUciMove(move.move);
        return {
          move: move.move,
          from,
          to,
          score: move.score,
          formattedScore: formatScore(move.score),
          color: colors[idx] || 'yellow',
        };
      });

      const bestMove = moves[0];
      const { from: bestFrom, to: bestTo } = bestMove
        ? parseUciMove(bestMove.move)
        : { from: null, to: null };

      const result: SandboxAnalysisResult = {
        bestMove: bestMove?.move || null,
        bestMoveFrom: bestFrom,
        bestMoveTo: bestTo,
        score: bestMove?.score || 0,
        formattedScore: bestMove ? formatScore(bestMove.score) : '0.00',
        topMoves,
      };

      this.state.analysisResult = result;
      this.state.isAnalyzing = false;
      logger.info('Analysis complete', { result });
      this.onAnalysisComplete?.(result);
      this.onStateChange?.(this.state);

      return result;
    } catch (error) {
      this.state.isAnalyzing = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Analysis error', { error: errorMessage });
      this.onAnalysisError?.(errorMessage);
      this.onStateChange?.(this.state);
      return null;
    }
  }

  /**
   * Get last analysis result
   */
  getAnalysisResult(): SandboxAnalysisResult | null {
    return this.state.analysisResult;
  }

  /**
   * Get a piece at a specific square
   */
  getPieceAt(square: string): EditorPiece | null {
    return this.state.position.get(square) || null;
  }
}

/**
 * UI Manager for Sandbox Mode
 */
export class SandboxUIManager {
  private manager: SandboxModeManager;
  private modeSelectionOverlay: HTMLElement | null = null;
  private sandboxOverlay: HTMLElement | null = null;

  // UI Callbacks
  public onModeStart?: () => void;
  public onBack?: () => void;

  constructor(manager: SandboxModeManager) {
    this.manager = manager;
  }

  /**
   * Initialize UI elements and event listeners
   */
  initialize(): void {
    this.modeSelectionOverlay = document.getElementById('mode-selection-overlay');
    this.sandboxOverlay = document.getElementById('sandbox-overlay');

    this.setupModeSelectionListeners();
    this.setupSandboxListeners();

    logger.debug('SandboxUIManager initialized');
  }

  /**
   * Setup mode selection screen listeners
   */
  private setupModeSelectionListeners(): void {
    const sandboxCard = document.querySelector('.mode-card[data-mode="sandbox"]');
    if (sandboxCard) {
      // Remove disabled state (Phase 7 enables Sandbox Mode)
      sandboxCard.classList.remove('disabled');
      sandboxCard.classList.add('available');

      // Update button
      const button = sandboxCard.querySelector('.mode-card-button');
      if (button) {
        (button as HTMLButtonElement).disabled = false;
        button.textContent = 'Start Sandbox';
      }

      sandboxCard.addEventListener('click', () => {
        if (!sandboxCard.classList.contains('disabled')) {
          this.showSandboxMode();
        }
      });
    }
  }

  /**
   * Setup sandbox mode listeners
   */
  private setupSandboxListeners(): void {
    // Back button
    const backButton = document.getElementById('sandbox-back-button');
    if (backButton) {
      backButton.addEventListener('click', () => this.showModeSelection());
    }

    // Clear board button
    const clearButton = document.getElementById('sandbox-clear-board');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.handleClearBoard());
    }

    // Analyze button
    const analyzeButton = document.getElementById('sandbox-analyze-button');
    if (analyzeButton) {
      analyzeButton.addEventListener('click', () => this.handleAnalyze());
    }

    // Color to move toggle
    const colorToggle = document.getElementById('sandbox-color-toggle');
    if (colorToggle) {
      colorToggle.addEventListener('click', () => {
        this.manager.toggleColorToMove();
        this.updateColorToggle();
      });
    }

    // FEN input
    const fenInput = document.getElementById('sandbox-fen-input') as HTMLInputElement;
    const fenLoadButton = document.getElementById('sandbox-fen-load');
    if (fenInput && fenLoadButton) {
      fenLoadButton.addEventListener('click', () => {
        const fen = fenInput.value.trim();
        if (fen) {
          if (!this.manager.loadFen(fen)) {
            this.showNotification('Invalid FEN notation', 'error');
          }
        }
      });
    }

    // FEN copy button
    const fenCopyButton = document.getElementById('sandbox-fen-copy');
    if (fenCopyButton) {
      fenCopyButton.addEventListener('click', () => {
        const fen = this.manager.getFen();
        navigator.clipboard.writeText(fen).then(() => {
          fenCopyButton.textContent = 'Copied!';
          setTimeout(() => {
            fenCopyButton.textContent = 'Copy';
          }, 1500);
        });
      });
    }

    // Position templates
    const templateButtons = document.querySelectorAll('[data-template]');
    templateButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const templateKey = button.getAttribute('data-template') as keyof typeof POSITION_TEMPLATES;
        if (templateKey && POSITION_TEMPLATES[templateKey]) {
          this.manager.loadTemplate(templateKey);
        }
      });
    });

    // Piece palette
    this.setupPiecePalette();
  }

  /**
   * Setup piece palette for placing pieces
   */
  private setupPiecePalette(): void {
    const palette = document.getElementById('sandbox-piece-palette');
    if (!palette) return;

    const pieces: Array<{ type: PieceType; color: PieceColor }> = [
      { type: 'K', color: 'w' },
      { type: 'Q', color: 'w' },
      { type: 'R', color: 'w' },
      { type: 'B', color: 'w' },
      { type: 'N', color: 'w' },
      { type: 'P', color: 'w' },
      { type: 'K', color: 'b' },
      { type: 'Q', color: 'b' },
      { type: 'R', color: 'b' },
      { type: 'B', color: 'b' },
      { type: 'N', color: 'b' },
      { type: 'P', color: 'b' },
    ];

    palette.innerHTML = '';

    pieces.forEach((piece) => {
      const button = document.createElement('button');
      button.className = 'palette-piece';
      button.dataset.pieceType = piece.type;
      button.dataset.pieceColor = piece.color;

      const img = document.createElement('img');
      img.src = `/assets/pieces/${piece.color}${piece.type}.svg`;
      img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`;
      img.draggable = true;

      // Drag from palette
      img.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('pieceType', piece.type);
        e.dataTransfer?.setData('pieceColor', piece.color);
        e.dataTransfer?.setData('fromPalette', 'true');
      });

      button.appendChild(img);

      // Click to select for placement
      button.addEventListener('click', () => {
        this.manager.selectPalettePiece(piece);
        this.updatePaletteSelection(piece);
      });

      palette.appendChild(button);
    });
  }

  /**
   * Update palette selection UI
   */
  private updatePaletteSelection(selected: EditorPiece | null): void {
    const paletteButtons = document.querySelectorAll('.palette-piece');
    paletteButtons.forEach((button) => {
      const btn = button as HTMLElement;
      const type = btn.dataset.pieceType;
      const color = btn.dataset.pieceColor;

      if (selected === null) {
        // No piece selected - deselect all
        btn.classList.remove('selected');
      } else {
        btn.classList.toggle('selected', type === selected.type && color === selected.color);
      }
    });
  }

  /**
   * Deselect palette piece (public method for external use)
   */
  deselectPalettePiece(): void {
    this.manager.selectPalettePiece(null);
    this.updatePaletteSelection(null);
  }

  /**
   * Update color toggle display
   */
  private updateColorToggle(): void {
    const toggle = document.getElementById('sandbox-color-toggle');
    if (toggle) {
      const color = this.manager.getColorToMove();
      toggle.textContent = color === 'w' ? '⚪ White to move' : '⚫ Black to move';
      toggle.className = `color-toggle ${color === 'w' ? 'white' : 'black'}`;
    }
  }

  /**
   * Update FEN display
   */
  updateFenDisplay(): void {
    const fenInput = document.getElementById('sandbox-fen-input') as HTMLInputElement;
    if (fenInput) {
      fenInput.value = this.manager.getFen();
    }
  }

  /**
   * Handle clear board action
   */
  private handleClearBoard(): void {
    // Show confirmation dialog
    const dialog = document.getElementById('confirm-dialog-overlay');
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-yes');
    const cancelBtn = document.getElementById('confirm-cancel');

    if (dialog && title && message && confirmBtn && cancelBtn) {
      title.textContent = 'Clear Board';
      message.textContent = 'Remove all pieces from the board?';
      dialog.classList.remove('hidden');

      const handleConfirm = () => {
        this.manager.clearBoard();
        dialog.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
      };

      const handleCancel = () => {
        dialog.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
    } else {
      // No confirmation dialog, just clear
      this.manager.clearBoard();
    }
  }

  /**
   * Handle analyze action
   */
  private async handleAnalyze(): Promise<void> {
    const validation = this.manager.getValidation();
    if (!validation.isValid) {
      this.showNotification('Invalid position: ' + validation.errors.join(', '), 'error');
      return;
    }

    await this.manager.analyzePosition();
  }

  /**
   * Show sandbox mode
   */
  showSandboxMode(): void {
    this.modeSelectionOverlay?.classList.add('hidden');
    this.sandboxOverlay?.classList.remove('hidden');

    this.manager.start();
    this.updateColorToggle();
    this.updateFenDisplay();

    this.onModeStart?.();
  }

  /**
   * Show mode selection screen
   */
  showModeSelection(): void {
    this.sandboxOverlay?.classList.add('hidden');
    this.modeSelectionOverlay?.classList.remove('hidden');

    this.manager.stop();
    this.onBack?.();
  }

  /**
   * Show sandbox overlay
   */
  show(): void {
    this.sandboxOverlay?.classList.remove('hidden');
    this.modeSelectionOverlay?.classList.add('hidden');
  }

  /**
   * Hide all overlays
   */
  hide(): void {
    this.sandboxOverlay?.classList.add('hidden');
    this.modeSelectionOverlay?.classList.add('hidden');
  }

  /**
   * Show notification toast
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `export-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <span class="notification-message">${message}</span>
    `;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

/**
 * Create and initialize sandbox mode
 */
export function createSandboxMode(): {
  manager: SandboxModeManager;
  ui: SandboxUIManager;
} {
  const manager = new SandboxModeManager();
  const ui = new SandboxUIManager(manager);
  return { manager, ui };
}

export default SandboxModeManager;
