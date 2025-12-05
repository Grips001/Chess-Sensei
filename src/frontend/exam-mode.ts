/**
 * Exam Mode Manager
 *
 * Handles Exam Mode game flow with full metric tracking and no guidance.
 * Unlike Training Mode, Exam Mode:
 * - Disables all guidance (no best-move hints)
 * - Records complete game history
 * - Tracks all metrics for post-game analysis
 *
 * @see source-docs/game-modes.md - "Exam Mode"
 * @see source-docs/tracked-metrics.md - Complete metrics reference
 * @see source-docs/post-game-analysis.md - Analysis pipeline
 */

import * as buntralino from 'buntralino-client';
import type { BotPersonality, DifficultyPreset, AIPlayMode } from '../shared/bot-types';
import { BOT_PERSONALITIES } from '../shared/bot-types';
import type { PlayerColor } from '../shared/game-state';
import { resolvePlayerColor } from '../shared/game-state';
import { IPC_METHODS } from '../shared/ipc-types';
import type { SuccessResponse, ErrorResponse, BotMoveResponse } from '../shared/ipc-types';

/**
 * Bot icons for display
 */
const BOT_ICONS: Record<BotPersonality, string> = {
  sensei: '🎓',
  student: '📚',
  club_player: '♟️',
  tactician: '⚔️',
  blunder_prone: '🎲',
};

/**
 * Individual move record for Exam Mode
 * Per data-storage.md: Complete move tracking
 */
export interface ExamMoveRecord {
  /** Move number (1-indexed) */
  moveNumber: number;
  /** Color that made the move */
  color: 'white' | 'black';
  /** Move in SAN notation */
  san: string;
  /** Move in UCI notation */
  uci: string;
  /** Position FEN after move */
  fen: string;
  /** Unix timestamp when move was made */
  timestamp: number;
  /** Time spent on this move (milliseconds) */
  timeSpent: number;
}

/**
 * Exam Mode game record
 * Per data-storage.md: Complete game data format
 */
export interface ExamGameRecord {
  /** Unique game ID */
  gameId: string;
  /** Data format version */
  version: string;
  /** Game start timestamp (ISO 8601) */
  timestamp: string;
  /** Game mode (always 'exam') */
  mode: 'exam';

  /** Game metadata */
  metadata: {
    /** Player's color */
    playerColor: 'white' | 'black';
    /** Bot opponent personality */
    botPersonality: string;
    /** Bot's Elo rating */
    botElo: number;
    /** Detected opening name */
    opening: string;
    /** Game result ('1-0', '0-1', '1/2-1/2') */
    result: string;
    /** How the game ended */
    termination: 'checkmate' | 'stalemate' | 'resignation' | 'draw' | 'timeout';
    /** Total game duration in seconds */
    duration: number;
    /** Total number of moves */
    totalMoves: number;
  };

  /** Complete move history */
  moves: ExamMoveRecord[];

  /** PGN representation */
  pgn: string;
}

/**
 * Exam Mode configuration
 */
export interface ExamConfig {
  botPersonality: BotPersonality;
  difficultyPreset: DifficultyPreset;
  playerColor: PlayerColor;
  useTimeDelays: boolean;
}

/**
 * Default exam configuration
 */
export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  botPersonality: 'club_player',
  difficultyPreset: 'intermediate',
  playerColor: 'white',
  useTimeDelays: true,
};

/**
 * Exam Mode state
 */
export interface ExamState {
  isActive: boolean;
  config: ExamConfig;
  resolvedPlayerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  isBotThinking: boolean;

  /** Game recording state */
  gameId: string | null;
  gameStartTime: number | null;
  moves: ExamMoveRecord[];
  lastMoveTime: number | null;
}

/**
 * Generate a UUID for game identification
 */
function generateGameId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Exam Mode Manager class
 *
 * Unlike TrainingModeManager, this class:
 * - NEVER enables guidance
 * - Records all moves with timestamps
 * - Tracks time spent per move
 * - Generates complete game records for analysis
 */
export class ExamModeManager {
  private state: ExamState;
  private config: ExamConfig;

  // Callbacks for UI updates
  public onBotMoveStart?: () => void;
  public onBotMoveEnd?: (move: string) => void;
  public onBotMoveError?: (error: string) => void;
  public onTurnChange?: (isPlayerTurn: boolean) => void;
  public onGameEnd?: (record: ExamGameRecord) => void;

