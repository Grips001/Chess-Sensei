/**
 * Chess-Sensei Backend Entry Point
 *
 * This file initializes the Bun backend and sets up IPC with the frontend.
 */

let viteHost: string | null = null;
{
  const viteHostArg = process.argv.find((arg) => arg.startsWith('--vitehost'));
  viteHost = viteHostArg?.split('=')[1]!;
}

import { create, events, registerMethodMap } from 'buntralino';

console.log('Chess-Sensei Backend initialized');

/**
 * Function map that allows running named functions with `buntralino.run` on the client (Neutralino) side.
 *
 * TODO: Add game logic functions:
 * - initGame()
 * - makeMove()
 * - getBestMoves()
 * - getGameState()
 */
const functionMap = {
  sayHello: async (payload: { message: string }) => {
    return `Chess-Sensei Backend: ${payload.message}`;
  },
};

registerMethodMap(functionMap);

await create(viteHost ?? '/', {
  // Name windows to easily manipulate them and distinguish them in events
  name: 'main',
  // We need this option to add Neutralino globals to the Vite-hosted page
  injectGlobals: true,
  // Any options for Neutralino.window.create can go here
});

// Exit the app completely when the main window is closed without the `shutdown` command.
events.on('close', (windowName: string) => {
  if (windowName === 'main') {
    process.exit();
  }
});
