---
paths: **/*.ts
---

# TypeScript Rules

## Strict Mode Requirements

- **NO** `any` types without explicit justification comment
- **USE** explicit types for all function signatures
- **USE** explicit types for all interface definitions
- **PREFER** `unknown` over `any` when type is truly unknown

## Type Safety Patterns

```typescript
// Good: Explicit return type
function calculateScore(moves: Move[]): number { ... }

// Good: Nullish coalescing for optional values
const value = game.botElo ?? 'Unknown';

// Good: Type guard for runtime validation
function isValidMove(move: unknown): move is Move { ... }

// Bad: Implicit any
function process(data) { ... }
```

## Import Patterns

- **USE** relative imports within the same module (frontend, backend, shared)
- **USE** `@shared/` alias for shared types when available
- **NEVER** import backend code from frontend or vice versa

## Null Safety

- **ALWAYS** check `getAttribute()` return values (returns `string | null`)
- **USE** optional chaining (`?.`) for potentially undefined properties
- **USE** nullish coalescing (`??`) for default values
