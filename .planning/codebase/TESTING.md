# Testing Patterns

**Analysis Date:** 2026-02-17

## Test Framework

**Runner:**
- **Bun test** - Built-in test runner
- Config: Preload `tests/setup.ts` for DOM globals setup
- Version: Bun 1.x (from `bun --version`)

**Assertion Library:**
- Built-in `expect()` from `bun:test`

**Run Commands:**
```bash
bun test --preload ./tests/setup.ts           # Run all tests
bun test --preload ./tests/setup.ts --watch   # Watch mode
bun test --preload ./tests/setup.ts --coverage # Coverage report
```

Run command reference: `package.json` scripts: `test`, `test:watch`, `test:coverage`

## Test File Organization

**Location:**
- **Co-located by feature area**: Separate `tests/unit/` and `tests/integration/` directories
- **Parallel to src structure**: NOT mirroring src exactly, but grouped by test type

**Naming:**
- **Pattern**: `[component-name].test.ts`
- **Examples**:
  - `tests/unit/chess-logic.test.ts` (tests `src/shared/chess-logic.ts`)
  - `tests/unit/explanation-generator.test.ts` (tests `src/shared/explanation-generator.ts`)
  - `tests/unit/collapsible-section.test.ts` (tests `src/frontend/components/collapsible-section.ts`)
  - `tests/integration/training-mode.test.ts` (integration of multiple modules)

**Structure:**
```
tests/
├── setup.ts                          # Global DOM environment setup
├── unit/                             # Unit tests for individual functions
│   ├── chess-logic.test.ts
│   ├── clipboard-utils.test.ts
│   ├── explanation-generator.test.ts
│   ├── notation-parser.test.ts
│   └── ... (other unit tests)
├── integration/                      # Integration tests for component interaction
│   ├── training-mode.test.ts
│   ├── panel-layout.test.ts
│   └── websocket-ipc.test.ts
└── README.md                         # Test documentation
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { ChessGame, createGame, STARTPOS_FEN } from '../../src/shared/chess-logic';

describe('Chess Logic', () => {
  describe('ChessGame Creation', () => {
    test('should create game with standard starting position', () => {
      const game = new ChessGame();
      expect(game.getFen()).toBe(STARTPOS_FEN);
      expect(game.getTurn()).toBe('w');
    });
  });

  describe('Move Making', () => {
    let game: ChessGame;

    beforeEach(() => {
      game = new ChessGame();
    });

    test('should make legal move in UCI format', () => {
      const result = game.makeMove('e2e4');
      expect(result.uci).toBe('e2e4');
    });
  });
});
```

**Patterns:**

- **`describe()` blocks** organize by feature or class: "Chess Logic", "Move Making", "Game State Detection"
- **Nested `describe()`** for grouping related tests: Top-level by domain, nested by specific behavior
- **`test()` blocks** for individual assertions: Each test is a single scenario
- **Test naming**: Descriptive English sentences starting with lowercase after 'should': `'should create game with standard starting position'`
- **`beforeEach()`** for setup: Initialize fresh state before each test (e.g., new game instance)
- **No `afterEach()`** required: Tests use local state, no cleanup needed

Example from `src/shared/chess-logic.ts` tests (11 describe blocks, 100+ test cases):
- Tests grouped by functionality: Creation, Move Making, Legal Moves, Game State, Undo Operations, Board State, PGN Export, etc.
- Each describe block is 20-40 lines
- Each test is 3-10 lines

## Mocking

**Framework:** Built-in Bun test module (no external mocking library used)

**Patterns:** No mocking used in current test suite; tests use real implementations

**What to Mock:**
- **External I/O operations**: File system, network requests (when isolated from core logic)
- **Time-dependent operations**: Timers, dates (use setups to override if needed)
- **Non-deterministic behavior**: Random operations

**What NOT to Mock:**
- **Core chess logic**: Test real ChessGame instances (moves, state)
- **Type validation**: Test with real types, not mocked
- **Simple calculations**: No need to mock utility functions
- **Business logic**: Test actual implementation, not mocks

## Fixtures and Factories

**Test Data:**
```typescript
// FEN strings used as fixtures
const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const game = new ChessGame('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');

// Object fixtures for move data
const move: GuidanceMove = {
  uci: 'g1f3',
  san: 'Nf3',
  from: 'g1',
  to: 'f3',
  score: 28,
  formattedScore: '+0.28',
  color: 'blue',
};
```

**Location:**
- **Inline fixtures** in test files for simple data
- **No separate fixtures directory** currently (keep with tests that use them)
- **Reusable setup** in `beforeEach()` blocks when multiple tests share same state

