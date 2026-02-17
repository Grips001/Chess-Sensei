# Coding Conventions

**Analysis Date:** 2026-02-17

## Naming Patterns

**Files:**
- **kebab-case** for all file names: `chess-logic.ts`, `move-guidance.ts`, `collapsible-section.ts`, `file-logger.ts`
- **Index files** explicitly named `index.ts` (not barrel pattern abbreviation): `src/backend/handlers/index.ts`, `src/frontend/ui/index.ts`
- **Type files** follow component pattern: `chess-logic.ts` exports both implementation and types (`BoardState`, `MoveResult`)
- **Manual test files** suffix with `-manual-test.ts`: `src/shared/chess-logic-manual-test.ts`, `src/engine/engine-operations-manual-test.ts`

**Functions:**
- **camelCase** for all function names: `makeMove()`, `generateExplanation()`, `parseSanToEnglish()`, `createErrorResponse()`
- **Verb-first naming** for action functions: `createGame()`, `parseUciMove()`, `toGuidanceMove()`, `formatScore()`
- **Getter/setter naming** without get/set prefix: `getFen()`, `getTurn()`, `getLegalMovesUci()` (library convention from chess.js)
- **Factory functions** with `create` prefix: `createGame()`, `createErrorResponse()`
- **Private helper methods** use underscore prefix with implementation detail: `_doInitialize()`, `_formatEntry()`

**Variables:**
- **camelCase** for all variable declarations: `gameState`, `selectedPieceSquare`, `hoveredIndex`, `moveHistory`
- **Unused parameters** marked with `^_` pattern in ESLint config to allow intentional omission: `(_unusedParam) => ...`
- **Boolean prefixes**: `isActive`, `isLoading`, `inCheck`, `isCastling`, `isEnPassant`, `expanded`, `initialized`
- **Private class fields** with hash prefix: `#container`, `#header`, `#config`

**Types:**
- **PascalCase** for all type/interface names: `GuidanceMove`, `GuidanceState`, `CollapsibleSectionConfig`, `BoardState`, `MoveResult`, `ErrorResponse`
- **Suffix conventions**: `-Config` for configuration interfaces, `-Response` for IPC responses, `-Types` for type definition modules
- **Enum-like constants** in UPPER_SNAKE_CASE within objects: `ErrorCodes.ENGINE_NOT_INITIALIZED`, `GUIDANCE_COLORS.BEST`
- **Type union naming** as compound: `GameStatus` (union of status strings), `ErrorCode` (union of error codes)

## Code Style

**Formatting:**
- **Prettier enforced** with 100 character print width (80 for markdown/JSON)
- **2-space indentation**, no tabs
- **Trailing commas** in ES5 compatible format
- **Single quotes** for strings
- **Semicolons required** at end of statements
- **Arrow function parentheses** always required: `(param) => ...` (never `param => ...`)
- **LF line endings**

Configuration file: `.config/.prettierrc.json`

