# PRD: Testing Strategy Enhancement - 90% Coverage Goal

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-08
> **Last Updated:** 2026-01-08 **Related Issues:** N/A

---

## Executive Summary

Expand Chess-Sensei's test suite from ~40% coverage to 90%+ through
comprehensive unit, integration, and end-to-end tests. Establish robust test
infrastructure with helpers, mocks, and fixtures to ensure code quality and
prevent regressions.

## Problem Statement

### Current State

Chess-Sensei v1.1.0 has limited test coverage:

- **Total Coverage:** ~40%
- **Test Files:** 12 files
- **Backend Services:** Mostly untested (~20% coverage)
- **Frontend Components:** Minimal testing (~10% coverage)
- **Integration Tests:** Basic coverage (~30% coverage)
- **Test Infrastructure:** Limited helpers and mocks

### User Pain Points (Developer Experience)

- Fear of breaking existing functionality when adding features
- Regressions caught late (or not at all) in development
- Time-consuming manual testing for each change
- Difficult to verify edge cases and error handling
- No confidence in refactoring safety
- Hard to reproduce and fix bugs without tests

### Impact

**Affected Users:** Developers, maintainers, and end-users (indirect)

**Severity:** High - Low test coverage leads to bugs, regressions, and
development friction

## Goals

### Primary Goals

1. **Achieve 90%+ test coverage** across all layers
2. **Create comprehensive test infrastructure** (helpers, mocks, fixtures)
3. **Establish testing best practices** and patterns
4. **Test all critical paths** (Training, Exam, Sandbox modes)
5. **Enable confident refactoring** with regression safety

### Non-Goals

1. 100% coverage (diminishing returns, some code difficult to test)
2. Performance testing (separate concern)
3. Visual regression testing (no visual changes expected)
4. Load testing (offline single-user app)

### Success Metrics

| Metric                      | Current | Target | Measurement Method       |
| --------------------------- | ------- | ------ | ------------------------ |
| Overall test coverage       | ~40%    | 90%+   | Bun test coverage report |
| Backend service coverage    | ~20%    | 90%+   | Bun test coverage report |
| Frontend component coverage | ~10%    | 80%+   | Bun test coverage report |
| Integration test coverage   | ~30%    | 85%+   | Bun test coverage report |
| Test file count             | 12      | 100+   | File count               |
| Critical paths tested       | 30%     | 100%   | Manual audit             |

## User Stories

### Primary User Story

```text
As a developer making changes to the codebase
I want comprehensive test coverage
So that I can be confident my changes don't break existing functionality
```

### Secondary User Stories

```text
As a developer fixing a bug
I want to write a regression test
So that the bug never reappears

As a new contributor
I want clear test examples and patterns
So that I can write quality tests for my contributions

As a tech lead reviewing PRs
I want high test coverage requirements
So that code quality standards are maintained

As an end user
I want a stable, bug-free application
So that I can focus on improving my chess skills
```

## Requirements

### Functional Requirements

| ID    | Requirement                            | Priority | Notes                               |
| ----- | -------------------------------------- | -------- | ----------------------------------- |
| FR-01 | Unit tests for all backend services    | Must     | AIOpponent, AnalysisPipeline, etc.  |
| FR-02 | Unit tests for all frontend components | Must     | Board, UI, Game, Analysis modules   |
| FR-03 | Integration tests for all IPC methods  | Must     | Full frontend-backend communication |
| FR-04 | E2E tests for all game mode flows      | Must     | Training, Exam, Sandbox             |
| FR-05 | Test helpers and utilities library     | Must     | Reduce test boilerplate             |
| FR-06 | Mock implementations for all services  | Must     | Enable isolated unit testing        |
| FR-07 | Test fixtures for common scenarios     | Must     | Standard game states, positions     |
| FR-08 | Snapshot testing for UI components     | Should   | Catch unintended UI changes         |

### Non-Functional Requirements

| ID     | Requirement          | Criteria                                       |
| ------ | -------------------- | ---------------------------------------------- |
| NFR-01 | Test Performance     | Full test suite completes in <60 seconds       |
| NFR-02 | Test Reliability     | Tests are deterministic, no flakiness          |
| NFR-03 | Test Maintainability | Tests are readable, well-organized, documented |
| NFR-04 | CI Integration       | All tests run automatically on PRs             |

## User Experience

### Developer Experience Flow: Writing a Test

**Before (Current):**

```text
1. Developer wants to test AIOpponent service
2. No existing examples or helpers
3. Developer struggles to mock Stockfish engine
4. Developer spends 2 hours setting up test infrastructure
5. Test is fragile, breaks when unrelated code changes
```

**After (Improved):**

