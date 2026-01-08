# Tech Spec: Code Quality Improvements - Type Safety & Error Handling

> **Filename:** `008-tech-code-quality-improvements.md`
> **Status:** Draft
> **Author:** Claude (AI Assistant)
> **Created:** 2026-01-08
> **Last Updated:** 2026-01-08
> **PRD:** `008-prd-code-quality-improvements.md`
> **Related Issues:** N/A

---

## Overview

### Summary

Eliminate all TypeScript `any` types (~15 instances), implement standardized error hierarchy with custom error classes, add Zod schema validation for all 45 IPC methods, enable additional TypeScript strict checks, and standardize error response format across the application.

### Goals

1. Remove all `any` types and replace with proper type annotations
2. Create ChessSenseiError hierarchy with category-specific classes
3. Add Zod schemas for all IPC method parameters
4. Enable `noUncheckedIndexedAccess` and other strict TypeScript options
5. Standardize error response format with error codes and context

### Non-Goals

1. Changing IPC method signatures (behavior-preserving)
2. Rewriting business logic
3. Performance optimization beyond validation overhead
4. Runtime type checking for internal code (TypeScript compile-time only)

## Background

### Current Architecture

**`any` Type Usage (~15 instances):**
```typescript
// src/backend/handlers/engine-handlers.ts
async requestBestMoves(params: any) {  // No validation
  const fen = params.fen;
  const depth = params.depth;
  // ...
}

// src/frontend/websocket-ipc-client.ts
async call(method: string, params: any): Promise<any> {  // Untyped
  // ...
}

// src/engine/stockfish-engine.ts
private parseUCIResponse(response: string): any {  // Untyped parsing
  // ...
}
```

**Error Handling (Inconsistent):**
```typescript
// Mix of approaches across codebase
throw new Error('Invalid FEN');  // Generic Error
return { error: 'Something went wrong' };  // String error
throw 'Invalid move';  // String throw (anti-pattern)
```

### Key Concepts

- **Zod**: Runtime type validation library with TypeScript inference
- **Error Hierarchy**: Structured error classes for different error categories
- **Type Guards**: Runtime type checking functions
- **Strict TypeScript**: Additional compiler flags for stricter checking

## Detailed Design

### Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                   Type Safety Layer                           │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │            Zod Schema Definitions                  │     │
│  │                                                     │     │
│  │  • Engine schemas (RequestBestMoves, etc.)        │     │
│  │  • Bot schemas (InitializeBot, RequestBotMove)    │     │
│  │  • Storage schemas (SaveGame, LoadGame)           │     │
│  │  • Analysis schemas (AnalyzeGame, GetAnalysis)    │     │
│  │                                                     │     │
│  │  All 45 IPC methods have schemas                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  Error Handling Layer                         │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │          ChessSenseiError (Base Class)            │     │
│  │                                                     │     │
│  │  Properties:                                       │     │
│  │  • code: string                                    │     │
│  │  • message: string                                 │     │
│  │  • details?: Record<string, any>                   │     │
│  │  • timestamp: number                               │     │
│  └────────────────┬───────────────────────────────────┘     │
│                   │                                           │
│        ┌──────────┼──────────┬──────────┬─────────────┐     │
│        │          │           │          │             │     │
│  ┌─────▼────┐ ┌──▼────┐ ┌───▼───┐ ┌───▼────┐ ┌─────▼──┐  │
│  │Validation│ │Storage│ │Engine │ │IPC     │ │Config  │  │
│  │Error     │ │Error  │ │Error  │ │Error   │ │Error   │  │
│  └──────────┘ └───────┘ └───────┘ └────────┘ └────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    IPC Request Flow                           │
│                                                               │
│  Frontend Request                                             │
│      │                                                        │
│      ▼                                                        │
│  [Type-safe IPC client]                                      │
│      │                                                        │
│      ▼                                                        │
│  [Zod Schema Validation]                                     │
│      │                                                        │
│      ├─ Valid ──▶ [Backend Handler] ──▶ [Response]          │
│      │                                                        │
│      └─ Invalid ──▶ [ValidationError] ──▶ [Error Response]  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Component Changes

#### Error Hierarchy

**File:** `src/shared/errors.ts` (new file)

