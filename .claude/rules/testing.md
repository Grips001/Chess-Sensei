# Testing Rules

## Test Requirements

### Before Every Commit

```bash
bun run verify  # Runs typecheck + lint + test
```

### For New Features

- Add unit tests for new functions
- Add integration tests for new IPC methods
- Test coverage should not decrease

### For Bug Fixes

- Add regression test that would have caught the bug
- Test must fail before fix, pass after
- Include test case description explaining the bug

## Test File Structure

```text
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for IPC and component interaction
└── fixtures/       # Test data and mocks
```

## Test Naming Convention

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    test('returns expected value for valid input', () => { ... });
    test('throws error for invalid input', () => { ... });
    test('handles edge case of empty input', () => { ... });
  });
});
```

## Bun Test Patterns

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Use beforeEach for setup
beforeEach(() => {
  // Reset state
});

// Use expect() for assertions
expect(result).toBe(expected);
expect(array).toContain(item);
expect(fn).toThrow(ErrorType);
```
