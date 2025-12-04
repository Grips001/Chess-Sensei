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

| Method             | Description                   | Request              | Response               |
| ------------------ | ----------------------------- | -------------------- | ---------------------- |
| `requestBestMoves` | Get top N moves for position  | `PositionRequest`    | `BestMovesResponse`    |
| `evaluatePosition` | Full position evaluation      | `PositionRequest`    | `EvaluationResponse`   |
| `analyzeMove`      | Analyze a played move (CPL)   | `AnalyzeMoveRequest` | `MoveAnalysisResponse` |
| `getGuidanceMoves` | Top 3 moves for Training Mode | `PositionRequest`    | `BestMovesResponse`    |
| `startNewGame`     | Reset engine state            | none                 | `SuccessResponse`      |
| `setSkillLevel`    | Set engine difficulty (0-20)  | `{ level: number }`  | `SuccessResponse`      |
| `getEngineStatus`  | Check engine state            | none                 | `EngineStatusResponse` |

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
│   ├── ipc-types.ts             # IPC interfaces
│   ├── chess-logic.ts           # Chess.js wrapper
│   └── test-chess-logic.ts      # Chess logic tests
└── backend/
    └── index.ts                 # IPC registration
```

## Troubleshooting

### Engine Not Initializing

The engine initializes automatically on backend startup. Check:

1. `node_modules/stockfish` is installed
2. Console shows "Stockfish engine ready"

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
