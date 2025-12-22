# PRD: Move Notation with English Descriptions

> **Status:** Approved **Author:** Grips001 **Created:** 2025-12-22 **Last
> Updated:** 2025-12-22 **Related Issues:** N/A

---

## Executive Summary

Add human-readable English descriptions alongside chess notation in the Best
Moves panel to help newer players understand moves while organically learning
standard chess notation. This feature improves accessibility and learning
outcomes without removing the educational value of notation itself.

## Problem Statement

### Current State

The Best Moves panel in Training Mode displays moves exclusively in algebraic
chess notation (e.g., "Nf3", "Qxd5", "O-O"). While this is standard in chess, it
creates a barrier for newer players who are still learning to read notation.

### User Pain Points

- Newer players cannot quickly understand what piece is moving or where it's
  going
- Learning notation requires external reference or memorization before the app
  becomes useful
- Players may struggle to match notation to board highlights, reducing the
  effectiveness of move recommendations
- The learning curve discourages engagement with Training Mode features

### Impact

This affects **beginner and novice players** who want to improve but lack
fluency in chess notation. It creates unnecessary friction in what should be an
educational, supportive experience.

## Goals

### Primary Goals

1. Display English descriptions alongside chess notation for all moves in the
   Best Moves panel
2. Maintain the visibility and educational value of standard chess notation
3. Help players learn notation organically by seeing both formats simultaneously
4. Ensure the solution works seamlessly with existing move highlighting and
   board interaction

### Non-Goals

1. Replacing or hiding standard chess notation
2. Adding English descriptions to move history or game review features (at this
   stage)
3. Allowing users to toggle between notation formats
4. Translating to non-English languages

### Success Metrics

| Metric                                             | Current | Target                  | Measurement Method       |
| -------------------------------------------------- | ------- | ----------------------- | ------------------------ |
| User understanding of suggested moves              | Unknown | Qualitative improvement | User feedback/testing    |
| Reduction in "what does this move mean?" confusion | N/A     | Measurable decrease     | User testing/observation |

## User Stories

### Primary User Story

```text
As a beginner chess player using Training Mode
I want to see English descriptions alongside chess notation in the Best Moves panel
So that I can understand what moves the engine recommends while learning notation naturally
```

### Secondary User Stories

```text
As a novice player familiar with some notation
I want to see both formats side-by-side
So that I can verify my understanding and fill gaps in my notation knowledge

As a chess instructor using Chess-Sensei with students
I want the app to show readable move descriptions
So that students can focus on strategy before mastering notation
```

## Requirements

### Functional Requirements

| ID    | Requirement                                                                        | Priority | Notes                                   |
| ----- | ---------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| FR-01 | Display English description for each move in Best Moves panel                      | Must     | Format: "Notation — Description"        |
| FR-02 | Parse standard chess notation (piece moves, captures, castling, checks, checkmate) | Must     | Support all standard algebraic notation |
| FR-03 | Generate accurate English descriptions (e.g., "Nf3" → "Knight moves to f3")        | Must     | Must reflect captures, checks, castling |
| FR-04 | Handle special moves (castling, en passant, promotion)                             | Must     | e.g., "O-O" → "Castle kingside"         |
| FR-05 | Maintain visual hierarchy (notation primary, description secondary)                | Should   | Notation should remain prominent        |
| FR-06 | Keep panel width reasonable with longer text                                       | Should   | Consider responsive design              |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                                 |
| ------ | ---------------------- | -------------------------------------------------------- |
| NFR-01 | Performance            | No perceptible delay in rendering descriptions           |
| NFR-02 | Accessibility          | Screen readers should read both notation and description |
| NFR-03 | Platform Compatibility | Must work on all supported platforms (Windows)           |

## User Experience

### User Flow

```text
1. User enters Training Mode and begins playing
2. Engine calculates top 3 moves and displays them in Best Moves panel
3. Each move appears as: "Nf3 — Knight moves to f3"
4. User reads the English description to understand the move
5. User observes the notation and begins associating it with the description
6. Over time, user learns notation through repeated exposure
```

