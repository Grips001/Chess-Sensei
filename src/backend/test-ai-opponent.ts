/**
 * AI Opponent Test Script
 *
 * Tests the AI opponent at different difficulty levels to verify
 * strength calibration and behavior.
 *
 * Run with: bun run src/backend/test-ai-opponent.ts
 *
 * @see source-docs/ai-engine.md - "Difficulty & Strength Scaling"
 */

import { createEngine } from '../engine/stockfish-engine';
import { AIOpponent, createAIOpponent, createAIOpponentFromElo } from './ai-opponent';
import {
  BOT_PERSONALITIES,
  DIFFICULTY_PRESETS,
  type BotPersonality,
  type DifficultyPreset,
} from '../shared/bot-types';

// Test positions for evaluation
const TEST_POSITIONS = {
  // Starting position
  startpos: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  // Position after 1.e4 e5
  openGame: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  // Tactical position with winning combination
  tactical: 'r2qk2r/ppp2ppp/2n1bn2/4N3/2B1P3/8/PPP2PPP/RNBQK2R w KQkq - 4 7',
  // Endgame position
  endgame: '8/5k2/8/8/8/8/4K3/R7 w - - 0 1',
};

/**
 * Test a bot's move selection characteristics
 */
async function testBotMoveSelection(
  _name: string,
  opponent: AIOpponent,
  fen: string,
  iterations: number = 5
): Promise<{
  avgThinkTime: number;
  bestMoveRate: number;
  blunderRate: number;
  classifications: Record<string, number>;
}> {
  const results = {
    bestMoveRate: 0,
    blunderRate: 0,
    avgThinkTime: 0,
    classifications: {} as Record<string, number>,
  };

  let bestCount = 0;
  let blunderCount = 0;
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const result = await opponent.selectMove(fen);
    totalTime += result.thinkingTime;

    results.classifications[result.classification] =
      (results.classifications[result.classification] || 0) + 1;

    if (result.classification === 'best') {
      bestCount++;
    }
    if (result.classification === 'blunder') {
      blunderCount++;
    }
  }

  results.bestMoveRate = bestCount / iterations;
  results.blunderRate = blunderCount / iterations;
  results.avgThinkTime = totalTime / iterations;

  return results;
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('AI Opponent Test Suite');
  console.log('='.repeat(60));
  console.log();

  // Initialize engine
  console.log('Initializing Stockfish engine...');
  const engine = await createEngine();
  console.log('Engine ready.\n');

  // Test each personality
  console.log('Testing Bot Personalities:');
  console.log('-'.repeat(60));

  for (const personality of Object.keys(BOT_PERSONALITIES) as BotPersonality[]) {
    const profile = BOT_PERSONALITIES[personality];
    const opponent = createAIOpponent(engine, personality, 'training', false);

    console.log(`\n${profile.name} (Elo ~${profile.targetElo}):`);
    console.log(`  Description: ${profile.description}`);
    console.log(`  Depth Limit: ${profile.depthLimit}`);
    console.log(`  Sampling Window: ${profile.moveSamplingWindow}`);
    console.log(`  Blunder Rate: ${(profile.blunderRate * 100).toFixed(1)}%`);
    console.log(`  Inaccuracy Rate: ${(profile.inaccuracyRate * 100).toFixed(1)}%`);

    const results = await testBotMoveSelection(profile.name, opponent, TEST_POSITIONS.openGame, 10);

    console.log(`  Test Results (10 moves from open game position):`);
    console.log(`    Best Move Rate: ${(results.bestMoveRate * 100).toFixed(1)}%`);
    console.log(`    Blunder Rate: ${(results.blunderRate * 100).toFixed(1)}%`);
    console.log(`    Avg Think Time: ${results.avgThinkTime.toFixed(0)}ms`);
    console.log(`    Classifications:`, results.classifications);
  }

  // Test Elo-based creation
  console.log('\n' + '='.repeat(60));
  console.log('Testing Elo-based Bot Creation:');
  console.log('-'.repeat(60));

  const eloLevels = [800, 1200, 1600, 2000, 2400];

  for (const elo of eloLevels) {
    const opponent = createAIOpponentFromElo(engine, elo, 'training', false);
    const profile = opponent.getProfile();

    console.log(`\nElo ${elo}:`);
    console.log(`  Depth Limit: ${profile.depthLimit}`);
    console.log(`  Sampling Window: ${profile.moveSamplingWindow}`);
    console.log(`  Blunder Rate: ${(profile.blunderRate * 100).toFixed(1)}%`);
    console.log(`  Inaccuracy Rate: ${(profile.inaccuracyRate * 100).toFixed(1)}%`);

    const results = await testBotMoveSelection(`Elo ${elo}`, opponent, TEST_POSITIONS.openGame, 5);

    console.log(`  Test Results (5 moves):`);
    console.log(`    Best Move Rate: ${(results.bestMoveRate * 100).toFixed(1)}%`);
    console.log(`    Classifications:`, results.classifications);
  }

  // Test difficulty presets
  console.log('\n' + '='.repeat(60));
  console.log('Testing Difficulty Presets:');
  console.log('-'.repeat(60));

  for (const preset of Object.keys(DIFFICULTY_PRESETS) as DifficultyPreset[]) {
    const presetConfig = DIFFICULTY_PRESETS[preset];

    console.log(`\n${preset.charAt(0).toUpperCase() + preset.slice(1)}:`);
    console.log(`  Target Elo: ${presetConfig.targetElo}`);
    console.log(`  Depth Limit: ${presetConfig.depthLimit}`);
    console.log(`  Sampling Window: ${presetConfig.moveSamplingWindow}`);
    console.log(`  Blunder Rate: ${((presetConfig.blunderRate ?? 0) * 100).toFixed(1)}%`);
  }

  // Test Training vs Punishing mode
  console.log('\n' + '='.repeat(60));
  console.log('Testing Training vs Punishing Modes:');
  console.log('-'.repeat(60));

  const trainingOpponent = createAIOpponent(engine, 'club_player', 'training', false);
  const punishingOpponent = createAIOpponent(engine, 'club_player', 'punishing', false);

  console.log('\nClub Player in Training Mode:');
  const trainingResults = await testBotMoveSelection(
    'Training',
    trainingOpponent,
    TEST_POSITIONS.tactical,
    10
  );
  console.log(`  Best Move Rate: ${(trainingResults.bestMoveRate * 100).toFixed(1)}%`);
  console.log(`  Classifications:`, trainingResults.classifications);

  console.log('\nClub Player in Punishing Mode:');
  const punishingResults = await testBotMoveSelection(
    'Punishing',
    punishingOpponent,
    TEST_POSITIONS.tactical,
    10
  );
  console.log(`  Best Move Rate: ${(punishingResults.bestMoveRate * 100).toFixed(1)}%`);
  console.log(`  Classifications:`, punishingResults.classifications);

  // Cleanup
  await engine.quit();

  console.log('\n' + '='.repeat(60));
  console.log('All tests completed successfully!');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
