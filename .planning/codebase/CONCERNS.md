# Codebase Concerns

**Analysis Date:** 2026-02-17

## Tech Debt

**Node.js fs Module in Bun Backend:**
- Issue: `src/backend/data-storage.ts` imports and uses Node.js `fs/promises` for file operations (lines 209, 272, 809, 874) despite targeting Bun runtime
- Files: `src/backend/data-storage.ts`
- Impact: Violates project constraint to use Bun APIs only. Reduces portability and performance benefits. The project rules explicitly mandate Bun.file() and Bun.write() instead of fs module
- Fix approach: Replace all `import('fs/promises')` calls with native Bun APIs. Bun.file() exists() check for verification, use Bun.write() for atomic operations, and investigate Bun's directory utilities for file deletion instead of fs.unlink() and fs.readdir()

**TypeScript `any` Type Without Justification:**
- Issue: `src/backend/websocket-server.ts:49` defines `type MethodHandler = (payload: any) => Promise<any>` without inline comment explaining why strict typing isn't used
- Files: `src/backend/websocket-server.ts`, `src/shared/explanation-generator.ts:299`
- Impact: Reduces type safety for WebSocket method handlers and move analysis. Makes refactoring harder and obscures runtime contracts
- Fix approach: Add JSDoc comment explaining dynamic dispatch pattern. For explanation-generator, validate square parameter before casting to `any`

**Manual Test Files in Source Tree:**
- Issue: Test files like `src/backend/ai-opponent-manual-test.ts`, `src/engine/stockfish-manual-test.ts`, `src/shared/chess-logic-manual-test.ts` (498 lines total) are checked into src/ instead of tests/
- Files: `src/backend/ai-opponent-manual-test.ts`, `src/engine/engine-interface-manual-test.ts`, `src/engine/engine-operations-manual-test.ts`, `src/engine/stockfish-manual-test.ts`, `src/shared/chess-logic-manual-test.ts`
- Impact: Clutters source code tree. These appear to be developer scripts not part of automated test suite. Increases cognitive load when navigating codebase
- Fix approach: Move to `tests/manual/` directory. Convert to proper test suite integration or document as development utilities only

**In-Memory Fallback Without Clear Data Loss Warning:**
- Issue: `src/backend/data-storage.ts` implements in-memory fallback (lines 147-149) when disk write fails. Logs warning but doesn't prevent user from continuing (line 276-277)
- Files: `src/backend/data-storage.ts`
- Impact: Users may unknowingly lose game data on application exit if disk storage fails silently. Phase 9 enhancement designed without user-facing error notification mechanism
- Fix approach: Implement user notification in frontend when memory fallback mode is activated. Prevent saving new games or recommend backup/export until disk issue is resolved

## Known Bugs

**Possible Race Condition in DOM getAttribute Usage:**
- Symptoms: Type assertions like `getAttribute('data-template') as keyof typeof POSITION_TEMPLATES` may fail if attribute returns null but code assumes string
- Files: `src/frontend/sandbox-mode.ts:848-849`, similar patterns in `src/frontend/exam-mode.ts:500, 510, 519`
- Trigger: When HTML attribute is missing or removed dynamically before event handler executes
- Workaround: All observed cases have null coalescing fallbacks (`||`) in place, but type cast doesn't reflect this

**Explanation Generator console.error Suppression:**
- Symptoms: Explanation generation failures are logged to console.error but application continues returning fallback explanation
- Files: `src/shared/explanation-generator.ts:53, 89`
- Trigger: Any chess.js parsing error or invalid FEN/move combination
- Workaround: Frontend displays generic fallback explanation. User has no visibility into why explanation failed

## Security Considerations

**Local-Only Data Storage:**
- Risk: All user game data, analysis results, and player profiles stored in plaintext JSON files on disk
- Files: `src/backend/data-storage.ts`, `src/backend/export-import.ts`
- Current mitigation: Stored in platform-specific user data directory (not world-readable on Unix systems). Application is single-user desktop only
- Recommendations: Document that exported files contain sensitive game analysis data and should be treated as private. Consider adding optional encryption layer for sensitive exports

