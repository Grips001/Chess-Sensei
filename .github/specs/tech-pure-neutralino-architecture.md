# Tech Spec: Pure Neutralino Architecture Migration

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-06
> **Last Updated:** 2026-01-06 **PRD:**
> [prd-pure-neutralino-architecture.md](./prd-pure-neutralino-architecture.md)
> **Related Issues:** CS-005

---

## Overview

### Summary

Migrate Chess-Sensei from a dual-process architecture (Neutralino frontend + Bun
backend executable) to a single-process Pure Neutralino App architecture. This
involves moving all backend services (`ai-opponent.ts`, `data-storage.ts`,
`analysis-pipeline.ts`, `metrics-calculator.ts`, `export-import.ts`) to the
frontend, running Stockfish in a WebWorker, replacing Bun file I/O with
Neutralino.filesystem APIs, and eliminating the WebSocket IPC layer. The result
is a 111MB size reduction (92% of current distribution) while maintaining 100%
feature parity.

### Goals

1. **Eliminate Bun runtime executable** (111MB → 0MB)
2. **Convert backend services to frontend modules** using Neutralino APIs
3. **Run Stockfish in WebWorker** for non-blocking chess analysis
4. **Remove WebSocket IPC layer** and replace with direct function calls
5. **Maintain 100% backward compatibility** with existing save data (JSON format
   unchanged)
6. **Preserve development workflow** (keep Bun for `bun install`, `bun test`,
   `bun run build`)

### Non-Goals

1. **Data format changes** - JSON save files remain identical for compatibility
2. **Feature additions** - Strictly architectural migration only
3. **UI/UX modifications** - User interface stays the same
4. **Performance optimizations** beyond architecture (Phase 2 work)
5. **Database migration** to SQLite (Phase 3 work)
6. **Framework introduction** (React/Vue/Solid considered too risky)

## Background

### Current Architecture

```text
┌─────────────────────────────────────┐
│  Neutralino Frontend (606KB bundle) │
│  - UI rendering                     │
│  - Game state management            │
│  - WebSocket IPC client             │
└──────────────┬──────────────────────┘
               │ WebSocket (port 9339)
               │ IPC_METHODS (48 methods)
               ▼
┌─────────────────────────────────────┐
│   Bun Backend (111MB executable)    │
│   - Stockfish engine wrapper        │
│   - AI opponent logic               │
│   - Data storage (Bun.file)         │
│   - Analysis pipeline               │
│   - Metrics calculator              │
│   - Export/Import manager           │
│   - File logger                     │
└─────────────────────────────────────┘
```

**File Structure (Current):**

- `src/backend/index.ts` - Backend entry point, IPC method registration (2175
  lines)
- `src/backend/websocket-server.ts` - WebSocket IPC server
- `src/backend/ai-opponent.ts` - Bot personalities and move selection
- `src/backend/data-storage.ts` - File I/O using Bun APIs (1000 lines)
- `src/backend/analysis-pipeline.ts` - Post-game analysis
- `src/backend/metrics-calculator.ts` - 9 composite score calculations
- `src/backend/export-import.ts` - PGN/JSON export/import
- `src/backend/file-logger.ts` - Debug logging to disk
- `src/frontend/websocket-ipc-client.ts` - Frontend IPC client
- `src/shared/ipc-types.ts` - IPC method definitions (48 methods)

**IPC Methods (48 total):**

- 8 Engine methods (e.g., `chess:requestBestMoves`, `chess:evaluatePosition`)
- 5 AI Opponent methods (e.g., `chess:configureBot`, `chess:getBotMove`)
- 3 Analysis methods (e.g., `chess:analyzeGame`, `chess:calculateMetrics`)
- 7 Data Storage methods (e.g., `chess:saveGame`, `chess:loadGame`)
- 4 Player Progress methods (e.g., `chess:loadPlayerProfile`,
  `chess:getAchievements`)
- 10 Export/Import methods (e.g., `chess:exportGame`, `chess:importBatchGames`)
- 8 Backup methods (e.g., `chess:createAutomaticBackup`, `chess:listBackups`)
- 3 Logging methods (e.g., `chess:logMessage`, `chess:getLogPath`)

### Key Concepts

**Neutralino.filesystem API**: Neutralino's cross-platform file I/O API

- `Neutralino.filesystem.writeFile(path, data)` - Write file
- `Neutralino.filesystem.readFile(path)` - Read file
- `Neutralino.filesystem.createDirectory(path)` - Create directory
- `Neutralino.filesystem.readDirectory(path)` - List directory contents
- `Neutralino.filesystem.getStats(path)` - Get file metadata
- `Neutralino.filesystem.remove(path)` - Delete file/directory

**WebWorker**: Browser API for running JavaScript in background threads

