# Testing Strategy

This document describes the testing requirements and standards for Chess-Sensei.

## Test Stack

| Tool         | Purpose                    | Location             |
| ------------ | -------------------------- | -------------------- |
| Bun Test     | Unit and integration tests | `tests/`             |
| TypeScript   | Type checking              | `tsconfig`           |
| ESLint       | Code quality               | `eslint.config.mjs`  |
| Stylelint    | CSS quality                | `.stylelintrc.json`  |
| Markdownlint | Documentation quality      | `.markdownlint.json` |
| Prettier     | Code formatting            | `.prettierrc.json`   |

## Test Commands

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Type checking
bun run typecheck

# All linters
bun run lint

# Full verification (typecheck + lint + test)
bun run verify
```

## Test Categories

### Unit Tests

**Purpose:** Test individual functions and classes in isolation

**Location:** `tests/unit/`

**Naming:** `[module-name].test.ts`

**Example:**

```typescript
import { describe, test, expect } from 'bun:test';
import { calculateAccuracy } from '../src/backend/metrics-calculator';

describe('calculateAccuracy', () => {
  test('returns 100 for perfect play', () => {
    const moves = [{ cpl: 0 }, { cpl: 0 }, { cpl: 0 }];
    expect(calculateAccuracy(moves)).toBe(100);
  });

  test('handles empty move list', () => {
    expect(calculateAccuracy([])).toBe(0);
  });
});
```

### Integration Tests

**Purpose:** Test interactions between components

**Location:** `tests/integration/`

**Naming:** `[feature-name].integration.test.ts`

**Example:**

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

describe('IPC Communication', () => {
  let backend: BackendProcess;

  beforeAll(async () => {
    backend = await startBackend();
  });

  afterAll(async () => {
    await backend.stop();
  });

  test('GET_ENGINE_STATUS returns ready state', async () => {
    const response = await ipcCall('GET_ENGINE_STATUS');
    expect(response.status).toBe('ready');
  });
});
```

### Type Tests

**Purpose:** Verify TypeScript types are correct

**Method:** `bun run typecheck` (runs `tsc --noEmit`)

### Lint Tests

**Purpose:** Ensure code quality and consistency

**Method:** `bun run lint`

## Test Requirements

### For All PRs

| Check               | Required | Command             |
| ------------------- | -------- | ------------------- |
| All tests pass      | Yes      | `bun run test`      |
| Type check passes   | Yes      | `bun run typecheck` |
| Lint passes         | Yes      | `bun run lint`      |
| No test regressions | Yes      | CI comparison       |

### For New Features

- Add unit tests for new functions
- Add integration tests for new IPC methods
- Update test documentation if needed

### For Bug Fixes

- Add regression test that would have caught the bug
- Ensure test fails before fix, passes after

## Test Coverage

### Coverage Goals

| Component | Target | Current |
| --------- | ------ | ------- |
| Backend   | 80%    | -       |
| Shared    | 90%    | -       |
| Engine    | 70%    | -       |
| Overall   | 75%    | -       |

### Generating Coverage Reports

```bash
bun run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Data

### Fixtures

Store test fixtures in `tests/fixtures/`:

```text
tests/
├── fixtures/
│   ├── games/          # Sample game data
│   ├── positions/      # FEN strings
│   └── profiles/       # Player profile data
```

### Test Constants

```typescript
// tests/constants.ts
export const TEST_FENS = {
  STARTING: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  MATE_IN_ONE: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
  STALEMATE: 'k7/8/1K6/8/8/8/8/8 b - - 0 1',
};
```

## Writing Good Tests

### Test Structure (AAA Pattern)

```typescript
test('should calculate accuracy correctly', () => {
  // Arrange
  const moves = createTestMoves([10, 20, 30]);

  // Act
  const result = calculateAccuracy(moves);

  // Assert
  expect(result).toBe(80);
});
```

### Descriptive Test Names

**Good:**

- `returns 100 accuracy for perfect play with zero CPL`
- `throws error when FEN is invalid`
- `handles edge case of empty move list`

**Bad:**

- `test1`
- `works correctly`
- `accuracy test`

### Test Independence

Each test should:

- Set up its own data
- Not depend on other tests
- Clean up after itself
- Be runnable in isolation

### Avoid Flaky Tests

- Don't use `Date.now()` directly (mock it)
- Don't use random values without seeding
- Don't rely on execution order
- Use appropriate timeouts for async tests

## Manual Testing

### Pre-Release Checklist

Before each release, manually verify:

- [ ] Application launches on Windows
- [ ] Application launches on macOS
- [ ] Application launches on Linux
- [ ] Training Mode: Can select bot and color
- [ ] Training Mode: Guidance highlights appear
- [ ] Exam Mode: Game records properly
- [ ] Exam Mode: Analysis runs after game
- [ ] Sandbox Mode: Can place pieces
- [ ] Sandbox Mode: Engine analysis works
- [ ] Progress Dashboard: Displays data
- [ ] Data Management: Export works
- [ ] Data Management: Import works
- [ ] Sound effects play correctly
- [ ] Keyboard shortcuts work

### Test Matrix

| Platform       | Browser Engine | Status |
| -------------- | -------------- | ------ |
| Windows 10 x64 | WebKit         | -      |
| Windows 11 x64 | WebKit         | -      |
| macOS Intel    | WebKit         | -      |
| macOS ARM      | WebKit         | -      |
| Ubuntu 22.04   | WebKit         | -      |

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Every push to any branch
- Every pull request to `main`
- Release builds (tag push)

### CI Test Configuration

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run verify
```

## Debugging Tests

### Running Specific Tests

```bash
# Run single file
bun test tests/unit/metrics.test.ts

# Run tests matching pattern
bun test --grep "accuracy"
```

### Verbose Output

```bash
bun test --verbose
```

### Debug Mode

Add breakpoints and run with debugger:

```bash
bun --inspect test
```
