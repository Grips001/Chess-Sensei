/**
 * Bot Types and Personalities
 *
 * Defines the AI opponent system including bot personalities,
 * difficulty levels, and behavioral profiles.
 *
 * @see source-docs/ai-engine.md - "Bot Personalities & Human-Like Play"
 * @see source-docs/ai-engine.md - "Difficulty & Strength Scaling"
 */

/**
 * Bot personality identifier
 * Per ai-engine.md: Example Bot Archetypes
 */
export type BotPersonality = 'sensei' | 'student' | 'club_player' | 'tactician' | 'blunder_prone';

/**
 * Preset difficulty mode
 * Per ai-engine.md: Preset Difficulty Modes
 */
export type DifficultyPreset = 'beginner' | 'intermediate' | 'advanced' | 'master';

/**
 * AI play mode
 * Per ai-engine.md: Training vs. Punishing Modes
 */
export type AIPlayMode = 'training' | 'punishing';

/**
 * Bot behavioral profile that modifies engine behavior
 * Per ai-engine.md: Core Behavior Controls
 */
export interface BotProfile {
  /** Personality identifier */
  personality: BotPersonality;
  /** Display name */
  name: string;
  /** Description of this bot's play style */
  description: string;
  /** Target Elo rating (800-2400+) */
  targetElo: number;
  /** Search depth limit (affects tactical foresight) */
  depthLimit: number;
  /** Move sampling window - select from top N candidates (1 = always best) */
  moveSamplingWindow: number;
  /** Evaluation noise in centipawns (controlled inaccuracies) */
  evaluationNoise: number;
  /** Probability of making a blunder (0-1) */
  blunderRate: number;
  /** Probability of making an inaccuracy (0-1) */
  inaccuracyRate: number;
  /** Style bias: positive = aggressive, negative = defensive */
  styleBias: number;
  /** Minimum thinking time in milliseconds */
  minThinkTime: number;
  /** Maximum thinking time in milliseconds */
  maxThinkTime: number;
}

/**
 * Bot configuration for a game
 */
export interface BotConfig {
  /** The bot's personality profile */
  profile: BotProfile;
  /** AI play mode (training or punishing) */
  playMode: AIPlayMode;
  /** Whether to use response time delays */
  useTimeDelays: boolean;
}

/**
 * Predefined bot personalities
 * Per ai-engine.md: Example Bot Archetypes
 */
export const BOT_PERSONALITIES: Record<BotPersonality, BotProfile> = {
  /**
   * Sensei - Near-optimal engine play
   * For serious training and post-game analysis
   */
  sensei: {
    personality: 'sensei',
    name: 'Sensei',
    description: 'Near-optimal play with low randomness. For serious training.',
    targetElo: 2400,
    depthLimit: 20,
    moveSamplingWindow: 1, // Always plays best move
    evaluationNoise: 0,
    blunderRate: 0,
    inaccuracyRate: 0.02,
    styleBias: 0, // Neutral style
    minThinkTime: 500,
    maxThinkTime: 3000,
  },

  /**
   * Student - Beginner-level play
   * Low depth, high randomness, prioritizes simple development
   */
  student: {
    personality: 'student',
    name: 'Student',
    description: 'Beginner-level play. Prioritizes simple development.',
    targetElo: 800,
    depthLimit: 4,
    moveSamplingWindow: 5, // Pick from top 5 moves
    evaluationNoise: 150, // High noise
    blunderRate: 0.15,
    inaccuracyRate: 0.25,
    styleBias: 0, // Neutral
    minThinkTime: 200,
    maxThinkTime: 1500,
  },

  /**
   * Club Player - Intermediate level
   * Moderate depth, occasional tactical oversights
   */
  club_player: {
    personality: 'club_player',
    name: 'Club Player',
    description: 'Moderate strength with occasional tactical oversights.',
    targetElo: 1600,
    depthLimit: 12,
    moveSamplingWindow: 3,
    evaluationNoise: 50,
    blunderRate: 0.05,
    inaccuracyRate: 0.12,
    styleBias: 0,
    minThinkTime: 300,
    maxThinkTime: 2500,
  },

  /**
   * Tactician - Aggressive, tactical player
   * Favors attacks over long-term positional safety
   */
  tactician: {
    personality: 'tactician',
    name: 'Tactician',
    description: 'Aggressive style. Favors attacks over positional safety.',
    targetElo: 1800,
    depthLimit: 14,
    moveSamplingWindow: 2,
    evaluationNoise: 30,
    blunderRate: 0.04,
    inaccuracyRate: 0.1,
    styleBias: 0.4, // Aggressive bias
    minThinkTime: 200,
    maxThinkTime: 2000,
  },

  /**
   * Blunder-Prone - Makes frequent mistakes
   * Useful for training conversion and punishment of errors
   */
  blunder_prone: {
    personality: 'blunder_prone',
    name: 'Blunder-Prone',
    description: 'Makes frequent mistakes. Good for practicing conversions.',
    targetElo: 1200,
    depthLimit: 8,
    moveSamplingWindow: 4,
    evaluationNoise: 100,
    blunderRate: 0.12,
    inaccuracyRate: 0.2,
    styleBias: 0,
    minThinkTime: 150,
    maxThinkTime: 1000,
  },
};

