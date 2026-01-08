# Tech Spec: Architecture Refactoring - Dependency Injection & State Management

> **Filename:** `006-tech-architecture-refactoring.md` **Status:** Draft
> **Author:** Claude (AI Assistant) **Created:** 2026-01-08 **Last Updated:**
> 2026-01-08 **PRD:** `006-prd-architecture-refactoring.md` **Related Issues:**
> N/A

---

## Overview

### Summary

Implement a lightweight dependency injection container for backend services and
a centralized GameStateManager for frontend state. Replace global state
accessors with explicit constructor injection, establish clear architectural
layers, and update all tests to use new patterns.

### Goals

1. Create DIContainer class with service registration and resolution
2. Implement GameStateManager with immutable state and subscriber pattern
3. Refactor all backend services to use constructor injection
4. Refactor frontend modules to use GameStateManager
5. Define and enforce layered architecture with ESLint rules

### Non-Goals

1. Changing IPC contracts or method signatures
2. UI/UX modifications (behavior-preserving refactor)
3. Performance optimization beyond current baseline
4. Third-party DI framework integration (custom lightweight solution)

## Background

### Current Architecture

**Backend State Management:**

```typescript
// src/backend/index.ts
let engine: StockfishEngine | null = null;
let aiOpponent: AIOpponent | null = null;

export function getEngine() {
  return engine!;
}
export function getAIOpponent() {
  return aiOpponent!;
}
```

**Frontend State Management:**

```typescript
// src/frontend/index.ts
let currentFen = '';
let gameHistory: Move[] = [];
let isFlipped = false;

// Scattered mutations across 10+ modules
function makeMove(move: Move) {
  gameHistory.push(move);
  currentFen = chess.fen();
  // ... manual notification to UI components
}
```

### Key Concepts

- **Dependency Injection**: Explicit dependency management via constructor
  parameters
- **Inversion of Control**: Container manages object lifecycle and dependencies
- **State Management**: Centralized, immutable state with predictable updates
- **Layer Architecture**: Clear separation between presentation, application,
  domain, and infrastructure

## Detailed Design

### Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    Backend (Bun)                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Dependency Injection Container             │    │
│  │                                                       │    │
│  │  Services:                                           │    │
│  │  • StockfishEngine                                   │    │
│  │  • AIOpponent (depends on Engine)                   │    │
│  │  • AnalysisPipeline (depends on Engine)             │    │
│  │  • DataStorage                                       │    │
│  │  • ExportImportManager (depends on Storage)         │    │
│  │                                                       │    │
│  │  container.register('engine', createEngine)         │    │
│  │  container.register('aiOpponent',                    │    │
│  │    (c) => new AIOpponent(c.resolve('engine')))      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 Frontend (Neutralino)                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              GameStateManager                        │    │
│  │                                                       │    │
│  │  State (Immutable):                                  │    │
│  │  • currentFen: string                                │    │
│  │  • gameHistory: readonly Move[]                      │    │
│  │  • isFlipped: boolean                                │    │
│  │  • selectedSquare: Square | null                     │    │
│  │  • availableMoves: readonly Move[]                   │    │
│  │                                                       │    │
│  │  Methods:                                            │    │
│  │  • makeMove(move: Move): void                        │    │
│  │  • undoMove(): void                                  │    │
│  │  • flipBoard(): void                                 │    │
│  │  • subscribe(listener: StateListener): Unsubscribe  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                   │
│                           │ State changes                     │
│                           ▼                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Board      │  │ Move       │  │ Analysis   │            │
│  │ Renderer   │  │ History UI │  │ UI         │            │
│  │ (subscribe)│  │ (subscribe)│  │ (subscribe)│            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Component Changes

#### DIContainer (Backend)

**File:** `src/backend/di-container.ts` (new file)

**Implementation:**

```typescript
type Factory<T> = (container: DIContainer) => T;

export class DIContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, Factory<any>>();

  /**
   * Register a service factory
   */
  register<T>(name: string, factory: Factory<T>): void {
    if (this.factories.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    this.factories.set(name, factory);
  }

  /**
   * Resolve a service by name (singleton pattern)
   */
  resolve<T>(name: string): T {
    // Return cached instance if exists
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Get factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Create and cache instance
    const instance = factory(this);
    this.services.set(name, instance);

    return instance as T;
  }

  /**
   * Check if service is registered
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}
```

#### Backend Service Registration

**File:** `src/backend/index.ts`

**Changes:**