  constructor() {
    this.config = { ...DEFAULT_EXAM_CONFIG };
    this.state = {
      isActive: false,
      config: this.config,
      resolvedPlayerColor: 'white',
      isPlayerTurn: true,
      isBotThinking: false,
      gameId: null,
      gameStartTime: null,
      moves: [],
      lastMoveTime: null,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExamConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ExamConfig>): void {
    this.config = { ...this.config, ...config };
    this.state.config = this.config;
  }

  /**
   * Get current state
   */
  getState(): ExamState {
    return { ...this.state };
  }

  /**
   * Check if Exam Mode is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Check if it's the player's turn
   */
  isPlayerTurn(): boolean {
    return this.state.isPlayerTurn;
  }

  /**
   * Check if bot is currently thinking
   */
  isBotThinking(): boolean {
    return this.state.isBotThinking;
  }

  /**
   * Check if guidance is enabled (ALWAYS FALSE for Exam Mode)
   * Per game-modes.md: "Trainer is completely disabled"
   */
  isGuidanceEnabled(): boolean {
    return false;
  }

  /**
   * Start Exam Mode with current configuration
   * Per game-modes.md: Exam Mode setup flow
   */
  async start(): Promise<void> {
    // Resolve player color
    this.state.resolvedPlayerColor = resolvePlayerColor(this.config.playerColor);
    this.state.isPlayerTurn = this.state.resolvedPlayerColor === 'white';
    this.state.isActive = true;
    this.state.isBotThinking = false;

    // Initialize game recording
    this.state.gameId = generateGameId();
    this.state.gameStartTime = Date.now();
    this.state.moves = [];
    this.state.lastMoveTime = this.state.gameStartTime;

    // Configure the bot on the backend (punishing mode for Exam)
    await this.configureBot();

    console.log(
      `Exam Mode started: Playing as ${this.state.resolvedPlayerColor}, ` +
        `opponent: ${this.config.botPersonality}, ` +
        `gameId: ${this.state.gameId}`
    );
  }

  /**
   * Stop Exam Mode
   */
  stop(): void {
    this.state.isActive = false;
    this.state.isBotThinking = false;
  }

  /**
   * Configure the bot on the backend
   * Exam Mode uses 'punishing' play mode for realistic testing
   */
  private async configureBot(): Promise<void> {
    try {
      const response = (await buntralino.run(IPC_METHODS.CONFIGURE_BOT, {
        personality: this.config.botPersonality,
        difficultyPreset: this.config.difficultyPreset,
        playMode: 'punishing' as AIPlayMode, // Exam Mode uses punishing for real testing
        useTimeDelays: this.config.useTimeDelays,
      })) as SuccessResponse | ErrorResponse;

      if (!response.success) {
        console.error('Failed to configure bot:', (response as ErrorResponse).error);
      }
    } catch (error) {
      console.error('Error configuring bot:', error);
    }
  }

  /**
   * Record a move
   * Per data-storage.md: Complete move recording
   */
  recordMove(san: string, uci: string, fen: string, color: 'white' | 'black'): void {
    if (!this.state.isActive || !this.state.lastMoveTime) return;

    const now = Date.now();
    const timeSpent = now - this.state.lastMoveTime;

    // Calculate move number (each complete turn increments by 1)
    const moveNumber = Math.floor(this.state.moves.length / 2) + 1;

    const moveRecord: ExamMoveRecord = {
      moveNumber,
      color,
      san,
      uci,
      fen,
      timestamp: now,
      timeSpent,
    };

    this.state.moves.push(moveRecord);
    this.state.lastMoveTime = now;

    console.log(`Exam move recorded: ${moveNumber}. ${san} (${timeSpent}ms)`);
  }

  /**
   * Handle position change (after a move is made)
   * Returns whether the bot should make a move
   */
  updatePosition(fen: string): boolean {
    if (!this.state.isActive) return false;

    // Determine whose turn it is from the FEN
    const fenParts = fen.split(' ');
    const activeColor = fenParts[1];
    const isWhiteToMove = activeColor === 'w';

    // Check if it's player's turn
    const isPlayerWhite = this.state.resolvedPlayerColor === 'white';
    this.state.isPlayerTurn = isWhiteToMove === isPlayerWhite;

    this.onTurnChange?.(this.state.isPlayerTurn);

    // Return true if bot should move
    return !this.state.isPlayerTurn;
  }

  /**
   * Request a move from the bot
   */
  async requestBotMove(fen: string, moves?: string[]): Promise<string | null> {
    if (!this.state.isActive || this.state.isPlayerTurn) {
      return null;
    }

    this.state.isBotThinking = true;
    this.onBotMoveStart?.();

    try {
      const response = (await buntralino.run(IPC_METHODS.GET_BOT_MOVE, {
        fen,
        moves,
      })) as BotMoveResponse | ErrorResponse;

      if (!response.success) {
        throw new Error((response as ErrorResponse).error || 'Failed to get bot move');
      }

      const move = (response as BotMoveResponse).move;

      this.state.isBotThinking = false;
      this.onBotMoveEnd?.(move);

      return move;
    } catch (error) {
      this.state.isBotThinking = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.onBotMoveError?.(errorMessage);
      console.error('Error getting bot move:', error);
      return null;
    }
  }

  /**
   * Get the resolved player color (after random selection)
   */
  getPlayerColor(): 'white' | 'black' {
    return this.state.resolvedPlayerColor;
  }

  /**
   * Check if player is white
   */
  isPlayerWhite(): boolean {
    return this.state.resolvedPlayerColor === 'white';
  }

  /**
   * Get recorded moves
   */
  getMoves(): ExamMoveRecord[] {
    return [...this.state.moves];
  }

  /**
   * Get game ID
   */
  getGameId(): string | null {
    return this.state.gameId;
  }

  /**
   * Get game duration in seconds
   */
  getGameDuration(): number {
    if (!this.state.gameStartTime) return 0;
    return Math.floor((Date.now() - this.state.gameStartTime) / 1000);
  }

  /**
   * Generate complete game record for saving
   * Per data-storage.md: Game data format
   */
  generateGameRecord(
    result: string,
    termination: ExamGameRecord['metadata']['termination'],
    pgn: string,
    opening: string = 'Unknown Opening'
  ): ExamGameRecord {
    const botProfile = BOT_PERSONALITIES[this.config.botPersonality];

    return {
      gameId: this.state.gameId || generateGameId(),
      version: '1.0',
      timestamp: new Date(this.state.gameStartTime || Date.now()).toISOString(),
      mode: 'exam',

      metadata: {
        playerColor: this.state.resolvedPlayerColor,
        botPersonality: botProfile.name,
        botElo: botProfile.targetElo,
        opening,
        result,
        termination,
        duration: this.getGameDuration(),
        totalMoves: this.state.moves.length,
      },

      moves: this.state.moves,
      pgn,
    };
  }
}

/**
 * UI Manager for Exam Mode Setup screen
 */
export class ExamUIManager {
  private manager: ExamModeManager;
  private modeSelectionOverlay: HTMLElement | null = null;
  private examSetupOverlay: HTMLElement | null = null;

