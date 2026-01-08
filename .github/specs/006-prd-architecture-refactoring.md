# PRD: Architecture Refactoring - Dependency Injection & State Management

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-08
> **Last Updated:** 2026-01-08 **Related Issues:** N/A

---

## Executive Summary

Refactor Chess-Sensei's architecture to use industry-standard dependency
injection and centralized state management patterns. This improves code
maintainability, testability, and developer experience while reducing coupling
and technical debt.

## Problem Statement

### Current State

Chess-Sensei v1.1.0 uses functional patterns with global state and state
accessor functions:

- **Backend:** Global singleton services with state accessor pattern
- **Frontend:** Global mutable state scattered across modules
- **Dependency Management:** Implicit dependencies passed via closures
- **State Updates:** Direct mutations with manual notification
- **Testing:** Difficult to mock dependencies, requires complex setup

### User Pain Points (Developer Experience)

- Difficult to understand component dependencies (implicit via closures)
- Hard to test components in isolation (tight coupling to globals)
- State mutations scattered throughout codebase (hard to debug)
- No single source of truth for application state
- Circular dependency risks when adding new features
- Time-consuming test setup (must initialize full dependency graph)

### Impact

**Affected Users:** Developers and maintainers

**Severity:** Medium - Current system works but creates friction for development
and increases maintenance cost

## Goals

### Primary Goals

1. **Implement dependency injection container** for explicit dependency
   management
2. **Create centralized state management** with immutability and predictable
   updates
3. **Improve testability** through easy dependency mocking
4. **Reduce coupling** between modules and components
5. **Establish clear architectural layers** with enforced boundaries

### Non-Goals

1. Rewriting working functionality (behavior-preserving refactor only)
2. Changing external APIs or IPC contracts
3. Performance optimization (separate concern)
4. UI/UX changes (no user-visible changes)

### Success Metrics

| Metric                     | Current | Target | Measurement Method        |
| -------------------------- | ------- | ------ | ------------------------- |
| Test setup complexity      | High    | Low    | Lines of test setup code  |
| Circular dependencies      | 3-5     | 0      | Dependency analysis tools |
| Global mutable state vars  | ~15     | 0      | Code audit                |
| Module coupling score      | Medium  | Low    | Static analysis           |
| Test coverage (refactored) | ~40%    | 60%    | Bun test coverage report  |

## User Stories

### Primary User Story

```text
As a developer adding a new feature
I want to easily understand and inject required dependencies
So that I can implement features quickly without breaking existing code
```

### Secondary User Stories

```text
As a developer writing tests
I want to mock dependencies without complex setup
So that I can write focused unit tests efficiently

As a developer debugging state issues
I want a single source of truth for application state
So that I can trace state changes and identify bugs quickly

As a new contributor
I want clear architectural layers and boundaries
So that I can understand the codebase and make safe changes
```

## Requirements

### Functional Requirements

| ID    | Requirement                                    | Priority | Notes                                 |
| ----- | ---------------------------------------------- | -------- | ------------------------------------- |
| FR-01 | Implement lightweight DI container for backend | Must     | Service registration and resolution   |
| FR-02 | Create GameStateManager with immutable state   | Must     | Single source of truth for game state |
| FR-03 | Refactor backend services to use DI            | Must     | Explicit constructor injection        |
| FR-04 | Refactor frontend to use GameStateManager      | Must     | Replace scattered global state        |
| FR-05 | Define and enforce layered architecture        | Should   | ESLint rules for import restrictions  |
| FR-06 | Update all tests to use new patterns           | Must     | Tests must pass after refactor        |
| FR-07 | Document architecture patterns and guidelines  | Should   | ADRs and code comments                |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                          |
| ------ | ---------------------- | ------------------------------------------------- |
| NFR-01 | Backward Compatibility | No changes to IPC contracts or data formats       |
| NFR-02 | Performance            | No performance regression (within 5%)             |
| NFR-03 | Testability            | 60%+ test coverage achieved                       |
| NFR-04 | Maintainability        | Clear separation of concerns, documented patterns |

## User Experience

### Developer Experience Flow: Adding a New Feature

**Before (Current):**

```text
1. Developer reads index.ts to understand global state
2. Developer searches codebase for state accessor functions
3. Developer adds new global variable and accessor
4. Developer manually wires dependencies via closures
5. Developer writes complex test setup with mock globals
6. Test fails due to uninitialized dependencies
7. Developer adds more initialization boilerplate
```

