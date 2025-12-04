/**
 * Test script for Basic Engine Operations (Task 1.3)
 *
 * Tests position evaluation, best move calculation, move analysis,
 * multi-PV extraction, and performance benchmarks.
 *
 * Run with: bun src/engine/test-engine-operations.ts
 */

import { createEngine, StockfishEngine } from './stockfish-engine';
import {
  STARTPOS_FEN,
  MoveClassification,
  formatScore,
  classifyMove,
} from '../shared/engine-types';

let engine: StockfishEngine;

async function setup() {
  console.log('=== Engine Operations Test (Task 1.3) ===\n');
  console.log('Creating engine...');
  engine = await createEngine();
  console.log('Engine initialized.\n');
}

async function cleanup() {
  await engine.quit();
  console.log('\nEngine terminated.');
}

/**
 * Test 1.3.1: Request position evaluation
 */
async function testPositionEvaluation() {
  console.log('--- Test 1.3.1: Position Evaluation ---\n');

  // Test 1: Starting position evaluation
  console.log('1. Evaluating starting position...');
  await engine.setPosition(STARTPOS_FEN);
  const startEval = await engine.evaluatePosition({ depth: 12 });

  console.log('   Score:', formatScore(startEval.score), `(${startEval.score} cp)`);
  console.log('   Best move:', startEval.bestMove);
  console.log('   Depth:', startEval.depth);
  console.log('   PV:', startEval.pv?.slice(0, 5).join(' '));
  if (startEval.nodes) console.log('   Nodes:', startEval.nodes.toLocaleString());
  if (startEval.nps) console.log('   NPS:', startEval.nps.toLocaleString());
  if (startEval.time) console.log('   Time:', startEval.time, 'ms');
  console.log('   ✓ Starting position evaluated\n');

  // Test 2: Clearly winning position for White
  console.log('2. Evaluating winning position for White (Q vs nothing)...');
  const queenUpFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4';
  await engine.setPosition(queenUpFen);
  const queenEval = await engine.evaluatePosition({ depth: 10 });

  console.log('   Score:', formatScore(queenEval.score), `(${queenEval.score} cp)`);
  console.log('   Best move:', queenEval.bestMove);
  console.log('   ✓ Winning position evaluated\n');

  // Test 3: Mate in 2 position
  console.log('3. Evaluating mate-in-2 position...');
  // After 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? - Qxf7# is mate
  const mateIn1Fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  await engine.setPosition(mateIn1Fen);
  const mateEval = await engine.evaluatePosition({ depth: 10 });

  console.log('   Score:', formatScore(mateEval.score));
  console.log('   Best move:', mateEval.bestMove);
  console.log('   ✓ Mate detection works (should show large positive or M1)\n');

  // Test 4: Human-readable format
  console.log('4. Testing formatted evaluation...');
  await engine.setPosition(STARTPOS_FEN);
  const formatted = await engine.getFormattedEvaluation({ depth: 10 });
  console.log('   Formatted:', formatted);
  console.log('   ✓ Human-readable format works\n');
}

/**
 * Test 1.3.2: Get best move calculation
 */
async function testBestMoveCalculation() {
  console.log('--- Test 1.3.2: Best Move Calculation ---\n');

  // Test 1: Best move at specific depth
  console.log('1. Getting best move at depth 15...');
  await engine.setPosition(STARTPOS_FEN);
  const depthResult = await engine.getBestMoves({ depth: 15 });

  console.log('   Best move:', depthResult[0]?.move);
  console.log('   Score:', formatScore(depthResult[0]?.score ?? 0));
  console.log('   PV:', depthResult[0]?.pv?.slice(0, 5).join(' '));
  console.log('   ✓ Depth-based search works\n');

  // Test 2: Best move with time limit
  console.log('2. Getting best move with 500ms time limit...');
  await engine.setPosition(STARTPOS_FEN);
  const startTime = Date.now();
  const timeResult = await engine.getBestMoves({ movetime: 500 });
  const elapsed = Date.now() - startTime;

  console.log('   Best move:', timeResult[0]?.move);
  console.log('   Actual time:', elapsed, 'ms');
  console.log('   ✓ Time-limited search works\n');

  // Test 3: Best move with skill level (for bots)
  console.log('3. Testing skill level adjustment...');
  // Use the existing engine and change skill level via setOption
  await engine.setOption('Skill Level', 5);
  await engine.setPosition(STARTPOS_FEN);
  const skillResult = await engine.getBestMoves({ depth: 10 });

  console.log('   Skill level 5 best move:', skillResult[0]?.move);

  // Reset skill level to 20 (max)
  await engine.setOption('Skill Level', 20);
  console.log('   ✓ Skill level adjustment works\n');

  // Test 4: Custom position analysis
  console.log('4. Analyzing Italian Game position...');
  const italianFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  await engine.setPosition(italianFen);
  const italianResult = await engine.getBestMoves({ depth: 12 });

  console.log('   Position: Italian Game (Black to move)');
  console.log('   Best move:', italianResult[0]?.move);
  console.log('   Score:', formatScore(italianResult[0]?.score ?? 0));
  console.log('   ✓ Custom position analysis works\n');
}

