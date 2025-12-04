/**
 * Game State Types
 *
 * Defines the game state management for Training Mode and other game modes.
 * Handles mode selection, game initialization, and state transitions.
 *
 * @see source-docs/game-modes.md - "Training Mode"
 * @see source-docs/game-modes.md - "Game Mode Comparison Table"
 */

import type { BotPersonality, DifficultyPreset, AIPlayMode } from './bot-types';

/**
 * Available game modes
 * Per game-modes.md: Three primary game modes
 */
export type GameMode = 'training' | 'exam' | 'sandbox';

/**
 * Player color selection
 */
export type PlayerColor = 'white' | 'black' | 'random';

/**
 * Current game phase
 */
export type GamePhase =
  | 'menu' // Main menu / mode selection
  | 'setup' // Bot/color selection
  | 'playing' // Game in progress
  | 'ended' // Game over
  | 'analysis'; // Post-game analysis

/**
 * Training Mode settings
 * Per game-modes.md: Training Mode configuration
 */
export interface TrainingModeSettings {
  /** Selected bot personality */
  botPersonality: BotPersonality;
  /** Difficulty preset (optional, overrides personality defaults) */
  difficultyPreset?: DifficultyPreset;
  /** Custom Elo rating (optional, overrides personality defaults) */
  customElo?: number;
  /** AI play mode */
  aiPlayMode: AIPlayMode;
  /** Whether guidance is enabled */
  guidanceEnabled: boolean;
  /** Player's chosen color */
  playerColor: PlayerColor;
  /** Whether time delays are enabled for bot */
  useTimeDelays: boolean;
}

/**
 * Default Training Mode settings
 */
export const DEFAULT_TRAINING_SETTINGS: TrainingModeSettings = {
  botPersonality: 'club_player',
  aiPlayMode: 'training',
  guidanceEnabled: true,
  playerColor: 'white',
  useTimeDelays: true,
};

/**
 * Current game state
 */
export interface GameState {
  /** Current game mode */
  mode: GameMode | null;
  /** Current game phase */
  phase: GamePhase;
  /** Training mode settings (if mode is 'training') */
  trainingSettings: TrainingModeSettings;
  /** Resolved player color (after random selection) */
  resolvedPlayerColor: 'white' | 'black';
  /** Whether player is playing as white */
  isPlayerWhite: boolean;
  /** Whether it's the player's turn */
  isPlayerTurn: boolean;
  /** Whether the bot is thinking */
  isBotThinking: boolean;
  /** Current position FEN */
  currentFen: string;
  /** Move history (UCI format) */
  moveHistory: string[];
}

/**
 * Starting position FEN
 */
export const STARTPOS_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Initial game state
 */
export const INITIAL_GAME_STATE: GameState = {
  mode: null,
  phase: 'menu',
  trainingSettings: DEFAULT_TRAINING_SETTINGS,
  resolvedPlayerColor: 'white',
  isPlayerWhite: true,
  isPlayerTurn: true,
  isBotThinking: false,
  currentFen: STARTPOS_FEN,
  moveHistory: [],
};

/**
 * Game mode descriptions for UI
 * Per game-modes.md: Mode descriptions
 */
export const GAME_MODE_INFO: Record<
  GameMode,
  {
    name: string;
    description: string;
    features: string[];
    available: boolean;
  }
> = {
  training: {
    name: 'Training Mode',
    description: 'Practice with real-time guidance and hints.',
    features: [
      'Real-time best-move suggestions',
      'Color-coded move highlighting',
      'Adjustable bot difficulty',
      'No performance tracking',
    ],
    available: true,
  },
  exam: {
    name: 'Exam Mode',
    description: 'Test your skills without assistance.',
    features: [
      'No hints or guidance',
      'Full performance tracking',
      'Post-game analysis',
      'Progress metrics saved',
    ],
    available: false, // Phase 4
  },
  sandbox: {
    name: 'Sandbox Mode',
    description: 'Free play and experimentation.',
    features: [
      'Play against yourself',
      'Set up custom positions',
      'Test variations',
      'No restrictions',
    ],
    available: false, // Phase 5
  },
};

/**
 * Resolve player color from selection
 */
export function resolvePlayerColor(selection: PlayerColor): 'white' | 'black' {
  if (selection === 'random') {
    return Math.random() < 0.5 ? 'white' : 'black';
  }
  return selection;
}

/**
 * Determine if it's the player's turn based on position
 */
export function isPlayersTurn(fen: string, isPlayerWhite: boolean): boolean {
  const fenParts = fen.split(' ');
  const activeColor = fenParts[1];
  const isWhiteToMove = activeColor === 'w';
  return isWhiteToMove === isPlayerWhite;
}
