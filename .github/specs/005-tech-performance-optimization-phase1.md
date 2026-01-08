# Tech Spec: Performance Optimization - Phase 1 (Critical Path Improvements)

> **Filename:** `005-tech-performance-optimization-phase1.md`
> **Status:** Draft
> **Author:** Claude (AI Assistant)
> **Created:** 2026-01-08
> **Last Updated:** 2026-01-08
> **PRD:** `005-prd-performance-optimization-phase1.md`
> **Related Issues:** N/A
>
> **Note:** The tech spec number (005) matches its corresponding PRD number. PRDs are numbered chronologically, so this tech spec inherits that same number.

---

## Overview

### Summary

Implement performance optimizations targeting critical user-facing operations: parallel game analysis, engine result caching, debounced guidance requests, hardware-accelerated board rendering, and batched DOM updates. These changes will reduce analysis time by 60%, guidance latency by 50%, and ensure consistent 60fps rendering.

### Goals

1. Implement parallel analysis pipeline using `Promise.all()` for concurrent move evaluation
2. Add LRU cache for Stockfish evaluations with FEN-based keying
3. Implement debouncing and request coalescing for move guidance
4. Replace position-based CSS with transform-based rendering for hardware acceleration
5. Batch DOM updates using DocumentFragment and requestAnimationFrame

### Non-Goals

1. Startup time optimization (deferred to separate effort)
2. Memory optimization (deferred to separate effort)
3. State management refactoring (covered in PRD 006)
4. Test coverage improvements (covered in PRD 007)

## Background

### Current Architecture

**Analysis Pipeline** (`src/backend/analysis-pipeline.ts`):
- Sequential move analysis using `for` loop
- Each move evaluated independently with no parallelization
- Synchronous position evaluation via Stockfish engine
- No caching of position evaluations

**Engine Integration** (`src/engine/stockfish-engine.ts`):
- Single-threaded WASM Stockfish 17.1
- UCI protocol communication via message passing
- No result caching or deduplication
- Each evaluation is independent

**Board Rendering** (`src/frontend/board/board-renderer.ts`):
- CSS `top`/`left` properties for piece positioning
- Individual DOM manipulation for each square/piece
- Direct innerHTML assignments trigger reflows

**Move Guidance** (`src/frontend/game/guidance-controller.ts`):
- Immediate engine call on every move
- No debouncing or throttling
- Synchronous UI updates

### Key Concepts

- **LRU Cache**: Least Recently Used eviction policy for position evaluations
- **Parallel Analysis**: Concurrent move evaluation using Promise-based concurrency
- **Debouncing**: Delay execution until a pause in rapid events
- **Hardware Acceleration**: GPU-accelerated CSS transforms via `will-change` and `transform`
- **DOM Batching**: Grouping mutations to minimize reflows/repaints

## Detailed Design

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Neutralino)                   │
│                                                              │
│  ┌────────────────┐         ┌─────────────────────┐        │
│  │ Board Renderer │         │ Guidance Controller │        │
│  │                │         │                     │        │
│  │ • CSS Transforms│        │ • Debounce (150ms) │        │
│  │ • DOM Batching │         │ • Request Coalescing│        │
│  └────────┬───────┘         └─────────┬───────────┘        │
│           │                           │                     │
│           │        IPC (WebSocket)    │                     │
└───────────┼───────────────────────────┼─────────────────────┘
            │                           │
┌───────────┼───────────────────────────┼─────────────────────┐
│           │      Backend (Bun)        │                     │
│           │                           │                     │
│           ▼                           ▼                     │
│  ┌─────────────────┐       ┌────────────────────┐         │
│  │ Analysis Pipeline│       │ Engine Handlers    │         │
│  │                 │       │                    │         │
│  │ • Parallel Exec │◄──────┤ • Guidance Request │         │
│  │ • Promise.all() │       │                    │         │
│  └────────┬────────┘       └────────┬───────────┘         │
│           │                         │                      │
│           │                         │                      │
│           ▼                         ▼                      │
│  ┌────────────────────────────────────────┐               │
│  │      Stockfish Engine (WASM)          │               │
│  │                                        │               │
│  │  ┌──────────────────────────┐         │               │
│  │  │   LRU Evaluation Cache   │         │               │
│  │  │                          │         │               │
│  │  │  Key: FEN string        │         │               │
│  │  │  Value: Evaluation      │         │               │
│  │  │  Max Size: 1000 entries │         │               │
│  │  └──────────────────────────┘         │               │
│  │                                        │               │
│  └────────────────────────────────────────┘               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Component Changes