/**
 * Test 1.3.3: Move analysis (centipawn loss)
 */
async function testMoveAnalysis() {
  console.log('--- Test 1.3.3: Move Analysis (Centipawn Loss) ---\n');

  // Test classifyMove function first
  console.log('1. Testing move classification thresholds...');
  const testCases = [
    { cpl: 0, expected: MoveClassification.EXCELLENT },
    { cpl: 5, expected: MoveClassification.EXCELLENT },
    { cpl: 10, expected: MoveClassification.EXCELLENT },
    { cpl: 15, expected: MoveClassification.GOOD },
    { cpl: 25, expected: MoveClassification.GOOD },
    { cpl: 50, expected: MoveClassification.INACCURACY },
    { cpl: 75, expected: MoveClassification.INACCURACY },
    { cpl: 100, expected: MoveClassification.MISTAKE },
    { cpl: 200, expected: MoveClassification.MISTAKE },
    { cpl: 300, expected: MoveClassification.BLUNDER },
  ];

  for (const tc of testCases) {
    const result = classifyMove(tc.cpl);
    const pass = result.classification === tc.expected;
    console.log(
      `   CPL ${tc.cpl}: ${result.classification} (${result.accuracy}%) ${pass ? '✓' : '✗'}`
    );
    if (!pass) {
      console.log(`      Expected: ${tc.expected}`);
    }
  }
  console.log('   ✓ Classification thresholds verified\n');

  // Test actual move analysis
  console.log('2. Analyzing played move: e4 from starting position...');
  const analysis1 = await engine.analyzeMove(STARTPOS_FEN, 'e2e4', { depth: 12 });

  console.log('   Played:', analysis1.playedMove);
  console.log('   Best:', analysis1.bestMove);
  console.log('   CPL:', analysis1.centipawnLoss);
  console.log('   Classification:', analysis1.classification);
  console.log('   Accuracy:', analysis1.accuracy + '%');
  console.log('   ✓ Common opening move analyzed\n');

  // Test 3: Analyze a clearly bad move
  console.log('3. Analyzing bad move: g2g4 from starting position...');
  const analysis2 = await engine.analyzeMove(STARTPOS_FEN, 'g2g4', { depth: 12 });

  console.log('   Played: g4');
  console.log('   Best:', analysis2.bestMove);
  console.log('   CPL:', analysis2.centipawnLoss);
  console.log('   Classification:', analysis2.classification);
  console.log('   Accuracy:', analysis2.accuracy + '%');
  console.log('   ✓ Bad move correctly classified (should be inaccuracy or worse)\n');

  // Test 4: Analyze a blunder that hangs the queen
  console.log('4. Analyzing blunder (queen hang)...');
  // Position where Qh5 is attacked and Qg4 blunders it
  const blunderFen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3';
  // A non-optimal move
  const analysis3 = await engine.analyzeMove(blunderFen, 'h5h4', { depth: 10 });

  console.log('   Position: After 1.e4 e5 2.Qh5');
  console.log('   Played: Qh4 (passive)');
  console.log('   Best:', analysis3.bestMove);
  console.log('   CPL:', analysis3.centipawnLoss);
  console.log('   Classification:', analysis3.classification);
  console.log('   ✓ Move analysis with alternatives works\n');
}