```typescript
import { DIContainer } from './di-container.js';
import { createStockfishEngine } from '../engine/stockfish-engine.js';
import { AIOpponent } from './ai-opponent.js';
import { AnalysisPipeline } from './analysis-pipeline.js';
import { DataStorage } from './data-storage.js';
import { ExportImportManager } from './export-import.js';

// Create DI container
const container = new DIContainer();

// Register services
container.register('engine', () => createStockfishEngine());
container.register('aiOpponent', (c) => new AIOpponent(c.resolve('engine')));
container.register(
  'analysisPipeline',
  (c) => new AnalysisPipeline(c.resolve('engine'))
);
container.register('dataStorage', () => new DataStorage());
container.register(
  'exportImport',
  (c) => new ExportImportManager(c.resolve('dataStorage'))
);

// IPC handlers now resolve services from container
function setupIPCHandlers(ws: WebSocket) {
  ws.on('message', async (message) => {
    const { method, params, id } = JSON.parse(message);

    if (method === 'chess:requestBestMoves') {
      const engine = container.resolve<StockfishEngine>('engine');
      const result = await engine.getBestMoves(params);
      ws.send(JSON.stringify({ id, result }));
    }
    // ... other handlers
  });
}
```

#### Backend Services Refactored

**File:** `src/backend/ai-opponent.ts`

**Before:**

```typescript
import { getEngine } from './index.js';

export class AIOpponent {
  async makeMove(fen: string): Promise<Move> {
    const engine = getEngine(); // Implicit dependency
    return engine.getBestMove(fen);
  }
}
```

**After:**

```typescript
import type { StockfishEngine } from '../engine/stockfish-engine.js';

export class AIOpponent {
  constructor(private engine: StockfishEngine) {} // Explicit injection

  async makeMove(fen: string): Promise<Move> {
    return this.engine.getBestMove(fen);
  }
}
```

#### GameStateManager (Frontend)

**File:** `src/frontend/game/game-state-manager.ts` (new file)

**Implementation:**

```typescript
type StateListener = (state: GameState) => void;
type Unsubscribe = () => void;

export interface GameState {
  readonly currentFen: string;
  readonly gameHistory: readonly Move[];
  readonly isFlipped: boolean;
  readonly selectedSquare: Square | null;
  readonly availableMoves: readonly Move[];
  readonly playerColor: 'white' | 'black';
  readonly turnToMove: 'white' | 'black';
}

export class GameStateManager {
  private state: GameState;
  private listeners = new Set<StateListener>();

  constructor(initialState: Partial<GameState> = {}) {
    this.state = {
      currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      gameHistory: [],
      isFlipped: false,
      selectedSquare: null,
      availableMoves: [],
      playerColor: 'white',
      turnToMove: 'white',
      ...initialState,
    };
  }

  /**
   * Get current state (immutable)
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update state immutably and notify listeners
   */
  private setState(updates: Partial<GameState>): void {
    this.state = {
      ...this.state,
      ...updates,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // Public actions
  makeMove(move: Move): void {
    const chess = new Chess(this.state.currentFen);
    chess.move(move);

    this.setState({
      currentFen: chess.fen(),
      gameHistory: [...this.state.gameHistory, move],
      turnToMove: chess.turn() === 'w' ? 'white' : 'black',
    });
  }

  undoMove(): void {
    if (this.state.gameHistory.length === 0) return;

    const newHistory = this.state.gameHistory.slice(0, -1);
    const chess = new Chess();
    for (const move of newHistory) {
      chess.move(move);
    }

    this.setState({
      currentFen: chess.fen(),
      gameHistory: newHistory,
      turnToMove: chess.turn() === 'w' ? 'white' : 'black',
    });
  }

  flipBoard(): void {
    this.setState({
      isFlipped: !this.state.isFlipped,
    });
  }

  setSelectedSquare(square: Square | null): void {
    this.setState({ selectedSquare: square });
  }

  setAvailableMoves(moves: Move[]): void {
    this.setState({ availableMoves: moves });
  }

  resetGame(): void {
    this.setState({
      currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      gameHistory: [],
      selectedSquare: null,
      availableMoves: [],
      turnToMove: 'white',
    });
  }
}
```

#### Frontend Integration

**File:** `src/frontend/index.ts`

**Changes:**

```typescript
import { GameStateManager } from './game/game-state-manager.js';
import { BoardRenderer } from './board/board-renderer.js';
import { MoveHistoryUI } from './ui/move-history.js';

// Create global state manager
const gameState = new GameStateManager();

// Components subscribe to state changes
const boardRenderer = new BoardRenderer();
const moveHistoryUI = new MoveHistoryUI();

gameState.subscribe((state) => {
  boardRenderer.render(state);
  moveHistoryUI.update(state.gameHistory);
});

// User actions update state
function handleSquareClick(square: Square) {
  const state = gameState.getState();

  if (state.selectedSquare === null) {
    gameState.setSelectedSquare(square);
  } else {
    const move = { from: state.selectedSquare, to: square };
    gameState.makeMove(move);
    gameState.setSelectedSquare(null);
  }
}
```

