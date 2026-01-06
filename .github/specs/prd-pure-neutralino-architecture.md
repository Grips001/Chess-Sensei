# PRD: Pure Neutralino Architecture Migration

> **Status:** Draft
> **Author:** Claude (AI Assistant)
> **Created:** 2026-01-06
> **Last Updated:** 2026-01-06
> **Related Issues:** CS-005

---

## Executive Summary

Migrate Chess-Sensei from a dual-process architecture (Neutralino frontend + Bun backend) to a single-process Pure
Neutralino App architecture. This eliminates the 111MB Bun runtime executable, reducing total distribution size from
121MB to ~10MB (92% reduction) while maintaining all existing functionality and improving application simplicity.

## Problem Statement

### Current State

Chess-Sensei v1.0.4 uses a dual-process architecture:

- **Frontend**: Neutralino.js application (606KB bundle)
- **Backend**: Bun runtime executable (111MB) handling file I/O, chess engine, and AI opponent
- **Communication**: WebSocket-based IPC between processes

The application distribution is **121MB**, with the Bun runtime accounting for **92%** of the total size.
This creates several issues:

1. **Excessive download size**: 111MB runtime for a chess training app is disproportionate
2. **Slow distribution**: Large executable takes longer to download and distribute
3. **Architectural mismatch**: Neutralino.js is designed for single-process frontend-only apps
4. **Unnecessary complexity**: WebSocket IPC layer adds complexity without benefit
5. **Misconception of Bun's role**: Bun was used as production runtime instead of development tool

### User Pain Points

- **Slow downloads**: Users with limited bandwidth experience long download times (111MB)
- **Storage concerns**: 121MB is excessive for a chess app on systems with limited storage
- **Deployment friction**: Larger distributions are harder to share and deploy
- **Update overhead**: Every update includes the full 111MB runtime even for minor changes
- **Perception issues**: Large executable size may deter downloads due to security concerns

### Impact

**Affected Users**: All Chess-Sensei users across Windows, Linux, and macOS

**Severity**: HIGH - Size is 10x larger than necessary, negatively impacting distribution and adoption

## Goals

### Primary Goals

1. **Reduce distribution size by 92%**: From 121MB to ~10MB by eliminating Bun runtime
2. **Maintain 100% feature parity**: All training modes, analysis, dashboard functionality preserved
3. **Improve architectural simplicity**: Single-process design following Neutralino best practices
4. **Preserve development experience**: Keep Bun as development/build tool
5. **Ensure stability**: No regressions in existing functionality (v1.0.4 is stable)

### Non-Goals

1. **Feature additions**: No new features during migration (stability over features)
2. **UI/UX changes**: User interface remains identical
3. **Performance optimization beyond architecture**: Not addressing rendering optimizations (Phase 2)
4. **Database migration**: JSON file storage remains (SQLite is Phase 3)
5. **Framework rewrite**: No introduction of React/Vue/Solid (considered too risky)

### Success Metrics

| Metric                     | Current | Target | Measurement Method                     |
| -------------------------- | ------- | ------ | -------------------------------------- |
| Distribution Size          | 121MB   | <15MB  | Measure build output directory size    |
| Executable Size            | 111MB   | 0MB    | Remove Chess-Sensei.exe completely     |
| Application Startup Time   | ~2s     | <1s    | Time from launch to UI interactive     |
| Test Pass Rate             | 100%    | 100%   | All existing tests must pass           |
| Feature Functionality      | 100%    | 100%   | Manual testing of all modes            |
| Build Time                 | ~10s    | <15s   | Time for `bun run build`               |
| Frontend Bundle Size       | 606KB   | <800KB | Measure resources.neu (services added) |
| Memory Usage (at startup)  | ~150MB  | <100MB | Single process should use less memory  |
| Stockfish Analysis Quality | 100%    | 100%   | Identical engine output                |

## User Stories

### Primary User Story

```text
As a Chess-Sensei user
I want to download and install the application quickly
So that I can start training without waiting for large downloads
```

### Secondary User Stories

```text
As a user with limited storage
I want the application to use minimal disk space
So that I can keep Chess-Sensei installed alongside other apps
```

```text
As a developer
I want to maintain the application using Bun's fast tooling
So that I can continue enjoying fast installs, tests, and builds
```

```text
As a user receiving updates
I want application updates to be small and fast
So that I stay current without long download times
```

```text
As a system administrator
I want to deploy Chess-Sensei across multiple machines efficiently
So that I can distribute it without bandwidth concerns
```

