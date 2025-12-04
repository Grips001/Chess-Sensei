/**
 * AI Opponent Module
 *
 * Handles bot move selection from the chess engine with human-like behavior.
 * Implements personality-based move selection, difficulty scaling, and timing.
 *
 * @see source-docs/ai-engine.md - "Bot Personalities & Human-Like Play"
 * @see source-docs/ai-engine.md - "Difficulty & Strength Scaling"
 */

import type { StockfishEngine } from '../engine/stockfish-engine';
import type { BestMove } from '../shared/engine-types';
import type { BotConfig, BotProfile, AIPlayMode } from '../shared/bot-types';
import { BOT_PERSONALITIES, createBotProfileFromElo } from '../shared/bot-types';

/**
 * Result of bot move selection
 */
export interface BotMoveResult {
  /** Selected move in UCI format */
  move: string;
  /** Engine evaluation of the move */
  score: number;
  /** Thinking time used (actual, for display) */
  thinkingTime: number;
  /** Whether the move was intentionally weakened */
  wasWeakened: boolean;
  /** Classification: best, good, inaccuracy, mistake, blunder */
  classification: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

/**
 * AI Opponent class managing bot behavior
 */
export class AIOpponent {
  private engine: StockfishEngine;
  private config: BotConfig;

  constructor(engine: StockfishEngine, config: BotConfig) {
    this.engine = engine;
    this.config = config;
  }

  /**
   * Update the bot configuration
   */
  setConfig(config: BotConfig): void {
    this.config = config;
  }

  /**
   * Get the current bot profile
   */
  getProfile(): BotProfile {
    return this.config.profile;
  }

  /**
   * Select a move for the bot to play
   *
   * @param fen - Current position in FEN notation
   * @param moves - Optional moves from position
   * @returns Selected move with metadata
   */
  async selectMove(fen: string, moves?: string[]): Promise<BotMoveResult> {
    const profile = this.config.profile;
    const startTime = Date.now();

    // Set position
    await this.engine.setPosition(fen, moves);

    // Get candidate moves from engine
    // Request more moves than sampling window to allow for randomization
    const candidateCount = Math.max(profile.moveSamplingWindow + 2, 5);
    const candidates = await this.engine.getBestMoves({
      depth: profile.depthLimit,
      count: candidateCount,
    });

    if (candidates.length === 0) {
      throw new Error('No legal moves available');
    }

    // Select a move based on bot personality
    const selectedMove = this.selectMoveFromCandidates(candidates);
    const endTime = Date.now();
    const actualThinkTime = endTime - startTime;

    // Determine classification
    const classification = this.classifySelection(candidates, selectedMove);

    // Calculate simulated thinking time
    let thinkingTime = actualThinkTime;
    if (this.config.useTimeDelays) {
      thinkingTime = this.calculateThinkingTime(actualThinkTime, classification);
    }

    return {
      move: selectedMove.move,
      score: selectedMove.score,
      thinkingTime,
      wasWeakened: selectedMove !== candidates[0],
      classification,
    };
  }

  /**
   * Select a move from candidate list based on bot personality
   */
  private selectMoveFromCandidates(candidates: BestMove[]): BestMove {
    const profile = this.config.profile;
    const playMode = this.config.playMode;

    // In punishing mode, always play the best move
    if (playMode === 'punishing' && profile.blunderRate < 0.05) {
      return candidates[0];
    }

    // Check for intentional blunder
    if (this.shouldMakeBlunder()) {
      // Pick a move outside the top candidates (if available)
      const blunderIndex = Math.min(
        Math.floor(Math.random() * 3) + profile.moveSamplingWindow,
        candidates.length - 1
      );
      return candidates[blunderIndex];
    }

    // Check for intentional inaccuracy
    if (this.shouldMakeInaccuracy()) {
      // Pick a slightly suboptimal move
      const inaccuracyIndex = Math.min(Math.floor(Math.random() * 2) + 1, candidates.length - 1);
      return candidates[inaccuracyIndex];
    }

    // Apply evaluation noise and select from sampling window
    const samplingWindow = Math.min(profile.moveSamplingWindow, candidates.length);

    if (samplingWindow === 1) {
      return candidates[0];
    }

    // Weight candidates based on evaluation with noise
    const weightedCandidates = candidates.slice(0, samplingWindow).map((move, index) => {
      // Apply evaluation noise
      const noise = (Math.random() - 0.5) * profile.evaluationNoise * 2;
      const adjustedScore = move.score + noise;

      // Apply style bias (aggressive bots prefer captures/checks)
      let styleFactor = 0;
      if (profile.styleBias > 0) {
        // Aggressive style - favor moves that increase tension
        // This is a simplified heuristic
        styleFactor = profile.styleBias * 20 * (samplingWindow - index);
      } else if (profile.styleBias < 0) {
        // Defensive style - favor consolidating moves
        styleFactor = profile.styleBias * 20 * index;
      }

      return {
        move,
        weight: adjustedScore + styleFactor,
      };
    });

    // Sort by adjusted weight and pick from top moves
    weightedCandidates.sort((a, b) => b.weight - a.weight);

    // Weighted random selection favoring higher weights
    const totalWeight = weightedCandidates.reduce((sum, _c, i) => {
      // Exponential decay for selection probability
      return sum + Math.pow(0.5, i);
    }, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < weightedCandidates.length; i++) {
      random -= Math.pow(0.5, i);
      if (random <= 0) {
        return weightedCandidates[i].move;
      }
    }

    return weightedCandidates[0].move;
  }

