# PRD: Code Modularization

> **Status:** Implemented **Author:** Jhon Vise **Created:** 2026-01-07 **Last
> Updated:** 2026-01-07 **Related Issues:** N/A

---

## Executive Summary

Refactor four oversized source files (8,255 / 2,720 / 2,389 / 2,175 lines) into
smaller, focused modules following single-responsibility principles. This
improves maintainability, testability, and developer experience without changing
application behavior.

## Problem Statement

### Current State

Four core files exceed reasonable size limits:

| File                            | Lines | Characters | Purpose                |
| ------------------------------- | ----- | ---------- | ---------------------- |
| `src/frontend/styles/index.css` | 8,255 | 159,045    | All application styles |
| `src/frontend/index.ts`         | 2,720 | 85,774     | Frontend entry point   |
| `src/frontend/analysis-ui.ts`   | 2,389 | 77,679     | Post-game analysis UI  |
| `src/backend/index.ts`          | 2,175 | 65,993     | Backend entry point    |

### User Pain Points

- **Developers:** Difficult to navigate, understand, and modify large files
- **Reviewers:** Code reviews are harder with massive file diffs
- **Contributors:** High barrier to entry for new contributors
- **Maintainers:** Merge conflicts more likely in monolithic files

### Impact

All developers working on the codebase are affected. The oversized files slow
down development velocity and increase cognitive load for every change.

## Goals

### Primary Goals

1. Reduce each target file to under 300 lines (entry point/orchestrator role)
2. Split code by responsibility into focused, single-purpose modules
3. Maintain 100% backward compatibility (no behavior changes)
4. Pass all existing tests without modification

### Non-Goals

1. Adding new features or functionality
2. Changing application behavior
3. Refactoring other files not listed in scope
4. Optimizing runtime performance (this is a code organization change)

### Success Metrics

| Metric                | Current     | Target        | Measurement Method  |
| --------------------- | ----------- | ------------- | ------------------- |
| Max file size (lines) | 8,255       | <400          | `wc -l`             |
| `bun run verify`      | Pass        | Pass          | CI pipeline         |
| Test count            | N (current) | N (unchanged) | Test runner         |
| Build output          | Working app | Working app   | Manual verification |

## User Stories

### Primary User Story

```text
As a developer
I want to find and modify code in focused, well-organized modules
So that I can work efficiently and avoid merge conflicts
```

### Secondary User Stories

```text
As a code reviewer
I want to review changes in small, focused files
So that I can provide thorough, meaningful feedback

As a new contributor
I want to understand the codebase structure quickly
So that I can start contributing without extensive onboarding
```

## Requirements

### Functional Requirements

| ID    | Requirement                                                | Priority | Notes                                                    |
| ----- | ---------------------------------------------------------- | -------- | -------------------------------------------------------- |
| FR-01 | Split `index.css` into component-based stylesheets         | Must     | Use CSS `@import`                                        |
| FR-02 | Split `frontend/index.ts` into board, UI, and mode modules | Must     | Maintain initialization order                            |
| FR-03 | Split `analysis-ui.ts` into components and shared types    | Must     | Move types to `src/shared/`                              |
| FR-04 | Split `backend/index.ts` into handler modules              | Must     | Keep `functionMap` assembly                              |
| FR-05 | Maintain all existing exports for external consumers       | Must     | `analysis-ui.ts` exports used by `progress-dashboard.ts` |
| FR-06 | Entry files become orchestrators (import + wire only)      | Should   | Minimal logic in index files                             |

### Non-Functional Requirements

| ID     | Requirement         | Criteria                        |
| ------ | ------------------- | ------------------------------- |
| NFR-01 | Build time          | No significant increase (< 10%) |
| NFR-02 | Bundle size         | No significant increase (< 5%)  |
| NFR-03 | Runtime performance | No degradation                  |
| NFR-04 | Code coverage       | Maintain current coverage       |

## User Experience

### User Flow

Not applicable - this is an internal refactoring with no user-facing changes.

### Mockups/Wireframes

Not applicable - no UI changes.

### Edge Cases

| Scenario              | Expected Behavior                                   |
| --------------------- | --------------------------------------------------- |
| CSS import order      | Maintain specificity by controlling import order    |
| Circular dependencies | Avoid by careful module boundary design             |
| Type exports          | Re-export from original locations for compatibility |

## Technical Considerations

### Dependencies