#### Analysis Pipeline (Backend)

**File:** `src/backend/analysis-pipeline.ts`

**Changes:**

- Replace sequential `for` loop with parallel `Promise.all()` execution
- Add move batching to prevent overwhelming the engine
- Stream results back to frontend as they complete
- Add progress reporting via IPC pub/sub

**Modified Functions:**

```typescript
// Before
export async function analyzeGame(moves: Move[]): Promise<Analysis[]> {
  const results: Analysis[] = [];
  for (const move of moves) {
    const analysis = await analyzeMove(move); // Sequential
    results.push(analysis);
  }
  return results;
}

// After
export async function analyzeGame(
  moves: Move[],
  onProgress?: (completed: number, total: number) => void
): Promise<Analysis[]> {
  // Parallel execution with concurrency limit
  const BATCH_SIZE = 5; // Prevent overwhelming single-threaded engine
  const results: Analysis[] = [];

  for (let i = 0; i < moves.length; i += BATCH_SIZE) {
    const batch = moves.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(move => analyzeMove(move))
    );
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(results.length, moves.length);
    }
  }

  return results;
}
```

**New Interfaces:**

```typescript
interface AnalysisProgress {
  completed: number;
  total: number;
  percentage: number;
}
```

#### Stockfish Engine (Backend)

**File:** `src/engine/stockfish-engine.ts`

**Changes:**

- Add LRU cache for position evaluations
- Implement cache key generation from FEN strings
- Add cache statistics tracking
- Implement cache invalidation for cache management

**New Class:**

```typescript
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists (will re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}
```

**Modified StockfishEngine:**

```typescript
export class StockfishEngine {
  private evaluationCache: LRUCache<string, Evaluation>;
  private cacheStats: { hits: number; misses: number };

  constructor() {
    this.evaluationCache = new LRUCache<string, Evaluation>(1000);
    this.cacheStats = { hits: 0, misses: 0 };
    // ... existing initialization
  }

  async evaluatePosition(fen: string, depth: number): Promise<Evaluation> {
    const cacheKey = `${fen}:${depth}`;

    // Check cache first
    const cached = this.evaluationCache.get(cacheKey);
    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;

    // Evaluate position via UCI
    const evaluation = await this.doEvaluation(fen, depth);

    // Cache result
    this.evaluationCache.set(cacheKey, evaluation);

    return evaluation;
  }

  getCacheStatistics(): CacheStatistics {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      size: this.evaluationCache.size,
      maxSize: 1000,
    };
  }

  clearCache(): void {
    this.evaluationCache.clear();
  }
}
```

#### Guidance Controller (Frontend)

**File:** `src/frontend/game/guidance-controller.ts`

**Changes:**

- Add debounce utility function
- Implement request coalescing for rapid moves
- Add loading state management
- Cancel pending requests on new input

**New Utilities:**

```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delay);
  };
}
```

**Modified Guidance Controller:**

```typescript
class GuidanceController {
  private debouncedUpdate: (fen: string) => void;
  private pendingRequest: AbortController | null = null;

  constructor() {
    // Debounce guidance updates by 150ms
    this.debouncedUpdate = debounce(
      (fen: string) => this.requestGuidance(fen),
      150
    );
  }

  async requestGuidance(fen: string): Promise<void> {
    // Cancel pending request
    if (this.pendingRequest) {
      this.pendingRequest.abort();
    }

    this.pendingRequest = new AbortController();

    try {
      // Show loading state
      this.showLoadingIndicator();

      const guidance = await ipcClient.chess.requestGuidance({
        fen,
        depth: 15,
        multiPv: 3,
      });

      this.updateGuidanceDisplay(guidance);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Guidance request failed:', error);
      }
    } finally {
      this.hideLoadingIndicator();
      this.pendingRequest = null;
    }
  }

  onMoveUpdate(fen: string): void {
    // Use debounced version for rapid updates
    this.debouncedUpdate(fen);
  }
}
```

#### Board Renderer (Frontend)

**File:** `src/frontend/board/board-renderer.ts`

**Changes:**

- Replace `top`/`left` CSS with `transform: translate()`
- Add `will-change: transform` for GPU optimization
- Batch DOM updates using DocumentFragment
- Use requestAnimationFrame for smooth updates