## Requirements

### Functional Requirements

| ID    | Requirement                                                    | Priority | Notes                                             |
| ----- | -------------------------------------------------------------- | -------- | ------------------------------------------------- |
| FR-01 | All training modes work identically (Training/Exam/Sandbox)    | Must     | Core functionality - no regressions               |
| FR-02 | Stockfish engine runs in WebWorker without blocking UI         | Must     | Move from backend to frontend WebWorker           |
| FR-03 | Game data persists using Neutralino.filesystem API             | Must     | Replace Bun file I/O with Neutralino APIs         |
| FR-04 | AI opponent personalities function identically                 | Must     | Move ai-opponent.ts to frontend services          |
| FR-05 | Post-game analysis produces identical results                  | Must     | Move analysis-pipeline.ts to frontend             |
| FR-06 | Progress dashboard displays all statistics correctly           | Must     | Data loaded via Neutralino.filesystem             |
| FR-07 | Move guidance (Blue/Green/Yellow hints) works in Training mode | Must     | Move move-guidance logic to frontend              |
| FR-08 | Export/Import functionality (PGN/JSON) works                   | Should   | Adapt to Neutralino.filesystem                    |
| FR-09 | Sound effects play correctly                                   | Should   | Frontend already handles this                     |
| FR-10 | All game modes load without WebSocket IPC                      | Must     | Direct function calls replace IPC                 |
| FR-11 | Error logging works via Neutralino APIs                        | Should   | Replace file-logger.ts with Neutralino.filesystem |
| FR-12 | Application builds for Windows/Linux/macOS                     | Must     | Update build scripts                              |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                                    |
| ------ | ---------------------- | ----------------------------------------------------------- |
| NFR-01 | Performance            | Application startup <1s, engine analysis non-blocking       |
| NFR-02 | Reliability            | Zero crashes during 100+ game test suite                    |
| NFR-03 | Platform Compatibility | Works on Windows 10+, Linux (Ubuntu 20.04+), macOS 11+      |
| NFR-04 | Maintainability        | Code remains readable, services clearly separated           |
| NFR-05 | Build Reproducibility  | `bun run build:app` produces identical builds               |
| NFR-06 | Test Coverage          | All existing tests pass, no coverage reduction              |
| NFR-07 | Data Integrity         | Existing user data loads correctly after migration          |
| NFR-08 | Memory Efficiency      | Single process uses <100MB RAM at startup                   |
| NFR-09 | CPU Usage              | Stockfish in WebWorker doesn't freeze UI                    |
| NFR-10 | Disk I/O               | Neutralino.filesystem performs equivalently to Bun file I/O |

## User Experience

### User Flow

```text
Before Migration:
1. User launches Chess-Sensei.exe (111MB executable)
2. Bun runtime starts backend process
3. Backend initializes Stockfish engine
4. Backend starts WebSocket server
5. Frontend launches (Neutralino)
6. Frontend connects to backend via WebSocket
7. User can now interact with application (~2s startup)

After Migration:
1. User launches Chess-Sensei (Neutralino only)
2. Frontend initializes Stockfish WebWorker
3. Frontend loads services (AI, storage, analysis)
4. User can now interact with application (<1s startup)
```

### Mockups/Wireframes

No UI changes required - user interface remains identical. Migration is purely architectural.

### Edge Cases

| Scenario                                         | Expected Behavior                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| First launch with no saved data                  | Creates default data files via Neutralino.filesystem                      |
| Stockfish WebWorker fails to load                | Display error modal, allow retry or disable AI features                   |
| Filesystem permission denied                     | Show error message, request permissions via Neutralino API                |
| Large game history (1000+ games)                 | Loads progressively, no UI blocking (same as current behavior)            |
| User has existing v1.0.4 save data               | Data format unchanged, loads seamlessly                                   |
| Stockfish WASM takes time to initialize          | Show loading indicator, queue analysis requests                           |
| Multiple chess engines requested simultaneously  | WebWorker queues requests, processes sequentially                         |
| Application closed during file write             | Neutralino.filesystem handles gracefully (same as Bun)                    |
| User switches modes rapidly                      | Direct function calls faster than WebSocket IPC (improved responsiveness) |
| Analysis requested on 50+ move game              | WebWorker keeps UI responsive, progress indicator shown                   |
| Neutralino.filesystem API unavailable (old ver.) | Detect at startup, show error, prompt user to update                      |