### Data Model

**New Types:**

```typescript
// src/shared/di-types.ts
export type Factory<T> = (container: DIContainer) => T;

export interface ServiceRegistry {
  engine: StockfishEngine;
  aiOpponent: AIOpponent;
  analysisPipeline: AnalysisPipeline;
  dataStorage: DataStorage;
  exportImport: ExportImportManager;
}

// src/shared/state-types.ts
export interface GameState {
  readonly currentFen: string;
  readonly gameHistory: readonly Move[];
  readonly isFlipped: boolean;
  readonly selectedSquare: Square | null;
  readonly availableMoves: readonly Move[];
  readonly playerColor: 'white' | 'black';
  readonly turnToMove: 'white' | 'black';
}

export type StateListener = (state: GameState) => void;
export type Unsubscribe = () => void;
```

### API Changes

No IPC method changes - refactor is internal implementation only.

### UI Changes

No visual UI changes - state management is internal to frontend.

### State Management

**Before:**

- Global mutable variables scattered across modules
- Direct state mutations trigger manual UI updates
- No single source of truth

**After:**

- GameStateManager is single source of truth
- Immutable state updates via setState()
- Automatic notification to all subscribers
- Components reactively update based on state

### Error Handling

| Error Condition          | Handling Strategy              | User Feedback                     |
| ------------------------ | ------------------------------ | --------------------------------- |
| Service not registered   | Throw at resolution time       | Developer error (caught in tests) |
| Circular dependency      | Detect during resolution       | Developer error (caught in tests) |
| State mutation attempted | TypeScript prevents (readonly) | Compile-time error                |
| Invalid move in state    | Validate before setState()     | Toast notification                |

## Implementation Plan

### Phase Breakdown

#### Phase 2A: DI Container (Week 3, Days 1-2)

**Scope:**

- Implement DIContainer class
- Add unit tests for container
- Document DI patterns

**Dependencies:** None

**Estimated Effort:** 12-16 hours

**File Changes:**

- Create `src/backend/di-container.ts`
- Create `src/shared/di-types.ts`
- Create `tests/unit/di-container.test.ts`

#### Phase 2B: Backend Service Refactor (Week 4, Days 1-3)

**Scope:**

- Refactor all backend services to use constructor injection
- Register services in DI container
- Update IPC handlers to resolve from container
- Update all backend tests

**Dependencies:** Phase 2A

**Estimated Effort:** 12-16 hours

**File Changes:**

- Modify `src/backend/index.ts`
- Modify `src/backend/ai-opponent.ts`
- Modify `src/backend/analysis-pipeline.ts`
- Modify `src/backend/export-import.ts`
- Update all backend test files

#### Phase 2C: GameStateManager (Week 4, Days 4-5)

**Scope:**

- Implement GameStateManager class
- Add subscriber pattern
- Add unit tests

**Dependencies:** None (parallel to Phase 2B)

**Estimated Effort:** 16-20 hours

**File Changes:**

- Create `src/frontend/game/game-state-manager.ts`
- Create `src/shared/state-types.ts`
- Create `tests/unit/game-state-manager.test.ts`

#### Phase 2D: Frontend Refactor (Week 5, Days 1-4)

**Scope:**

- Refactor frontend to use GameStateManager
- Remove global state variables
- Update UI components to subscribe to state
- Update all frontend tests

**Dependencies:** Phase 2C

**Estimated Effort:** 16-20 hours

**File Changes:**

- Modify `src/frontend/index.ts`
- Modify `src/frontend/board/board-renderer.ts`
- Modify `src/frontend/ui/move-history.ts`
- Modify all game mode controllers
- Update all frontend test files

#### Phase 2E: Layer Enforcement (Week 5, Day 5)

**Scope:**

- Define architectural layers
- Add ESLint import restriction rules
- Fix any violations
- Document architecture

**Dependencies:** Phases 2B, 2D

**Estimated Effort:** 8-10 hours

**File Changes:**

- Modify `.eslintrc.json`
- Create `docs/architecture-layers.md`
- Fix import violations

### File Changes Summary