**Modified Rendering:**

```typescript
export class BoardRenderer {
  private pendingUpdate: number | null = null;

  renderBoard(position: Position): void {
    // Cancel pending animation frame
    if (this.pendingUpdate !== null) {
      cancelAnimationFrame(this.pendingUpdate);
    }

    // Schedule update on next frame
    this.pendingUpdate = requestAnimationFrame(() => {
      this.doBoardUpdate(position);
      this.pendingUpdate = null;
    });
  }

  private doBoardUpdate(position: Position): void {
    const fragment = document.createDocumentFragment();
    const boardElement = document.getElementById('chessboard')!;

    // Clear existing pieces
    boardElement.innerHTML = '';

    // Build all pieces in fragment (no reflow until append)
    for (const [square, piece] of Object.entries(position)) {
      const pieceElement = this.createPieceElement(piece, square);
      fragment.appendChild(pieceElement);
    }

    // Single DOM update (triggers one reflow)
    boardElement.appendChild(fragment);
  }

  private createPieceElement(piece: Piece, square: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `piece ${piece.color} ${piece.type}`;

    // Use transform instead of top/left
    const [file, rank] = this.squareToCoordinates(square);
    element.style.transform = `translate(${file * 100}%, ${rank * 100}%)`;

    return element;
  }
}
```

**CSS Changes:**

**File:** `src/frontend/styles/index.css`

```css
/* Add hardware acceleration hints */
.piece {
  /* Remove: top, left positioning */
  /* Add: transform-based positioning */
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  transform: translate(var(--file-pos), var(--rank-pos));
  will-change: transform; /* GPU hint */
  transition: transform 0.2s ease-out;
}

/* Optimize board container for transforms */
#chessboard {
  /* Enable GPU compositing */
  transform: translateZ(0);
  will-change: transform;
}
```

### Data Model

**New Types:**

```typescript
// src/shared/performance-types.ts

interface AnalysisProgress {
  completed: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

interface CacheStatistics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

interface PerformanceMetrics {
  analysisTime: number;
  guidanceLatency: number;
  renderTime: number;
  cacheHitRate: number;
}
```

### API Changes

#### IPC Methods

| Method | Request Type | Response Type | Description |
| ------ | ------------ | ------------- | ----------- |
| `chess:analyzeGameWithProgress` | `AnalyzeGameProgressRequest` | Stream of `AnalysisProgress` | Analyze game with progress updates |
| `engine:getCacheStatistics` | `void` | `CacheStatistics` | Get engine cache performance metrics |
| `engine:clearCache` | `void` | `void` | Clear engine evaluation cache |

#### Request/Response Schemas

```typescript
// Request
interface AnalyzeGameProgressRequest {
  moves: Move[];
  depth?: number;
}

// Response (streamed via pub/sub)
interface AnalysisProgressUpdate {
  type: 'progress' | 'complete';
  progress: AnalysisProgress;
  results?: Analysis[]; // Only on 'complete'
}
```

### UI Changes

**Affected Files:**

- `src/frontend/board/board-renderer.ts` - Transform-based rendering
- `src/frontend/game/guidance-controller.ts` - Debounced updates
- `src/frontend/analysis/analysis-controller.ts` - Progress indicators
- `src/frontend/styles/index.css` - Hardware acceleration styles

**New UI Elements:**

- Loading indicator during guidance requests (spinner overlay)
- Progress bar during game analysis showing completion percentage
- Cache statistics in developer debug panel (if enabled)

### State Management

- Guidance requests managed via AbortController for cancellation
- Board render requests coalesced via requestAnimationFrame
- Cache state managed within StockfishEngine singleton
- Progress updates streamed via IPC pub/sub pattern

### Error Handling

| Error Condition | Handling Strategy | User Feedback |
| --------------- | ----------------- | ------------- |
| Engine cache full | LRU eviction automatically handles | None (transparent) |
| Parallel analysis fails | Retry failed moves sequentially | Toast: "Analysis slower than expected" |
| Debounced request canceled | Silent cancellation, no-op | None (expected behavior) |
| DOM update frame dropped | Continue on next frame | None (graceful degradation) |

## Implementation Plan

### Phase Breakdown

#### Phase 1A: Backend Parallel Analysis (Week 1, Days 1-2)

