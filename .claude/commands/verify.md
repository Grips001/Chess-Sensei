---
description: Run full verification suite (typecheck, lint, test)
allowed-tools: Bash
---

# Verify Project

Run the complete verification suite to ensure code quality before commits or
PRs.

## Current Status

Branch: !`git branch --show-current`

## Execute Verification

Run all checks in sequence:

```bash
bun run verify
```

This runs:

1. `bun run typecheck` - TypeScript type checking
2. `bun run lint` - ESLint + Stylelint + Markdownlint + Prettier
3. `bun run test` - All 114 unit tests

Report the results and highlight any failures that need attention.
