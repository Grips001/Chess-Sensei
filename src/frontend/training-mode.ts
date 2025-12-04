/**
 * Training Mode Manager
 *
 * Handles Training Mode game flow, bot opponent integration,
 * and move guidance system for the frontend.
 *
 * @see source-docs/game-modes.md - "Training Mode"
 * @see source-docs/ai-engine.md - "Bot Personalities"
 * @see source-docs/move-guidance.md - "Best-Move Guidance System"
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
 * Training Mode configuration
 */
export interface TrainingConfig {
  botPersonality: BotPersonality;
  difficultyPreset: DifficultyPreset;
  playerColor: PlayerColor;
  guidanceEnabled: boolean;
  useTimeDelays: boolean;
}

/**
 * Default training configuration
 */
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  botPersonality: 'club_player',
  difficultyPreset: 'intermediate',
  playerColor: 'white',
  guidanceEnabled: true,
  useTimeDelays: true,
};

/**
 * Training Mode state
 */
export interface TrainingState {
  isActive: boolean;
  config: TrainingConfig;
  resolvedPlayerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  isBotThinking: boolean;
}

/**
 * Training Mode Manager class
 */
export class TrainingModeManager {
  private state: TrainingState;
  private config: TrainingConfig;

  // Callbacks for UI updates
  public onBotMoveStart?: () => void;
  public onBotMoveEnd?: (move: string) => void;
  public onBotMoveError?: (error: string) => void;
  public onTurnChange?: (isPlayerTurn: boolean) => void;

  constructor() {
    this.config = { ...DEFAULT_TRAINING_CONFIG };
    this.state = {
      isActive: false,
      config: this.config,
      resolvedPlayerColor: 'white',
      isPlayerTurn: true,
      isBotThinking: false,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): TrainingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TrainingConfig>): void {
    this.config = { ...this.config, ...config };
    this.state.config = this.config;
  }

  /**
   * Get current state
   */
  getState(): TrainingState {
    return { ...this.state };
  }

  /**
   * Check if Training Mode is active
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
   * Start Training Mode with current configuration
   */
  async start(): Promise<void> {
    // Resolve player color
    this.state.resolvedPlayerColor = resolvePlayerColor(this.config.playerColor);
    this.state.isPlayerTurn = this.state.resolvedPlayerColor === 'white';
    this.state.isActive = true;
    this.state.isBotThinking = false;

    // Configure the bot on the backend
    await this.configureBot();

    console.log(
      `Training Mode started: Playing as ${this.state.resolvedPlayerColor}, ` +
        `opponent: ${this.config.botPersonality}`
    );
  }

  /**
   * Stop Training Mode
   */
  stop(): void {
    this.state.isActive = false;
    this.state.isBotThinking = false;
  }

