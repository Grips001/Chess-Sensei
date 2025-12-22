/**
 * Test Setup for DOM Testing
 *
 * Configures happy-dom for component tests that require DOM environment.
 */

import { GlobalWindow } from 'happy-dom';

// Set up global DOM environment
const window = new GlobalWindow();
const document = window.document;

// Expose globals for tests
global.window = window as unknown as Window & typeof globalThis;
global.document = document;
global.HTMLElement = window.HTMLElement;
global.HTMLButtonElement = window.HTMLButtonElement;
global.HTMLInputElement = window.HTMLInputElement;
global.HTMLDivElement = window.HTMLDivElement;
global.HTMLSpanElement = window.HTMLSpanElement;
global.KeyboardEvent = window.KeyboardEvent;
global.MouseEvent = window.MouseEvent;
global.Event = window.Event;
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number;
};