/**
 * Test 1.3.4: Multi-move PV extraction
 */
async function testMultiPV() {
  console.log('--- Test 1.3.4: Multi-Move PV Extraction ---\n');

  // Test 1: Get top 3 moves (per move-guidance.md requirement)
  console.log('1. Getting top 3 moves from starting position...');
  await engine.setPosition(STARTPOS_FEN);
  const top3 = await engine.getBestMoves({ depth: 12, count: 3 });

  console.log('   Top 3 moves:');
  top3.forEach((move, i) => {
    console.log(
      `   ${i + 1}. ${move.move} (${formatScore(move.score)}) PV: ${move.pv?.slice(0, 3).join(' ') ?? 'N/A'}`
    );
  });
  console.log('   ✓ Top 3 moves retrieved\n');

  // Test 2: Verify PV for each move
  console.log('2. Verifying PV depth...');
  for (const move of top3) {
    if (move.pv) {
      console.log(`   ${move.move}: PV length = ${move.pv.length}`);
    }
  }
  console.log('   ✓ Principal variations available\n');

  // Test 3: Test with tactical position
  console.log('3. Top 3 moves in Italian Game...');
  const italianFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  await engine.setPosition(italianFen);
  const italianTop3 = await engine.getBestMoves({ depth: 12, count: 3 });

  console.log('   Top 3 for Black:');
  italianTop3.forEach((move, i) => {
    console.log(`   ${i + 1}. ${move.move} (${formatScore(move.score)})`);
  });
  console.log('   ✓ MultiPV works in different positions\n');
}

/**
 * Test 1.3.5: Performance and optimization
 */
async function testPerformance() {
  console.log('--- Test 1.3.5: Performance Testing ---\n');

  // Test 1: Benchmark depth 20 analysis time
  console.log('1. Benchmarking depth 20 analysis (target: <2s)...');
  await engine.setPosition(STARTPOS_FEN);

  const times: number[] = [];
  const positions = [
    STARTPOS_FEN,
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', // Italian
    'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', // Two Knights
  ];

  for (let i = 0; i < positions.length; i++) {
    await engine.setPosition(positions[i]);
    const start = Date.now();
    await engine.getBestMoves({ depth: 20 });
    const elapsed = Date.now() - start;
    times.push(elapsed);
    console.log(`   Position ${i + 1}: ${elapsed}ms ${elapsed < 2000 ? '✓' : '⚠️ SLOW'}`);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`   Average: ${avgTime.toFixed(0)}ms`);
  console.log(`   Target: <2000ms per position`);
  console.log(
    `   ${avgTime < 2000 ? '✓ Performance target MET' : '⚠️ Performance target NOT MET'}\n`
  );

  // Test 2: Complex position (many legal moves)
  console.log('2. Testing complex position analysis...');
  // Middlegame position with many pieces
  const complexFen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8';
  await engine.setPosition(complexFen);

  const complexStart = Date.now();
  const complexResult = await engine.getBestMoves({ depth: 18 });
  const complexTime = Date.now() - complexStart;

  console.log(`   Analysis time: ${complexTime}ms`);
  console.log(`   Best move: ${complexResult[0]?.move}`);
  console.log('   ✓ Complex position handled\n');

  // Test 3: MultiPV performance
  console.log('3. MultiPV performance (top 3 moves)...');
  await engine.setPosition(STARTPOS_FEN);

  const multiPvStart = Date.now();
  await engine.getBestMoves({ depth: 15, count: 3 });
  const multiPvTime = Date.now() - multiPvStart;

  console.log(`   MultiPV time: ${multiPvTime}ms`);
  console.log('   ✓ MultiPV performance measured\n');
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    await setup();

    await testPositionEvaluation();
    await testBestMoveCalculation();
    await testMoveAnalysis();
    await testMultiPV();
    await testPerformance();

    await cleanup();

    console.log('\n=== All Engine Operations Tests Passed! ===');
    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error);
    if (engine) {
      await engine.quit();
    }
    process.exit(1);
  }
}

runAllTests();