  // UI callbacks
  public onGameStart?: (config: ExamConfig, playerColor: 'white' | 'black') => void;
  public onBack?: () => void;

  constructor(manager: ExamModeManager) {
    this.manager = manager;
  }

  /**
   * Initialize UI elements and event listeners
   */
  initialize(): void {
    this.modeSelectionOverlay = document.getElementById('mode-selection-overlay');
    this.examSetupOverlay = document.getElementById('exam-setup-overlay');

    this.setupModeSelectionListeners();
    this.setupExamSetupListeners();
    this.populateBotCards();
  }

  /**
   * Setup mode selection screen listeners for Exam Mode
   */
  private setupModeSelectionListeners(): void {
    // Exam mode card click
    const examCard = document.querySelector('.mode-card[data-mode="exam"]');
    if (examCard) {
      examCard.addEventListener('click', () => {
        // Only respond if Exam Mode is enabled
        if (!examCard.classList.contains('disabled')) {
          this.showExamSetup();
        }
      });
    }
  }

  /**
   * Setup exam setup screen listeners
   */
  private setupExamSetupListeners(): void {
    // Back button
    const backButton = document.getElementById('exam-setup-back-button');
    if (backButton) {
      backButton.addEventListener('click', () => this.showModeSelection());
    }

    // Bot selection
    const botGrid = document.getElementById('exam-bot-selection-grid');
    if (botGrid) {
      botGrid.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.bot-card');
        if (card) {
          const personality = card.getAttribute('data-personality') as BotPersonality;
          this.selectBot(personality);
        }
      });
    }