**Scope:**

- Implement parallel analysis in `analysis-pipeline.ts`
- Add batching logic to prevent engine overload
- Add progress callback mechanism
- Update IPC handler to stream progress

**Dependencies:** None

**Estimated Effort:** 4-6 hours

#### Phase 1B: Engine Caching (Week 1, Days 2-3)

**Scope:**

- Implement LRU cache class
- Integrate cache into StockfishEngine
- Add cache statistics tracking
- Add IPC methods for cache management

**Dependencies:** None

**Estimated Effort:** 2-3 hours

#### Phase 1C: Guidance Debouncing (Week 1, Day 3)

**Scope:**

- Implement debounce utility
- Add request cancellation to guidance controller
- Add loading state indicators
- Test rapid move sequences

**Dependencies:** None

**Estimated Effort:** 2-3 hours

#### Phase 2A: Board Rendering Optimization (Week 1, Days 4-5)

**Scope:**

- Replace top/left CSS with transforms
- Add will-change hints for GPU acceleration
- Implement DOM batching with DocumentFragment
- Use requestAnimationFrame for updates

**Dependencies:** None

**Estimated Effort:** 2-3 hours

#### Phase 2B: CSS Optimization (Week 1, Day 5)

**Scope:**

- Update CSS for transform-based positioning
- Add hardware acceleration hints
- Test across different screen sizes
- Validate 60fps rendering

**Dependencies:** Phase 2A

**Estimated Effort:** 2-3 hours

#### Phase 3: Testing & Benchmarking (Week 2, Days 1-2)

**Scope:**

- Performance benchmarks for all optimizations
- Integration testing with real games
- Cache hit rate analysis
- User acceptance testing

**Dependencies:** All previous phases

**Estimated Effort:** 6-8 hours

### File Changes Summary

| File | Action | Description |
| ---- | ------ | ----------- |
| `src/backend/analysis-pipeline.ts` | Modify | Add parallel analysis with Promise.all() |
| `src/engine/stockfish-engine.ts` | Modify | Add LRU cache for evaluations |
| `src/frontend/game/guidance-controller.ts` | Modify | Add debouncing and request cancellation |
| `src/frontend/board/board-renderer.ts` | Modify | Transform-based rendering with batching |
| `src/frontend/styles/index.css` | Modify | Hardware acceleration CSS |
| `src/shared/performance-types.ts` | Create | New types for performance tracking |
| `src/backend/handlers/analysis-handlers.ts` | Modify | Add progress streaming support |
| `src/shared/utils/debounce.ts` | Create | Debounce utility function |
| `tests/unit/lru-cache.test.ts` | Create | LRU cache unit tests |
| `tests/integration/parallel-analysis.test.ts` | Create | Parallel analysis integration tests |
| `tests/performance/rendering-benchmark.test.ts` | Create | Board rendering performance tests |

## Testing Strategy

### Unit Tests

| Test Case | File | Description |
| --------- | ---- | ----------- |
| LRU Cache - Basic Operations | `tests/unit/lru-cache.test.ts` | Test get/set/eviction logic |
| LRU Cache - Max Size | `tests/unit/lru-cache.test.ts` | Verify LRU eviction at capacity |
| LRU Cache - Statistics | `tests/unit/lru-cache.test.ts` | Test hit/miss tracking |
| Debounce - Delay | `tests/unit/debounce.test.ts` | Verify delay behavior |
| Debounce - Cancellation | `tests/unit/debounce.test.ts` | Test cancellation on rapid calls |

### Integration Tests

| Test Case | Description |
| --------- | ----------- |
| Parallel Analysis - 40 Moves | Verify analysis completes in <3s with parallelization |
| Cache Hit Rate - Repeated Positions | Test cache effectiveness with transpositions |
| Guidance Debounce - Rapid Undo/Redo | Verify only final position triggers engine call |
| Board Render - 60fps | Measure frame rate during rapid piece movements |

### Manual Test Cases

| ID | Steps | Expected Result |
| -- | ----- | --------------- |
| MT-1 | Play 40-move game in Exam Mode, analyze | Analysis completes in <3 seconds with progress bar |
| MT-2 | Rapidly undo/redo 10 times in Training Mode | Only final position shows guidance (<100ms) |
| MT-3 | Make rapid moves with bot opponent | Board animations smooth, no stuttering |
| MT-4 | Analyze same position multiple times | Second analysis instant due to cache |