Example from `tests/unit/explanation-generator.test.ts`:
- 4 test suites with fixtures
- `startingFen` constant reused across tests
- `GuidanceMove` objects created fresh for each test

## Coverage

**Requirements:** Not enforced (no coverage thresholds in configuration)

**View Coverage:**
```bash
bun test --preload ./tests/setup.ts --coverage
```

Coverage output shown in terminal; no coverage file configuration present

## Test Types

**Unit Tests:**
- **Scope**: Single function or class method
- **Location**: `tests/unit/`
- **Examples**:
  - `chess-logic.test.ts` - Tests ChessGame class methods (100+ tests)
  - `notation-parser.test.ts` - Tests notation parsing function
  - `explanation-generator.test.ts` - Tests move explanation generation
- **Approach**: Create instance, call method, assert output
- **Count**: ~80 unit tests across core modules

**Integration Tests:**
- **Scope**: Multiple modules working together
- **Location**: `tests/integration/`
- **Examples**:
  - `training-mode.test.ts` - Tests notation parser output in UI context
  - `panel-layout.test.ts` - Tests DOM component interaction
  - `websocket-ipc.test.ts` - Tests frontend-backend communication
- **Approach**: Setup multiple components, verify interaction and state
- **Count**: ~3 integration tests (focused on critical flows)

**E2E Tests:**
- **Framework**: Not currently implemented
- **Notes**: Application uses Neutralino desktop framework; E2E would require separate harness

## Common Patterns

**Async Testing:**
```typescript
// Not currently used (synchronous tests only)
// If needed:
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
// Pattern from chess-logic.test.ts
test('should throw for illegal move', () => {
  const game = new ChessGame();
  expect(() => game.makeMove('e2e5')).toThrow('Illegal move');
});

// Pattern from explanation-generator.test.ts
test('handles invalid FEN gracefully', () => {
  const move: GuidanceMove = { ... };
  const explanation = generateExplanation('invalid_fen', move, 1, [move]);
  expect(explanation.notation).toBe('e4');
  expect(explanation.strengths.length).toBeGreaterThan(0);
});
```

**Assertion Patterns:**
```typescript
// Equality
expect(game.getFen()).toBe(STARTPOS_FEN);
expect(result.uci).toBe('e2e4');

// Array membership
expect(moves).toContain('e2e4');
expect(moves.map((m) => m.to)).toContain('e3');

// Array properties
expect(history).toEqual(['e4', 'e5', 'Nf3']);
expect(moves.length).toBe(20);

// Boolean conditions
expect(game.isLegalMove('e2e4')).toBe(true);
expect(game.isCheckmate()).toBe(true);

// Null/undefined
expect(game.undoMove()).toBeNull();
expect(game.getPiece('e4')).toBeNull();

// Greater/less than
expect(moves.length).toBeGreaterThan(25);

// Object property checks
expect(state.castling.whiteKingside).toBe(true);

// String matching
expect(pgn).toContain('1. e4 e5 2. Nf3');
expect(explanation.ranking).toContain('alternative');
```

## Setup and Teardown

**Global Setup:**
```typescript
// tests/setup.ts
import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
const document = window.document;

global.window = window as unknown as Window & typeof globalThis;
global.document = document as unknown as Document;
global.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
// ... additional DOM globals for component testing
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number;
};
```

**Per-test Setup:**
- **`beforeEach()`** used to reset state: Create fresh game instance, clear mocks
- **No `afterEach()`** currently: State is local, no cleanup needed
- **No global state pollution**: Each test is independent

## Running Tests

**All tests:**
```bash
bun test --preload ./tests/setup.ts
```

**Watch mode (development):**
```bash
bun test --preload ./tests/setup.ts --watch
```

**With coverage:**
```bash
bun test --preload ./tests/setup.ts --coverage
```

**Single test file:**
```bash
bun test tests/unit/chess-logic.test.ts
```

## Test Documentation

Reference: `tests/README.md` contains test strategy and running instructions

## DOM Testing

**Setup:** `happy-dom` library provides DOM environment for component tests

**Usage Pattern:**
```typescript
// From training-mode.test.ts integration test
const moveElement = document.createElement('div');
moveElement.className = 'guidance-move';

const notationSpan = document.createElement('span');
notationSpan.className = 'move-notation';
notationSpan.textContent = move.notation;

const descriptionSpan = document.createElement('span');
descriptionSpan.className = 'move-description';
descriptionSpan.textContent = move.description;
```

**Available APIs:** All standard DOM APIs available through happy-dom globals (HTMLElement, HTMLDivElement, etc.)

---

*Testing analysis: 2026-02-17*