```typescript
/**
 * Base error class for Chess-Sensei
 */
export class ChessSenseiError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    code: string,
    message: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation error (invalid input)
 */
export class ValidationError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, details);
  }
}

/**
 * Storage error (file system, database)
 */
export class StorageError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('STORAGE_ERROR', message, details);
  }
}

/**
 * Engine error (Stockfish communication)
 */
export class EngineError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('ENGINE_ERROR', message, details);
  }
}

/**
 * IPC error (communication failure)
 */
export class IPCError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('IPC_ERROR', message, details);
  }
}

/**
 * Configuration error (invalid settings)
 */
export class ConfigError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFIG_ERROR', message, details);
  }
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: number;
  };
}

/**
 * Convert any error to standardized response
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ChessSenseiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
      },
    };
  }

  // Unknown error
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    },
  };
}
```

#### Zod Schemas

**File:** `src/shared/ipc-schemas.ts` (new file)

```typescript
import { z } from 'zod';

/**
 * FEN string validation
 */
const fenSchema = z.string()
  .min(15)
  .max(100)
  .regex(/^[rnbqkpRNBQKP1-8/]+ [wb] [KQkq-]+ [a-h][1-8]|- \d+ \d+$/);

/**
 * Square notation validation (e.g., "e2", "a8")
 */
const squareSchema = z.string()
  .length(2)
  .regex(/^[a-h][1-8]$/);

/**
 * Move validation
 */
const moveSchema = z.object({
  from: squareSchema,
  to: squareSchema,
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
});

// ============================================
// Engine IPC Schemas
// ============================================

export const RequestBestMovesSchema = z.object({
  fen: fenSchema,
  depth: z.number().int().min(1).max(30),
  count: z.number().int().min(1).max(5),
});

export type RequestBestMovesParams = z.infer<typeof RequestBestMovesSchema>;

export const EvaluatePositionSchema = z.object({
  fen: fenSchema,
  depth: z.number().int().min(1).max(30),
});

export type EvaluatePositionParams = z.infer<typeof EvaluatePositionSchema>;

// ============================================
// Bot IPC Schemas
// ============================================

export const InitializeBotOpponentSchema = z.object({
  personality: z.enum(['sensei', 'student', 'club', 'tactician', 'blunder']),
  elo: z.number().int().min(800).max(2400),
  mode: z.enum(['training', 'punishing']),
});

export type InitializeBotOpponentParams = z.infer<typeof InitializeBotOpponentSchema>;

export const RequestBotMoveSchema = z.object({
  fen: fenSchema,
  timeLimit: z.number().int().min(0).max(60000).optional(),
});

export type RequestBotMoveParams = z.infer<typeof RequestBotMoveSchema>;

// ============================================
// Storage IPC Schemas
// ============================================

export const SaveGameSchema = z.object({
  game: z.object({
    id: z.string(),
    playerColor: z.enum(['white', 'black']),
    opponentColor: z.enum(['white', 'black']),
    result: z.enum(['win', 'loss', 'draw', 'in-progress']),
    moves: z.array(moveSchema),
    startTime: z.number(),
    endTime: z.number().optional(),
  }),
});

export type SaveGameParams = z.infer<typeof SaveGameSchema>;

export const LoadGameSchema = z.object({
  id: z.string().min(1),
});

export type LoadGameParams = z.infer<typeof LoadGameSchema>;

// ============================================
// Analysis IPC Schemas
// ============================================

export const AnalyzeGameSchema = z.object({
  moves: z.array(moveSchema).min(1),
  depth: z.number().int().min(1).max(30).optional(),
});

export type AnalyzeGameParams = z.infer<typeof AnalyzeGameSchema>;

// ... (schemas for all 45 IPC methods)
```

#### IPC Handler Validation

**File:** `src/backend/handlers/engine-handlers.ts`

**Before:**
```typescript
async requestBestMoves(params: any) {
  const fen = params.fen;
  const depth = params.depth;
  const count = params.count;
  // No validation
}
```

**After:**
```typescript
import { RequestBestMovesSchema } from '../../shared/ipc-schemas.js';
import { ValidationError, toErrorResponse } from '../../shared/errors.js';

async requestBestMoves(params: unknown) {
  try {
    // Validate and parse params
    const validated = RequestBestMovesSchema.parse(params);

    // Type-safe from here on
    const result = await engine.getBestMoves(
      validated.fen,
      validated.depth,
      validated.count
    );

    return { result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid request parameters',
        { issues: error.issues }
      );
    }
    throw error;
  }
}
```

#### TypeScript Configuration

**File:** `tsconfig.json`

