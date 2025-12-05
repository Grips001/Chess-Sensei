# Chess Engine Integration Guide

This document describes the chess engine integration implemented in Phase 1 of
Chess-Sensei development.

## Overview

Chess-Sensei uses Stockfish 17.1 WASM (WebAssembly) as its chess engine,
providing powerful analysis capabilities without requiring a separate engine
installation. The engine runs entirely within the application.

## Engine Selection

**Build**: Stockfish 17.1 NNUE Lite Single-threaded

- **Package**: `stockfish` npm package v17.1
- **Variant**: NNUE Lite Single-threaded (~7MB WASM)
- **Benefits**:
  - No external dependencies
  - Cross-platform compatibility
  - Strong NNUE evaluation
  - Single-threaded for predictable performance

See [STOCKFISH_SELECTION.md](../src/engine/STOCKFISH_SELECTION.md) for detailed
selection rationale.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Neutralino)                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Buntralino IPC                      │  │
│  │  requestBestMoves, evaluatePosition, analyzeMove     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Bun)                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              StockfishEngine Class                    │  │
│  │  - setPosition(), getBestMoves(), analyzeMove()      │  │
│  │  - evaluatePosition(), setOption()                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Stockfish WASM Module                    │  │
│  │  - UCI Protocol (position, go, info, bestmove)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Stockfish Loader (`src/engine/stockfish-loader.ts`)

Handles loading the Stockfish WASM module in Bun's runtime:

- Polyfills browser globals for compatibility
- Provides clean interface for UCI communication
- Uses Emscripten's `ccall()` for command execution
- **Compiled mode**: Loads stockfish files from `stockfish/` directory next to
  executable (Bun's bundler cannot correctly bundle the stockfish.js IIFE module
  pattern)

### 2. Stockfish Engine (`src/engine/stockfish-engine.ts`)

High-level engine interface implementing:

- **Position Management**: `setPosition(fen, moves)`
- **Move Analysis**: `getBestMoves(options)`, `analyzeMove()`
- **Position Evaluation**: `evaluatePosition()`
- **Engine Control**: `init()`, `quit()`, `newGame()`

### 3. Chess Logic (`src/shared/chess-logic.ts`)

Chess.js wrapper providing:

- Move validation and generation
- FEN parsing and generation
- PGN import/export
- Board state management

### 4. IPC Types (`src/shared/ipc-types.ts`)

TypeScript interfaces for frontend-backend communication:

```typescript
interface PositionRequest {
  fen: string;
  moves?: string[];
  depth?: number;
  movetime?: number;
  count?: number;
}

interface BestMovesResponse {
  moves: BestMove[];
  success: true;
}
```

## IPC Methods

The following methods are available via Buntralino IPC:

### Core Engine Methods (Phase 1)

| Method             | Description                   | Request              | Response               |
| ------------------ | ----------------------------- | -------------------- | ---------------------- |
| `requestBestMoves` | Get top N moves for position  | `PositionRequest`    | `BestMovesResponse`    |
| `evaluatePosition` | Full position evaluation      | `PositionRequest`    | `EvaluationResponse`   |
| `analyzeMove`      | Analyze a played move (CPL)   | `AnalyzeMoveRequest` | `MoveAnalysisResponse` |
| `getGuidanceMoves` | Top 3 moves for Training Mode | `PositionRequest`    | `BestMovesResponse`    |
| `startNewGame`     | Reset engine state            | none                 | `SuccessResponse`      |
| `setSkillLevel`    | Set engine difficulty (0-20)  | `{ level: number }`  | `SuccessResponse`      |
| `getEngineStatus`  | Check engine state            | none                 | `EngineStatusResponse` |

### AI Opponent Methods (Phase 3)

| Method                 | Description                          | Request               | Response                    |
| ---------------------- | ------------------------------------ | --------------------- | --------------------------- |
| `configureBot`         | Configure bot personality/difficulty | `ConfigureBotRequest` | `BotConfigResponse`         |
| `getBotMove`           | Get AI opponent's move               | `BotMoveRequest`      | `BotMoveResponse`           |
| `getBotProfiles`       | List all bot personalities           | none                  | `BotProfilesResponse`       |
| `getCurrentBotConfig`  | Get current bot configuration        | none                  | `BotConfigResponse`         |
| `getDifficultyPresets` | Get difficulty preset options        | none                  | `DifficultyPresetsResponse` |

### Analysis & Storage Methods (Phase 4)

