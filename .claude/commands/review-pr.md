---
description: Review a pull request following team standards
argument-hint: [pr-number-or-branch]
allowed-tools: Read, Bash, Glob, Grep
---

# Pull Request Review

Review PR/branch: $1

## Gather Context

Current branch and changes: !`git fetch origin`
!`git log --oneline origin/main..HEAD 2>/dev/null || echo "On main branch"`

## Review Checklist

Based on @.github/process/TESTING_STRATEGY.md and
@.github/process/BRANCHING_STRATEGY.md:

### Code Quality

- [ ] TypeScript strict mode compliance (no `any` without justification)
- [ ] Follows existing code patterns
- [ ] Clear variable and function names
- [ ] Comments only for complex logic

### Testing

- [ ] New tests for new functionality
- [ ] Regression tests for bug fixes
- [ ] All tests pass: `bun run test`
- [ ] Type check passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`

### Security

- [ ] No hardcoded secrets
- [ ] Input validation where needed
- [ ] No new security vulnerabilities

### Documentation

- [ ] CHANGELOG.md updated if needed
- [ ] User docs updated if user-facing change
- [ ] Inline documentation for complex code

### Architecture

- [ ] Follows WebSocket IPC pattern
- [ ] Uses Bun APIs (not Node.js patterns)
- [ ] Respects frontend/backend/shared boundaries

## Run Verification

```bash
bun run verify
```

Provide detailed review feedback for $1.