  /**
   * Determine if the bot should make an intentional blunder
   */
  private shouldMakeBlunder(): boolean {
    const rate = this.config.profile.blunderRate;

    // In training mode, reduce blunder rate slightly
    const adjustedRate = this.config.playMode === 'training' ? rate * 0.8 : rate;

    return Math.random() < adjustedRate;
  }

  /**
   * Determine if the bot should make an intentional inaccuracy
   */
  private shouldMakeInaccuracy(): boolean {
    const rate = this.config.profile.inaccuracyRate;

    // In training mode, reduce inaccuracy rate slightly
    const adjustedRate = this.config.playMode === 'training' ? rate * 0.9 : rate;

    return Math.random() < adjustedRate;
  }

  /**
   * Classify the move selection
   */
  private classifySelection(
    candidates: BestMove[],
    selected: BestMove
  ): BotMoveResult['classification'] {
    const selectedIndex = candidates.findIndex((c) => c.move === selected.move);

    if (selectedIndex === 0) {
      return 'best';
    }

    // Calculate centipawn loss
    const cpl = Math.abs(candidates[0].score - selected.score);

    if (cpl <= 25) {
      return 'good';
    } else if (cpl <= 75) {
      return 'inaccuracy';
    } else if (cpl <= 200) {
      return 'mistake';
    } else {
      return 'blunder';
    }
  }

  /**
   * Calculate simulated thinking time for human-like play
   */
  private calculateThinkingTime(
    actualTime: number,
    classification: BotMoveResult['classification']
  ): number {
    const profile = this.config.profile;

    // Base time is somewhere between min and max
    const baseRange = profile.maxThinkTime - profile.minThinkTime;
    let targetTime = profile.minThinkTime + Math.random() * baseRange * 0.6;

    // Adjust based on move classification
    // Better moves might be found faster (intuitive), worse moves take longer (doubt)
    switch (classification) {
      case 'best':
        // Sometimes best moves are intuitive (quick) or require calculation (slower)
        targetTime *= 0.8 + Math.random() * 0.4;
        break;
      case 'good':
        targetTime *= 0.9 + Math.random() * 0.3;
        break;
      case 'inaccuracy':
        // Slight hesitation
        targetTime *= 1.0 + Math.random() * 0.5;
        break;
      case 'mistake':
        // More hesitation or overconfidence
        targetTime *= Math.random() < 0.5 ? 1.2 : 0.7;
        break;
      case 'blunder':
        // Either rushed or overthought
        targetTime *= Math.random() < 0.5 ? 1.5 : 0.5;
        break;
    }

    // Ensure we don't return less than actual calculation time
    const finalTime = Math.max(actualTime, targetTime);

    // Add some randomness to prevent predictable patterns
    const variance = finalTime * 0.2 * (Math.random() - 0.5);

    return Math.max(profile.minThinkTime, Math.round(finalTime + variance));
  }

  /**
   * Wait for the simulated thinking time
   */
  async waitForThinkingTime(thinkingTime: number, actualTime: number): Promise<void> {
    const remainingTime = thinkingTime - actualTime;
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
  }
}

/**
 * Create an AI opponent with the specified personality
 */
export function createAIOpponent(
  engine: StockfishEngine,
  personality: keyof typeof BOT_PERSONALITIES,
  playMode: AIPlayMode = 'training',
  useTimeDelays: boolean = true
): AIOpponent {
  const profile = BOT_PERSONALITIES[personality];
  return new AIOpponent(engine, {
    profile,
    playMode,
    useTimeDelays,
  });
}

/**
 * Create an AI opponent with custom Elo rating
 */
export function createAIOpponentFromElo(
  engine: StockfishEngine,
  targetElo: number,
  playMode: AIPlayMode = 'training',
  useTimeDelays: boolean = true
): AIOpponent {
  const profile = createBotProfileFromElo(targetElo);
  return new AIOpponent(engine, {
    profile,
    playMode,
    useTimeDelays,
  });
}

export default AIOpponent;
