---
name: stockfish-integration
description:
  Verify Stockfish WASM integration patterns. Use when working with engine code,
  UCI commands, or move analysis to ensure correct async patterns and error
  handling.
allowed-tools: Read, Grep, Glob
---

# Stockfish WASM Integration Patterns

Automatically verify correct usage of the Stockfish WASM engine integration.

## When to Apply

- Working with files in `src/engine/`
- Implementing move analysis features
- Debugging engine communication issues
- Adding new UCI commands

## Architecture Overview

```text
Frontend Request → WebSocket IPC → Backend Handler → Stockfish Engine
                                                          ↓
Frontend Display ← WebSocket IPC ← Backend Response ← UCI Output
```

## Key Files

| File                               | Purpose                    |
| ---------------------------------- | -------------------------- |
| `src/engine/stockfish-engine.ts`   | Main engine wrapper        |
| `src/engine/stockfish-loader.ts`   | WASM loading               |
| `src/shared/engine-types.ts`       | Type definitions           |
| `src/shared/engine-constants.ts`   | Engine configuration       |
| `src/backend/analysis-pipeline.ts` | Batch analysis integration |

## Correct Patterns

### Engine Initialization

```typescript
// Always check engine ready state before use
if (!engine.isReady()) {
  await engine.initialize();
}
```

### UCI Command Pattern

```typescript
// Set position before analysis
engine.setPosition(fen);

// Use appropriate depth/time limits
const analysis = await engine.analyze({
  depth: 20,
  multiPV: 3,
});
```

### Error Handling

```typescript
try {
  const result = await engine.getBestMove(fen);
} catch (error) {
  if (error instanceof EngineNotReadyError) {
    // Reinitialize engine
  } else if (error instanceof InvalidFENError) {
    // User feedback for invalid position
  }
}
```

### Async Patterns

```typescript
// Always await engine operations
const moves = await engine.getTopMoves(fen, 3);

// Use Promise.all for independent operations
const [eval1, eval2] = await Promise.all([
  engine.evaluate(fen1),
  engine.evaluate(fen2),
]);
```

## Anti-Patterns to Avoid

```typescript
// DON'T: Fire and forget
engine.analyze(fen); // Missing await

// DON'T: Assume engine is ready
engine.getBestMove(fen); // Should check isReady()

// DON'T: Block on synchronous operations
while (!engine.isReady()) {} // Use async/await
```

## Verification Checklist

1. All engine calls are awaited
2. Engine ready state checked before use
3. Proper error types used (not generic Error)
4. UCI commands follow correct sequence
5. Analysis results validated before use

## Reference

- `documents/engine-integration.md` - Full integration guide
- Stockfish UCI protocol documentation
