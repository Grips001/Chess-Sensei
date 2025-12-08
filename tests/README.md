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

## Existing Tests (Legacy)

Note: Existing test files in `src/` use the `test-*.ts` naming pattern. These
will be migrated to `*.test.ts` pattern in Phase 5.2:

- `src/engine/test-stockfish.ts` → `src/engine/stockfish.test.ts`
- `src/engine/test-engine-interface.ts` → `src/engine/engine-interface.test.ts`
- `src/engine/test-engine-operations.ts` →
  `src/engine/engine-operations.test.ts`
- `src/shared/test-chess-logic.ts` → `src/shared/chess-logic.test.ts`
- `src/backend/test-ai-opponent.ts` → `src/backend/ai-opponent.test.ts`

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

## Phase 5 Modernization

This test infrastructure was established during Phase 5 (Comprehensive Testing)
as part of post-migration modernization:

1. **Phase 5.0:** ✅ Audit completed (TESTING_INFRASTRUCTURE_AUDIT.md)
2. **Phase 5.1:** ✅ Infrastructure setup (this directory, scripts)
3. **Phase 5.2:** Pending - Update existing tests
4. **Phase 5.3:** Pending - Create Phase 4 feature tests
5. **Phase 5.4:** Pending - Update Claude customizations
6. **Phase 5.5:** Pending - Run comprehensive tests

## References

- **Audit Document:** `TESTING_INFRASTRUCTURE_AUDIT.md`
- **Bun Test Docs:** <https://bun.sh/docs/cli/test>
- **Project Docs:** `source-docs/development.md`