  /**
   * Configure the bot on the backend
   */
  private async configureBot(): Promise<void> {
    try {
      const response = (await buntralino.run(IPC_METHODS.CONFIGURE_BOT, {
        personality: this.config.botPersonality,
        difficultyPreset: this.config.difficultyPreset,
        playMode: 'training' as AIPlayMode,
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
}

/**
 * UI Manager for Mode Selection and Training Setup screens
 */
export class TrainingUIManager {
  private manager: TrainingModeManager;
  private modeSelectionOverlay: HTMLElement | null = null;
  private trainingSetupOverlay: HTMLElement | null = null;

  // UI callbacks
  public onGameStart?: (config: TrainingConfig, playerColor: 'white' | 'black') => void;
  public onBack?: () => void;

  constructor(manager: TrainingModeManager) {
    this.manager = manager;
  }

  /**
   * Initialize UI elements and event listeners
   */
  initialize(): void {
    this.modeSelectionOverlay = document.getElementById('mode-selection-overlay');
    this.trainingSetupOverlay = document.getElementById('training-setup-overlay');

    this.setupModeSelectionListeners();
    this.setupTrainingSetupListeners();
    this.populateBotCards();
  }

  /**
   * Setup mode selection screen listeners
   */
  private setupModeSelectionListeners(): void {
    // Training mode card click
    const trainingCard = document.querySelector('.mode-card[data-mode="training"]');
    if (trainingCard) {
      trainingCard.addEventListener('click', () => this.showTrainingSetup());
    }
  }

  /**
   * Setup training setup screen listeners
   */
  private setupTrainingSetupListeners(): void {
    // Back button
    const backButton = document.getElementById('setup-back-button');
    if (backButton) {
      backButton.addEventListener('click', () => this.showModeSelection());
    }

    // Bot selection
    const botGrid = document.getElementById('bot-selection-grid');
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
    const difficultyButtons = document.querySelectorAll('.difficulty-button');
    difficultyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.getAttribute('data-preset') as DifficultyPreset;
        this.selectDifficulty(preset);
      });
    });

    // Color selection
    const colorButtons = document.querySelectorAll('.color-button');
    colorButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const color = button.getAttribute('data-color') as PlayerColor;
        this.selectColor(color);
      });
    });

    // Options
    const guidanceCheckbox = document.getElementById('guidance-enabled') as HTMLInputElement;
    if (guidanceCheckbox) {
      guidanceCheckbox.addEventListener('change', () => {
        this.manager.setConfig({ guidanceEnabled: guidanceCheckbox.checked });
      });
    }

    const timeDelaysCheckbox = document.getElementById('time-delays-enabled') as HTMLInputElement;
    if (timeDelaysCheckbox) {
      timeDelaysCheckbox.addEventListener('change', () => {
        this.manager.setConfig({ useTimeDelays: timeDelaysCheckbox.checked });
      });
    }

    // Start game button
    const startButton = document.getElementById('start-training-button');
    if (startButton) {
      startButton.addEventListener('click', () => this.startGame());
    }
  }

  /**
   * Populate bot selection cards
   */
  private populateBotCards(): void {
    const grid = document.getElementById('bot-selection-grid');
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
    const cards = document.querySelectorAll('.bot-card');
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
    const buttons = document.querySelectorAll('.difficulty-button');
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
    const buttons = document.querySelectorAll('.color-button');
    buttons.forEach((button) => {
      const buttonColor = button.getAttribute('data-color');
      button.classList.toggle('selected', buttonColor === color);
    });
  }

  /**
   * Show mode selection screen
   */
  showModeSelection(): void {
    this.trainingSetupOverlay?.classList.add('hidden');
    this.modeSelectionOverlay?.classList.remove('hidden');
    this.onBack?.();
  }

  /**
   * Show training setup screen
   */
  showTrainingSetup(): void {
    this.modeSelectionOverlay?.classList.add('hidden');
    this.trainingSetupOverlay?.classList.remove('hidden');
  }

  /**
   * Hide all overlays and start the game
   */
  async startGame(): Promise<void> {
    await this.manager.start();

    this.modeSelectionOverlay?.classList.add('hidden');
    this.trainingSetupOverlay?.classList.add('hidden');

    const config = this.manager.getConfig();
    const playerColor = this.manager.getPlayerColor();

    this.onGameStart?.(config, playerColor);
  }

  /**
   * Show mode selection (reset to initial state)
   */
  show(): void {
    this.modeSelectionOverlay?.classList.remove('hidden');
    this.trainingSetupOverlay?.classList.add('hidden');
  }

  /**
   * Hide all overlays
   */
  hide(): void {
    this.modeSelectionOverlay?.classList.add('hidden');
    this.trainingSetupOverlay?.classList.add('hidden');
  }
}

/**
 * Create and initialize training mode
 */
export function createTrainingMode(): {
  manager: TrainingModeManager;
  ui: TrainingUIManager;
} {
  const manager = new TrainingModeManager();
  const ui = new TrainingUIManager(manager);
  return { manager, ui };
}

export default TrainingModeManager;