**Linting:**
- **ESLint** with flat config (`eslint.config.mjs`)
- **@typescript-eslint** for TypeScript-specific rules
- **Strict TypeScript mode enabled**: `noImplicitAny: true`, `strictNullChecks: true`, `noUnusedLocals: true`
- **no-var**: Error (must use const/let)
- **prefer-const**: Warn (use const over let when reassignment not needed)
- **eqeqeq**: Error with 'always' (always use === and !==)
- **curly**: Warn for multi-line (single-line conditions don't require braces)
- **@typescript-eslint/no-unused-vars**: Warn (with `^_` pattern to allow intentional unused)
- **@typescript-eslint/no-explicit-any**: Warn (allow `any` with inline comment justification)
- **console allowed**: `no-console: off` (logging is integral to this application)
- **no-debugger**: Warn
- **no-eval**: Error
- **no-new-func**: Error

Ignored paths: `node_modules/`, `dist/`, `app/`, `build/`, `.neutralino/`, `coverage/`, `*.min.js`

## Import Organization

**Order (enforced by structure):**
1. **External dependencies** (node: prefixed or npm packages): `import { Chess } from 'chess.js'`, `import { appendFile } from 'node:fs/promises'`
2. **Type imports** from external: `import type { Move, Square } from 'chess.js'`
3. **Absolute path imports** (path aliases): `import { ipc } from './websocket-ipc-client'`, `import type { BestMove } from '@/shared/engine-types'`
4. **Relative imports** within module: `import { ChessGame } from '../../src/shared/chess-logic'`

**Path Aliases (tsconfig.json):**
```
@/*          → src/*
@shared/*    → src/shared/*
@backend/*   → src/backend/*
@frontend/*  → src/frontend/*
@engine/*    → src/engine/*
```

**Import Patterns:**
- **Prefer relative imports** within same module (frontend, backend, shared) for clarity
- **Use aliases** (`@shared/*`) only when importing shared code from other modules
- **Named imports** always used (no default imports from modules with multiple exports)
- **Type imports** explicitly marked with `type` keyword: `import type { BoardState } from '@/shared/chess-logic'`
- **Barrel files allowed** as documented re-exports: `src/frontend/ui/index.ts` exports component types and helpers

## Error Handling

**Patterns:**
- **Explicit error wrapping**: Catch all errors and wrap in typed response using `createErrorResponse()` or `createErrorResponseWithMessage()`
- **Error codes enumerated**: `ErrorCodes` constant with UPPER_SNAKE_CASE keys for programmatic handling
- **Error responses typed**: `ErrorResponse` interface with `error` message, `code`, and `success: false`
- **Message extraction**: Use `error instanceof Error ? error.message : 'Unknown error'` for extracting messages
- **Try-catch in handlers**: All IPC handlers wrapped in try-catch returning error responses
- **Throw on validation failure**: Functions like `makeMove()` throw with descriptive messages on invalid input

Error codes location: `src/backend/helpers/error-response.ts`

## Logging

**Framework:** `console` (built-in, allowed by linter rule `no-console: off`)

**Patterns:**
- **Backend file logging**: `FileLogger` class in `src/backend/file-logger.ts` for --dev mode
- **Frontend browser console**: `console.*` methods for UI-layer logging
- **Structured logging**: Messages include context (component/module name), level, and optional data object
- **Levels**: debug, info, warn, error (implemented in `LogLevel` type from `src/shared/logger-types.ts`)

Log management: `src/backend/file-logger.ts` queues writes atomically, creates logs directory, includes timestamp in filename

## Comments

**When to Comment:**
- **JSDoc/TSDoc required** for all public functions, classes, and interfaces
- **Complex logic explanation**: Comments explain "why" not "what" - code is self-documenting for obvious cases
- **Implementation notes**: Document non-obvious workarounds or dependencies
- **TODO/FIXME allowed**: Use format `// TODO: description` (grep-able: `src/...`)

**JSDoc/TSDoc Pattern:**
```typescript
/**
 * Brief description of function purpose
 *
 * Longer explanation if needed, describing behavior,
 * constraints, or important implementation details.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = myFunction(value);
 * ```
 */
function myFunction(paramName: string): string { ... }
```

Example locations: `src/shared/chess-logic.ts`, `src/backend/helpers/error-response.ts`, `src/frontend/components/collapsible-section.ts`

## Function Design

**Size:**
- **Typical range**: 20-50 lines per function
- **Helpers extracted** for complex operations: `parseUciMove()` extracted from `toGuidanceMove()`
- **Single responsibility** enforced: `makeMove()` only makes move, `getPiece()` only retrieves piece state

**Parameters:**
- **Max 3 required parameters**: Use config objects for more: `new CollapsibleSection(config: CollapsibleSectionConfig)`
- **Optional parameters** marked with `?`: `expanded?: boolean` in configs
- **Defaults used** via nullish coalescing: `this.expanded = config.expanded ?? true`

**Return Values:**
- **Explicit return types** required on all functions: `function parse(input: string): { from: string; to: string }`
- **Null returns** for optional results: `undoMove(): MoveResult | null`
- **Union types** for multiple outcomes: `isLegalMove(move: string): boolean` (simple true/false)
- **Typed objects** for complex returns: `getBoardState(): BoardState`

## Module Design

**Exports:**
- **Named exports only**: `export function generateExplanation() {...}` (never `export default`)
- **Re-exports allowed**: Type definitions re-exported from dependencies: `export { type Move, type Square } from 'chess.js'`
- **Constants exported**: `GUIDANCE_COLORS`, `STARTPOS_FEN`, `ErrorCodes`
- **Barrel files** for component groups: `src/frontend/analysis/components/index.ts` exports all component types

**File Organization:**
- **One main export per file** (rule enforced by structure)
- **Supporting types** defined inline or in same file
- **Helpers** placed below main implementation within same file or extracted to separate helper file
- **Type definitions** at file top after imports

## Null Safety

**Patterns:**
- **getAttribute() returns null**: Always check return value: `const value = element.getAttribute('data-id'); if (value) {...}`
- **Optional chaining**: `obj?.property?.method()` for potentially undefined properties
- **Nullish coalescing**: `value ?? defaultValue` for undefined/null handling
- **Type guards**: `if (typeof value === 'string') { ... }` for narrowing
- **Explicit null checks**: Avoid truthy/falsy checks for potentially valid falsy values

Example from `src/frontend/components/collapsible-section.ts`:
```typescript
const value = element.getAttribute('data-id');  // returns string | null
if (value) {  // Type guard
  this.handleData(value);
}
```

## Type Safety

**Patterns:**
- **Strict mode enabled**: All TypeScript settings in strict category enabled
- **No implicit any**: Use `unknown` when type truly unknown, then narrow with type guard
- **Explicit function signatures**: Return types always specified, parameter types always specified
- **Generics for reusable code**: Used in callbacks and response handlers
- **Type imports**: `import type { MoveResult }` for type-only dependencies to avoid circular deps
- **Avoid any justification**: If `any` used, inline comment required: `const data: any = rawInput; // Untyped external API`

TypeScript config: `tsconfig.json` with `strict: true` and all strict sub-options enabled

---

*Convention analysis: 2026-02-17*