- Non-blocking execution (chess analysis doesn't freeze UI)
- Message-based communication (`postMessage`, `onmessage`)
- Stockfish WASM runs inside WebWorker

**Bun APIs vs Neutralino APIs:**

| Operation      | Bun Backend (Current)                | Neutralino Frontend (Target)                                               |
| -------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| Write file     | `await Bun.write(path, data)`        | `await Neutralino.filesystem.writeFile(...)`                               |
| Read file      | `const file = Bun.file(path).json()` | `const text = await Neutralino.filesystem.readFile(...); JSON.parse(text)` |
| File exists    | `await Bun.file(path).exists()`      | `try { await Neutralino.filesystem.getStats(path) } catch { false }`       |
| Create dir     | Auto-created on write                | `await Neutralino.filesystem.createDirectory(path)`                        |
| List directory | `import fs; fs.readdir(path)`        | `await Neutralino.filesystem.readDirectory(path)`                          |
| Get file size  | `Bun.file(path).size`                | `(await Neutralino.filesystem.getStats(path)).size`                        |

**Data Storage Paths:**

- Windows: `%APPDATA%\Chess-Sensei\`
- macOS: `~/Library/Application Support/Chess-Sensei/`
- Linux: `~/.local/share/chess-sensei/`

---

## Detailed Design

### Architecture

```text
Target Architecture (Pure Neutralino App):

┌──────────────────────────────────────────────────────────┐
│         Neutralino Frontend (Single Process)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  UI Layer (index.ts)                               │  │
│  │  - Board rendering                                 │  │
│  │  - Game modes (training/exam/sandbox)              │  │
│  │  - Progress dashboard                              │  │
│  └─────────────────┬──────────────────────────────────┘  │
│                    │ Direct function calls              │
│                    ▼                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Services Layer (src/frontend/services/)           │  │
│  │  ┌───────────────────┐  ┌────────────────────────┐ │  │
│  │  │ ai-opponent.ts    │  │ analysis-pipeline.ts   │ │  │
│  │  │ (Migrated)        │  │ (Migrated)             │ │  │
│  │  └───────────────────┘  └────────────────────────┘ │  │
│  │  ┌───────────────────┐  ┌────────────────────────┐ │  │
│  │  │ data-storage.ts   │  │ metrics-calculator.ts  │ │  │
│  │  │ (Adapted for      │  │ (Migrated)             │ │  │
│  │  │  Neutralino APIs) │  └────────────────────────┘ │  │
│  │  └───────────────────┘  ┌────────────────────────┐ │  │
│  │                         │ export-import.ts       │ │  │
│  │                         │ (Adapted)              │ │  │
│  │                         └────────────────────────┘ │  │
│  └───────────┬──────────────────────┬─────────────────┘  │
│              │                      │                     │
│              ▼                      ▼                     │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │ Neutralino.filesystem│  │ Stockfish WebWorker     │  │
│  │ API (File I/O)       │  │ (stockfish-worker.ts)   │  │
│  │ - writeFile()        │  │ - UCI message passing   │  │
│  │ - readFile()         │  │ - Non-blocking analysis │  │
│  │ - createDirectory()  │  │ - 7MB WASM module       │  │
│  └──────────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Component Changes

### 1. Data Storage Service

**File:** `src/frontend/services/data-storage.ts` (migrated from
`src/backend/data-storage.ts`)

**Changes:**

1. Replace all `Bun.write()` calls with `Neutralino.filesystem.writeFile()`
2. Replace `Bun.file().json()` with `Neutralino.filesystem.readFile()` +
   `JSON.parse()`
3. Replace `Bun.file().exists()` with try/catch
   `Neutralino.filesystem.getStats()`
4. Replace `import('fs/promises').readdir()` with
   `Neutralino.filesystem.readDirectory()`
5. Replace `import('fs/promises').rename()` with write + delete (no atomic
   rename)
6. Update path handling to use `Neutralino.os.getPath()` for user data directory
7. Remove in-memory fallback mode (lines 148-160, 252-256, 273-279, 286-300)

**Key Method Adaptations:**

```typescript
// BEFORE (Bun backend):
private async atomicWrite(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await Bun.write(tempPath, data);
  const fs = await import('fs/promises');
  await fs.rename(tempPath, filePath);
}

// AFTER (Neutralino frontend):
private async atomicWrite(filePath: string, data: string): Promise<void> {
  // Neutralino doesn't have atomic rename, but writes are atomic
  await Neutralino.filesystem.writeFile(filePath, data);
}
```

```typescript
// BEFORE (Bun backend):
private async readJson<T>(filePath: string): Promise<T | null> {
  try {
    const file = Bun.file(filePath);
    return (await file.json()) as T;
  } catch {
    return null;
  }
}

// AFTER (Neutralino frontend):
private async readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await Neutralino.filesystem.readFile(filePath);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
```

```typescript
// BEFORE (Bun backend):
private getBasePathInternal(): string {
  const platform = process.platform;
  switch (platform) {
    case 'win32':
      return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), APP_FOLDER);
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', APP_FOLDER);
    default:
      return join(homedir(), '.local', 'share', APP_FOLDER.toLowerCase());
  }
}

// AFTER (Neutralino frontend):
private async getBasePathInternal(): Promise<string> {
  // Use Neutralino's cross-platform path API
  const appDataPath = await Neutralino.os.getPath('data');
  return `${appDataPath}/Chess-Sensei`;
}
```

**Affected Methods (24 total):**

- `initialize()` - Replace directory creation
- `atomicWrite()` - Simplify (no temp file needed)
- `readJson()` - Use Neutralino.filesystem.readFile
- `getBasePathInternal()` - Use Neutralino.os.getPath
- `ensureDirectory()` - Use Neutralino.filesystem.createDirectory
- `getAllGamesData()` - Load from Neutralino filesystem
- `getAllAnalysesData()` - Load from Neutralino filesystem
- `cleanupOldBackups()` - Use Neutralino.filesystem for file operations
- `listBackups()` - Use Neutralino.filesystem.readDirectory

---

### 2. Stockfish WebWorker

**File:** `src/frontend/workers/stockfish-worker.ts` (NEW)

**Purpose:** Run Stockfish WASM in background thread for non-blocking analysis

**Implementation:**

```typescript
/**
 * Stockfish WebWorker
 * Runs chess engine analysis in background thread to keep UI responsive
 */

// Import Stockfish WASM
importScripts('/stockfish/stockfish-17.1-lite-single-03e3232.js');

let stockfish: any = null;
let messageQueue: string[] = [];
let currentPromiseResolve: ((value: string) => void) | null = null;

// Initialize Stockfish engine
async function initializeEngine() {
  if (stockfish) return;

  // Stockfish() is provided by the imported script
  stockfish = Stockfish();

  // Set up UCI output handler
  stockfish.addMessageListener((line: string) => {
    if (
      currentPromiseResolve &&
      (line.startsWith('bestmove') || line.startsWith('info score'))
    ) {
      messageQueue.push(line);

      // If this is a bestmove, resolve the promise
      if (line.startsWith('bestmove')) {
        const result = messageQueue.join('\n');
        messageQueue = [];
        currentPromiseResolve(result);
        currentPromiseResolve = null;
      }
    }
  });

  // Initialize engine
  stockfish.postMessage('uci');
  await waitForResponse('uciok');
  stockfish.postMessage('isready');
  await waitForResponse('readyok');
}

// Wait for specific UCI response
function waitForResponse(expectedResponse: string): Promise<void> {
  return new Promise((resolve) => {
    const checkResponse = (line: string) => {
      if (line.includes(expectedResponse)) {
        stockfish.removeMessageListener(checkResponse);
        resolve();
      }
    };
    stockfish.addMessageListener(checkResponse);
  });
}

// Send UCI command and wait for result
async function sendCommand(command: string): Promise<string> {
  return new Promise((resolve) => {
    currentPromiseResolve = resolve;
    messageQueue = [];
    stockfish.postMessage(command);
  });
}

// Handle messages from main thread
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, payload, requestId } = e.data;

  try {
    if (!stockfish) {
      await initializeEngine();
    }

    switch (type) {
      case 'SET_POSITION': {
        const { fen, moves } = payload;
        let cmd = `position fen ${fen}`;
        if (moves && moves.length > 0) {
          cmd += ` moves ${moves.join(' ')}`;
        }
        stockfish.postMessage(cmd);
        self.postMessage({ type: 'SUCCESS', requestId });
        break;
      }

      case 'GET_BEST_MOVES': {
        const { depth, movetime, count } = payload;

        // Set MultiPV if requesting multiple moves
        if (count > 1) {
          stockfish.postMessage(`setoption name MultiPV value ${count}`);
        }

        // Start analysis
        let cmd = 'go';
        if (depth) cmd += ` depth ${depth}`;
        if (movetime) cmd += ` movetime ${movetime}`;

        const result = await sendCommand(cmd);

        // Parse UCI output to extract best moves
        const moves = parseUCIOutput(result);

        self.postMessage({
          type: 'BEST_MOVES_RESULT',
          requestId,
          payload: { moves },
        });
        break;
      }

      case 'EVALUATE_POSITION': {
        const { depth, movetime } = payload;

        let cmd = 'go';
        if (depth) cmd += ` depth ${depth}`;
        if (movetime) cmd += ` movetime ${movetime}`;

        const result = await sendCommand(cmd);
        const evaluation = parseEvaluation(result);

        self.postMessage({
          type: 'EVALUATION_RESULT',
          requestId,
          payload: { evaluation },
        });
        break;
      }

      case 'ANALYZE_MOVE': {
        const { fen, playedMove, depth } = payload;

        // Analyze position before move
        stockfish.postMessage(`position fen ${fen}`);
        const beforeResult = await sendCommand(`go depth ${depth || 15}`);
        const evalBefore = parseEvaluation(beforeResult);

        // Analyze position after move
        stockfish.postMessage(`position fen ${fen} moves ${playedMove}`);
        const afterResult = await sendCommand(`go depth ${depth || 15}`);
        const evalAfter = parseEvaluation(afterResult);

        // Calculate centipawn loss
        const cpl = Math.max(0, evalBefore.score - evalAfter.score);

        self.postMessage({
          type: 'MOVE_ANALYSIS_RESULT',
          requestId,
          payload: {
            centipawnLoss: cpl,
            evaluationBefore: evalBefore.score,
            evaluationAfter: evalAfter.score,
          },
        });
        break;
      }

      case 'SET_OPTION': {
        const { name, value } = payload;
        stockfish.postMessage(`setoption name ${name} value ${value}`);
        self.postMessage({ type: 'SUCCESS', requestId });
        break;
      }

      case 'NEW_GAME': {
        stockfish.postMessage('ucinewgame');
        stockfish.postMessage('isready');
        await waitForResponse('readyok');
        self.postMessage({ type: 'SUCCESS', requestId });
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Parse UCI output to extract moves and scores
function parseUCIOutput(
  uciOutput: string
): Array<{ move: string; score: number }> {
  const lines = uciOutput.split('\n');
  const moves: Array<{ move: string; score: number }> = [];

  for (const line of lines) {
    if (line.startsWith('info') && line.includes('pv')) {
      const match = line.match(/score cp (-?\d+)/);
      const moveMatch = line.match(/pv (\S+)/);

      if (match && moveMatch) {
        moves.push({
          move: moveMatch[1],
          score: parseInt(match[1], 10),
        });
      }
    }
  }

  return moves;
}

// Parse UCI evaluation
function parseEvaluation(uciOutput: string): {
  score: number;
  mate: number | null;
} {
  const lines = uciOutput.split('\n');

  for (const line of lines) {
    if (line.startsWith('info') && line.includes('score')) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) {
        return { score: parseInt(cpMatch[1], 10), mate: null };
      }

      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1], 10);
        return { score: mateIn > 0 ? 10000 : -10000, mate: mateIn };
      }
    }
  }

  return { score: 0, mate: null };
}

// Signal that worker is ready
self.postMessage({ type: 'WORKER_READY' });
```

---

### 3. Stockfish Engine Wrapper

**File:** `src/frontend/services/stockfish-engine.ts` (adapted from
`src/engine/stockfish-engine.ts`)

**Changes:**

1. Replace direct Stockfish communication with WebWorker message passing
2. Add request ID tracking for async responses
3. Implement promise-based API over message passing
4. Keep same interface for compatibility with migrated services

**New Implementation:**

```typescript
/**
 * Stockfish Engine Wrapper (Frontend - WebWorker version)
 * Communicates with Stockfish running in WebWorker
 */

import type {
  BestMove,
  PositionEvaluation,
  MoveAnalysis,
  GetBestMovesOptions,
} from '../../shared/engine-types';

export class StockfishEngine {
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  private initialized = false;

  constructor() {
    this.worker = new Worker('/src/frontend/workers/stockfish-worker.ts', {
      type: 'module',
    });

    this.worker.addEventListener('message', (e: MessageEvent) => {
      const { type, requestId, payload } = e.data;

      if (type === 'WORKER_READY') {
        this.initialized = true;
        return;
      }

      const request = this.pendingRequests.get(requestId);
      if (!request) return;

      this.pendingRequests.delete(requestId);

      if (type === 'ERROR') {
        request.reject(new Error(payload.error));
      } else {
        request.resolve(payload);
      }
    });

    this.worker.addEventListener('error', (e: ErrorEvent) => {
      console.error('Stockfish WebWorker error:', e);
    });
  }

  private async sendMessage<T>(type: string, payload?: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Stockfish worker not initialized');
    }

    const requestId = this.requestId++;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker!.postMessage({ type, payload, requestId });
    });
  }

  async setPosition(fen: string, moves?: string[]): Promise<void> {
    await this.sendMessage('SET_POSITION', { fen, moves });
  }

  async getBestMoves(options: GetBestMovesOptions): Promise<BestMove[]> {
    const result = await this.sendMessage<{
      moves: Array<{ move: string; score: number }>;
    }>('GET_BEST_MOVES', options);

    return result.moves.map((m, index) => ({
      move: m.move,
      score: m.score,
      mate: null, // TODO: Parse mate scores from UCI
      rank: index + 1,
    }));
  }

  async evaluatePosition(
    options: GetBestMovesOptions
  ): Promise<PositionEvaluation> {
    const result = await this.sendMessage<{
      evaluation: { score: number; mate: number | null };
    }>('EVALUATE_POSITION', options);

    return {
      score: result.evaluation.score,
      mate: result.evaluation.mate,
      depth: options.depth || 15,
    };
  }

  async analyzeMove(
    fen: string,
    playedMove: string,
    options: GetBestMovesOptions
  ): Promise<MoveAnalysis> {
    const result = await this.sendMessage<{
      centipawnLoss: number;
      evaluationBefore: number;
      evaluationAfter: number;
    }>('ANALYZE_MOVE', { fen, playedMove, depth: options.depth });

    return {
      move: playedMove,
      centipawnLoss: result.centipawnLoss,
      evaluationBefore: result.evaluationBefore,
      evaluationAfter: result.evaluationAfter,
      classification: this.classifyMove(result.centipawnLoss),
    };
  }

  private classifyMove(
    cpl: number
  ): 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' {
    if (cpl <= 10) return 'best';
    if (cpl <= 25) return 'good';
    if (cpl <= 100) return 'inaccuracy';
    if (cpl <= 300) return 'mistake';
    return 'blunder';
  }

  async setOption(name: string, value: number | string): Promise<void> {
    await this.sendMessage('SET_OPTION', { name, value });
  }

  async newGame(): Promise<void> {
    await this.sendMessage('NEW_GAME');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export async function createEngine(): Promise<StockfishEngine> {
  const engine = new StockfishEngine();

  // Wait for worker to be ready
  await new Promise<void>((resolve) => {
    const checkReady = setInterval(() => {
      if (engine.isInitialized()) {
        clearInterval(checkReady);
        resolve();
      }
    }, 100);
  });

  return engine;
}
```

---

### 4. AI Opponent Service

**File:** `src/frontend/services/ai-opponent.ts` (migrated from
`src/backend/ai-opponent.ts`)

**Changes:**

1. **No API changes** - AI logic is pure JavaScript (no I/O)
2. Update import path for `StockfishEngine` (now in
   `src/frontend/services/stockfish-engine.ts`)
3. Update import paths for shared types (`src/shared/bot-types.ts`)
4. **No Neutralino API needed** - no file operations

**Migration:** Direct copy with updated import paths

---

### 5. Analysis Pipeline Service

**File:** `src/frontend/services/analysis-pipeline.ts` (migrated from
`src/backend/analysis-pipeline.ts`)

**Changes:**

1. **No API changes** - Analysis logic is pure computation
2. Update import path for `StockfishEngine`
3. Update import paths for shared types (`src/shared/engine-types.ts`)
4. **No Neutralino API needed** - no file operations

**Migration:** Direct copy with updated import paths

---

### 6. Metrics Calculator Service

**File:** `src/frontend/services/metrics-calculator.ts` (migrated from
`src/backend/metrics-calculator.ts`)

**Changes:**

1. **No API changes** - Pure calculation logic
2. Update import paths for types
3. **No Neutralino API needed** - no file operations

**Migration:** Direct copy with updated import paths

---

### 7. Export/Import Manager

**File:** `src/frontend/services/export-import.ts` (adapted from
`src/backend/export-import.ts`)

**Changes:**

1. Replace `import('fs/promises')` with `Neutralino.filesystem` calls
2. Replace `Bun.write()` with `Neutralino.filesystem.writeFile()`
3. Replace `Bun.file().text()` with `Neutralino.filesystem.readFile()`
4. Update PGN generation to not use Node.js APIs
5. Keep same interface for compatibility

**Key Method Adaptation:**

```typescript
// BEFORE (Bun backend):
async exportGameAsPGN(game: StoredGameData, destinationPath?: string): Promise<ExportResult> {
  const pgn = this.convertGameToPGN(game);
  const filename = `${game.gameId}.pgn`;
  const fullPath = destinationPath || join(this.basePath, 'exports', filename);

  await Bun.write(fullPath, pgn);

  return {
    success: true,
    path: fullPath,
    format: 'pgn',
    timestamp: new Date().toISOString(),
  };
}

// AFTER (Neutralino frontend):
async exportGameAsPGN(game: StoredGameData, destinationPath?: string): Promise<ExportResult> {
  const pgn = this.convertGameToPGN(game);
  const filename = `${game.gameId}.pgn`;
  const fullPath = destinationPath || `${this.basePath}/exports/${filename}`;

  await Neutralino.filesystem.writeFile(fullPath, pgn);

  return {
    success: true,
    path: fullPath,
    format: 'pgn',
    timestamp: new Date().toISOString(),
  };
}
```

---

### 8. Frontend Logger

**File:** `src/frontend/services/frontend-logger.ts` (adapted from
`src/backend/file-logger.ts`)

**Changes:**

1. Replace file logging with Neutralino.filesystem.appendFile()
2. Keep in-memory log buffer for display in UI
3. Make logging optional (controlled by settings)

**Simplified Implementation:**

```typescript
/**
 * Frontend Logger
 * Logs to Neutralino filesystem and in-memory buffer
 */

class FrontendLogger {
  private logBuffer: string[] = [];
  private enabled = false;
  private logPath = '';

  async initialize(devMode: boolean): Promise<void> {
    this.enabled = devMode;

    if (this.enabled) {
      const appDataPath = await Neutralino.os.getPath('data');
      this.logPath = `${appDataPath}/Chess-Sensei/logs/app.log`;

      // Ensure logs directory exists
      try {
        await Neutralino.filesystem.createDirectory(
          `${appDataPath}/Chess-Sensei/logs`
        );
      } catch {
        // Directory might already exist
      }
    }
  }

  log(level: string, context: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${context}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > 1000) {
      this.logBuffer.shift(); // Keep last 1000 entries
    }

    if (this.enabled) {
      // Write to file asynchronously (fire and forget)
      Neutralino.filesystem
        .appendFile(this.logPath, logEntry + '\n')
        .catch((err) => {
          console.error('Failed to write log:', err);
        });
    }

    // Also log to console in dev mode
    if (this.enabled) {
      console.log(logEntry);
    }
  }

  info(context: string, message: string, data?: any): void {
    this.log('INFO', context, message, data);
  }

  warn(context: string, message: string, data?: any): void {
    this.log('WARN', context, message, data);
  }

  error(context: string, message: string, error?: any): void {
    this.log('ERROR', context, message, error);
  }

  getLogBuffer(): string[] {
    return [...this.logBuffer];
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getLogFilePath(): string {
    return this.logPath;
  }
}

export const frontendLogger = new FrontendLogger();
```

---

### 9. Frontend Integration

**File:** `src/frontend/index.ts` (main entry point)

**Changes:**

1. Remove WebSocket IPC client import
2. Import services directly from `src/frontend/services/`
3. Replace `ipc.call()` with direct service method calls
4. Initialize services on app startup
5. Initialize Stockfish WebWorker early (before first game)

**Service Initialization:**

```typescript
// NEW: Service imports (replace IPC client)
import { createEngine, StockfishEngine } from './services/stockfish-engine';
import { AIOpponent } from './services/ai-opponent';
import { createDataStorage, DataStorage } from './services/data-storage';
import {
  createAnalysisPipeline,
  AnalysisPipeline,
} from './services/analysis-pipeline';
import {
  createMetricsCalculator,
  MetricsCalculator,
} from './services/metrics-calculator';
import {
  createExportImportManager,
  ExportImportManager,
} from './services/export-import';
import { frontendLogger } from './services/frontend-logger';

// Global service instances
let engine: StockfishEngine | null = null;
let aiOpponent: AIOpponent | null = null;
let dataStorage: DataStorage | null = null;
let analysisPipeline: AnalysisPipeline | null = null;
let metricsCalculator: MetricsCalculator | null = null;
let exportImportManager: ExportImportManager | null = null;

// Initialize services on app startup
async function initializeServices(): Promise<void> {
  frontendLogger.info('App', 'Initializing services...');

  try {
    // Initialize data storage first
    dataStorage = createDataStorage();
    await dataStorage.initialize();
    frontendLogger.info('App', 'Data storage initialized');

    // Initialize Stockfish engine
    engine = await createEngine();
    frontendLogger.info('App', 'Stockfish engine initialized');

    // Initialize other services
    metricsCalculator = createMetricsCalculator();
    exportImportManager = createExportImportManager(
      dataStorage.getStorageBasePath()
    );

    frontendLogger.info('App', 'All services initialized successfully');
  } catch (error) {
    frontendLogger.error('App', 'Service initialization failed', error);
    throw error;
  }
}

// Call on app load
Neutralino.events.on('ready', async () => {
  await initializeServices();
  // Rest of app initialization...
});
```

**Replace IPC Calls:**

```typescript
// BEFORE (WebSocket IPC):
const response = await ipc.call('chess:saveGame', { gameData });
if (!response.success) {
  throw new Error(response.error);
}

// AFTER (Direct service call):
if (!dataStorage) {
  throw new Error('Data storage not initialized');
}
await dataStorage.saveGame(gameData);
```

```typescript
// BEFORE (WebSocket IPC):
const response = await ipc.call('chess:getBotMove', { fen, moves });
if (!response.success) {
  throw new Error(response.error);
}
const move = response.move;

// AFTER (Direct service call):
if (!aiOpponent) {
  aiOpponent = new AIOpponent(engine!, {
    profile: BOT_PERSONALITIES.club_player,
    playMode: 'training',
    useTimeDelays: true,
  });
}
const result = await aiOpponent.selectMove(fen, moves);
const move = result.move;
```

---

### 10. Build Scripts

**Files:**

- `scripts/build-windows.ts`
- `scripts/build-linux.ts`
- `scripts/build-macos.ts`

**Changes:**

1. Remove Bun executable compilation step
2. Keep Vite frontend build step
3. Keep Neutralino build step
4. Update distribution file list (no Chess-Sensei.exe)

**Updated Build Flow:**

```typescript
// BEFORE (build-windows.ts):
// Step 1: Build frontend with Vite
await $`bun run build`;

// Step 2: Compile Bun backend to executable
await $`bun build src/backend/index.ts --compile --outfile build/Chess-Sensei.exe`;

// Step 3: Build Neutralino
await $`neu build --release`;

// Step 4: Copy files to distribution folder
// - Chess-Sensei.exe (111MB)
// - neutralino.exe (2.6MB)
// - resources.neu (606KB)
// - stockfish/ (7MB)

// AFTER (build-windows.ts):
// Step 1: Build frontend with Vite (includes services now)
await $`bun run build`;

// Step 2: Build Neutralino
await $`neu build --release`;

// Step 3: Copy files to distribution folder
// - neutralino.exe (2.6MB) - renamed to Chess-Sensei.exe
// - resources.neu (700-800KB) - slightly larger due to services
// - stockfish/ (7MB)

// Step 4: Rename neutralino.exe to Chess-Sensei.exe
await $`mv dist/Windows x64/Chess-Sensei/neutralino.exe dist/Windows x64/Chess-Sensei/Chess-Sensei.exe`;
```

---

## Data Model

### No Data Model Changes

**Critical:** JSON save file formats remain **100% identical** for backward
compatibility.

**Existing Formats (Unchanged):**

- `StoredGameData` - Game save format (from `data-storage.ts`)
- `StoredAnalysisData` - Analysis save format
- `PlayerProfile` - Player metrics format
- `StoredAchievements` - Achievements format
- `GamesIndex` - Game index format

**Compatibility:**

- v1.0.4 save files work seamlessly with v1.0.5+
- No migration scripts needed
- Users can downgrade without data loss

---

## API Changes

### Removed: WebSocket IPC Layer

**Deleted Files:**

- `src/backend/index.ts` - Backend entry point (2175 lines)
- `src/backend/websocket-server.ts` - WebSocket IPC server
- `src/frontend/websocket-ipc-client.ts` - Frontend IPC client
- `src/shared/ipc-types.ts` - IPC method definitions (48 methods)

**Deleted IPC Methods (48 total):**

All `IPC_METHODS` constants removed. Services now called directly.

### New: Direct Service APIs

**Services** exported from `src/frontend/services/`:

```typescript
// Data Storage Service
export interface DataStorage {
  initialize(): Promise<void>;
  saveGame(gameData: ExamGameData): Promise<string>;
  loadGame(gameId: string): Promise<StoredGameData | null>;
  saveAnalysis(analysis: GameAnalysis): Promise<string>;
  loadAnalysis(gameId: string): Promise<StoredAnalysisData | null>;
  getGamesList(): Promise<GameIndexEntry[]>;
  savePlayerProfile(profile: PlayerProfile): Promise<void>;
  loadPlayerProfile(): Promise<PlayerProfile | null>;
  // ... (24 methods total)
}

// Stockfish Engine Service (WebWorker wrapper)
export interface StockfishEngine {
  setPosition(fen: string, moves?: string[]): Promise<void>;
  getBestMoves(options: GetBestMovesOptions): Promise<BestMove[]>;
  evaluatePosition(options: GetBestMovesOptions): Promise<PositionEvaluation>;
  analyzeMove(
    fen: string,
    playedMove: string,
    options: GetBestMovesOptions
  ): Promise<MoveAnalysis>;
  setOption(name: string, value: number | string): Promise<void>;
  newGame(): Promise<void>;
  isInitialized(): boolean;
  destroy(): void;
}

// AI Opponent Service
export class AIOpponent {
  constructor(
    engine: StockfishEngine,
    config: {
      profile: BotProfile;
      playMode: AIPlayMode;
      useTimeDelays: boolean;
    }
  );
  async selectMove(
    fen: string,
    moves?: string[]
  ): Promise<{
    move: string;
    score: number;
    thinkingTime: number;
    wasWeakened: boolean;
    classification: string;
  }>;
  getProfile(): BotProfile;
  getConfig(): {
    profile: BotProfile;
    playMode: AIPlayMode;
    useTimeDelays: boolean;
  };
  // ... (6 methods total)
}

// Analysis Pipeline Service
export interface AnalysisPipeline {
  analyzeGame(gameData: ExamGameData): Promise<GameAnalysis>;
  setDeepAnalysis(deep: boolean): void;
  // ... (2 methods total)
}

// Metrics Calculator Service
export interface MetricsCalculator {
  calculateGameMetrics(
    analysis: GameAnalysis,
    playerColor: 'white' | 'black',
    botElo: number,
    result: string
  ): GameMetrics;
  calculateCompositeScores(
    metrics: GameMetrics,
    wasWinning: boolean,
    playerWon: boolean
  ): CompositeScores;
  // ... (2 methods total)
}

// Export/Import Manager Service
export interface ExportImportManager {
  exportGameAsPGN(
    game: StoredGameData,
    destinationPath?: string
  ): Promise<ExportResult>;
  exportGameAsJSON(
    game: StoredGameData,
    analysis?: StoredAnalysisData,
    destinationPath?: string
  ): Promise<ExportResult>;
  exportAllGames(
    games: StoredGameData[],
    analyses?: StoredAnalysisData[],
    destinationPath?: string
  ): Promise<ExportResult>;
  exportPlayerProfile(
    profile: PlayerProfile,
    destinationPath?: string
  ): Promise<ExportResult>;
  exportFullBackup(
    games: StoredGameData[],
    analyses: StoredAnalysisData[],
    profile: PlayerProfile | null,
    destinationPath?: string
  ): Promise<ExportResult>;
  importGameFromJSON(
    filePath: string,
    existingIds: Set<string>
  ): Promise<ImportResult>;
  importBatchGames(
    filePath: string,
    existingIds: Set<string>
  ): Promise<ImportResult>;
  importFromPGN(filePath: string): Promise<ImportResult>;
  mergePlayerProfiles(
    current: PlayerProfile,
    incoming: PlayerProfile
  ): Promise<PlayerProfile>;
  getExportsPath(): string;
  // ... (10 methods total)
}
```

---

## UI Changes

**No UI changes** - User interface remains identical. Migration is purely
architectural.

---

## State Management

**Current State Management (Unchanged):**

- Global variables in `src/frontend/index.ts` for game state
- Service instances stored in global variables
- No state management framework (React/Redux) introduced

**New Service State:**

```typescript
// Global service instances (replace IPC client)
let engine: StockfishEngine | null = null;
let aiOpponent: AIOpponent | null = null;
let dataStorage: DataStorage | null = null;
let analysisPipeline: AnalysisPipeline | null = null;
let metricsCalculator: MetricsCalculator | null = null;
let exportImportManager: ExportImportManager | null = null;
```

---

## Error Handling

| Error Condition                         | Handling Strategy                                                          | User Feedback                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Stockfish WebWorker fails to load       | Show error modal, disable AI features, allow sandbox mode                  | "Chess engine failed to load. AI features unavailable."          |
| Neutralino.filesystem permission denied | Request permissions via Neutralino.os.showDialog, retry or disable storage | "File access denied. Grant permissions to save games."           |
| Data storage initialization fails       | Continue with in-memory mode (data lost on exit), show warning             | "⚠️ Running in temporary mode. Data will not be saved."          |
| Service call throws exception           | Catch at call site, log error, show user-friendly message                  | "Failed to save game. Please try again."                         |
| Stockfish WebWorker crashes             | Reinitialize worker, show loading indicator                                | "Chess engine restarting..."                                     |
| File write fails (disk full)            | Show error, offer export to different location                             | "Disk full. Export games to external drive?"                     |
| Corrupted save file                     | Show warning, skip file, continue loading other games                      | "Game file corrupted, skipped. Other games loaded successfully." |
| Neutralino API unavailable (old ver.)   | Detect at startup, show error, prompt user to update                       | "Outdated app version. Please update Chess-Sensei."              |

---

## Implementation Plan

### Phase Breakdown

#### Phase 1: Backend Service Migration (Days 1-2)

**Scope:**

- Create `src/frontend/services/` directory
- Copy backend services to frontend services:
  - `ai-opponent.ts` (direct copy + import path updates)
  - `analysis-pipeline.ts` (direct copy + import path updates)
  - `metrics-calculator.ts` (direct copy + import path updates)
  - `data-storage.ts` (adapt for Neutralino.filesystem)
  - `export-import.ts` (adapt for Neutralino.filesystem)
  - `frontend-logger.ts` (new implementation)
- Update import paths in migrated services
- Adapt `data-storage.ts`:
  - Replace `Bun.write()` → `Neutralino.filesystem.writeFile()`
  - Replace `Bun.file().json()` → `Neutralino.filesystem.readFile()` +
    `JSON.parse()`
  - Replace `Bun.file().exists()` → try/catch `Neutralino.filesystem.getStats()`
  - Replace `import('fs/promises')` → `Neutralino.filesystem` equivalents
  - Update `getBasePathInternal()` to use `Neutralino.os.getPath('data')`
- Adapt `export-import.ts`:
  - Replace Node.js fs with Neutralino.filesystem
  - Update file path handling

**Dependencies:** None

**Files Changed:**

- `src/frontend/services/ai-opponent.ts` (new)
- `src/frontend/services/analysis-pipeline.ts` (new)
- `src/frontend/services/metrics-calculator.ts` (new)
- `src/frontend/services/data-storage.ts` (new)
- `src/frontend/services/export-import.ts` (new)
- `src/frontend/services/frontend-logger.ts` (new)

#### Phase 2: Stockfish WebWorker (Day 2)

**Scope:**

- Create `src/frontend/workers/stockfish-worker.ts`
  - Import Stockfish WASM script
  - Implement UCI message passing
  - Parse UCI output (best moves, evaluations)
  - Handle error cases
- Create `src/frontend/services/stockfish-engine.ts`
  - WebWorker wrapper API
  - Promise-based interface
  - Request ID tracking
  - Message routing
- Test engine analysis quality (compare output with backend version)

**Dependencies:** Phase 1

**Files Changed:**

- `src/frontend/workers/stockfish-worker.ts` (new)
- `src/frontend/services/stockfish-engine.ts` (new)

#### Phase 3: Remove WebSocket IPC (Day 3)

**Scope:**

- Update `src/frontend/index.ts`:
  - Remove `websocket-ipc-client.ts` import
  - Import services from `src/frontend/services/`
  - Add service initialization on app startup
  - Replace all `ipc.call()` with direct service calls (48 replacements)
- Update game modes:
  - `training-mode.ts` - Replace IPC calls
  - `exam-mode.ts` - Replace IPC calls
  - `sandbox-mode.ts` - Replace IPC calls
- Update UI modules:
  - `progress-dashboard.ts` - Replace IPC calls
  - `move-guidance.ts` - Replace IPC calls
  - `analysis-ui.ts` - Replace IPC calls
- Delete obsolete files:
  - `src/backend/` (entire directory)
  - `src/frontend/websocket-ipc-client.ts`
  - `src/shared/ipc-types.ts` (IPC_METHODS no longer needed)

**Dependencies:** Phase 2

**Files Changed:**

- `src/frontend/index.ts` (modify)
- `src/frontend/training-mode.ts` (modify)
- `src/frontend/exam-mode.ts` (modify)
- `src/frontend/sandbox-mode.ts` (modify)
- `src/frontend/progress-dashboard.ts` (modify)
- `src/frontend/move-guidance.ts` (modify)
- `src/frontend/analysis-ui.ts` (modify)
- `src/backend/` (delete entire directory)
- `src/frontend/websocket-ipc-client.ts` (delete)

#### Phase 4: Update Build Scripts (Day 3)

**Scope:**

- Update `scripts/build-windows.ts`:
  - Remove Bun executable compilation step
  - Keep Vite frontend build
  - Keep Neutralino build
  - Rename `neutralino.exe` → `Chess-Sensei.exe`
  - Update file copy operations
- Update `scripts/build-linux.ts` (same changes)
- Update `scripts/build-macos.ts` (same changes)
- Update `neutralino.config.json` if needed
- Test builds on all platforms

**Dependencies:** Phase 3

**Files Changed:**

- `scripts/build-windows.ts` (modify)
- `scripts/build-linux.ts` (modify)
- `scripts/build-macos.ts` (modify)

#### Phase 5: Testing & Validation (Day 4)

**Scope:**

- Run full test suite: `bun run verify`
  - Unit tests for migrated services
  - Integration tests for file I/O
  - Test Stockfish WebWorker
- Manual testing:
  - Training mode (all bot personalities)
  - Exam mode (game save, analysis, metrics)
  - Sandbox mode (FEN import/export)
  - Progress dashboard (load history, achievements)
  - Export/Import (PGN, JSON, full backup)
- Cross-platform build testing:
  - Windows: Test `Chess-Sensei.exe` startup, file I/O
  - Linux: Test executable, permissions
  - macOS: Test executable, app bundle
- Performance benchmarking:
  - Measure app startup time (<1s target)
  - Measure Stockfish WebWorker analysis time (should match backend)
  - Measure file I/O performance
- Data migration testing:
  - Load v1.0.4 save files (100% compatibility required)
  - Verify no data corruption
  - Test with large game history (1000+ games)

**Dependencies:** Phase 4

**Testing Strategy:** See "Testing Strategy" section below

#### Phase 6: Documentation Update (Day 4)

**Scope:**

- Update `README.md`:
  - Remove backend architecture description
  - Update "How It Works" section (Pure Neutralino App)
  - Update distribution size (121MB → ~10MB)
- Update `CHANGELOG.md`:
  - Add v1.0.5 entry documenting architecture migration
  - List size reduction (111MB savings)
  - Note 100% backward compatibility
- Update `documents/troubleshooting.md`:
  - Add Stockfish WebWorker troubleshooting section
  - Add Neutralino.filesystem permission issues
- Update `.github/specs/` documents if needed

**Dependencies:** Phase 5

**Files Changed:**

- `README.md` (modify)
- `CHANGELOG.md` (modify)
- `documents/troubleshooting.md` (modify)

---

### File Changes Summary

| File                                          | Action | Description                                    |
| --------------------------------------------- | ------ | ---------------------------------------------- |
| `src/frontend/services/ai-opponent.ts`        | Create | Migrated from backend, import paths updated    |
| `src/frontend/services/analysis-pipeline.ts`  | Create | Migrated from backend, import paths updated    |
| `src/frontend/services/metrics-calculator.ts` | Create | Migrated from backend, import paths updated    |
| `src/frontend/services/data-storage.ts`       | Create | Adapted for Neutralino.filesystem              |
| `src/frontend/services/export-import.ts`      | Create | Adapted for Neutralino.filesystem              |
| `src/frontend/services/frontend-logger.ts`    | Create | New implementation using Neutralino.filesystem |
| `src/frontend/services/stockfish-engine.ts`   | Create | WebWorker wrapper API                          |
| `src/frontend/workers/stockfish-worker.ts`    | Create | Stockfish WASM WebWorker                       |
| `src/frontend/index.ts`                       | Modify | Remove IPC, add service calls                  |
| `src/frontend/training-mode.ts`               | Modify | Replace IPC calls with service calls           |
| `src/frontend/exam-mode.ts`                   | Modify | Replace IPC calls with service calls           |
| `src/frontend/sandbox-mode.ts`                | Modify | Replace IPC calls with service calls           |
| `src/frontend/progress-dashboard.ts`          | Modify | Replace IPC calls with service calls           |
| `src/frontend/move-guidance.ts`               | Modify | Replace IPC calls with service calls           |
| `src/frontend/analysis-ui.ts`                 | Modify | Replace IPC calls with service calls           |
| `src/backend/` (entire directory)             | Delete | Backend no longer needed                       |
| `src/frontend/websocket-ipc-client.ts`        | Delete | IPC removed                                    |
| `scripts/build-windows.ts`                    | Modify | Remove Bun exe compilation                     |
| `scripts/build-linux.ts`                      | Modify | Remove Bun exe compilation                     |
| `scripts/build-macos.ts`                      | Modify | Remove Bun exe compilation                     |
| `README.md`                                   | Modify | Update architecture description                |
| `CHANGELOG.md`                                | Modify | Add v1.0.5 entry                               |
| `documents/troubleshooting.md`                | Modify | Add WebWorker troubleshooting                  |

---

## Testing Strategy

### Unit Tests

| Test Case                                  | File                                             | Description                           |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------- |
| `test-data-storage-neutralino`             | `tests/unit/services/data-storage.test.ts`       | Test Neutralino.filesystem adaptation |
| `test-stockfish-webworker-initialization`  | `tests/unit/services/stockfish-engine.test.ts`   | Test WebWorker initialization         |
| `test-stockfish-webworker-best-moves`      | `tests/unit/services/stockfish-engine.test.ts`   | Test best move calculation            |
| `test-stockfish-webworker-evaluation`      | `tests/unit/services/stockfish-engine.test.ts`   | Test position evaluation              |
| `test-stockfish-webworker-move-analysis`   | `tests/unit/services/stockfish-engine.test.ts`   | Test move analysis (CPL calculation)  |
| `test-ai-opponent-move-selection`          | `tests/unit/services/ai-opponent.test.ts`        | Test bot move selection logic         |
| `test-analysis-pipeline-game-analysis`     | `tests/unit/services/analysis-pipeline.test.ts`  | Test full game analysis               |
| `test-metrics-calculator-composite-scores` | `tests/unit/services/metrics-calculator.test.ts` | Test 9 composite score calculations   |
| `test-export-import-pgn`                   | `tests/unit/services/export-import.test.ts`      | Test PGN export/import                |
| `test-export-import-json`                  | `tests/unit/services/export-import.test.ts`      | Test JSON export/import               |
| `test-frontend-logger-file-write`          | `tests/unit/services/frontend-logger.test.ts`    | Test log file writing                 |

### Integration Tests

| Test Case                                      | Description                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `test-full-game-flow`                          | Play Training mode game, save, load, verify data                    |
| `test-exam-mode-analysis`                      | Play Exam mode game, analyze, calculate metrics, save               |
| `test-progress-dashboard-load`                 | Load player profile with 100+ games, verify metrics displayed       |
| `test-export-import-round-trip`                | Export games as PGN, import back, verify data integrity             |
| `test-backup-restore-flow`                     | Create backup, simulate data loss, restore, verify games intact     |
| `test-stockfish-webworker-concurrent-requests` | Send multiple analysis requests simultaneously, verify no conflicts |
| `test-file-io-large-dataset`                   | Save/load 1000+ games, measure performance                          |
| `test-backward-compatibility`                  | Load v1.0.4 save files, verify 100% compatibility                   |

### Manual Test Cases

| ID    | Steps                                                                  | Expected Result                                               |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| MT-1  | Launch app, verify startup time                                        | App loads in <1s, Stockfish WebWorker initialized             |
| MT-2  | Start Training mode game, make 5 moves, verify move guidance appears   | Blue/Green/Yellow hints show correctly, no UI freezing        |
| MT-3  | Complete Exam mode game, verify post-game analysis runs                | Analysis completes, metrics calculated, dashboard updated     |
| MT-4  | Go to Player Progress, load game history with 50+ games                | Dashboard loads quickly, charts render correctly              |
| MT-5  | Export game as PGN, open in external chess app (e.g., Lichess)         | PGN opens correctly, moves display properly                   |
| MT-6  | Import PGN from external source, verify game loads                     | Game imports successfully, analysis available                 |
| MT-7  | Create full backup, delete save folder, restore from backup            | All games restored, no data loss                              |
| MT-8  | Play rapid game (30 moves in 2 minutes), verify no UI lag              | UI stays responsive, Stockfish analysis doesn't block         |
| MT-9  | Test on Windows: Check file paths, verify %APPDATA% storage            | Files saved to %APPDATA%\Chess-Sensei\                        |
| MT-10 | Test on macOS: Check file paths, verify ~/Library/Application Support/ | Files saved to ~/Library/Application Support/Chess-Sensei/    |
| MT-11 | Test on Linux: Check file paths, verify ~/.local/share/                | Files saved to ~/.local/share/chess-sensei/                   |
| MT-12 | Deny Neutralino.filesystem permissions, verify graceful error handling | Error message shown, option to grant permissions              |
| MT-13 | Fill disk to capacity, attempt to save game                            | Error message: "Disk full", offer export to external location |
| MT-14 | Close app during file write, reopen, verify no corruption              | No data corruption, last game saved correctly                 |
| MT-15 | Load v1.0.4 save files (from previous version), verify compatibility   | All v1.0.4 games load successfully, analysis intact           |

---

## Performance Considerations

### Expected Impact

**Improvements:**

- **App startup time**: 2s → <1s (no backend process startup)
- **Memory usage**: ~150MB → <100MB (single process)
- **Distribution size**: 121MB → ~10MB (92% reduction)
- **IPC latency**: ~5-10ms → 0ms (direct function calls)

**Potential Concerns:**

- **Frontend bundle size**: 606KB → 700-800KB (+100-200KB services)
- **Stockfish WebWorker**: First analysis may take 100-200ms to initialize
- **File I/O**: Neutralino.filesystem may be slightly slower than Bun.file
  (negligible)

### Benchmarks

**Before Migration:**

```text
Metric                      Current (v1.0.4)
-----------------------------------------
App startup time            ~2s
Distribution size           121MB
Memory usage (startup)      ~150MB
IPC call latency            ~5-10ms
Stockfish analysis (depth 15) ~800ms
Game save time              ~50ms
Dashboard load (100 games)  ~300ms
```

**After Migration (Target):**

```text
Metric                      Target (v1.0.5)
-----------------------------------------
App startup time            <1s
Distribution size           <15MB
Memory usage (startup)      <100MB
IPC call latency            0ms (direct calls)
Stockfish analysis (depth 15) ~800ms (unchanged)
Game save time              ~50ms (unchanged)
Dashboard load (100 games)  ~300ms (unchanged)
```

**Measurement Method:**

- Use `performance.now()` for timing measurements
- Log startup time from `Neutralino.events.on('ready')` to services initialized
- Benchmark Stockfish WebWorker with 10 position analyses, average time
- Test file I/O with 100 game saves/loads, measure average time
- Measure memory usage via Chrome DevTools (Neutralino runs in Chromium)

---

## Security Considerations

- [x] No user data exposed (data remains local, Neutralino.filesystem access
      controlled)
- [x] Input validation added (Neutralino.filesystem paths validated, no
      directory traversal)
- [x] No new attack vectors (eliminated WebSocket IPC port 9339)
- [x] Reduced attack surface (no backend executable, no network communication)
- [x] Same origin policy enforced (Neutralino apps sandboxed)

**Security Improvements:**

1. **No WebSocket port**: Port 9339 no longer exposed, eliminates potential RCE
   via IPC
2. **No backend process**: Cannot exploit backend vulnerabilities (no process to
   target)
3. **Neutralino sandboxing**: Neutralino.filesystem access controlled by OS
   permissions
4. **Smaller distribution**: Less code = smaller attack surface

**Security Risks:**

- **None identified** - Migration reduces attack surface

---

## Rollout Plan

### Feature Flags

Not applicable - architecture migration is all-or-nothing.

### Rollback Plan

**If critical issues found post-release:**

1. **Immediate**: Remove v1.0.5 release from GitHub releases
2. **Notify users**: Post notice recommending v1.0.4 until fixed
3. **Rollback approach**:
   - Users can download v1.0.4 installer
   - Save data is 100% compatible (JSON format unchanged)
   - No data migration needed
4. **Fix forward**: Address issues, re-release v1.0.5 when stable

**Data Safety:**

- v1.0.5 uses identical JSON save format as v1.0.4
- Users can switch between versions without data loss
- Backup feature allows users to export data before upgrading

---

## Alternatives Considered

### Option 1: Use Node.js Runtime (Instead of Bun)

**Approach:** Replace 111MB Bun runtime with ~15-20MB Node.js runtime

**Pros:**

- Smaller than Bun (15-20MB vs 111MB)
- Maintains backend/frontend separation
- Less code migration required

**Cons:**

- Still 15-20MB of unnecessary runtime
- Maintains WebSocket IPC complexity
- Doesn't follow Neutralino design philosophy
- Doesn't achieve optimal size reduction

**Why rejected:** Pure Neutralino approach is simpler and achieves better
results (0MB vs 15MB)

### Option 2: Native Backend (Rust/Go)

**Approach:** Rewrite backend in Rust or Go, compile to ~5-10MB native
executable

**Pros:**

- Smallest possible backend (~5-10MB)
- Best performance
- No runtime overhead

**Cons:**

- Complete backend rewrite (2-4 weeks)
- Requires Rust/Go expertise
- High risk for stable project
- Violates "stability over features" principle

**Why rejected:** Too risky and time-consuming for marginal benefit (5MB vs 0MB)

### Option 3: Electron Framework

**Approach:** Migrate entire app to Electron

**Pros:**

- Familiar to many developers
- Large ecosystem
- Chrome DevTools built-in

**Cons:**

- Even larger runtime (~150MB with Chromium)
- Goes in wrong direction (larger, not smaller)
- Requires complete rewrite

**Why rejected:** Makes the problem worse, not better

### Option 4: Keep Dual-Process Architecture

**Approach:** Do nothing, accept 111MB distribution size

**Pros:**

- No development effort
- Zero risk

**Cons:**

- 121MB distribution is excessive for a chess app
- Hurts adoption (slow downloads, storage concerns)
- Architecture doesn't align with Neutralino design
- WebSocket IPC adds unnecessary complexity

**Why rejected:** Size is a major user pain point that needs addressing

---

## Dependencies

### External Dependencies

No new external dependencies. All dependencies unchanged:

| Dependency          | Version | License | Purpose                |
| ------------------- | ------- | ------- | ---------------------- |
| `@neutralinojs/lib` | ^6.4.0  | MIT     | Neutralino API client  |
| `chess.js`          | ^1.4.0  | BSD     | Chess game logic       |
| `stockfish.wasm`    | ^0.10.0 | GPL-3.0 | Stockfish WASM wrapper |

### Internal Dependencies

**Services depend on each other:**

```text
index.ts (UI)
  ├─→ data-storage.ts
  ├─→ stockfish-engine.ts
  │     └─→ stockfish-worker.ts
  ├─→ ai-opponent.ts
  │     └─→ stockfish-engine.ts
  ├─→ analysis-pipeline.ts
  │     └─→ stockfish-engine.ts
  ├─→ metrics-calculator.ts
  │     └─→ analysis-pipeline.ts
  └─→ export-import.ts
        └─→ data-storage.ts
```

**Neutralino API Requirements:**

- Neutralino 6.4.0+ required (for `Neutralino.filesystem` API)
- Neutralino.os.getPath() for cross-platform data paths
- Neutralino.filesystem.writeFile() for file I/O
- Neutralino.filesystem.readFile() for file I/O
- Neutralino.filesystem.createDirectory() for directory creation

---

## Open Questions

1. **Neutralino.filesystem performance**: Does Neutralino.filesystem match
   Bun.file performance for large JSON writes (1000+ games)?
   - **Resolution needed**: Benchmark before Phase 5
   - **If slower**: Consider caching in memory, batch writes

2. **WebWorker Stockfish initialization time**: How long does Stockfish WASM
   take to initialize in WebWorker?
   - **Resolution needed**: Measure during Phase 2 implementation
   - **If >500ms**: Show loading indicator, initialize on app startup

3. **Neutralino.filesystem atomic writes**: Does Neutralino support atomic file
   writes (no corruption on crash)?
   - **Resolution needed**: Test during Phase 5
   - **If no**: Implement write-verify-rename pattern

4. **Cross-platform path handling**: Are Neutralino.os.getPath() paths
   consistent across Windows/macOS/Linux?
   - **Resolution needed**: Test on all platforms during Phase 5
   - **If inconsistent**: Add platform-specific path handling

5. **WebWorker memory usage**: Does Stockfish WebWorker add significant memory
   overhead?
   - **Resolution needed**: Measure memory during Phase 5
   - **Target**: <30MB for WebWorker

6. **Bundle size threshold**: At what frontend bundle size should we consider
   code splitting?
   - **Resolution needed**: Monitor bundle after Phase 1-3
   - **Threshold**: If >1MB, consider lazy loading services

7. **Error recovery**: Can Stockfish WebWorker recover from crashes without
   restarting app?
   - **Resolution needed**: Test crash scenarios during Phase 5
   - **Implementation**: Automatic worker re-initialization on crash

8. **File watching**: Should we watch save files for external changes
   (multi-device sync)?
   - **Resolution needed**: After Phase 5 (Phase 2 optimization)
   - **Decision**: Defer to Phase 2 (not critical for v1.0.5)

---

## Risks

| Risk                                            | Likelihood | Impact | Mitigation                                                              |
| ----------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| Stockfish WASM slower in WebWorker              | Low        | Medium | Benchmark early (Phase 2), WebWorkers typically same performance        |
| Neutralino.filesystem API issues                | Medium     | High   | Thorough testing (Phase 5), create filesystem abstraction layer         |
| Existing save data incompatibility              | Low        | High   | Use identical JSON format, test migration with v1.0.4 data              |
| Frontend bundle becomes too large (>1MB)        | Medium     | Low    | Monitor bundle size, services are <200KB, still acceptable              |
| WebSocket IPC removal breaks something          | Medium     | High   | Comprehensive testing (Phase 5), maintain feature parity checklist      |
| Build script changes break cross-platform build | Low        | Medium | Test on all platforms before finalizing (Phase 5)                       |
| Development workflow disrupted                  | Low        | Low    | Bun remains for dev, only production runtime changes                    |
| UI blocking during Stockfish initialization     | Medium     | Medium | Add loading states, initialize WebWorker early (on app startup)         |
| File I/O errors on some platforms               | Medium     | Medium | Robust error handling, fallback to in-memory for critical operations    |
| Regression in AI opponent behavior              | Low        | Medium | Unit tests for AI logic, manual testing of all personalities            |
| Analysis quality degradation                    | Low        | High   | Automated tests comparing engine output before/after (Phase 5)          |
| User confusion from different file structure    | Low        | Low    | No user-visible changes, internals only                                 |
| Performance regression (slower than v1.0.4)     | Low        | High   | Benchmark all operations (Phase 5), target: equal or better performance |
| Memory leak in WebWorker                        | Low        | Medium | Test long-running sessions (100+ games), monitor memory usage           |

---

## Approval

| Role       | Name | Date | Status  |
| ---------- | ---- | ---- | ------- |
| Tech Lead  | User |      | Pending |
| Reviewer 1 |      |      | Pending |
| Reviewer 2 |      |      | Pending |

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2026-01-06 | Claude | Initial draft |