## Technical Considerations

### Dependencies

**Frontend Dependencies** (unchanged):

- `@neutralinojs/lib`: ^6.4.0
- `chess.js`: ^1.4.0
- `stockfish.wasm`: ^0.10.0

**Backend Dependencies** (migrate to frontend):

- AI opponent logic (no external deps)
- Analysis pipeline logic (chess.js already in frontend)
- Data storage logic (adapt to Neutralino.filesystem)

**Build Dependencies** (unchanged):

- `vite`: ^7.2.7 (frontend bundler)
- `bun`: ^1.3.4 (dev tool only)
- `@neutralinojs/neu`: ^11.3.0 (build tool)

### Constraints

1. **Neutralino API Limitations**: Must use Neutralino.filesystem (no Node.js fs module)
2. **Browser Environment**: WebWorker for Stockfish (main thread blocking not acceptable)
3. **No Backend Runtime**: Cannot use backend-specific APIs (Bun.file, etc.)
4. **Vite Bundle Size**: Adding services to frontend will increase bundle (~100-200KB)
5. **WebWorker Communication**: Message passing overhead for Stockfish (minimal impact)
6. **Neutralino Version**: Requires Neutralino 6.4.0+ for filesystem APIs
7. **Data Migration**: Existing save files must work without conversion
8. **Cross-Platform**: Solution must work on Windows, Linux, macOS

### Risks

| Risk                                            | Likelihood | Impact | Mitigation                                                           |
| ----------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------- |
| Stockfish WASM slower in WebWorker              | Low        | Medium | Benchmark early, WebWorkers typically same performance               |
| Neutralino.filesystem API issues                | Medium     | High   | Thorough testing, create filesystem abstraction layer                |
| Existing save data incompatibility              | Low        | High   | Use identical JSON format, test migration with v1.0.4 data           |
| Frontend bundle becomes too large               | Medium     | Low    | Monitor bundle size, services are <200KB, still acceptable           |
| WebSocket IPC removal breaks something          | Medium     | High   | Comprehensive testing, maintain feature parity checklist             |
| Build script changes break cross-platform build | Low        | Medium | Test on all platforms before finalizing                              |
| Development workflow disrupted                  | Low        | Low    | Bun remains for dev, only production runtime changes                 |
| UI blocking during Stockfish initialization     | Medium     | Medium | Add loading states, initialize WebWorker early                       |
| File I/O errors on some platforms               | Medium     | Medium | Robust error handling, fallback to in-memory for critical operations |
| Regression in AI opponent behavior              | Low        | Medium | Unit tests for AI logic, manual testing of all personalities         |
| Analysis quality degradation                    | Low        | High   | Automated tests comparing engine output before/after                 |
| User confusion from different file structure    | Low        | Low    | No user-visible changes, internals only                              |

## Alternatives Considered

### Option 1: Use Node.js Runtime (Instead of Bun)

- **Pros:**
  - Smaller runtime (~15-20MB vs 111MB)
  - Maintains backend/frontend separation
  - Less code migration required
- **Cons:**
  - Still 15-20MB of unnecessary runtime
  - Maintains WebSocket IPC complexity
  - Doesn't follow Neutralino design philosophy
  - Doesn't achieve optimal size reduction
- **Why rejected:** Pure Neutralino approach is simpler and achieves better results (0MB vs 15MB)

### Option 2: Native Backend (Rust/Go)

- **Pros:**
  - Smallest possible backend (~5-10MB)
  - Best performance
  - No runtime overhead
- **Cons:**
  - Complete backend rewrite (2-4 weeks)
  - Requires Rust/Go expertise
  - High risk for stable project
  - Violates "stability over features" principle
- **Why rejected:** Too risky and time-consuming for marginal benefit (5MB vs 0MB)

### Option 3: Electron Framework

- **Pros:**
  - Familiar to many developers
  - Large ecosystem
  - Chrome DevTools built-in
- **Cons:**
  - Even larger runtime (~150MB with Chromium)
  - Goes in wrong direction (larger, not smaller)
  - Requires complete rewrite
- **Why rejected:** Makes the problem worse, not better

### Option 4: Tauri Framework

- **Pros:**
  - Smaller runtime (~10-15MB)
  - Uses system webview
  - Rust-based (secure)
- **Cons:**
  - Requires complete rewrite
  - Different API surface than Neutralino
  - Migration effort equivalent to Option 2
  - Already invested in Neutralino
- **Why rejected:** Pure Neutralino achieves same result without migration cost