**Arbitrary FEN Parsing in Sandbox Mode:**
- Risk: `src/frontend/sandbox-mode.ts` accepts arbitrary FEN strings from user input without validation in some code paths
- Files: `src/frontend/sandbox-mode.ts`
- Current mitigation: chess.js library validates FEN at parse time, throws on invalid input
- Recommendations: Add explicit FEN validation before passing to chess.js. Provide clear error messages for invalid positions

**Math.random() for Skill Simulation:**
- Risk: `src/backend/ai-opponent.ts` uses Math.random() extensively (lines 127, 136, 150, 179, 199, 211, 252, 259, 262, 266, 270, 274, 282) for bot move selection and timing. Not cryptographically secure but acceptable for game purposes
- Files: `src/backend/ai-opponent.ts`
- Current mitigation: Used only for gameplay simulation, not security-critical
- Recommendations: No action needed unless AI behavior becomes prediction-based competitive feature

## Performance Bottlenecks

**Progress Dashboard DOM Manipulation (1758 lines):**
- Problem: `src/frontend/progress-dashboard.ts` is the largest frontend file. Generates complex HTML for multiple tabs/charts/analytics sections. May cause jank on lower-end machines during initial load or rapid tab switches
- Files: `src/frontend/progress-dashboard.ts`
- Cause: All dashboard HTML generation happens synchronously in JavaScript. No virtualization or lazy loading for game history lists
- Improvement path: Implement lazy rendering for game history. Use web workers for statistics calculations. Consider pagination instead of rendering all 30+ games at once

**Analysis Pipeline Synchronous Processing:**
- Problem: `src/backend/analysis-pipeline.ts` (611 lines) processes entire game move-by-move in single async function. No streaming or cancellation support
- Files: `src/backend/analysis-pipeline.ts`
- Cause: Game analysis calculates metrics for all moves sequentially before returning results
- Improvement path: Implement streaming analysis updates via WebSocket pub/sub channels. Add cancellation token for long-running analyses

**WebSocket Method Handler Type Safety:**
- Problem: Generic `MethodHandler = (payload: any) => Promise<any>` means each handler must validate parameters at runtime. No type checking at call site
- Files: `src/backend/websocket-server.ts:49`, all handler implementations
- Cause: Deserialized JSON payload requires runtime validation before use
- Improvement path: Implement type-safe method registry using discriminated unions or type guards

## Fragile Areas

**DOM Event Handling in Game Modes:**
- Files: `src/frontend/exam-mode.ts` (673 lines), `src/frontend/training-mode.ts` (480 lines), `src/frontend/sandbox-mode.ts` (1088 lines)
- Why fragile: Multiple overlapping event listeners on dynamically created elements. Mode switching calls addEventListener/removeEventListener on elements that may not exist. Board rendering updates can conflict with UI state
- Safe modification: Always check element existence with `getElementById` before attaching listeners. Use event delegation on parent containers instead of direct listeners on ephemeral elements. Clear all listeners in mode shutdown before creating new ones
- Test coverage: Integration tests exist (`tests/integration/training-mode.test.ts`) but cover only happy path. Missing tests for mode switching sequences, rapid board updates, and interrupted games

**Board Renderer and Highlight System:**
- Files: `src/frontend/board/board-renderer.ts`, `src/frontend/board/board-highlights.ts`, `src/frontend/board/board-events.ts` (295 DOM operations total)
- Why fragile: Multiple systems modify board squares simultaneously (renders, highlights, selections, annotations). Race conditions possible during rapid move sequences
- Safe modification: Centralize board state management. Always update highlights after board render completes. Use MutationObserver to detect external DOM changes that break internal state
- Test coverage: No unit tests for board state consistency. Only integration tests through game modes

**Export/Import Data Validation:**
- Files: `src/backend/export-import.ts` (1061 lines)
- Why fragile: Import accepts arbitrary JSON with minimal version/compatibility checking. Schema validation is minimal - only checks required fields exist
- Safe modification: Implement strict JSON schema validation. Add version migration path for future format changes. Validate game data integrity (move sequences play out correctly). Add detailed error reporting for import failures
- Test coverage: No automated tests for import validation. Manual testing only

## Scaling Limits

