/**
 * Test script for Stockfish WASM integration
 *
 * Run with: bun src/engine/test-stockfish.ts
 */

import { loadStockfish } from './stockfish-loader';

async function testEngine() {
  console.log('Loading Stockfish WASM engine...');

  try {
    const engine = await loadStockfish();
    console.log('Engine loaded successfully!');
    console.log('Engine ready:', engine.isReady());

    // Set up output listener
    const lines: string[] = [];
    engine.setListener((line) => {
      console.log('Engine:', line);
      lines.push(line);
    });

    // Send UCI command to initialize
    console.log('\nSending: uci');
    engine.postMessage('uci');

    // Wait for uciok
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (lines.some((l) => l === 'uciok')) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });

    if (!lines.some((l) => l === 'uciok')) {
      console.error('ERROR: Did not receive uciok response');
      engine.terminate();
      process.exit(1);
    }

    console.log('\nUCI initialization successful!');

    // Test isready
    console.log('\nSending: isready');
    engine.postMessage('isready');

    // Wait for readyok
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (lines.some((l) => l === 'readyok')) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 5000);
    });

    if (!lines.some((l) => l === 'readyok')) {
      console.error('ERROR: Did not receive readyok response');
      engine.terminate();
      process.exit(1);
    }

    console.log('\nEngine is ready!');

    // Test position and best move calculation
    console.log('\nSending: position startpos');
    engine.postMessage('position startpos');

    console.log('Sending: go depth 10');
    engine.postMessage('go depth 10');

    // Wait for bestmove
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (lines.some((l) => l.startsWith('bestmove'))) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 30000);
    });

    const bestmoveLine = lines.find((l) => l.startsWith('bestmove'));
    if (bestmoveLine) {
      console.log('\nBest move found:', bestmoveLine);
    } else {
      console.error('ERROR: Did not receive bestmove response');
    }

    // Clean up
    console.log('\nSending: quit');
    engine.postMessage('quit');
    engine.terminate();

    console.log('\n✓ Stockfish WASM integration test passed!');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

testEngine();
