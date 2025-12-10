/**
 * Type Guards
 *
 * Runtime type validation functions for ensuring type safety
 * when dealing with external input or unknown data.
 */

import type { BotPersonality, DifficultyPreset, AIPlayMode } from './bot-types';

/**
 * Valid bot personality values
 */
const BOT_PERSONALITIES: readonly BotPersonality[] = [
  'sensei',
  'student',
  'club_player',
  'tactician',
  'blunder_prone',
] as const;

/**
 * Valid difficulty preset values
 */
const DIFFICULTY_PRESETS: readonly DifficultyPreset[] = [
  'beginner',
  'intermediate',
  'advanced',
  'master',
] as const;

/**
 * Valid AI play mode values
 */
const AI_PLAY_MODES: readonly AIPlayMode[] = ['training', 'punishing'] as const;

/**
 * Valid game mode values
 */
const GAME_MODES = ['training', 'exam', 'sandbox', 'analysis'] as const;
export type GameMode = (typeof GAME_MODES)[number];

/**
 * Checks if a value is a valid BotPersonality.
 *
 * @param value - Value to check
 * @returns true if value is a valid BotPersonality
 *
 * @example
 * ```typescript
 * const personality = getUserInput();
 * if (isValidBotPersonality(personality)) {
 *   configureBot({ personality }); // type-safe
 * }
 * ```
 */
export function isValidBotPersonality(value: unknown): value is BotPersonality {
  return typeof value === 'string' && BOT_PERSONALITIES.includes(value as BotPersonality);
}

/**
 * Checks if a value is a valid DifficultyPreset.
 *
 * @param value - Value to check
 * @returns true if value is a valid DifficultyPreset
 */
export function isValidDifficultyPreset(value: unknown): value is DifficultyPreset {
  return typeof value === 'string' && DIFFICULTY_PRESETS.includes(value as DifficultyPreset);
}

/**
 * Checks if a value is a valid AIPlayMode.
 *
 * @param value - Value to check
 * @returns true if value is a valid AIPlayMode
 */
export function isValidAIPlayMode(value: unknown): value is AIPlayMode {
  return typeof value === 'string' && AI_PLAY_MODES.includes(value as AIPlayMode);
}

/**
 * Checks if a value is a valid GameMode.
 *
 * @param value - Value to check
 * @returns true if value is a valid GameMode
 */
export function isValidGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && GAME_MODES.includes(value as GameMode);
}

/**
 * Checks if a value is a valid Elo rating (within reasonable bounds).
 *
 * @param value - Value to check
 * @returns true if value is a valid Elo rating
 */
export function isValidEloRating(value: unknown): value is number {
  return typeof value === 'number' && value >= 100 && value <= 3500 && Number.isInteger(value);
}

/**
 * Checks if a value is a valid FEN string (basic format check).
 * Note: This does not validate the chess position itself, just the format.
 *
 * @param value - Value to check
 * @returns true if value appears to be a valid FEN string
 */
export function isValidFenFormat(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const parts = value.split(' ');
  if (parts.length !== 6) return false;

  // Check piece placement has 8 ranks
  const ranks = parts[0].split('/');
  if (ranks.length !== 8) return false;

  // Check active color
  if (parts[1] !== 'w' && parts[1] !== 'b') return false;

  // Check castling availability (can be '-' or combination of KQkq)
  if (!/^(-|[KQkq]+)$/.test(parts[2])) return false;

  // Check en passant (can be '-' or a square like 'e3')
  if (!/^(-|[a-h][36])$/.test(parts[3])) return false;

  // Check halfmove and fullmove are non-negative integers
  if (!/^\d+$/.test(parts[4]) || !/^\d+$/.test(parts[5])) return false;

  return true;
}

/**
 * Checks if a value is a non-empty string.
 *
 * @param value - Value to check
 * @returns true if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a value is a positive integer.
 *
 * @param value - Value to check
 * @returns true if value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Checks if a value is a non-negative integer.
 *
 * @param value - Value to check
 * @returns true if value is a non-negative integer (0 or positive)
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
