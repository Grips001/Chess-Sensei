# Chess-Sensei Agent Guidelines

This file defines the development workflow and operational boundaries for Claude
when working on this project.

## Project Status

**Version:** v1.0.4 (Stable) **Priority:** Stability over new features

## Available Tools

Claude customizations are in `.claude/`:

| Type     | Location            | Purpose                        |
| -------- | ------------------- | ------------------------------ |
| Commands | `.claude/commands/` | Workflow slash commands        |
| Agents   | `.claude/agents/`   | Specialized subagents          |
| Rules    | `.claude/rules/`    | Path-specific coding rules     |
| Skills   | `.claude/skills/`   | Auto-invoked pattern checkers  |
| Hooks    | `.claude/hooks/`    | Automatic lifecycle automation |

### Slash Commands

| Command        | Use Case                    |
| -------------- | --------------------------- |
| `/verify`      | Run full verification       |
| `/new-feature` | Start feature workflow      |
| `/fix-bug`     | Start bug fix workflow      |
| `/release`     | Execute release process     |
| `/review-pr`   | Review PR against standards |

## Development Workflow

### Feature Development Sequence

Each step requires user approval before proceeding to the next:

```text
1. PRD Creation
   └── Create `.github/specs/prd-[feature].md`
   └── USER APPROVAL REQUIRED

2. Tech Spec Creation
   └── Create `.github/specs/tech-[feature].md`
   └── USER APPROVAL REQUIRED

3. Implementation
   └── Create feature branch: `feature/CS-XXX-[name]`
   └── Implement according to Tech Spec
   └── Run `bun run verify` after each change
   └── USER APPROVAL REQUIRED (for significant milestones)

4. Pull Request
   └── Create PR using `.github/PULL_REQUEST_TEMPLATE.md`
   └── USER APPROVAL REQUIRED

5. Merge
   └── Only after PR is approved by user
   └── Never merge without explicit approval
```

**NEVER skip steps.** Do not:

- Start implementation without approved Tech Spec
- Create PR without passing `bun run verify`
- Merge without PR approval
- Push to main directly

### Before Any Code Change

1. Run `bun run verify` to establish baseline
2. Create appropriate branch (`feature/` or `fix/`)
3. Follow existing code patterns

### Before Any Commit

1. Run `bun run verify` (typecheck + lint + test)
2. All tests must pass
3. No lint errors

### Boundaries

**DO:**

- Fix bugs when requested
- Follow existing patterns in the codebase
- Ask for clarification when requirements are unclear
- Update `documents/troubleshooting.md` for user-facing bug fixes

**DO NOT:**

- Add features without explicit request
- Refactor working code unnecessarily
- Modify `.env`, `CHANGELOG.md`, or `ATTRIBUTIONS.md` without request
- Use Node.js APIs in backend (use Bun APIs)
- Use `any` types without justification

## Critical Patterns

### Backend (Bun)

```typescript
// File I/O
const content = await Bun.file(path).text();
await Bun.write(path, data);
```

### Frontend (Neutralino)

- Check [Neutralino docs](https://neutralino.js.org/docs/) before using APIs
- Do not assume Node.js or Electron patterns work

### TypeScript

- Strict mode enabled
- Handle null from `getAttribute()` (returns `string | null`)
- Explicit types for all function signatures

## Document Locations

| Document Type      | Location                          | Template                                |
| ------------------ | --------------------------------- | --------------------------------------- |
| PRDs               | `.github/specs/prd-[feature].md`  | `.github/process/PRD_TEMPLATE.md`       |
| Tech Specs         | `.github/specs/tech-[feature].md` | `.github/process/TECH_SPEC_TEMPLATE.md` |
| User Documentation | `documents/`                      | N/A                                     |
| Process Docs       | `.github/process/`                | N/A                                     |

### Process Documentation

- `BRANCHING_STRATEGY.md` - Branch naming and git workflow
- `TESTING_STRATEGY.md` - Test requirements
- `RELEASE_PROCESS.md` - Versioning and releases

## Quick Commands

```bash
bun run verify        # Full verification (required before commits)
bun run dev           # Start development server
bun run build:windows # Build for Windows
```

## Conflict Resolution

1. User instruction overrides everything
2. Existing code patterns override preferences
3. Ask when unclear
