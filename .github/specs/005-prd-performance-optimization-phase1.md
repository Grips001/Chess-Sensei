# PRD: Performance Optimization - Phase 1 (Critical Path Improvements)

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-08
> **Last Updated:** 2026-01-08 **Related Issues:** N/A

---

## Executive Summary

Improve Chess-Sensei's performance by 30-60% in critical user-facing operations
through targeted optimizations in game analysis pipeline, move guidance system,
and board rendering. This phase focuses on high-impact, low-risk improvements
that directly enhance user experience.

## Problem Statement

### Current State

Chess-Sensei v1.1.0 has acceptable but not optimal performance in key
operations:

- **Game Analysis:** 5-10 seconds for a 40-move game (sequential processing)
- **Move Guidance:** ~200ms response time (acceptable but can be improved)
- **Board Rendering:** Variable frame rates, occasional jank during rapid moves
- **Engine Calls:** No caching, repeated evaluation of identical positions

### User Pain Points

- Users wait 5-10 seconds for post-game analysis results in Exam Mode
- Rapid undo/redo sequences trigger unnecessary engine calculations
- Long games (100+ moves) experience slower UI updates
- Board animations occasionally stutter during bot moves
- No visual feedback during analysis (feels unresponsive)

### Impact

**Affected Users:** All users across all game modes

**Severity:** Medium - functionality works but performance impacts user
experience and perceived quality

## Goals

### Primary Goals

1. **Reduce game analysis time to <3 seconds** for 40-move games (60%
   improvement)
2. **Reduce move guidance latency to <100ms** (50% improvement)
3. **Achieve consistent 60fps board rendering** (16ms frame budget)
4. **Eliminate redundant engine calculations** through intelligent caching

### Non-Goals

1. Optimizing startup time (separate PRD)
2. Memory optimization (separate PRD)
3. Network performance (app is offline-only)
4. Algorithm complexity improvements in Stockfish (third-party)

### Success Metrics

| Metric                        | Current | Target    | Measurement Method             |
| ----------------------------- | ------- | --------- | ------------------------------ |
| Game analysis (40 moves)      | 5-10s   | <3s       | Automated performance test     |
| Move guidance response        | 200ms   | <100ms    | Performance.now() measurements |
| Board render time             | ~20ms   | <16ms     | requestAnimationFrame timing   |
| Cache hit rate (repeated pos) | 0%      | >70%      | Engine cache statistics        |
| Analysis progress feedback    | None    | Real-time | User testing feedback          |

## User Stories

### Primary User Story

```text
As a chess student using Exam Mode
I want my game analysis to complete quickly
So that I can review my mistakes immediately and maintain learning momentum
```

### Secondary User Stories

```text
As a Training Mode user
I want move guidance to appear instantly
So that I can focus on learning without waiting for suggestions

As a user making rapid moves
I want the board to respond smoothly
So that the app feels professional and responsive

As a user analyzing positions
I want to see progress during long operations
So that I know the app is working and not frozen
```

## Requirements

### Functional Requirements

| ID    | Requirement                                            | Priority | Notes                                |
| ----- | ------------------------------------------------------ | -------- | ------------------------------------ |
| FR-01 | Parallelize game analysis across all moves             | Must     | Core performance improvement         |
| FR-02 | Cache engine evaluations with LRU eviction             | Must     | Prevents redundant calculations      |
| FR-03 | Debounce guidance requests during rapid move sequences | Must     | Reduces unnecessary engine calls     |
| FR-04 | Use CSS transforms for piece positioning               | Must     | Hardware acceleration for animations |
| FR-05 | Batch DOM updates in board renderer                    | Must     | Reduces layout thrashing             |
| FR-06 | Stream analysis results as they complete               | Should   | Progressive user feedback            |
| FR-07 | Display analysis progress indicator                    | Should   | User sees activity during wait       |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                         |
| ------ | ---------------------- | ------------------------------------------------ |
| NFR-01 | Performance            | Meet all target metrics in Success Metrics table |
| NFR-02 | Reliability            | No regressions in existing functionality         |
| NFR-03 | Maintainability        | Code changes well-documented and tested          |
| NFR-04 | Platform Compatibility | Improvements work across Windows, macOS, Linux   |

## User Experience

### User Flow: Exam Mode Analysis

