# Tech Spec: Testing Strategy Enhancement - 90% Coverage Goal

> **Filename:** `007-tech-testing-strategy-enhancement.md` **Status:** Draft
> **Author:** Claude (AI Assistant) **Created:** 2026-01-08 **Last Updated:**
> 2026-01-08 **PRD:** `007-prd-testing-strategy-enhancement.md` **Related
> Issues:** N/A

---

## Overview

### Summary

Expand test coverage from 40% to 90%+ by creating comprehensive test
infrastructure (helpers, mocks, fixtures), writing unit tests for all backend
services and frontend components, integration tests for all IPC methods, and E2E
tests for critical user flows.

### Goals

1. Create test helpers library to reduce boilerplate
2. Implement mock services for isolated unit testing
3. Define test fixtures for common scenarios
4. Write unit tests for all backend services (90%+ coverage)
5. Write unit tests for frontend components (80%+ coverage)
6. Write integration tests for all 45 IPC methods
7. Write E2E tests for Training, Exam, and Sandbox modes

### Non-Goals

1. 100% coverage (diminishing returns)
2. Performance/load testing (separate concern)
3. Visual regression testing
4. Mutation testing (deferred)

## Background

### Current Architecture

**Test Files (12 total):**

```text
tests/
├── unit/
│   ├── notation-parser.test.ts (39 tests)
│   ├── explanation-generator.test.ts (60 tests)
│   └── move-classification.test.ts (15 tests)
├── integration/
│   ├── ipc-health-check.test.ts (5 tests)
│   └── training-mode.test.ts (29 tests)
└── fixtures/
    └── test-games.ts
```

**Coverage Gaps:**

- Backend: AIOpponent, AnalysisPipeline, MetricsCalculator, DataStorage
  (untested)
- Frontend: Board renderer, UI components, mode controllers (mostly untested)
- Integration: Only 2 of 45 IPC methods tested

### Key Concepts

- **Test Pyramid**: Many unit tests, fewer integration tests, minimal E2E tests
- **Test Doubles**: Mocks (behavior verification), Stubs (canned responses),
  Fakes (simplified implementations)
- **Fixtures**: Pre-defined test data for common scenarios
- **Test Helpers**: Reusable functions to reduce boilerplate

## Detailed Design

### Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                   Test Infrastructure                         │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │            Test Helpers Library                    │     │
│  │                                                     │     │
│  │  • createMockEngine()                             │     │
│  │  • createMockStorage()                            │     │
│  │  • createTestGame()                               │     │
│  │  • setupTestEnvironment()                         │     │
│  │  • waitForCondition()                             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Mock Implementations                   │     │
│  │                                                     │     │
│  │  • MockStockfishEngine                            │     │
│  │  • MockDataStorage                                │     │
│  │  • MockIPCClient                                  │     │
│  │  • MockAIOpponent                                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │               Test Fixtures                         │     │
│  │                                                     │     │
│  │  • commonPositions (starting, endgame, etc.)      │     │
│  │  • sampleGames (short, long, tactical)            │     │
│  │  • errorScenarios (invalid FEN, etc.)             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       Test Suites                             │
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐    │
│  │   Unit Tests  │  │ Integration   │  │  E2E Tests   │    │
│  │   (~80 files) │  │   (~15 files) │  │  (~5 files)  │    │
│  │               │  │               │  │              │    │
│  │ Backend: 40   │  │ IPC: 10       │  │ Training: 1  │    │
│  │ Frontend: 30  │  │ Modes: 3      │  │ Exam: 1      │    │
│  │ Shared: 10    │  │ Storage: 2    │  │ Sandbox: 1   │    │
│  └───────────────┘  └───────────────┘  └──────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Component Changes

#### Test Helpers Library

**File:** `tests/helpers/test-utils.ts` (new file)

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import type { StockfishEngine } from '../../src/engine/stockfish-engine.js';

/**
 * Create a mock Stockfish engine for testing
 */
export function createMockEngine(): StockfishEngine {
  return {
    evaluatePosition: vi.fn().mockResolvedValue({
      score: 0.5,
      depth: 15,
      bestMove: 'e2e4',
    }),
    getBestMoves: vi.fn().mockResolvedValue([
      { move: 'e2e4', score: 0.5 },
      { move: 'd2d4', score: 0.4 },
      { move: 'g1f3', score: 0.3 },
    ]),
    stopAnalysis: vi.fn(),
    dispose: vi.fn(),
  } as any;
}

/**
 * Create a mock data storage for testing
 */
export function createMockStorage(): DataStorage {
  const storage = new Map<string, any>();

  return {
    saveGame: vi.fn(async (game) => {
      storage.set(game.id, game);
    }),
    loadGame: vi.fn(async (id) => storage.get(id)),
    deleteGame: vi.fn(async (id) => storage.delete(id)),
    getAllGames: vi.fn(async () => Array.from(storage.values())),
  } as any;
}