**Changes:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,  // NEW: Array/object access returns T | undefined
    "noImplicitReturns": true,         // NEW: All code paths must return
    "noFallthroughCasesInSwitch": true, // NEW: Switch statements must have breaks
    "noUncheckedSideEffectImports": true, // NEW: Side-effect imports must be explicit
    "exactOptionalPropertyTypes": true  // NEW: Optional != undefined union
  }
}
```

#### Remove `any` Types

**Audit Results (15 instances):**

1. `src/backend/handlers/*.ts` - IPC params (8 instances) → Replace with schema types
2. `src/frontend/websocket-ipc-client.ts` - Generic call method (2 instances) → Add type parameters
3. `src/engine/stockfish-engine.ts` - UCI parsing (3 instances) → Create UCI response types
4. `src/shared/utils.ts` - Utility functions (2 instances) → Add proper generics

**Example Fix - IPC Client:**

**Before:**
```typescript
class IPCClient {
  async call(method: string, params: any): Promise<any> {
    // ...
  }
}
```

**After:**
```typescript
class IPCClient {
  async call<TParams, TResult>(
    method: string,
    params: TParams
  ): Promise<TResult> {
    // Type-safe request/response
  }

  // Or use method-specific helpers
  chess = {
    requestBestMoves: (params: RequestBestMovesParams) =>
      this.call<RequestBestMovesParams, BestMove[]>(
        'chess:requestBestMoves',
        params
      ),
  };
}
```

### Data Model

**New Types:**

```typescript
// src/shared/error-types.ts

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'ENGINE_ERROR'
  | 'IPC_ERROR'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

// src/shared/validation-types.ts

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  code: string;
}

export interface ValidationErrorDetails {
  issues: ValidationIssue[];
}
```

### API Changes

No IPC method signature changes - validation is transparent to callers.

**Error Response Format (standardized):**

```typescript
// Success
{ result: T }

// Error
{
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request parameters',
    details: {
      issues: [
        { path: ['fen'], message: 'FEN string is too short', code: 'too_small' }
      ]
    },
    timestamp: 1704724800000
  }
}
```

### UI Changes

No UI changes - error handling is internal.

### State Management

Error state management:
- Errors logged with structured format
- Error aggregation for tracking recurring issues
- Error responses follow consistent format

### Error Handling

| Error Condition | Handling Strategy | User Feedback |
| --------------- | ----------------- | ------------- |
| Zod validation failure | Throw ValidationError with field details | Toast: "Invalid input: [field] [message]" |
| Storage write failure | Throw StorageError with path | Toast: "Failed to save: [reason]" |
| Engine timeout | Throw EngineError with timeout info | Toast: "Analysis timed out" |
| IPC connection loss | Throw IPCError with reconnect info | Toast: "Connection lost, reconnecting..." |

## Implementation Plan

### Phase Breakdown

#### Phase 4A: Error Hierarchy (Week 9, Days 1-2)

**Scope:**

- Create ChessSenseiError base class
- Implement category-specific error classes
- Create toErrorResponse helper
- Document error handling patterns

**Dependencies:** None

**Estimated Effort:** 8-10 hours

**Files Created:**
- `src/shared/errors.ts`
- `src/shared/error-types.ts`
- `docs/error-handling-guide.md`

#### Phase 4B: Zod Schemas (Week 9, Days 3-5)

**Scope:**

- Add Zod dependency
- Define schemas for all 45 IPC methods
- Create type exports from schemas
- Add FEN validation schema

**Dependencies:** None

**Estimated Effort:** 6-8 hours

**Files Created:**
- `src/shared/ipc-schemas.ts`
- `src/shared/validation-types.ts`

#### Phase 4C: Type Safety (Week 9-10, Days 5-8)

**Scope:**

- Audit all `any` types
- Enable strict TypeScript checks
- Fix resulting type errors
- Remove all `any` types

**Dependencies:** Phase 4B (schemas needed for IPC types)

**Estimated Effort:** 8-10 hours

**Files Modified:**
- `tsconfig.json`
- All files with `any` types (~15 files)

#### Phase 4D: IPC Validation (Week 10, Days 1-5)

**Scope:**

- Add validation to all 45 IPC handlers
- Update error responses
- Add validation error tests
- Update IPC client types

**Dependencies:** Phases 4A, 4B

**Estimated Effort:** 6-8 hours

**Files Modified:**
- All IPC handler files (~10 files)
- `src/frontend/websocket-ipc-client.ts`

### File Changes Summary

| File | Action | Description |
| ---- | ------ | ----------- |
| `src/shared/errors.ts` | Create | Error class hierarchy |
| `src/shared/error-types.ts` | Create | Error type definitions |
| `src/shared/ipc-schemas.ts` | Create | Zod schemas for IPC |
| `src/shared/validation-types.ts` | Create | Validation types |
| `tsconfig.json` | Modify | Enable strict checks |
| `package.json` | Modify | Add Zod dependency |
| All IPC handler files | Modify | Add schema validation |
| `src/frontend/websocket-ipc-client.ts` | Modify | Type-safe methods |
| `src/engine/stockfish-engine.ts` | Modify | Remove `any` types |
| All files with `any` | Modify | Replace with proper types |
| `tests/unit/error-handling.test.ts` | Create | Error class tests |
| `tests/unit/schema-validation.test.ts` | Create | Schema validation tests |

## Testing Strategy

### Unit Tests

| Test Case | File | Description |
| --------- | ---- | ----------- |
| Error Classes | `tests/unit/error-handling.test.ts` | Test error hierarchy |
| Error Serialization | `tests/unit/error-handling.test.ts` | Test toJSON() |
| Schema Validation - Valid | `tests/unit/schema-validation.test.ts` | Valid inputs pass |
| Schema Validation - Invalid | `tests/unit/schema-validation.test.ts` | Invalid inputs fail with details |
| FEN Validation | `tests/unit/schema-validation.test.ts` | Comprehensive FEN tests |

### Integration Tests

| Test Case | Description |
| --------- | ----------- |
| IPC Validation | All 45 IPC methods validate params |
| Error Responses | All errors return standardized format |
| Type Safety | No runtime type errors after strict checks |

### Manual Test Cases

| ID | Steps | Expected Result |
| -- | ----- | --------------- |
| MT-1 | Send IPC request with invalid params | ValidationError with field details |
| MT-2 | Trigger storage error | StorageError with consistent format |
| MT-3 | Run TypeScript compiler | Zero `any` type errors |
| MT-4 | Review ESLint output | Zero no-explicit-any violations |

## Performance Considerations

### Expected Impact

**Validation Overhead:**
- Zod validation: ~1-5ms per request (negligible)
- Total: <5ms per IPC call

**Compile Time:**
- Strict checks may increase compile time by ~10%
- One-time cost, no runtime impact

### Benchmarks

- Measure IPC request time before/after validation: <5ms overhead target
- Measure TypeScript compile time: <30s target

## Security Considerations

- [x] Input validation prevents injection attacks
- [x] Schema validation catches malformed data
- [x] Error messages don't leak sensitive information
- [x] Type safety prevents unexpected behavior

## Rollout Plan

### Feature Flags

No feature flags - internal quality improvements.

### Rollback Plan

Changes are isolated and can be rolled back per phase:
1. Error hierarchy: Remove custom errors, use generic Error
2. Schemas: Remove Zod, validate manually
3. Strict checks: Disable in tsconfig.json
4. IPC validation: Remove validation layer

## Alternatives Considered

### Option 1: io-ts Instead of Zod

**Approach:** Use io-ts for schema validation

**Pros:** Generates types from validators, functional approach

**Cons:** More complex API, less readable, smaller community

**Why rejected:** Zod is more developer-friendly and sufficient

### Option 2: Manual Validation Without Library

**Approach:** Write validation functions manually

**Pros:** No dependency, full control

**Cons:** Verbose, error-prone, inconsistent error messages

**Why rejected:** Library provides better DX and consistency

### Option 3: Keep Some `any` Types

**Approach:** Only remove `any` from critical paths

**Pros:** Less work, avoid potential breaks

**Cons:** Technical debt persists, partial type safety

**Why rejected:** Goal is complete type safety

## Dependencies

### External Dependencies

| Dependency | Version | License | Purpose |
| ---------- | ------- | ------- | ------- |
| zod | ^3.22.0 | MIT | Schema validation |

### Internal Dependencies

- All IPC handlers
- All services with `any` types
- TypeScript compiler configuration

## Open Questions

1. **Should we validate responses in addition to requests?**
   - Proposal: Not initially, add if needed for robustness

2. **Should validation errors include field paths?**
   - Proposal: Yes, Zod provides this automatically

3. **Should we track error frequency?**
   - Proposal: Yes, implement lightweight error tracking

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Breaking changes during `any` removal | Medium | High | Thorough testing, incremental approach |
| Validation overhead impacts perf | Low | Medium | Benchmark validation, optimize if needed |
| Strict checks reveal hidden bugs | High | Medium | Good! Fix bugs, improve quality |
| Zod dependency adds bundle size | Low | Low | Zod is small (~12KB gzipped) |

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
