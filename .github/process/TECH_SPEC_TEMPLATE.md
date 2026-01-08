# Tech Spec: [Feature Name]

> **Filename:** `NNN-tech-[feature-name].md` (where NNN matches the corresponding PRD number)
> **Status:** Draft | In Review | Approved | Implemented **Author:** [Name]
> **Created:** YYYY-MM-DD **Last Updated:** YYYY-MM-DD **PRD:** `NNN-prd-[feature-name].md`
> **Related Issues:** #XXX
>
> **Note:** The tech spec number (NNN) must exactly match its corresponding PRD number. PRDs are numbered chronologically, so your tech spec inherits that same number (e.g., `005-tech-feature.md` pairs with `005-prd-feature.md`)

---

## Overview

### Summary

<!-- 2-3 sentences describing the technical approach -->

### Goals

<!-- Technical goals, not product goals -->

1.
2.
3.

### Non-Goals

<!-- What is explicitly out of scope for this implementation? -->

1.
2.

## Background

### Current Architecture

<!-- Describe relevant existing systems -->

### Key Concepts

<!-- Define technical terms or concepts used in this spec -->

## Detailed Design

### Architecture

```text
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   Component A   │────▶│   Component B   │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

### Component Changes

#### [Component Name]

**File:** `src/[path]/[file].ts`

**Changes:**

- Change 1
- Change 2

**New Interfaces:**

```typescript
interface ExampleInterface {
  field: Type;
}
```

### Data Model

<!-- New or modified data structures -->

```typescript
// Example type definition
type ExampleType = {
  id: string;
  // ...
};
```

### API Changes

#### IPC Methods

| Method     | Request Type | Response Type | Description |
| ---------- | ------------ | ------------- | ----------- |
| `METHOD_A` |              |               |             |

#### Request/Response Schemas

```typescript
// Request
interface MethodARequest {
  param: string;
}

// Response
interface MethodAResponse {
  result: boolean;
}
```

### UI Changes

<!-- If applicable -->

**Affected Files:**

- `src/frontend/[file].ts`

**New UI Elements:**

- Description of UI changes

### State Management

<!-- How state is managed for this feature -->

### Error Handling

| Error Condition | Handling Strategy | User Feedback |
| --------------- | ----------------- | ------------- |
|                 |                   |               |

## Implementation Plan

### Phase Breakdown

#### Phase 1: [Name]

**Scope:**

- Task 1
- Task 2

**Dependencies:** None

#### Phase 2: [Name]

**Scope:**

- Task 1
- Task 2

**Dependencies:** Phase 1

### File Changes Summary

| File                      | Action | Description |
| ------------------------- | ------ | ----------- |
| `src/backend/example.ts`  | Create |             |
| `src/frontend/example.ts` | Modify |             |
| `src/shared/types.ts`     | Modify |             |

## Testing Strategy

### Unit Tests

| Test Case | File | Description |
| --------- | ---- | ----------- |
|           |      |             |

### Integration Tests

| Test Case | Description |
| --------- | ----------- |
|           |             |

### Manual Test Cases

| ID   | Steps | Expected Result |
| ---- | ----- | --------------- |
| MT-1 |       |                 |

## Performance Considerations

### Expected Impact

<!-- CPU, memory, startup time, etc. -->

### Benchmarks

<!-- How will performance be measured? -->

## Security Considerations

<!-- Any security implications of this change -->

- [ ] No user data exposed
- [ ] Input validation added
- [ ] No new attack vectors

## Rollout Plan

### Feature Flags

<!-- If using feature flags -->

### Rollback Plan

<!-- How to revert if issues are found -->

## Alternatives Considered

### Option 1: [Name]

**Approach:**

**Pros:**

**Cons:**

**Why rejected:**

## Dependencies

### External Dependencies

<!-- New packages or services -->

| Dependency | Version | License | Purpose |
| ---------- | ------- | ------- | ------- |
|            |         |         |         |

### Internal Dependencies

<!-- Other Chess-Sensei systems this depends on -->

## Open Questions

1.
2.

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
|      |            |        |            |

---

## Approval

| Role       | Name | Date | Status  |
| ---------- | ---- | ---- | ------- |
| Tech Lead  |      |      | Pending |
| Reviewer 1 |      |      | Pending |
| Reviewer 2 |      |      | Pending |

## Revision History

| Version | Date | Author | Changes |
| ------- | ---- | ------ | ------- |
| 0.1     |      |        | Initial |
