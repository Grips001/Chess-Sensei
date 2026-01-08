# PRD: Code Quality Improvements - Type Safety & Error Handling

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-08
> **Last Updated:** 2026-01-08 **Related Issues:** N/A

---

## Executive Summary

Eliminate all TypeScript `any` types and implement standardized error handling
throughout Chess-Sensei. This improves type safety, reduces runtime errors, and
creates a consistent error handling strategy that makes debugging easier and
code more maintainable.

## Problem Statement

### Current State

Chess-Sensei v1.1.0 has good TypeScript practices but room for improvement:

- **TypeScript `any` Types:** ~15 instances across codebase
- **Error Handling:** Inconsistent patterns, mix of approaches
- **Error Types:** No standardized error hierarchy
- **Type Coverage:** ~85% (room for 100%)
- **Runtime Type Checking:** Minimal validation of external inputs

### User Pain Points (Developer Experience)

- `any` types bypass TypeScript safety, hide potential bugs
- Inconsistent error messages make debugging harder
- No standard way to handle different error categories
- Runtime type mismatches not caught until execution
- IPC parameter validation missing in some handlers
- Difficult to trace error origin in stack traces

### Impact

**Affected Users:** Developers, maintainers, and indirectly end-users (fewer
bugs)

**Severity:** Medium - Code works but lacks robustness and safety

## Goals

### Primary Goals

1. **Eliminate all `any` types** from the codebase (target: zero)
2. **Implement standardized error hierarchy** for consistent error handling
3. **Add comprehensive input validation** using schema validation library
4. **Improve error messages** with actionable context
5. **Enable strict TypeScript checks** (noUncheckedIndexedAccess, etc.)

### Non-Goals

1. Rewriting working algorithms or business logic
2. Performance optimization (type safety should not impact performance)
3. Changing external APIs or contracts
4. Adding new features (pure quality improvement)

### Success Metrics

| Metric                     | Current | Target   | Measurement Method                |
| -------------------------- | ------- | -------- | --------------------------------- |
| TypeScript `any` count     | ~15     | 0        | ESLint no-explicit-any violations |
| Type coverage              | ~85%    | 100%     | TypeScript strict checks          |
| Error handling consistency | 30%     | 100%     | Code audit                        |
| Input validation coverage  | 40%     | 100%     | Review all IPC handlers           |
| Runtime type errors        | 5/month | <1/month | Error tracking logs               |

## User Stories

### Primary User Story

```text
As a developer working with TypeScript
I want complete type safety without any escape hatches
So that I catch bugs at compile time instead of runtime
```

### Secondary User Stories

```text
As a developer debugging an error
I want clear, actionable error messages
So that I can quickly identify and fix the issue

As a developer calling IPC methods
I want schema validation with helpful error messages
So that I know exactly what went wrong with my request

As a new contributor
I want consistent error handling patterns
So that I can follow established conventions
```

## Requirements

### Functional Requirements

| ID    | Requirement                                       | Priority | Notes                                   |
| ----- | ------------------------------------------------- | -------- | --------------------------------------- |
| FR-01 | Remove all `any` types, replace with proper types | Must     | Backend, frontend, shared code          |
| FR-02 | Implement standardized error class hierarchy      | Must     | Base class + category-specific classes  |
| FR-03 | Add Zod schema validation for IPC parameters      | Must     | All 45 IPC methods                      |
| FR-04 | Standardize error response format                 | Must     | Consistent structure across IPC         |
| FR-05 | Enable additional TypeScript strict checks        | Must     | noUncheckedIndexedAccess, etc.          |
| FR-06 | Add comprehensive FEN validation library          | Should   | Detailed error messages for invalid FEN |
| FR-07 | Implement error tracking and aggregation          | Should   | Count recurring errors                  |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                     |
| ------ | ---------------------- | -------------------------------------------- |
| NFR-01 | Backward Compatibility | No breaking changes to IPC contracts         |
| NFR-02 | Performance            | Validation overhead <5ms per request         |
| NFR-03 | Developer Experience   | Clear error messages with actionable context |
| NFR-04 | Maintainability        | Consistent patterns, well-documented         |

## User Experience

### Developer Experience Flow: Type-Safe IPC Call

**Before (Current):**

```typescript
// Frontend - no type safety
const result = await ipcClient.call('chess:requestBestMoves', {
  fen: position,      // Could be wrong type
  depth: '10',        // String instead of number - runtime error!
  count: 3
});

// Backend - any type, no validation
async requestBestMoves(params: any) {
  const fen = params.fen;  // Could be undefined, wrong type
  const depth = params.depth; // Could be string, not validated
  // Runtime error when passing to engine
}
```

**After (Improved):**

