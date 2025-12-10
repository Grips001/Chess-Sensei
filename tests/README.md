# Chess-Sensei Test Suite

This directory contains the testing infrastructure for Chess-Sensei.

## Directory Structure

```text
tests/
├── integration/    # Integration tests (IPC, game flow, etc.)
├── unit/           # Unit tests (isolated component tests)
└── README.md       # This file
```

## Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run type checking
bun run typecheck

# Run full verification (types + lint + tests)
bun run verify
```

## Test File Conventions

Bun's test runner automatically discovers test files matching these patterns:

- `*.test.ts`
- `*.spec.ts`
- `*_test_.ts`
- `*_spec_.ts`

## Writing Tests

```typescript
import { describe, test, expect } from 'bun:test';

describe('Example Module', () => {
  test('should do something', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Test Categories

### Unit Tests (`tests/unit/`)

- Pure function tests
- Component isolation tests
- Chess logic tests
- No external dependencies

### Integration Tests (`tests/integration/`)

- WebSocket IPC communication tests
- Backend ↔ Frontend integration
- Game flow tests (full user scenarios)
- Build verification tests

## Test Files

Test files use the `*.test.ts` naming pattern and are located in `tests/`:

- `tests/chess-logic.test.ts` - Chess logic validation (40 tests)
- `tests/bot-types.test.ts` - Bot personality and difficulty tests
- `tests/engine-types.test.ts` - Engine type validation
- `tests/game-state.test.ts` - Game state management
- `tests/ipc-types.test.ts` - IPC type validation

Legacy test files in `src/` use `test-*.ts` pattern for manual testing.

## Architecture Notes

Chess-Sensei uses:

- **Bun 1.3.4** - Runtime and test runner
- **Neutralino 6.4.0** - UI framework
- **WebSocket IPC** - Custom implementation (port 9339)
- **Stockfish 17.1 WASM** - Chess engine

### IPC Testing

When testing IPC communication, use the WebSocket client:

- Frontend: `src/frontend/websocket-ipc-client.ts`
- Backend: WebSocket server on port 9339
- **No Neutralino Events** - Pure WebSocket communication

### Engine Testing

Stockfish runs as **WASM in-process**, not as a subprocess. Engine tests should:

- Load the WASM module
- Test UCI protocol communication
- Verify position analysis
- Check move generation

## Test Coverage Goals

| Component               | Target Coverage | Priority |
| ----------------------- | --------------- | -------- |
| Chess logic (`shared/`) | 90%+            | High     |
| Engine interface        | 80%+            | High     |
| Backend services        | 70%+            | Medium   |
| Frontend UI             | 50%+            | Low      |
| Integration             | 60%+            | Medium   |

## Test Suite Status

The test suite includes 114 tests across 5 test files:

- ✅ Chess logic validation
- ✅ Bot type and personality tests
- ✅ Engine type validation
- ✅ Game state management
- ✅ IPC type contracts

Run the full suite with `bun run test`.

## References

- **Audit Document:** `TESTING_INFRASTRUCTURE_AUDIT.md`
- **Bun Test Docs:** <https://bun.sh/docs/cli/test>
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