/**
 * Create a test game with optional overrides
 */
export function createTestGame(
  overrides: Partial<GameRecord> = {}
): GameRecord {
  return {
    id: 'test-game-1',
    playerColor: 'white',
    opponentColor: 'black',
    result: 'in-progress',
    moves: [],
    startTime: Date.now(),
    ...overrides,
  };
}

/**
 * Wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Setup test environment with common mocks
 */
export function setupTestEnvironment() {
  const mockEngine = createMockEngine();
  const mockStorage = createMockStorage();

  return {
    mockEngine,
    mockStorage,
    cleanup: () => {
      vi.clearAllMocks();
    },
  };
}
```

#### Mock Implementations

**File:** `tests/mocks/mock-engine.ts` (new file)

```typescript
import type {
  StockfishEngine,
  Evaluation,
} from '../../src/engine/stockfish-engine.js';

export class MockStockfishEngine implements StockfishEngine {
  private evaluations = new Map<string, Evaluation>();

  /**
   * Set canned evaluation for a FEN position
   */
  setEvaluation(fen: string, evaluation: Evaluation): void {
    this.evaluations.set(fen, evaluation);
  }

  async evaluatePosition(fen: string, depth: number): Promise<Evaluation> {
    // Return canned evaluation if exists
    if (this.evaluations.has(fen)) {
      return this.evaluations.get(fen)!;
    }

    // Default evaluation
    return {
      score: 0,
      depth,
      bestMove: 'e2e4',
      pv: ['e2e4', 'e7e5'],
    };
  }

  async getBestMoves(
    fen: string,
    depth: number,
    count: number
  ): Promise<BestMove[]> {
    const moves: BestMove[] = [];
    for (let i = 0; i < count; i++) {
      moves.push({
        move: `move${i}`,
        score: 0.5 - i * 0.1,
        pv: [`move${i}`],
      });
    }
    return moves;
  }

  stopAnalysis(): void {
    // No-op in mock
  }

  dispose(): void {
    this.evaluations.clear();
  }
}
```

#### Test Fixtures

**File:** `tests/fixtures/common-positions.ts` (new file)

```typescript
/**
 * Common chess positions for testing
 */
export const commonPositions = {
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',

  sicilianDefense:
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',

  kingsideCheckmate: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1',

  stalemate: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',

  lucenaPosition: '1K6/1P6/8/8/8/8/r7/2k5 w - - 0 1',

  complexMiddlegame:
    'r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/R3K2R w KQ - 0 10',
};

/**
 * Sample game moves for testing
 */
export const sampleGames = {
  shortGame: [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e5' },
    { from: 'g1', to: 'f3' },
    { from: 'b8', to: 'c6' },
  ],

  scholarsMate: [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e5' },
    { from: 'f1', to: 'c4' },
    { from: 'b8', to: 'c6' },
    { from: 'd1', to: 'h5' },
    { from: 'g8', to: 'f6' },
    { from: 'h5', to: 'f7' }, // Checkmate
  ],

  longGame: [
    // 40 moves of a real game
    // ... (abbreviated for brevity)
  ],
};

/**
 * Error scenarios for testing
 */
export const errorScenarios = {
  invalidFen: {
    tooFewPieces: 'rnbqkbn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    tooManyKings: 'rnbqkknr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKKNR w KQkq - 0 1',
    invalidSquare: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w XYZ - 0 1',
  },

  invalidMoves: [
    { from: 'e2', to: 'e5' }, // Pawn can't move 3 squares
    { from: 'e1', to: 'e8' }, // King can't teleport
    { from: 'a1', to: 'h8' }, // Rook blocked
  ],
};
```

### Data Model

**New Types:**

```typescript
// tests/types/test-types.ts

interface TestEnvironment {
  mockEngine: StockfishEngine;
  mockStorage: DataStorage;
  cleanup: () => void;
}

interface TestGame extends Partial<GameRecord> {
  id: string;
}