**Single Chess Engine Instance:**
- Current capacity: 1 sequential analysis request at a time. Backend maintains single global StockfishEngine instance
- Limit: User cannot analyze multiple games simultaneously. Frontend queues requests serially to port 9339
- Scaling path: Implement engine instance pooling or multi-threaded analysis. Would require architectural changes to handler dispatch

**Data Storage in User Home Directory:**
- Current capacity: No technical limit, but UI performs O(n) directory scans and full file loads
- Limit: With 1000+ games stored, loading all game metadata into memory becomes slow. Progress dashboard rendering becomes sluggish
- Scaling path: Implement SQLite database or indexed JSON format. Lazy-load game data. Add database query for filtering/sorting instead of in-memory operations

**WebSocket Message Buffering:**
- Current capacity: All pub/sub messages buffered in memory with no size limits
- Limit: Long-running analyses generating rapid evaluation updates could cause memory growth
- Scaling path: Implement ring buffer for published updates. Drop old messages if buffer fills. Add configurable retention policy

## Dependencies at Risk

**chess.js Dependency:**
- Risk: No alternatives evaluated. If chess.js becomes unmaintained or has critical bugs, migration would require significant refactoring
- Impact: Core game logic, move validation, and FEN parsing all depend on chess.js. No wrapper layer abstracts dependency
- Migration plan: Create `src/shared/chess-wrapper.ts` that exports only used chess.js functions with type-safe wrappers. Would allow swapping implementation (e.g., to `chess-engine` or `chessops`) with minimal frontend changes

**Stockfish WASM Module:**
- Risk: Stockfish library version pinned in build. Updates require recompiling engine binary
- Impact: Security updates or performance improvements in Stockfish require rebuild and testing
- Migration plan: Document Stockfish version in package.json. Establish upgrade schedule (e.g., quarterly). Test against latest version in CI

## Missing Critical Features

**No Game Replay/Navigation:**
- Problem: Users can view game history but cannot navigate to specific moves or replay games from any position
- Blocks: Cannot review critical moments in detail. Cannot practice from lost positions

**No Elo Rating System:**
- Problem: Bot personality/difficulty exists but no player rating tracking across games
- Blocks: Cannot measure objective improvement or track rating over time

**No Opening/Endgame Database:**
- Problem: Board annotations exist but no opening recognition or endgame tablebase integration
- Blocks: Cannot provide opening theory recommendations or endgame guidance

**No Export to Standard Formats:**
- Problem: Export exists for JSON/PGN but not to SCID, ChessTempo, or Lichess format
- Blocks: Cannot interoperate with existing chess training platforms

**No Cloud Sync:**
- Problem: All data is local only
- Blocks: Cannot backup to cloud or access data across devices

## Test Coverage Gaps

**Export/Import Validation:**
- What's not tested: PGN parsing accuracy, import of corrupt/malformed files, batch import conflict resolution, data integrity after round-trip export/import
- Files: `src/backend/export-import.ts`
- Risk: Imported games could have silently corrupted move sequences. Users may lose data during batch operations
- Priority: High - data loss impact

**AI Opponent Behavior:**
- What's not tested: Blunder rate accuracy across difficulty levels, time management consistency, move selection distributions
- Files: `src/backend/ai-opponent.ts`
- Risk: Difficulty balancing could feel inconsistent or exploitable. Bot personality not matching profile settings
- Priority: Medium - user experience impact

**Progress Dashboard Calculations:**
- What's not tested: Accuracy metric calculation, trend detection logic, edge cases (zero games, all draws, incomplete games)
- Files: `src/frontend/progress-dashboard.ts`
- Risk: Misleading statistics displayed to user. Trend indicators could be inverted
- Priority: High - user sees incorrect data

**WebSocket IPC Error Handling:**
- What's not tested: Connection failures, message loss scenarios, handler timeout behavior, concurrent request ordering
- Files: `src/backend/websocket-server.ts`, `src/frontend/websocket-ipc-client.ts`
- Risk: Silent failures. User clicks button, nothing happens. No feedback that operation failed
- Priority: High - affects all game modes

**Board State Consistency:**
- What's not tested: Rapid move sequences, board resets during analysis, highlight synchronization during mode switches
- Files: `src/frontend/board/`
- Risk: Board could display incorrect position. Highlights could persist from previous move
- Priority: Medium - gameplay correctness

---

*Concerns audit: 2026-02-17*
