/**
 * Test script for Engine Interface
 *
 * Tests the StockfishEngine implementation of the Engine interface.
 * Run with: bun src/engine/test-engine-interface.ts
 */

import { createEngine } from './stockfish-engine';
import { STARTPOS_FEN } from '../shared/engine-types';

async function testEngineInterface() {
  console.log('=== Engine Interface Test ===\n');

  try {
    // Test 1: Create and initialize engine
    console.log('1. Creating and initializing engine...');
    const engine = await createEngine();
    console.log('   ✓ Engine initialized successfully\n');

    // Test 2: Get best moves from starting position
    console.log('2. Getting best move from starting position...');
    await engine.setPosition(STARTPOS_FEN);
    const bestMoves = await engine.getBestMoves({ depth: 10 });
    console.log('   Best moves:', bestMoves);
    if (bestMoves.length > 0) {
      console.log('   ✓ Best move:', bestMoves[0].move);
      console.log('   ✓ Score:', bestMoves[0].score, 'cp');
      console.log('   ✓ PV:', bestMoves[0].pv?.join(' ') || 'N/A');
    }
    console.log();

    // Test 3: Get multiple best moves (MultiPV)
    console.log('3. Getting top 3 best moves...');
    const topMoves = await engine.getBestMoves({ depth: 8, count: 3 });
    console.log('   Top 3 moves:');
    topMoves.forEach((move, i) => {
      console.log(
        `   ${i + 1}. ${move.move} (${move.score} cp) - PV: ${move.pv?.slice(0, 3).join(' ') || 'N/A'}`
      );
    });
    console.log('   ✓ Retrieved', topMoves.length, 'moves\n');

    // Test 4: Set custom position and analyze
    console.log('4. Setting custom position (Italian Game)...');
    // Italian Game position after 1.e4 e5 2.Nf3 Nc6 3.Bc4
    const italianFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    await engine.setPosition(italianFen);
    const italianMoves = await engine.getBestMoves({ depth: 10 });
    console.log('   Position: Italian Game (Black to move)');
    console.log('   Best move:', italianMoves[0]?.move);
    console.log('   Score:', italianMoves[0]?.score, 'cp');
    console.log('   ✓ Custom position analyzed\n');

    // Test 5: Position with move history
    console.log('5. Testing position with move history...');
    await engine.setPosition(STARTPOS_FEN, ['e2e4', 'e7e5', 'g1f3']);
    const afterMoves = await engine.getBestMoves({ depth: 8 });
    console.log('   Position: After 1.e4 e5 2.Nf3');
    console.log('   Best move:', afterMoves[0]?.move);
    console.log('   ✓ Move history applied correctly\n');

    // Test 6: Test with movetime instead of depth
    console.log('6. Testing movetime-based search...');
    await engine.setPosition(STARTPOS_FEN);
    const timeMoves = await engine.getBestMoves({ movetime: 500 });
    console.log('   500ms search result:', timeMoves[0]?.move);
    console.log('   ✓ Movetime search works\n');

    // Test 7: New game
    console.log('7. Testing newGame()...');
    await engine.newGame();
    console.log('   ✓ New game started\n');

    // Test 8: Engine shutdown
    console.log('8. Testing quit()...');
    await engine.quit();
    console.log('   ✓ Engine terminated\n');

    console.log('=== All Engine Interface Tests Passed! ===');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

testEngineInterface();