**After (Improved):**

```text
1. Developer defines service interface
2. Developer implements service with constructor injection
3. Developer registers service in DI container
4. Service dependencies automatically resolved
5. Developer writes test with mocked dependencies
6. Test passes, clean and focused
```

### Developer Experience Flow: Debugging State Bug

**Before (Current):**

```text
1. Bug reported: "Board doesn't update after undo"
2. Developer searches for state mutations (15+ locations)
3. Developer adds console.log to trace mutations
4. Developer finds race condition in scattered updates
5. Fix requires coordinating 3 different modules
```

**After (Improved):**

```text
1. Bug reported: "Board doesn't update after undo"
2. Developer checks GameStateManager subscribers
3. Developer sees state change history in debugger
4. Developer identifies missing notification
5. Fix is one-line change in single location
```

### Edge Cases

| Scenario                            | Expected Behavior                                  |
| ----------------------------------- | -------------------------------------------------- |
| Service depends on unregistered dep | Container throws clear error at startup            |
| Circular service dependencies       | Container detects and throws error at registration |
| State mutation attempted directly   | TypeScript error (state is readonly)               |
| Multiple state updates in sequence  | Batched notification, single render                |

## Technical Considerations

### Dependencies

- **Backend:** All service files (ai-opponent, analysis-pipeline, etc.)
- **Frontend:** All modules with state (index.ts, game-controller, modes)
- **Testing:** All existing tests must be updated

### Constraints

- Must maintain current functionality (behavior-preserving refactor)
- Cannot break existing IPC contracts
- Must complete incrementally (module-by-module)
- Cannot introduce new runtime dependencies (pure refactor)

### Risks

| Risk                                  | Likelihood | Impact | Mitigation                                     |
| ------------------------------------- | ---------- | ------ | ---------------------------------------------- |
| Regression during refactor            | Medium     | High   | Incremental approach, comprehensive test suite |
| Performance degradation               | Low        | Medium | Benchmark before/after, optimize if needed     |
| Developer resistance to new patterns  | Low        | Medium | Clear documentation, code examples             |
| Incomplete refactor leaves mixed code | Medium     | Medium | Complete one subsystem fully before next       |

## Alternatives Considered

### Option 1: Keep Current State Accessors Pattern

- **Pros:** No refactor needed, current code works
- **Cons:** Technical debt increases, harder to maintain over time
- **Why rejected:** Long-term maintainability more important than short-term
  stability

### Option 2: Use Full Framework (Redux, MobX, etc.)

- **Pros:** Battle-tested, ecosystem support, devtools
- **Cons:** Heavy dependency, overkill for our needs, learning curve
- **Why rejected:** Lightweight custom solution sufficient, avoids framework
  lock-in

### Option 3: InversifyJS for DI

- **Pros:** Full-featured DI framework, decorator support
- **Cons:** Heavy dependency, complex API, decorator overhead
- **Why rejected:** Simple custom container meets our needs, no unnecessary
  complexity

## Implementation Plan

### Phases

1. **Phase 2A: DI Container (Week 3)**
   - Implement lightweight DI container
   - Register backend services
   - Update backend to use constructor injection
   - Update backend tests

2. **Phase 2B: State Management (Week 4)**
   - Implement GameStateManager
   - Refactor frontend to use centralized state
   - Update UI to subscribe to state changes
   - Update frontend tests

3. **Phase 2C: Layer Enforcement (Week 5)**
   - Define architectural layers
   - Add ESLint import restriction rules
   - Fix any circular dependencies
   - Document architecture patterns

### Implementation Dependencies

- DI container must be complete before service refactor
- GameStateManager must be complete before frontend refactor
- All refactors must have tests before moving to next phase

## Open Questions

1. **Should DI container support lifecycle management?** (Singleton, Transient,
   Scoped)
   - Proposal: Start with singleton only, add others if needed

2. **Should state changes be logged automatically?** (Time-travel debugging)
   - Proposal: Yes in dev mode, configurable

3. **How to handle state persistence?** (Save/restore state for HMR)
   - Proposal: Add serialization support to GameStateManager

4. **Should we generate DI container from TypeScript types?** (Type-safe
   registration)
   - Proposal: Manual registration initially, explore codegen later

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
