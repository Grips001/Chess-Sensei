/**
 * Chess-Sensei Frontend Entry Point
 *
 * This file initializes the Neutralino.js window and sets up the chess UI.
 * Includes IPC communication with the Bun backend for engine operations.
 *
 * @see source-docs/architecture.md - "Frontend Layer"
 */

import neutralino from '@neutralinojs/lib';
neutralino.init();
import * as buntralino from 'buntralino-client';
import {
  IPC_METHODS,
  isErrorResponse,
  STARTPOS_FEN,
  type BestMovesResponse,
  type EvaluationResponse,
  type EngineStatusResponse,
} from '../shared/ipc-types';

console.log('Chess-Sensei Frontend initialized');

// Results display element
let resultsDiv: HTMLDivElement | null = null;

/**
 * Display results in the UI
 */
function displayResults(title: string, data: unknown): void {
  if (!resultsDiv) return;

  const resultItem = document.createElement('div');
  resultItem.style.cssText =
    'background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; text-align: left;';
  resultItem.innerHTML = `
    <strong>${title}</strong>
    <pre style="margin: 5px 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
  `;
  resultsDiv.prepend(resultItem);
}

/**
 * Test IPC communication with backend
 * Per Task 1.4.3: Test frontend-backend communication
 */
async function testIPCCommunication(): Promise<void> {
  console.log('Testing IPC communication...');

  // Test 1: Health check
  console.log('1. Testing sayHello...');
  const helloResult = await buntralino.run(IPC_METHODS.SAY_HELLO, {
    message: 'Hello from frontend!',
  });
  console.log('   Response:', helloResult);
  displayResults('1. sayHello', helloResult);

  // Test 2: Engine status
  console.log('2. Testing getEngineStatus...');
  const statusResult = (await buntralino.run(
    IPC_METHODS.GET_ENGINE_STATUS
  )) as EngineStatusResponse;
  console.log('   Engine initialized:', statusResult.initialized);
  displayResults('2. getEngineStatus', statusResult);

  // Test 3: Start new game
  console.log('3. Testing startNewGame...');
  const newGameResult = await buntralino.run(IPC_METHODS.START_NEW_GAME);
  console.log('   Result:', newGameResult);
  displayResults('3. startNewGame', newGameResult);

  // Test 4: Get best moves from starting position
  console.log('4. Testing requestBestMoves...');
  const bestMovesResult = (await buntralino.run(IPC_METHODS.REQUEST_BEST_MOVES, {
    fen: STARTPOS_FEN,
    depth: 10,
    count: 3,
  })) as BestMovesResponse;

  if (isErrorResponse(bestMovesResult)) {
    console.error('   Error:', bestMovesResult.error);
  } else {
    console.log('   Top 3 moves:', bestMovesResult.moves.map((m) => m.move).join(', '));
  }
  displayResults('4. requestBestMoves (top 3)', bestMovesResult);

  // Test 5: Evaluate position
  console.log('5. Testing evaluatePosition...');
  const evalResult = (await buntralino.run(IPC_METHODS.EVALUATE_POSITION, {
    fen: STARTPOS_FEN,
    depth: 12,
  })) as EvaluationResponse;

  if (!isErrorResponse(evalResult)) {
    console.log('   Evaluation:', evalResult.formattedScore);
    console.log('   Best move:', evalResult.evaluation.bestMove);
  }
  displayResults('5. evaluatePosition', evalResult);

  // Test 6: Get guidance moves (for Training Mode)
  console.log('6. Testing getGuidanceMoves...');
  const guidanceResult = (await buntralino.run(IPC_METHODS.GET_GUIDANCE_MOVES, {
    fen: STARTPOS_FEN,
    depth: 12,
  })) as BestMovesResponse;

  if (!isErrorResponse(guidanceResult)) {
    console.log('   Guidance moves (Blue/Green/Yellow):');
    guidanceResult.moves.forEach((m, i) => {
      const color = ['Blue', 'Green', 'Yellow'][i];
      console.log(`     ${color}: ${m.move}`);
    });
  }
  displayResults('6. getGuidanceMoves', guidanceResult);

  // Test 7: Analyze a move
  console.log('7. Testing analyzeMove...');
  const analysisResult = await buntralino.run(IPC_METHODS.ANALYZE_MOVE, {
    fen: STARTPOS_FEN,
    playedMove: 'g2g4', // Bad move for testing
    depth: 10,
  });
  displayResults('7. analyzeMove (g4 from start)', analysisResult);

  console.log('\n=== IPC Communication Tests Complete ===');
}

// Initialize Buntralino connection
(async () => {
  await buntralino.ready;
  console.log('Buntralino connection established');

  // Make test function available globally for debugging
  (window as unknown as { testIPC: () => Promise<void> }).testIPC = testIPCCommunication;

  // Auto-run IPC tests after a short delay to let engine initialize
  setTimeout(async () => {
    try {
      await testIPCCommunication();
    } catch (error) {
      console.error('IPC test error:', error);
      displayResults('ERROR', { error: String(error) });
    }
  }, 1000);
})();

// Display welcome message with IPC test results
const app = document.getElementById('app');
if (app) {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.innerHTML = `
    <div style="text-align: center; padding: 30px; font-family: system-ui; max-width: 800px; margin: 0 auto;">
      <h1>Chess-Sensei</h1>
      <p style="font-size: 1.2em; margin: 20px 0;">Phase 1: Core Chess Engine Integration</p>
      <p style="color: #666;">
        Engine IPC communication test results:
      </p>
      <div id="ipc-results" style="margin-top: 20px; max-height: 500px; overflow-y: auto;"></div>
      <p style="color: #999; font-size: 0.9em; margin-top: 20px;">
        Open DevTools (F12) for full console output
      </p>
      <button onclick="window.testIPC()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
        Re-run IPC Tests
      </button>
    </div>
  `;
  app.prepend(welcomeDiv);
  resultsDiv = document.getElementById('ipc-results') as HTMLDivElement;
}
