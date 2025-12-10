# Git Workflow Rules

## Branch Naming

| Type    | Pattern                      | Example                          |
| ------- | ---------------------------- | -------------------------------- |
| Feature | `feature/CS-XXX-description` | `feature/CS-123-add-puzzle-mode` |
| Bug fix | `fix/CS-XXX-description`     | `fix/CS-456-board-flip-bug`      |
| Hotfix  | `hotfix/vX.Y.Z-description`  | `hotfix/v1.0.1-crash-fix`        |

## Commit Message Format

Follow Conventional Commits:

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Scopes:** `frontend`, `backend`, `engine`, `shared`, `build`, `ci`, `docs`

**Examples:**

```text
feat(frontend): add puzzle mode selection screen
fix(backend): resolve engine crash on invalid FEN
docs: update README with build instructions
```

## Pull Request Requirements

Before creating a PR:

1. All tests pass: `bun run test`
2. Type check passes: `bun run typecheck`
3. Lint passes: `bun run lint`
4. Branch is up-to-date with main

## Protected Operations

These require explicit user confirmation:

- `git push` - Pushing to remote
- `git commit` - Creating commits
- `git merge` - Merging branches
- `git tag` - Creating version tags

## Reference Documentation

See @.github/process/BRANCHING_STRATEGY.md for full details.
