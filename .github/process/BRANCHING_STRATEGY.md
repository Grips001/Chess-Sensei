# Branching Strategy

This document describes the Git branching strategy and PR workflow for
Chess-Sensei.

## Branch Types

### Main Branch

- **Name:** `main`
- **Purpose:** Production-ready code
- **Protection:** Requires PR approval, passing CI
- **Direct commits:** Never (except emergency hotfixes with approval)

### Feature Branches

- **Pattern:** `feature/CS-XXX-short-description`
- **Purpose:** New features and enhancements
- **Base:** `main`
- **Merge to:** `main` via PR
- **Lifetime:** Delete after merge

**Example:** `feature/CS-123-add-puzzle-mode`

### Bugfix Branches

- **Pattern:** `fix/CS-XXX-short-description`
- **Purpose:** Bug fixes
- **Base:** `main`
- **Merge to:** `main` via PR
- **Lifetime:** Delete after merge

**Example:** `fix/CS-456-board-flip-corruption`

### Hotfix Branches

- **Pattern:** `hotfix/vX.Y.Z-description`
- **Purpose:** Critical production fixes
- **Base:** Latest release tag
- **Merge to:** `main` + create patch release
- **Lifetime:** Delete after release

**Example:** `hotfix/v1.0.1-engine-crash`

### Release Branches (Optional)

- **Pattern:** `release/vX.Y.Z`
- **Purpose:** Stabilization before major releases
- **Base:** `main`
- **Merge to:** `main` + tag
- **Lifetime:** Delete after release

**Example:** `release/v2.0.0`

## Naming Conventions

### Branch Names

```text
<type>/<issue>-<short-description>

type: feature | fix | hotfix | release | refactor | docs | test
issue: CS-XXX (GitHub issue number) or omit if no issue
short-description: kebab-case, max 40 chars
```

**Good examples:**

- `feature/CS-42-add-puzzle-mode`
- `fix/CS-99-fix-undo-crash`
- `refactor/simplify-ipc-types`
- `docs/update-api-docs`

**Bad examples:**

- `johns-feature` (no type prefix)
- `feature/AddPuzzleMode` (not kebab-case)
- `fix/bug` (too vague)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type       | Description                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation only                   |
| `style`    | Formatting (no code change)          |
| `refactor` | Code change (no new feature or fix)  |
| `perf`     | Performance improvement              |
| `test`     | Adding/updating tests                |
| `chore`    | Build process, dependencies, tooling |

**Scopes:** `frontend`, `backend`, `engine`, `shared`, `build`, `ci`, `docs`

**Examples:**

```text
feat(frontend): add puzzle mode selection screen

fix(backend): resolve engine crash on invalid FEN

docs: update README with new build instructions

refactor(shared): simplify IPC type definitions
```

## Pull Request Workflow

### Creating a PR

1. **Create branch** from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/CS-123-description
   ```

2. **Develop** with regular commits following conventions

3. **Push** and create PR:

   ```bash
   git push -u origin feature/CS-123-description
   ```

4. **Fill out PR template** completely

5. **Request review** from appropriate reviewer(s)

### PR Requirements

Before merge, all PRs must:

- [ ] Pass all CI checks (`test`, `typecheck`, `lint`)
- [ ] Have at least 1 approval
- [ ] Have no unresolved conversations
- [ ] Be up-to-date with `main`
- [ ] Have a descriptive title and completed template

### Review Guidelines

**For Authors:**

- Keep PRs focused (< 400 lines when possible)
- Respond to feedback promptly
- Don't force-push after review has started
- Use "Request Changes" comments to indicate blockers

**For Reviewers:**

- Review within 1 business day
- Be specific and constructive
- Approve when satisfied, don't nitpick style
- Use suggestions feature for small changes

### Merge Strategy

- **Default:** Squash and merge (single commit on main)
- **Exception:** Merge commit for large features with meaningful history

## Workflow Diagram

```text
main ─────●───────●───────●───────●─────────●───────
          │       │       ▲       ▲         ▲
          │       │       │       │         │
          │       ▼       │       │         │
          │  feature/a ───┘       │         │
          │                       │         │
          ▼                       │         │
     feature/b ───────────────────┘         │
                                            │
                           hotfix/v1.0.1 ───┘
```

## Protected Branch Rules

### main

- Require pull request before merging
- Require 1 approval
- Require status checks to pass:
  - `build (windows-latest)`
  - `build (ubuntu-latest)`
  - `build (macos-latest)`
- Require branches to be up to date
- Do not allow bypassing settings

## Emergency Procedures

### Hotfix Process

1. Create hotfix branch from release tag:

   ```bash
   git checkout v1.0.0
   git checkout -b hotfix/v1.0.1-critical-fix
   ```

2. Make minimal fix and test

3. Create PR to `main`

4. After merge, create patch tag:

   ```bash
   git tag -a v1.0.1 -m "Hotfix: critical fix"
   git push origin v1.0.1
   ```

### Rollback Process

If a release causes issues:

1. Identify last good commit
2. Create revert PR or hotfix branch
3. Merge and create new patch release
4. Communicate in release notes