| Method              | Description                      | Request                   | Response                 |
| ------------------- | -------------------------------- | ------------------------- | ------------------------ |
| `analyzeGame`       | Run post-game analysis pipeline  | `AnalyzeGameRequest`      | `GameAnalysisResponse`   |
| `getAnalysisConfig` | Get analysis depth configuration | none                      | `AnalysisConfigResponse` |
| `calculateMetrics`  | Calculate 9 composite scores     | `CalculateMetricsRequest` | `GameMetricsResponse`    |
| `initializeStorage` | Initialize storage directories   | none                      | `SuccessResponse`        |
| `saveGame`          | Save game data to disk           | `SaveGameRequest`         | `SaveGameResponse`       |
| `saveAnalysis`      | Save analysis results to disk    | `SaveAnalysisRequest`     | `SaveAnalysisResponse`   |
| `getGamesList`      | Get list of all saved games      | none                      | `GamesListResponse`      |
| `loadGame`          | Load a saved game by ID          | `LoadGameRequest`         | `LoadGameResponse`       |
| `loadAnalysis`      | Load analysis for a game         | `LoadAnalysisRequest`     | `LoadAnalysisResponse`   |
| `getStoragePath`    | Get storage base path            | none                      | `StoragePathResponse`    |

All method types are defined in `src/shared/ipc-types.ts` and
`src/backend/index.ts`.

## Move Classification

Moves are classified based on centipawn loss (CPL):

| Classification | CPL Range | Accuracy |
| -------------- | --------- | -------- |
| Excellent      | 0-10      | 100%     |
| Good           | 10-25     | 90%      |
| Inaccuracy     | 25-75     | 70%      |
| Mistake        | 75-200    | 40%      |
| Blunder        | 200+      | 0%       |

## Performance

Benchmarked performance (depth 20 analysis):

- **Target**: <2 seconds per position
- **Actual**: ~865ms average
- **Complex positions**: <1.5 seconds

## Usage Example

### Frontend (TypeScript)

```typescript
import * as buntralino from 'buntralino-client';
import { IPC_METHODS, STARTPOS_FEN } from '../shared/ipc-types';

// Get top 3 moves from starting position
const result = await buntralino.run(IPC_METHODS.REQUEST_BEST_MOVES, {
  fen: STARTPOS_FEN,
  depth: 15,
  count: 3,
});

if (result.success) {
  console.log('Top moves:', result.moves);
}
```

### Move Analysis

```typescript
// Analyze a played move
const analysis = await buntralino.run(IPC_METHODS.ANALYZE_MOVE, {
  fen: 'current-position-fen',
  playedMove: 'e2e4',
  depth: 20,
});

if (analysis.success) {
  console.log('CPL:', analysis.analysis.centipawnLoss);
  console.log('Classification:', analysis.analysis.classification);
  console.log('Best was:', analysis.analysis.bestMove);
}
```

## Files Reference

```text
src/
├── engine/
│   ├── stockfish-loader.ts      # WASM loader
│   ├── stockfish-engine.ts      # Engine implementation
│   ├── STOCKFISH_SELECTION.md   # Selection rationale
│   ├── test-engine-interface.ts # Engine tests
│   └── test-engine-operations.ts # Operation tests
├── shared/
│   ├── engine-types.ts          # Engine interfaces
│   ├── ipc-types.ts             # IPC interfaces (all methods)
│   ├── bot-types.ts             # AI opponent types (Phase 3)
│   ├── game-state.ts            # Game state management
│   ├── chess-logic.ts           # Chess.js wrapper
│   └── test-chess-logic.ts      # Chess logic tests
├── backend/
│   ├── index.ts                 # IPC registration (all methods)
│   ├── ai-opponent.ts           # AI opponent logic (Phase 3)
│   ├── analysis-pipeline.ts     # Post-game analysis (Phase 4)
│   ├── metrics-calculator.ts    # Composite scores (Phase 4)
│   └── data-storage.ts          # File persistence (Phase 4)
└── frontend/
    ├── training-mode.ts         # Training Mode UI (Phase 3)
    ├── move-guidance.ts         # Best-move guidance (Phase 3)
    └── exam-mode.ts             # Exam Mode UI (Phase 4)
```

## Troubleshooting

### Engine Not Initializing

The engine initializes automatically on backend startup. Check:

**Development mode:**

1. `node_modules/stockfish` is installed
2. Console shows "Stockfish engine ready"

**Compiled executable mode:**

1. `stockfish/` directory exists next to the executable
2. Contains `stockfish-17.1-lite-single-*.js` and
   `stockfish-17.1-lite-single-*.wasm`
3. Console shows "[Stockfish] Running in compiled mode"

### Slow Analysis

For faster analysis:

- Reduce depth (10-15 for quick analysis)
- Use `movetime` instead of depth for time-bounded search

### Memory Issues

The WASM module uses ~50-100MB. For long sessions:

- Call `startNewGame()` to clear hash tables
- Restart application if memory grows excessively

## Related Documentation

- [ai-engine.md](../source-docs/ai-engine.md) - Engine specification
- [architecture.md](../source-docs/architecture.md) - System architecture
- [roadmap.md](../source-docs/roadmap.md) - Development phases