## Implementation Plan

### Phases

1. **Phase 1: Backend Service Migration (Days 1-2)**

   - Move `src/backend/ai-opponent.ts` → `src/frontend/services/ai-opponent.ts`
   - Move `src/backend/data-storage.ts` → `src/frontend/services/data-storage.ts`
   - Move `src/backend/analysis-pipeline.ts` → `src/frontend/services/analysis-pipeline.ts`
   - Move `src/backend/metrics-calculator.ts` → `src/frontend/services/metrics-calculator.ts`
   - Move `src/backend/export-import.ts` → `src/frontend/services/export-import.ts`
   - Adapt file I/O calls from Bun APIs to Neutralino.filesystem

2. **Phase 2: Stockfish WebWorker (Day 2)**

   - Create `src/frontend/workers/stockfish-worker.ts`
   - Implement UCI protocol message passing
   - Update engine references to use WebWorker
   - Test engine analysis quality

3. **Phase 3: Remove WebSocket IPC (Day 3)**

   - Delete `src/backend/websocket-server.ts`
   - Delete `src/frontend/websocket-ipc-client.ts`
   - Replace IPC calls with direct service imports
   - Update all frontend modules

4. **Phase 4: Update Build Scripts (Day 3)**

   - Modify `scripts/build-windows.ts` to skip Bun exe compilation
   - Modify `scripts/build-linux.ts` to skip Bun exe compilation
   - Modify `scripts/build-macos.ts` to skip Bun exe compilation
   - Update build output to only include Neutralino + resources.neu

5. **Phase 5: Testing & Validation (Day 4)**

   - Run full test suite: `bun run verify`
   - Manual testing: All game modes, AI opponents, analysis
   - Cross-platform build testing
   - Performance benchmarking
   - Data migration testing with v1.0.4 saves

6. **Phase 6: Documentation Update (Day 4)**
   - Update README.md architecture section
   - Update CHANGELOG.md
   - Update troubleshooting.md if needed
   - Document new development workflow (unchanged)

### Dependencies

**Before Implementation:**

- ✅ v1.0.4 is stable (no known bugs)
- ✅ Optimization analysis completed (component-inventory.md, optimization-plan.md)
- ⏳ PRD approval (this document)
- ⏳ Tech Spec creation and approval

**During Implementation:**

- Neutralino.js 6.4.0+ (already installed)
- Stockfish WASM module (already included)
- Working knowledge of WebWorker API
- Comprehensive test suite

## Open Questions

1. **Neutralino.filesystem performance**: Does Neutralino.filesystem match Bun.file performance for large JSON writes?

   - **Answer needed before**: Phase 1 implementation
   - **How to resolve**: Benchmark file I/O operations

2. **WebWorker Stockfish initialization time**: How long does Stockfish WASM take to initialize in WebWorker?

   - **Answer needed before**: Phase 2 implementation
   - **How to resolve**: Create prototype WebWorker, measure init time

3. **Error logging strategy**: Should we keep file-based logging or switch to in-memory logs?

   - **Answer needed before**: Phase 1 implementation
   - **How to resolve**: Decide based on user needs (logs rarely accessed)

4. **Development hot-reload**: Will Vite hot module replacement work with services in frontend?

   - **Answer needed before**: Phase 1 implementation
   - **How to resolve**: Test with `bun run dev` after initial migration

5. **Stockfish multi-instance**: Can we run multiple Stockfish WebWorkers for parallel analysis?

   - **Answer needed before**: Not blocking (optimization consideration)
   - **How to resolve**: Test after Phase 2 if needed

6. **Data format changes**: Do we need to version the save data format?

   - **Answer needed before**: Phase 1 implementation
   - **How to resolve**: Add version field to save files for future migrations

7. **Bundle size threshold**: At what frontend bundle size should we consider code splitting?

   - **Answer needed before**: Not blocking (Phase 2 optimization)
   - **How to resolve**: Monitor bundle size, split if >1MB

8. **Cross-platform testing**: Do we have access to Windows/Linux/macOS for testing?
   - **Answer needed before**: Phase 5 testing
   - **How to resolve**: Confirm testing environment availability

---

## Approval

| Role           | Name | Date | Status  |
| -------------- | ---- | ---- | ------- |
| Product Owner  | User |      | Pending |
| Tech Lead      | User |      | Pending |
| Design (if UI) | N/A  |      | N/A     |

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2026-01-06 | Claude | Initial draft |