```text
1. User completes game and clicks "Finish Game"
2. System displays "Analyzing game..." with progress bar (NEW)
3. Analysis progress updates in real-time: "Analyzing move 15/40..." (NEW)
4. Analysis completes in <3 seconds (IMPROVED from 5-10s)
5. User sees analysis results immediately
```

### User Flow: Training Mode Guidance

```text
1. User makes a move
2. System debounces guidance request (150ms delay) (NEW)
3. System checks cache for position (NEW)
   - If cached: return instantly (<1ms)
   - If not cached: query engine (<100ms)
4. Board highlights appear with Blue/Green/Yellow moves
5. User hovers over suggestion, sees instant feedback (no lag)
```

### Edge Cases

| Scenario                         | Expected Behavior                                    |
| -------------------------------- | ---------------------------------------------------- |
| Very long game (200+ moves)      | Progress indicator updates throughout, completes <6s |
| Repeated undo/redo same position | Cache hit, instant response                          |
| Multiple games analyzed rapidly  | Cache persists across games, maintains performance   |
| Cache memory limit reached       | LRU eviction, maintains 1000 entry limit             |
| Analysis interrupted by user     | Graceful cancellation, cleanup of pending promises   |

## Technical Considerations

### Dependencies

- **Backend:** analysis-pipeline.ts, stockfish-engine.ts
- **Frontend:** guidance-controller.ts, board-renderer.ts
- **Shared:** websocket-ipc-client.ts (for progress streaming)
- **External:** Stockfish WASM (no changes needed)

### Constraints

- Stockfish WASM is single-threaded (cannot parallelize within engine)
- Must maintain WASM sandboxing (no native multi-threading)
- Cache must not consume excessive memory (limit to 1000 entries)
- Debouncing must not introduce noticeable input lag

### Risks

| Risk                                     | Likelihood | Impact | Mitigation                                    |
| ---------------------------------------- | ---------- | ------ | --------------------------------------------- |
| Parallel analysis doesn't scale linearly | Medium     | Medium | Benchmark early, adjust approach if needed    |
| Cache invalidation bugs                  | Low        | High   | Comprehensive testing of cache key generation |
| CSS transform browser compatibility      | Low        | Low    | Test on WebView2, WebKit, confirm support     |
| Debouncing feels laggy to users          | Low        | Medium | User testing, adjust debounce delay if needed |

## Alternatives Considered

### Option 1: WebWorker for Engine

- **Pros:** True parallel execution, doesn't block main thread
- **Cons:** Stockfish WASM already in backend, complex message passing
- **Why rejected:** Backend already isolated, no benefit over promise
  parallelization

### Option 2: IndexedDB for Cache

- **Pros:** Persistent cache across sessions
- **Cons:** Async overhead, cache invalidation complexity, storage quota limits
- **Why rejected:** In-memory LRU sufficient, faster access, simpler
  implementation

### Option 3: Virtual DOM for Board

- **Pros:** Automatic batching, diffing algorithm
- **Cons:** Framework dependency, overkill for simple board updates
- **Why rejected:** DocumentFragment sufficient for our use case, no added
  complexity

## Implementation Plan

### Phases

1. **Phase 1A: Backend Performance (Week 1)**
   - Parallel move analysis
   - Engine position caching
   - Analysis progress streaming

2. **Phase 1B: Frontend Performance (Week 1)**
   - Debounce guidance requests
   - CSS transform piece positioning
   - Batch DOM updates

3. **Phase 1C: Testing & Validation (Week 2)**
   - Performance benchmarks
   - Regression testing
   - User acceptance testing

### Implementation Dependencies

- All changes can be implemented independently
- Testing requires all changes complete for accurate benchmark comparison
- Progress UI requires WebSocket pub/sub pattern (already exists)

## Open Questions

1. **What debounce delay feels natural?** Need user testing to determine optimal
   value (150ms proposed)
2. **Should cache persist across app restarts?** Currently in-memory only,
   discuss persistence value
3. **What cache size is optimal?** 1000 entries proposed, may need tuning based
   on memory usage

---

## Approval

| Role           | Name | Date | Status  |
| -------------- | ---- | ---- | ------- |
| Product Owner  |      |      | Pending |
| Tech Lead      |      |      | Pending |
| Design (if UI) | N/A  | N/A  | N/A     |

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2026-01-08 | Claude | Initial draft |
