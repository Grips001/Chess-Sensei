/**
 * Chess-Sensei Frontend Entry Point
 *
 * This file initializes the Neutralino.js window and sets up the chess UI.
 */

import neutralino from '@neutralinojs/lib';
neutralino.init();
import * as buntralino from 'buntralino-client';

console.log('Chess-Sensei Frontend initialized');

// Test Buntralino connection
(async () => {
  await buntralino.ready;
  console.log('Buntralino connection established');

  // TODO: Initialize chess board
  // TODO: Set up event listeners
  // TODO: Connect to backend game logic
})();

// Placeholder: Display welcome message
const app = document.getElementById('app');
if (app) {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.innerHTML = `
    <div style="text-align: center; padding: 50px; font-family: system-ui;">
      <h1>🏆 Chess-Sensei</h1>
      <p style="font-size: 1.2em; margin: 20px 0;">A modern chess training application</p>
      <p style="color: #666;">
        Project initialized successfully!<br>
        Ready for Phase 1 development.
      </p>
      <p style="color: #999; font-size: 0.9em; margin-top: 30px;">
        See <a href="#" onclick="alert('Check source-docs/ folder for documentation')">source-docs/</a> for full documentation
      </p>
    </div>
  `;
  app.prepend(welcomeDiv);
}
