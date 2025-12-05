/**
 * Stockfish WASM Loader for Bun
 *
 * Loads and initializes the Stockfish WASM engine directly in Bun's runtime.
 * Uses the NNUE Lite Single-threaded build for optimal size/performance balance.
 *
 * Key insight: The stockfish.js module checks for `self.location.hash` to detect
 * browser vs Node.js environment. We polyfill `self.location` to make it work in Bun.
 *
 * For compiled executables: The stockfish JS and WASM files must be distributed
 * alongside the executable in a 'stockfish/' subdirectory. Bun's bundler cannot
 * correctly bundle the complex CommonJS IIFE pattern in stockfish.js, so we load
 * it dynamically at runtime.
 *
 * @see src/engine/STOCKFISH_SELECTION.md for build selection rationale
 */

import { join, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
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

// Stockfish engine file names
const STOCKFISH_JS = 'stockfish-17.1-lite-single-03e3232.js';
const STOCKFISH_WASM = 'stockfish-17.1-lite-single-03e3232.wasm';

// Development mode: node_modules path
const DEV_STOCKFISH_DIR = join(__dirname, '..', '..', 'node_modules', 'stockfish', 'src');

// Compiled mode: stockfish files alongside executable
// process.execPath points to the executable itself
const COMPILED_STOCKFISH_DIR = join(dirname(process.execPath), 'stockfish');

/**
 * Determine if we're running in a compiled Bun executable
 */
function isCompiledExecutable(): boolean {
  // In compiled mode, __dirname points to a temp extraction location
  // Check if the node_modules path exists - if not, we're compiled
  return !existsSync(DEV_STOCKFISH_DIR);
}

/**
 * Get the stockfish directory based on execution mode
 */
function getStockfishDir(): string {
  return isCompiledExecutable() ? COMPILED_STOCKFISH_DIR : DEV_STOCKFISH_DIR;
}

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
 * For compiled executables, loads the stockfish JS and WASM files from the
 * 'stockfish/' subdirectory next to the executable. Bun's bundler cannot
 * correctly handle the stockfish.js IIFE module pattern.
 *
 * @returns Promise resolving to initialized Stockfish instance
 */
export async function loadStockfish(): Promise<StockfishInstance> {
  // Determine paths and load binary based on execution context
  const compiled = isCompiledExecutable();
  const stockfishDir = getStockfishDir();
  const jsPath = join(stockfishDir, STOCKFISH_JS);
  const wasmPath = join(stockfishDir, STOCKFISH_WASM);

  console.log(`[Stockfish] Running in ${compiled ? 'compiled' : 'development'} mode`);
  console.log('[Stockfish] Stockfish directory:', stockfishDir);
  console.log('[Stockfish] JS path:', jsPath);
  console.log('[Stockfish] WASM path:', wasmPath);

  // Verify files exist
  if (!existsSync(jsPath)) {
    throw new Error(`Stockfish JS not found at: ${jsPath}`);
  }
  if (!existsSync(wasmPath)) {
    throw new Error(`Stockfish WASM not found at: ${wasmPath}`);
  }

  // Load WASM binary
  const wasmBinary = readFileSync(wasmPath);
  console.log('[Stockfish] WASM binary loaded, size:', wasmBinary.length);

  // Dynamically require the stockfish module
  // This works in both development and compiled mode because:
  // - Development: loads from node_modules
  // - Compiled: loads from stockfish/ directory next to executable
  const StockfishModule = require(jsPath);

  // The stockfish.js module exports a factory function via module.exports = e
  // Calling it returns another function (the Stockfish constructor)
  const StockfishFactory: () => (config: Record<string, unknown>) => Promise<RawEngine> =
    StockfishModule;

  if (typeof StockfishFactory !== 'function') {
    console.error('[Stockfish] Module type:', typeof StockfishModule);
    console.error('[Stockfish] Module keys:', Object.keys(StockfishModule || {}));
    throw new Error(
      `Stockfish module did not export a factory function. Got: ${typeof StockfishFactory}`
    );
  }

  let listener: EngineListener = () => {};
  let ready = false;
  let engine: RawEngine | null = null;

  const engineConfig = {
    wasmBinary: wasmBinary.buffer,
    locateFile: (filename: string) => {
      if (filename.endsWith('.wasm')) {
        return wasmPath;
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