/**
 * Difficulty preset configurations
 * Per ai-engine.md: Preset Difficulty Modes
 */
export const DIFFICULTY_PRESETS: Record<DifficultyPreset, Partial<BotProfile>> = {
  /**
   * Beginner - Very low depth, high randomness, frequent small inaccuracies
   */
  beginner: {
    depthLimit: 4,
    moveSamplingWindow: 6,
    evaluationNoise: 200,
    blunderRate: 0.15,
    inaccuracyRate: 0.3,
    targetElo: 800,
  },

  /**
   * Intermediate - Moderate depth, selective randomness
   */
  intermediate: {
    depthLimit: 10,
    moveSamplingWindow: 3,
    evaluationNoise: 75,
    blunderRate: 0.06,
    inaccuracyRate: 0.15,
    targetElo: 1400,
  },

  /**
   * Advanced - High depth, low error rates
   */
  advanced: {
    depthLimit: 16,
    moveSamplingWindow: 2,
    evaluationNoise: 25,
    blunderRate: 0.02,
    inaccuracyRate: 0.06,
    targetElo: 2000,
  },

  /**
   * Master - Near-engine-perfect play, minimal randomness
   */
  master: {
    depthLimit: 20,
    moveSamplingWindow: 1,
    evaluationNoise: 10,
    blunderRate: 0.005,
    inaccuracyRate: 0.02,
    targetElo: 2400,
  },
};

/**
 * Create a bot profile with custom Elo rating
 * Maps Elo to engine parameters
 *
 * @param targetElo - Target Elo rating (800-2400)
 * @param basePersonality - Optional personality to base settings on
 */
export function createBotProfileFromElo(
  targetElo: number,
  basePersonality?: BotPersonality
): BotProfile {
  // Clamp Elo to valid range
  const elo = Math.max(800, Math.min(2400, targetElo));

  // Linear interpolation factor (0 at 800, 1 at 2400)
  const factor = (elo - 800) / 1600;

  // Calculate parameters based on Elo
  const depthLimit = Math.round(4 + factor * 16); // 4-20
  const moveSamplingWindow = Math.round(6 - factor * 5); // 6-1
  const evaluationNoise = Math.round(200 - factor * 190); // 200-10
  const blunderRate = 0.15 - factor * 0.145; // 0.15-0.005
  const inaccuracyRate = 0.3 - factor * 0.28; // 0.30-0.02

  // Get base profile if specified
  const base = basePersonality ? BOT_PERSONALITIES[basePersonality] : null;

  return {
    personality: basePersonality ?? 'club_player',
    name: base?.name ?? `Bot (${elo})`,
    description: base?.description ?? `Custom difficulty at ${elo} Elo`,
    targetElo: elo,
    depthLimit,
    moveSamplingWindow,
    evaluationNoise,
    blunderRate,
    inaccuracyRate,
    styleBias: base?.styleBias ?? 0,
    minThinkTime: base?.minThinkTime ?? 200,
    maxThinkTime: base?.maxThinkTime ?? 2000,
  };
}

/**
 * Apply a difficulty preset to a bot profile
 */
export function applyDifficultyPreset(profile: BotProfile, preset: DifficultyPreset): BotProfile {
  const presetConfig = DIFFICULTY_PRESETS[preset];
  return {
    ...profile,
    ...presetConfig,
  };
}

/**
 * Get all available bot personalities
 */
export function getAllBotPersonalities(): BotProfile[] {
  return Object.values(BOT_PERSONALITIES);
}

/**
 * Get a bot profile by personality
 */
export function getBotProfile(personality: BotPersonality): BotProfile {
  return BOT_PERSONALITIES[personality];
}
