/**
 * Test Setup for DOM Testing
 *
 * Configures happy-dom for component tests that require DOM environment.
 */

import { GlobalWindow } from 'happy-dom';

// Set up global DOM environment
const window = new GlobalWindow();
const document = window.document;

// Expose globals for tests with proper type assertions
global.window = window as unknown as Window & typeof globalThis;
global.document = document as unknown as Document;
global.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
global.HTMLButtonElement = window.HTMLButtonElement as unknown as typeof HTMLButtonElement;
global.HTMLInputElement = window.HTMLInputElement as unknown as typeof HTMLInputElement;
global.HTMLDivElement = window.HTMLDivElement as unknown as typeof HTMLDivElement;
global.HTMLSpanElement = window.HTMLSpanElement as unknown as typeof HTMLSpanElement;
global.KeyboardEvent = window.KeyboardEvent as unknown as typeof KeyboardEvent;
global.MouseEvent = window.MouseEvent as unknown as typeof MouseEvent;
global.Event = window.Event as unknown as typeof Event;
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number;
};