- Vite bundler (handles CSS `@import` and TypeScript imports)
- Bun build (compiles backend entry point)
- Existing test infrastructure

### Constraints

- Must maintain backward compatibility with existing imports
- Build scripts reference `src/backend/index.ts` directly
- HTML references `src/frontend/index.ts` and `src/frontend/styles/index.css`

### Risks

| Risk                              | Likelihood | Impact | Mitigation                         |
| --------------------------------- | ---------- | ------ | ---------------------------------- |
| Breaking existing imports         | Medium     | High   | Re-export from original locations  |
| CSS specificity changes           | Medium     | Medium | Careful import ordering            |
| Circular dependencies             | Low        | High   | Design module boundaries carefully |
| Missing functionality after split | Low        | High   | Comprehensive test suite           |

## Proposed File Structure

### CSS (`src/frontend/styles/`)

```text
styles/
├── index.css              (~20 lines - imports only)
├── _variables.css         (design tokens)
├── _base.css              (global styles)
├── _accessibility.css
├── _chessboard.css
├── _panels.css
├── _toolbar.css
├── _modals.css
├── _animations.css
├── _responsive.css
└── components/
    ├── _mode-selection.css
    ├── _training-mode.css
    ├── _exam-mode.css
    ├── _sandbox-mode.css
    ├── _analysis-ui.css
    ├── _progress-dashboard.css
    └── _data-management.css
```

### Frontend (`src/frontend/`)

```text
frontend/
├── index.ts               (~200 lines - orchestration)
├── board/
│   ├── board-renderer.ts
│   ├── board-events.ts
│   └── board-highlights.ts
├── ui/
│   ├── turn-indicator.ts
│   ├── move-history.ts
│   ├── captured-pieces.ts
│   └── dialogs.ts
└── modes/
    └── mode-controller.ts
```

### Analysis UI (`src/frontend/analysis/`)

```text
analysis/
├── index.ts               (re-exports for compatibility)
├── analysis-ui.ts         (~300 lines - controller)
├── constants.ts
└── components/
    ├── evaluation-graph.ts
    ├── move-list.ts
    ├── critical-moments.ts
    ├── summary-panel.ts
    └── game-selector.ts
```

### Backend (`src/backend/`)

```text
backend/
├── index.ts               (~100 lines - initialization)
├── types/
│   └── ipc-payloads.ts
├── handlers/
│   ├── engine-handlers.ts
│   ├── bot-handlers.ts
│   ├── analysis-handlers.ts
│   ├── storage-handlers.ts
│   ├── export-handlers.ts
│   └── profile-handlers.ts
└── function-map.ts
```

### Shared Types (`src/shared/`)

```text
shared/
├── analysis-types.ts      (moved from analysis-ui.ts)
└── ... (existing files)
```

## Alternatives Considered

### Option 1: Keep Current Structure

- **Pros:** No work required, no risk of breaking changes
- **Cons:** Technical debt continues to accumulate, developer experience
  degrades
- **Why rejected:** Long-term maintainability concerns outweigh short-term
  stability

### Option 2: Complete Rewrite

- **Pros:** Could improve architecture more significantly
- **Cons:** High risk, time-consuming, potential for bugs
- **Why rejected:** Incremental refactoring is safer and achieves the goals

## Implementation Plan

### Phases

1. **Phase 1: CSS Modularization**
   - Split `index.css` into component files
   - Verify styles render correctly
   - Run visual regression checks

2. **Phase 2: Backend Modularization**
   - Extract handler modules
   - Create function map assembly
   - Verify all IPC methods work

3. **Phase 3: Analysis UI Modularization**
   - Move types to `src/shared/`
   - Extract component modules
   - Update imports in `progress-dashboard.ts`

4. **Phase 4: Frontend Index Modularization**
   - Extract board modules
   - Extract UI modules
   - Verify initialization order

### Implementation Dependencies

- Phase 2-4 can proceed in parallel after Phase 1
- Each phase should pass `bun run verify` before proceeding

## Open Questions

1. Should we use CSS modules or keep global CSS with `@import`?
2. Should extracted modules use default exports or named exports?

---

## Approval

| Role          | Name | Date | Status  |
| ------------- | ---- | ---- | ------- |
| Product Owner |      |      | Pending |
| Tech Lead     |      |      | Pending |

## Revision History

| Version | Date       | Author    | Changes       |
| ------- | ---------- | --------- | ------------- |
| 0.1     | 2026-01-07 | Jhon Vise | Initial draft |