### Mockups/Wireframes

**Current Display:**

```text
Best Moves:
1. Nf3
2. d4
3. Bc4
```

**Proposed Display:**

```text
Best Moves:
1. Nf3 — Knight moves to f3
2. d4 — Pawn moves to d4
3. Bc4 — Bishop moves to c4
```

**With Special Moves:**

```text
Best Moves:
1. O-O — Castle kingside
2. Qxe5+ — Queen captures on e5, check
3. e8=Q — Pawn promotes to Queen on e8
```

### Edge Cases

| Scenario                                                 | Expected Behavior                          |
| -------------------------------------------------------- | ------------------------------------------ |
| Ambiguous notation (e.g., "Nbd2" for knight from b-file) | "Knight from b-file moves to d2"           |
| Capture notation ("Qxd5")                                | "Queen captures on d5"                     |
| Check notation ("Nf7+")                                  | "Knight moves to f7, check"                |
| Checkmate notation ("Qh8#")                              | "Queen moves to h8, checkmate"             |
| Castling ("O-O" or "O-O-O")                              | "Castle kingside" or "Castle queenside"    |
| Pawn promotion ("e8=Q")                                  | "Pawn promotes to Queen on e8"             |
| En passant capture                                       | "Pawn captures en passant on [square]"     |
| Very long descriptions on small screens                  | Text wraps cleanly or truncates gracefully |

## Technical Considerations

### Dependencies

- Existing Best Moves panel UI component
- Chess engine move generation system
- Move notation parsing/formatting utilities (may need creation)

### Constraints

- Must not significantly increase panel width or height
- Should use existing typography and styling system
- Performance impact should be negligible (string formatting only)

### Risks

| Risk                                          | Likelihood | Impact | Mitigation                                          |
| --------------------------------------------- | ---------- | ------ | --------------------------------------------------- |
| Panel becomes too wide with long descriptions | Medium     | Medium | Use responsive design, test on various screen sizes |
| Notation parsing edge cases missed            | Low        | Medium | Comprehensive testing with edge cases               |
| Users find dual format cluttered              | Low        | Low    | Use clear visual hierarchy and spacing              |

## Alternatives Considered

### Option 1: Toggle Button (Notation Only vs English Only)

- **Pros:** Gives users full control, cleaner interface
- **Cons:** Requires extra UI element, loses learning benefit of seeing both
  simultaneously
- **Why rejected:** Defeats the purpose of helping users learn notation through
  exposure

### Option 2: Tooltip on Hover

- **Pros:** Keeps interface clean
- **Cons:** Requires user action, not discoverable, doesn't work on touch
  screens
- **Why rejected:** Reduces accessibility and learning effectiveness

### Option 3: English Only with Notation in Parentheses

- **Pros:** Emphasizes readability
- **Cons:** De-emphasizes notation, doesn't align with chess conventions
- **Why rejected:** Standard notation should remain primary for learning
  purposes

## Implementation Plan

### Phases

1. **Phase 1:** Core Implementation
   - Create notation-to-English parser utility
   - Update Best Moves panel component to display dual format
   - Basic testing with standard moves

2. **Phase 2:** Edge Cases & Polish
   - Handle all special move types (castling, promotion, en passant)
   - Responsive design testing
   - UI polish and spacing refinements

### Dependencies

- Access to existing Best Moves panel code
- Understanding of current move notation format used by engine

## Open Questions

1. Should we apply this pattern to other areas (move history, game review) in
   future iterations?
2. Do we need to handle non-standard notation variants (descriptive notation,
   ICCF numeric)?
3. Should the description styling be different for different move rankings (#1,
   #2, #3)?
4. What is the maximum acceptable panel width before we need to truncate or
   wrap?

---

## Approval

| Role           | Name | Date | Status  |
| -------------- | ---- | ---- | ------- |
| Product Owner  |      |      | Pending |
| Tech Lead      |      |      | Pending |
| Design (if UI) |      |      | Pending |

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2025-12-22 | Claude | Initial draft |