```text
1. Developer wants to test AIOpponent service
2. Developer imports createMockEngine() helper
3. Developer uses commonFixtures.startingFen
4. Developer writes focused test in 10 minutes
5. Test is robust, only fails for real issues
```

### Developer Experience Flow: Running Tests

**Before (Current):**

```text
1. Developer runs `bun test`
2. 12 tests complete in 2 seconds
3. 40% coverage shown
4. Developer unsure if changes are safe
```

**After (Improved):**

```text
1. Developer runs `bun test`
2. 100+ tests complete in 45 seconds
3. 90%+ coverage shown with detailed report
4. Developer confident changes are safe
5. CI automatically runs tests on PR
```

### Edge Cases

| Scenario                           | Expected Behavior                                 |
| ---------------------------------- | ------------------------------------------------- |
| Test timeout during long operation | Test fails with clear timeout message             |
| Mock returns unexpected value      | Test fails with type error or assertion failure   |
| Fixture data becomes outdated      | Tests fail, prompting fixture update              |
| Test depends on external state     | Test is isolated, uses mocks for all dependencies |

## Technical Considerations

### Dependencies

- **Test Runner:** Bun test (already in use)
- **DOM Testing:** happy-dom (already in use)
- **Test Utilities:** Custom helpers (to be created)
- **Coverage Tool:** Bun's built-in coverage (already in use)

### Constraints

- Tests must run in CI environment (no GUI, no external dependencies)
- Tests must be deterministic (no flakiness from timing issues)
- Test suite must complete in reasonable time (<60s target)
- Tests must not depend on external resources (offline testing)

### Risks

| Risk                                  | Likelihood | Impact | Mitigation                                     |
| ------------------------------------- | ---------- | ------ | ---------------------------------------------- |
| Writing tests takes longer than code  | High       | Medium | Invest in helpers/mocks upfront to accelerate  |
| Tests become brittle over time        | Medium     | Medium | Follow best practices, isolate dependencies    |
| Test suite becomes too slow           | Low        | Medium | Monitor performance, parallelize, optimize     |
| False sense of security from coverage | Low        | High   | Focus on meaningful tests, not just coverage % |

## Alternatives Considered

### Option 1: Focus on E2E Tests Only

- **Pros:** Tests real user flows, catches integration issues
- **Cons:** Slow, brittle, hard to debug, poor isolation
- **Why rejected:** Need unit tests for fast feedback and precise failure
  diagnosis

### Option 2: Use Jest Instead of Bun Test

- **Pros:** Mature ecosystem, many examples, large community
- **Cons:** Slower than Bun test, additional dependency, configuration overhead
- **Why rejected:** Bun test is fast, built-in, sufficient for our needs

### Option 3: Aim for 100% Coverage

- **Pros:** Maximum confidence, no untested code
- **Cons:** Diminishing returns, some code not worth testing (trivial getters)
- **Why rejected:** 90% is pragmatic balance between effort and value

## Implementation Plan

### Phases

1. **Phase 3A: Test Infrastructure (Week 6)**
   - Create test helper library
   - Implement mock services (MockEngine, MockStorage, etc.)
   - Define test fixtures (common game states, FEN positions)
   - Document testing patterns and best practices

2. **Phase 3B: Backend Unit Tests (Week 6-7)**
   - AIOpponent tests (bot personalities, difficulty)
   - AnalysisPipeline tests (move classification, CPL)
   - MetricsCalculator tests (9-dimension metrics)
   - DataStorage tests (atomic writes, backups)
   - ExportImportManager tests (PGN, JSON, ZIP)

3. **Phase 3C: Frontend Unit Tests (Week 7)**
   - Board renderer tests (FEN → DOM, flipping)
   - UI component tests (dialogs, alerts, history)
   - Game controller tests (move execution, undo/redo)
   - Mode controller tests (Training, Exam, Sandbox)
   - Analysis UI tests (AnalysisUIManager, components)

4. **Phase 3D: Integration Tests (Week 8)**
   - WebSocket IPC tests (all 45 methods)
   - Training Mode flow tests (start → play → finish)
   - Exam Mode flow tests (start → play → analyze)
   - Sandbox Mode flow tests (edit → analyze)
   - Data Management flow tests (export → import)

### Implementation Dependencies

- Test infrastructure must be complete before unit tests
- Unit tests should be prioritized by criticality
- Integration tests require stable unit test foundation

## Open Questions

1. **Should we implement mutation testing?** (Test the tests)
   - Proposal: Not initially, consider later if coverage quality concerns arise

2. **What coverage threshold should block PRs?** (CI enforcement)
   - Proposal: 80% minimum to merge, 90% target for new code

3. **Should tests run in watch mode during development?**
   - Proposal: Yes, add `bun run test:watch` to workflow

4. **How to handle slow integration tests?**
   - Proposal: Separate fast unit tests from slow integration tests

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