## Performance Considerations

### Expected Impact

**CPU:**
- Parallel analysis increases CPU usage during analysis (acceptable trade-off for speed)
- Debouncing reduces overall CPU usage during rapid user input

**Memory:**
- LRU cache adds ~5-10MB for 1000 cached evaluations
- DOM batching reduces memory churn from frequent reflows

**Startup Time:**
- No impact (optimizations apply to runtime only)

### Benchmarks

**Analysis Performance:**
- Baseline: Measure 40-move game analysis time (current: 5-10s)
- Target: <3s with parallel execution
- Method: Automated benchmark with real game data

**Guidance Latency:**
- Baseline: Measure guidance update time (current: 200ms)
- Target: <100ms with debouncing
- Method: Performance.now() instrumentation

**Rendering Performance:**
- Baseline: Measure frame rate during rapid moves
- Target: Consistent 60fps (16ms per frame)
- Method: requestAnimationFrame timing + Chrome DevTools

## Security Considerations

- [x] No user data exposed
- [x] No input validation changes (using existing FEN validation)
- [x] No new attack vectors introduced
- [x] Cache isolation per engine instance (no cross-contamination)

## Rollout Plan

### Feature Flags

No feature flags needed - optimizations are internal implementation details with no user-facing changes to functionality.

### Rollback Plan

1. **Parallel Analysis:** Revert to sequential loop if stability issues
2. **Caching:** Disable cache if memory issues detected
3. **Debouncing:** Remove debounce if user feedback is negative
4. **Transform Rendering:** Revert CSS to position-based if GPU issues

All changes are isolated and can be rolled back independently.

## Alternatives Considered

### Option 1: Web Workers for Analysis

**Approach:** Move entire analysis pipeline to Web Worker

**Pros:**
- True parallelism separate from main thread
- No blocking of UI during analysis

**Cons:**
- Stockfish WASM already runs in background
- Overhead of message passing between threads
- Complexity of state synchronization

**Why rejected:** Promise.all() provides sufficient parallelism with less complexity for single-threaded Stockfish

### Option 2: IndexedDB for Cache Persistence

**Approach:** Persist cache to IndexedDB for cross-session reuse

**Pros:**
- Cache survives app restarts
- Potentially higher hit rates over time

**Cons:**
- Async overhead for cache lookups
- Storage management complexity
- Cache invalidation challenges across versions

**Why rejected:** In-memory cache is faster and simpler; positions rarely repeat across sessions

### Option 3: Throttle Instead of Debounce

**Approach:** Use throttling (max 1 call per N ms) instead of debouncing

**Pros:**
- Provides periodic updates during rapid input

**Cons:**
- Still makes unnecessary calls during rapid sequences
- Debouncing better matches user intent (final position)

**Why rejected:** Debouncing aligns better with user behavior pattern

## Dependencies

### External Dependencies

None - all optimizations use existing packages and APIs

### Internal Dependencies

- Existing Stockfish engine integration
- Existing IPC infrastructure (WebSocket)
- Existing board rendering system
- Existing analysis pipeline

## Open Questions

1. **What is the optimal batch size for parallel analysis?**
   - Proposal: Start with 5, tune based on benchmarks
   - Consideration: Single-threaded Stockfish may not benefit from batches >5

2. **Should cache size be configurable by users?**
   - Proposal: No, hardcode at 1000 for simplicity
   - Revisit if memory concerns arise in testing

3. **Should we show cache statistics in UI?**
   - Proposal: Yes, but only in developer debug mode
   - Add to settings panel for power users

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Parallel analysis causes race conditions | Low | High | Thorough testing, each move analysis is independent |
| Cache causes memory issues on low-end devices | Low | Medium | Monitor memory usage, implement cache size limits |
| Transform rendering causes visual bugs | Medium | Medium | Extensive cross-browser testing, fallback to position |
| Debouncing makes app feel less responsive | Low | High | User testing to tune delay value (150ms default) |

---

## Approval

| Role | Name | Date | Status |
| ---- | ---- | ---- | ------ |
| Tech Lead | | | Pending |
| Reviewer 1 | | | Pending |
| Reviewer 2 | | | Pending |

## Revision History

| Version | Date | Author | Changes |
| ------- | ---- | ------ | ------- |
| 0.1 | 2026-01-08 | Claude | Initial draft |