```typescript
// Shared schema definition
const RequestBestMovesSchema = z.object({
  fen: z.string().min(10).max(100),
  depth: z.number().int().min(1).max(30),
  count: z.number().int().min(1).max(5)
});

// Frontend - type-safe interface
const result = await ipcClient.chess.requestBestMoves({
  fen: position,
  depth: '10',  // TypeScript error: Type 'string' not assignable to 'number'
  count: 3
});

// Backend - validated and typed
async requestBestMoves(params: unknown) {
  const validated = RequestBestMovesSchema.parse(params); // Throws ValidationError if invalid
  // validated is now properly typed: { fen: string; depth: number; count: number }
  const result = await engine.getBestMoves(validated.fen, validated.depth, validated.count);
}
```

### Developer Experience Flow: Error Handling

**Before (Current):**

```typescript
// Inconsistent error handling
try {
  await saveGame(record);
} catch (error) {
  // What type of error? What went wrong? How to fix?
  console.error('Error saving game', error); // Generic message
  return { error: 'Failed to save game' }; // No context
}
```

**After (Improved):**

```typescript
// Consistent error handling with hierarchy
try {
  await saveGame(record);
} catch (error) {
  if (error instanceof StorageError) {
    logger.error('Storage error', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return {
      error: {
        code: 'STORAGE_ERROR',
        message: 'Failed to save game: disk full or permissions issue',
        details: {
          path: error.details.path,
          diskSpace: error.details.available,
        },
      },
    };
  }
  // Handle other error types...
}
```

### Edge Cases

| Scenario                                 | Expected Behavior                                       |
| ---------------------------------------- | ------------------------------------------------------- |
| IPC params fail schema validation        | Return ValidationError with detailed field-level errors |
| Unexpected error type caught             | Log full stack, return generic INTERNAL_ERROR           |
| Array index access potentially undefined | TypeScript error forces null check                      |
| Optional property accessed               | TypeScript error forces undefined check                 |

## Technical Considerations

### Dependencies

- **Zod:** Schema validation library (new dependency)
- **TypeScript:** Upgrade to latest 5.x for best strict checks
- **All IPC handlers:** Must add validation
- **All services:** Must use typed error classes

### Constraints

- Validation must not significantly impact performance (<5ms overhead)
- Error handling must be backward compatible with existing IPC clients
- Cannot change existing IPC method signatures (breaking change)
- Must maintain current functionality (behavior-preserving)

### Risks

| Risk                                  | Likelihood | Impact | Mitigation                                 |
| ------------------------------------- | ---------- | ------ | ------------------------------------------ |
| Breaking changes during `any` removal | Medium     | High   | Thorough testing, incremental approach     |
| Validation overhead impacts perf      | Low        | Medium | Benchmark validation, optimize if needed   |
| Over-engineering error hierarchy      | Low        | Low    | Keep simple, add complexity only as needed |
| Strict checks reveal hidden bugs      | High       | Medium | Good! Fix bugs, improve quality            |

## Alternatives Considered

### Option 1: Keep Some `any` Types

- **Pros:** Less refactoring work, avoid potential breaks
- **Cons:** Continues to hide type safety issues
- **Why rejected:** Goal is complete type safety, `any` is technical debt

### Option 2: Use io-ts Instead of Zod

- **Pros:** Generates types from validators (single source of truth)
- **Cons:** More complex API, less readable, smaller community
- **Why rejected:** Zod is more developer-friendly, sufficient for needs

### Option 3: Manual Validation Without Library

- **Pros:** No new dependency, full control
- **Cons:** Verbose, error-prone, harder to maintain
- **Why rejected:** Library provides better DX, standardization, error messages

## Implementation Plan

### Phases

1. **Phase 4A: Error Hierarchy (Week 9)**
   - Define base ChessSenseiError class
   - Create category-specific error classes
   - Implement standardized error response helper
   - Update error handling documentation

2. **Phase 4B: Type Safety (Week 9)**
   - Audit all `any` types, create replacement plan
   - Enable additional TypeScript strict checks
   - Fix resulting type errors incrementally
   - Remove all `any` types

3. **Phase 4C: Input Validation (Week 10)**
   - Add Zod dependency
   - Define schemas for all IPC methods
   - Implement validation in all IPC handlers
   - Add comprehensive FEN validation
   - Update error messages with context

4. **Phase 4D: Testing & Documentation (Week 10)**
   - Test error handling paths
   - Document error codes and handling patterns
   - Create developer guide for error handling
   - Update all tests for new error format

### Implementation Dependencies

- Error hierarchy must be complete before handler refactor
- TypeScript strict checks should be enabled early (reveals issues)
- Validation schemas can be added incrementally per handler

## Open Questions

1. **Should we track error frequency?** (Identify recurring issues)
   - Proposal: Yes, implement lightweight error tracking

2. **Should validation errors include field paths?** (e.g., "params.depth must
   be number")
   - Proposal: Yes, Zod provides this automatically

3. **Should we validate responses in addition to requests?**
   - Proposal: Not initially, add if needed for robustness

4. **How to handle backwards compatibility for error format?**
   - Proposal: Add new fields, keep old structure, deprecate gradually

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