| File                                      | Action | Description                  |
| ----------------------------------------- | ------ | ---------------------------- |
| `src/backend/di-container.ts`             | Create | DI container implementation  |
| `src/frontend/game/game-state-manager.ts` | Create | Centralized state manager    |
| `src/shared/di-types.ts`                  | Create | DI type definitions          |
| `src/shared/state-types.ts`               | Create | State type definitions       |
| `src/backend/index.ts`                    | Modify | Service registration         |
| `src/backend/ai-opponent.ts`              | Modify | Constructor injection        |
| `src/backend/analysis-pipeline.ts`        | Modify | Constructor injection        |
| `src/backend/export-import.ts`            | Modify | Constructor injection        |
| `src/frontend/index.ts`                   | Modify | GameStateManager integration |
| `src/frontend/board/board-renderer.ts`    | Modify | Subscribe to state           |
| `src/frontend/ui/move-history.ts`         | Modify | Subscribe to state           |
| `src/frontend/modes/training-mode.ts`     | Modify | Use state manager            |
| `src/frontend/modes/exam-mode.ts`         | Modify | Use state manager            |
| `.eslintrc.json`                          | Modify | Import restriction rules     |
| `tests/unit/di-container.test.ts`         | Create | DI container tests           |
| `tests/unit/game-state-manager.test.ts`   | Create | State manager tests          |
| All existing test files                   | Modify | Use new patterns             |

## Testing Strategy

### Unit Tests

| Test Case                 | File                                    | Description             |
| ------------------------- | --------------------------------------- | ----------------------- |
| DI - Service Registration | `tests/unit/di-container.test.ts`       | Test register() method  |
| DI - Service Resolution   | `tests/unit/di-container.test.ts`       | Test resolve() caching  |
| DI - Circular Dependency  | `tests/unit/di-container.test.ts`       | Detect circular deps    |
| State - Immutability      | `tests/unit/game-state-manager.test.ts` | Verify readonly state   |
| State - Notifications     | `tests/unit/game-state-manager.test.ts` | Test subscriber pattern |
| State - Move History      | `tests/unit/game-state-manager.test.ts` | Test undo/redo logic    |

### Integration Tests

| Test Case                        | Description                            |
| -------------------------------- | -------------------------------------- |
| Backend Services - DI Resolution | Verify all services resolve correctly  |
| Frontend State - Full Game Flow  | Play complete game using state manager |
| Layer Enforcement - ESLint       | Verify no cross-layer violations       |

### Manual Test Cases

| ID   | Steps                                | Expected Result               |
| ---- | ------------------------------------ | ----------------------------- |
| MT-1 | Play full game with new architecture | Identical behavior to v1.1.0  |
| MT-2 | Rapidly undo/redo moves              | Smooth state updates, no bugs |
| MT-3 | Switch between game modes            | Clean state transitions       |

## Performance Considerations

### Expected Impact

**Performance:**

- DI container resolution: <1ms (negligible)
- State immutability overhead: <0.1ms per update (negligible)
- Overall: No measurable performance regression expected

**Memory:**

- DI container: ~10KB for service registry
- GameState copies: Minimal (shallow copies with shared references)

### Benchmarks

- Measure DI resolution time: <1ms target
- Measure state update time: <0.1ms target
- Validate no regression in existing benchmarks

## Security Considerations

- [x] No user data exposed
- [x] No input validation changes
- [x] No new attack vectors
- [x] DI container isolated per backend instance

## Rollout Plan

### Feature Flags

No feature flags - internal refactor only.

### Rollback Plan

Use git to revert changes if critical issues found. All changes are in separate
commits per phase for granular rollback.

## Alternatives Considered

### Option 1: InversifyJS DI Framework

**Approach:** Use established DI framework

**Pros:** Battle-tested, decorator support, large community

**Cons:** Heavy dependency, decorator complexity, overkill for needs

**Why rejected:** Custom lightweight solution sufficient

### Option 2: Redux for State Management

**Approach:** Use Redux pattern with actions/reducers

**Pros:** Well-known pattern, time-travel debugging

**Cons:** Boilerplate overhead, learning curve, overkill for app size

**Why rejected:** Simple observer pattern sufficient for our needs

### Option 3: Keep Current State Accessors

**Approach:** Incremental improvements to existing pattern

**Pros:** No major refactor, minimal risk

**Cons:** Technical debt persists, testability remains poor

**Why rejected:** Technical debt compounds over time

## Dependencies

### External Dependencies

None - pure TypeScript implementation

### Internal Dependencies

- All backend services
- All frontend modules with state
- All existing tests

## Open Questions

1. **Should DI container support lifecycle scopes (transient, scoped)?**
   - Proposal: Start singleton-only, add if needed

2. **Should GameStateManager support middleware pattern?**
   - Proposal: Not initially, add if logging/debugging needs arise

3. **Should we implement time-travel debugging?**
   - Proposal: Defer to separate effort, focus on core refactor

## Risks

| Risk                       | Likelihood | Impact | Mitigation                                     |
| -------------------------- | ---------- | ------ | ---------------------------------------------- |
| Regression during refactor | Medium     | High   | Comprehensive test suite, incremental approach |
| Performance degradation    | Low        | Medium | Benchmark before/after, optimize if needed     |
| Developer resistance       | Low        | Medium | Clear documentation, code examples             |
| Incomplete refactor        | Medium     | Medium | Complete one subsystem fully before next       |

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
