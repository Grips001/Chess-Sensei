/**
 * Stockfish WASM Loader for Bun
 *
 * Loads and initializes the Stockfish WASM engine directly in Bun's runtime.
 * Uses the NNUE Lite Single-threaded build for optimal size/performance balance.
 *
 * Key insight: The stockfish.js module checks for `self.location.hash` to detect
 * browser vs Node.js environment. We polyfill `self.location` to make it work in Bun.
 *
 * @see src/engine/STOCKFISH_SELECTION.md for build selection rationale
 */

import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Polyfill self.location for stockfish.js compatibility
// This MUST be done before requiring the stockfish module
declare const self: { location?: Record<string, string> };
if (typeof self !== 'undefined' && !self.location) {
  self.location = {
    hash: '',
    href: 'file://' + __filename,
    origin: 'file://',
    protocol: 'file:',
    host: '',
    hostname: '',
    port: '',
    pathname: __filename,
    search: '',
  };
}

// Path to the stockfish lite single-threaded JS and WASM files
const STOCKFISH_DIR = join(__dirname, '..', '..', 'node_modules', 'stockfish', 'src');
const STOCKFISH_JS_PATH = join(STOCKFISH_DIR, 'stockfish-17.1-lite-single-03e3232.js');
const STOCKFISH_WASM_PATH = join(STOCKFISH_DIR, 'stockfish-17.1-lite-single-03e3232.wasm');

/**
 * Listener callback type for engine output
 */
export type EngineListener = (line: string) => void;

/**
 * Stockfish engine instance interface matching ai-engine.md specification
 */
export interface StockfishInstance {
  /** Send a UCI command to the engine */
  postMessage: (command: string) => void;
  /** Set the listener for engine output */
  setListener: (listener: EngineListener) => void;
  /** Terminate the engine */
  terminate: () => void;
  /** Check if engine is ready */
  isReady: () => boolean;
}

// Store for the raw engine instance
interface RawEngine {
  ccall: (
    name: string,
    returnType: null | string,
    argTypes: string[],
    args: unknown[],
    options?: { async?: boolean }
  ) => unknown;
  terminate: () => void;
}

/**
 * Load and initialize the Stockfish WASM engine
 *
 * Loads the WASM binary and initializes the Stockfish engine directly in
 * the Bun runtime. Provides a clean interface for UCI communication.
 *
 * @returns Promise resolving to initialized Stockfish instance
 */
export async function loadStockfish(): Promise<StockfishInstance> {
  // Read the WASM binary
  const wasmBinary = readFileSync(STOCKFISH_WASM_PATH);

  // Dynamically require the stockfish module (factory function)

  const StockfishFactory = require(STOCKFISH_JS_PATH) as () => (
    config: Record<string, unknown>
  ) => Promise<RawEngine>;

  let listener: EngineListener = () => {};
  let ready = false;
  let engine: RawEngine | null = null;

  const engineConfig = {
    wasmBinary: wasmBinary.buffer,
    locateFile: (filename: string) => {
      if (filename.endsWith('.wasm')) {
        return STOCKFISH_WASM_PATH;
      }
      return filename;
    },
    listener: (line: string) => {
      listener(line);
    },
    print: (line: string) => {
      listener(line);
    },
    printErr: (line: string) => {
      // Log errors to stderr for debugging
      console.error('[Stockfish]', line);
    },
  };

  // Create the Stockfish constructor and initialize
  const Stockfish = StockfishFactory();
  engine = await Stockfish(engineConfig);
  ready = true;

  const instance: StockfishInstance = {
    postMessage: (command: string) => {
      if (engine) {
        // Use ccall to send UCI commands
        // The 'go' command needs async mode for search
        engine.ccall('command', null, ['string'], [command], {
          async: /^go\b/.test(command),
        });
      }
    },
    setListener: (newListener: EngineListener) => {
      listener = newListener;
    },
    terminate: () => {
      if (engine) {
        engine.terminate();
        engine = null;
        ready = false;
      }
    },
    isReady: () => ready,
  };

  return instance;
}

export default loadStockfish;