interface MockEvaluation extends Evaluation {
  // Additional test-specific properties
}
```

### API Changes

No IPC changes - testing infrastructure only.

### UI Changes

No UI changes - testing infrastructure only.

### State Management

Test state management:

- Mock services maintain test-specific state
- Test fixtures provide consistent starting states
- Cleanup functions reset state between tests

### Error Handling

| Error Condition     | Handling Strategy            | User Feedback                 |
| ------------------- | ---------------------------- | ----------------------------- |
| Test timeout        | Fail test with clear message | CI failure notification       |
| Mock not configured | Throw descriptive error      | Test failure with stack trace |
| Fixture not found   | Throw with fixture name      | Test failure message          |
| Assertion failure   | Detailed diff output         | Test report with diff         |

## Implementation Plan

### Phase Breakdown

#### Phase 3A: Test Infrastructure (Week 6, Days 1-2)

**Scope:**

- Create test helpers library
- Implement mock services
- Define test fixtures
- Document testing patterns

**Dependencies:** None

**Estimated Effort:** 10-12 hours

**Files Created:**

- `tests/helpers/test-utils.ts`
- `tests/mocks/mock-engine.ts`
- `tests/mocks/mock-storage.ts`
- `tests/mocks/mock-ipc-client.ts`
- `tests/fixtures/common-positions.ts`
- `tests/fixtures/sample-games.ts`
- `docs/testing-guide.md`

#### Phase 3B: Backend Unit Tests (Week 6-7, Days 3-10)

**Scope:**

- AIOpponent tests (bot personalities, difficulty)
- AnalysisPipeline tests (move classification, CPL)
- MetricsCalculator tests (9-dimension metrics)
- DataStorage tests (atomic writes, backups)
- ExportImportManager tests (PGN, JSON, ZIP)

**Dependencies:** Phase 3A

**Estimated Effort:** 40-50 hours

**Files Created:**

- `tests/unit/ai-opponent.test.ts`
- `tests/unit/analysis-pipeline.test.ts`
- `tests/unit/metrics-calculator.test.ts`
- `tests/unit/data-storage.test.ts`
- `tests/unit/export-import-manager.test.ts`
- ~35 additional test files for backend modules

#### Phase 3C: Frontend Unit Tests (Week 7, Days 1-5)

**Scope:**

- Board renderer tests (FEN → DOM, flipping)
- UI component tests (dialogs, alerts, history)
- Game controller tests (move execution, undo/redo)
- Mode controller tests (Training, Exam, Sandbox)
- Analysis UI tests (components, interactions)

**Dependencies:** Phase 3A

**Estimated Effort:** 30-40 hours

**Files Created:**

- `tests/unit/board-renderer.test.ts`
- `tests/unit/move-history-ui.test.ts`
- `tests/unit/game-controller.test.ts`
- `tests/unit/training-mode-controller.test.ts`
- `tests/unit/exam-mode-controller.test.ts`
- ~25 additional test files for frontend modules

#### Phase 3D: Integration Tests (Week 8, Days 1-5)

**Scope:**

- IPC method tests (all 45 methods)
- Training Mode flow tests
- Exam Mode flow tests
- Sandbox Mode flow tests
- Data Management flow tests

**Dependencies:** Phases 3B, 3C

**Estimated Effort:** 40-50 hours

**Files Created:**

- `tests/integration/ipc-methods.test.ts`
- `tests/integration/training-mode-flow.test.ts`
- `tests/integration/exam-mode-flow.test.ts`
- `tests/integration/sandbox-mode-flow.test.ts`
- `tests/integration/data-management-flow.test.ts`
- ~10 additional integration test files

### File Changes Summary

| File                                 | Action | Description              |
| ------------------------------------ | ------ | ------------------------ |
| `tests/helpers/test-utils.ts`        | Create | Test helper functions    |
| `tests/mocks/mock-engine.ts`         | Create | Mock Stockfish engine    |
| `tests/mocks/mock-storage.ts`        | Create | Mock data storage        |
| `tests/mocks/mock-ipc-client.ts`     | Create | Mock IPC client          |
| `tests/fixtures/common-positions.ts` | Create | Common FEN positions     |
| `tests/fixtures/sample-games.ts`     | Create | Sample game moves        |
| `docs/testing-guide.md`              | Create | Testing documentation    |
| ~40 backend unit test files          | Create | Backend service tests    |
| ~30 frontend unit test files         | Create | Frontend component tests |
| ~15 integration test files           | Create | Integration/E2E tests    |

Total: ~100 new test files

## Testing Strategy

### Unit Tests

**Backend Services (40 files):**

| Service             | Test Cases                                               | Coverage Target |
| ------------------- | -------------------------------------------------------- | --------------- |
| AIOpponent          | Bot personalities, difficulty levels, thinking delays    | 95%             |
| AnalysisPipeline    | Move classification, CPL calculation, tactical detection | 95%             |
| MetricsCalculator   | 9 composite scores, aggregation logic                    | 95%             |
| DataStorage         | Atomic writes, backup system, file operations            | 90%             |
| ExportImportManager | PGN/JSON parsing, ZIP handling                           | 90%             |

**Frontend Components (30 files):**

| Component       | Test Cases                                | Coverage Target |
| --------------- | ----------------------------------------- | --------------- |
| BoardRenderer   | FEN to DOM, flipping, animations          | 85%             |
| MoveHistoryUI   | SAN notation display, scrolling           | 80%             |
| GameController  | Move execution, undo/redo, validation     | 90%             |
| ModeControllers | Initialization, state management, cleanup | 85%             |
| AnalysisUI      | Chart rendering, data formatting          | 75%             |

### Integration Tests

**IPC Methods (45 methods):**

| Category | Methods                                          | Test Approach                |
| -------- | ------------------------------------------------ | ---------------------------- |
| Engine   | requestBestMoves, evaluatePosition, stopAnalysis | Full request/response cycle  |
| Bot      | initializeBotOpponent, requestBotMove            | Bot personality verification |
| Storage  | saveGame, loadGame, getAllGames, deleteGame      | Data persistence validation  |
| Analysis | analyzeGame, getGameAnalysis                     | End-to-end analysis pipeline |

**Game Mode Flows:**

| Mode     | Test Scenarios                                        | Coverage           |
| -------- | ----------------------------------------------------- | ------------------ |
| Training | Start game, get guidance, make moves, finish          | All critical paths |
| Exam     | Start game, play without guidance, post-game analysis | All critical paths |
| Sandbox  | Edit position, analyze, export FEN                    | All critical paths |

### Manual Test Cases

| ID   | Steps                            | Expected Result               |
| ---- | -------------------------------- | ----------------------------- |
| MT-1 | Run `bun test`                   | All tests pass, 90%+ coverage |
| MT-2 | Run `bun test --coverage`        | Coverage report shows 90%+    |
| MT-3 | Run tests in CI                  | Tests complete in <60 seconds |
| MT-4 | Make intentional breaking change | Tests catch regression        |

## Performance Considerations

### Expected Impact

**Test Suite Performance:**

- Unit tests: ~30 seconds (fast, isolated)
- Integration tests: ~20 seconds (moderate, some IPC)
- E2E tests: ~10 seconds (slower, full flows)
- **Total: <60 seconds target**

**Development Workflow:**

- Watch mode for rapid feedback
- Parallel test execution where possible
- Cached test results for unchanged files

### Benchmarks

- Measure test suite execution time: <60s target
- Monitor for flaky tests: 0 tolerance
- Track test maintenance overhead: low target

## Security Considerations

- [x] No production code changes
- [x] Test data does not contain real user data
- [x] Mock services isolated from production systems
- [x] No secrets in test fixtures

## Rollout Plan

### Feature Flags

No feature flags - tests run in CI only.

### Rollback Plan

Tests are additive - no rollback needed. Can disable specific test files if
causing issues.

## Alternatives Considered

### Option 1: Jest Instead of Bun Test

**Approach:** Use Jest test framework

**Pros:** Mature, large community, extensive documentation

**Cons:** Slower, requires additional config, Bun test is native

**Why rejected:** Bun test is faster and built-in

### Option 2: Focus Only on Integration Tests

**Approach:** Skip unit tests, only test integration

**Pros:** Tests real user flows, less test code

**Cons:** Slow, hard to isolate failures, poor coverage of edge cases

**Why rejected:** Need unit tests for fast feedback and precise diagnosis

### Option 3: Aim for 100% Coverage

**Approach:** Test every line of code

**Pros:** Maximum confidence, no gaps

**Cons:** Diminishing returns, some code not worth testing

**Why rejected:** 90% is pragmatic balance

## Dependencies

### External Dependencies

None - using Bun's built-in test runner

### Internal Dependencies

- All backend services (test subjects)
- All frontend components (test subjects)
- IPC infrastructure (integration tests)

## Open Questions

1. **Should we use snapshot testing for UI components?**
   - Proposal: Yes for static components, no for dynamic ones

2. **What coverage threshold should block PRs?**
   - Proposal: 80% minimum, 90% target

3. **Should tests run in watch mode by default?**
   - Proposal: Yes for development, add `bun test:watch`

4. **How to handle slow integration tests?**
   - Proposal: Separate fast/slow test suites

## Risks

| Risk                                  | Likelihood | Impact | Mitigation                                   |
| ------------------------------------- | ---------- | ------ | -------------------------------------------- |
| Test suite becomes too slow           | Medium     | Medium | Optimize, parallelize, separate fast/slow    |
| Tests become brittle over time        | Medium     | High   | Follow best practices, isolate dependencies  |
| False sense of security from coverage | Low        | High   | Focus on meaningful tests, not just coverage |
| Test maintenance overhead             | High       | Medium | Invest in good test infrastructure upfront   |

---

## Approval

| Role       | Name | Date | Status  |
| ---------- | ---- | ---- | ------- |
| Tech Lead  |      |      | Pending |
| Reviewer 1 |      |      | Pending |
| Reviewer 2 |      |      | Pending |

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2026-01-08 | Claude | Initial draft |