    // Difficulty selection
    const difficultyButtons = document.querySelectorAll('#exam-setup-overlay .difficulty-button');
    difficultyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.getAttribute('data-preset') as DifficultyPreset;
        this.selectDifficulty(preset);
      });
    });

    // Color selection
    const colorButtons = document.querySelectorAll('#exam-setup-overlay .color-button');
    colorButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-color') as PlayerColor;
        this.selectColor(color);
      });
    });

    // Options
    const timeDelaysCheckbox = document.getElementById(
      'exam-time-delays-enabled'
    ) as HTMLInputElement;
    if (timeDelaysCheckbox) {
      timeDelaysCheckbox.addEventListener('change', () => {
        this.manager.setConfig({ useTimeDelays: timeDelaysCheckbox.checked });
      });
    }

    // Start game button
    const startButton = document.getElementById('start-exam-button');
    if (startButton) {
      startButton.addEventListener('click', () => this.startGame());
    }
  }

  /**
   * Populate bot selection cards
   */
  private populateBotCards(): void {
    const grid = document.getElementById('exam-bot-selection-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const personalities = Object.keys(BOT_PERSONALITIES) as BotPersonality[];
    const currentConfig = this.manager.getConfig();

    personalities.forEach((personality) => {
      const profile = BOT_PERSONALITIES[personality];
      const isSelected = personality === currentConfig.botPersonality;

      const card = document.createElement('div');
      card.className = `bot-card${isSelected ? ' selected' : ''}`;
      card.setAttribute('data-personality', personality);
      card.innerHTML = `
        <div class="bot-card-icon">${BOT_ICONS[personality]}</div>
        <h4 class="bot-card-name">${profile.name}</h4>
        <p class="bot-card-elo">~${profile.targetElo} Elo</p>
      `;

      grid.appendChild(card);
    });
  }

  /**
   * Select a bot personality
   */
  private selectBot(personality: BotPersonality): void {
    this.manager.setConfig({ botPersonality: personality });

    // Update UI
    const cards = document.querySelectorAll('#exam-bot-selection-grid .bot-card');
    cards.forEach((card) => {
      const cardPersonality = card.getAttribute('data-personality');
      card.classList.toggle('selected', cardPersonality === personality);
    });
  }

  /**
   * Select a difficulty preset
   */
  private selectDifficulty(preset: DifficultyPreset): void {
    this.manager.setConfig({ difficultyPreset: preset });

    // Update UI
    const buttons = document.querySelectorAll('#exam-setup-overlay .difficulty-button');
    buttons.forEach((button) => {
      const buttonPreset = button.getAttribute('data-preset');
      button.classList.toggle('selected', buttonPreset === preset);
    });
  }

  /**
   * Select player color
   */
  private selectColor(color: PlayerColor): void {
    this.manager.setConfig({ playerColor: color });

    // Update UI
    const buttons = document.querySelectorAll('#exam-setup-overlay .color-button');
    buttons.forEach((button) => {
      const buttonColor = button.getAttribute('data-color');
      button.classList.toggle('selected', buttonColor === color);
    });
  }

  /**
   * Show mode selection screen
   */
  showModeSelection(): void {
    this.examSetupOverlay?.classList.add('hidden');
    this.modeSelectionOverlay?.classList.remove('hidden');
    this.onBack?.();
  }

  /**
   * Show exam setup screen
   */
  showExamSetup(): void {
    this.modeSelectionOverlay?.classList.add('hidden');
    this.examSetupOverlay?.classList.remove('hidden');
  }

  /**
   * Hide all overlays and start the game
   */
  async startGame(): Promise<void> {
    await this.manager.start();

    this.modeSelectionOverlay?.classList.add('hidden');
    this.examSetupOverlay?.classList.add('hidden');

    const config = this.manager.getConfig();
    const playerColor = this.manager.getPlayerColor();

    this.onGameStart?.(config, playerColor);
  }

  /**
   * Show mode selection (reset to initial state)
   */
  show(): void {
    this.modeSelectionOverlay?.classList.remove('hidden');
    this.examSetupOverlay?.classList.add('hidden');
  }

  /**
   * Hide all overlays
   */
  hide(): void {
    this.modeSelectionOverlay?.classList.add('hidden');
    this.examSetupOverlay?.classList.add('hidden');
  }
}

/**
 * Create and initialize exam mode
 */
export function createExamMode(): {
  manager: ExamModeManager;
  ui: ExamUIManager;
} {
  const manager = new ExamModeManager();
  const ui = new ExamUIManager(manager);
  return { manager, ui };
}

export default ExamModeManager;
