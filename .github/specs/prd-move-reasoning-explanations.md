# PRD: Move Reasoning Explanations

> **Status:** Approved **Author:** Grips001 **Created:** 2025-12-22 **Last
> Updated:** 2025-12-22 **Related Issues:** N/A

---

## Executive Summary

Add interactive explanation bubbles to board move highlights in Training Mode
that reveal the strategic and tactical reasoning behind each recommended move.
This transforms Training Mode from a simple move suggestion tool into an active
teaching system that helps players understand chess principles.

## Problem Statement

### Current State

Training Mode displays the top 3 recommended moves as highlighted squares on the
board with corresponding notation in the Best Moves panel. While players can see
_what_ moves are recommended, they receive no information about _why_ those
moves are strong or how they're ranked.

### User Pain Points

- Players see move recommendations but don't understand the reasoning behind
  them
- No context for why Move #1 is better than Move #2 or Move #3
- Missing educational opportunity to teach chess concepts (tactics, positional
  play, threats)
- Players may follow recommendations without learning underlying principles
- Difficult to internalize chess improvement without understanding the "why"

### Impact

This affects **all players using Training Mode**, particularly intermediate
players trying to improve their strategic understanding. Without explanations,
Training Mode becomes a "follow the computer" exercise rather than a learning
tool.

## Goals

### Primary Goals

1. Provide on-demand explanations for each of the top 3 recommended moves in
   Training Mode
2. Explain why each move is ranked at its position (#1, #2, or #3)
3. Include tactical and positional concepts relevant to each move
4. Create an intuitive, non-intrusive UI that enhances rather than clutters the
   board
5. Turn Training Mode into an active teaching tool rather than passive
   suggestion system

### Non-Goals

1. Generating explanations in real-time (may use pre-analyzed patterns or canned
   explanations initially)
2. Providing deep engine analysis with specific evaluation scores (beyond basic
   concepts)
3. Explaining every possible move (only top 3 recommendations)
4. Adding explanations to other modes (Exam, Play) at this stage

### Success Metrics

| Metric                                 | Current      | Target                  | Measurement Method    |
| -------------------------------------- | ------------ | ----------------------- | --------------------- |
| Player understanding of chess concepts | Unknown      | Qualitative improvement | User feedback/surveys |
| Engagement with Training Mode          | Baseline TBD | 20% increase            | Usage analytics       |
| Player self-reported learning value    | N/A          | 80%+ positive           | Post-session surveys  |

## User Stories

### Primary User Story

```text
As a chess player using Training Mode to improve
I want to understand why specific moves are recommended
So that I can learn chess principles and apply them in future games
```

### Secondary User Stories

```text
As an intermediate player analyzing a position
I want to compare the reasoning between the #1 and #2 moves
So that I can understand nuanced differences in move quality

As a beginner following move suggestions
I want explanations that teach me tactical patterns
So that I can start recognizing these patterns on my own

As a visual learner
I want explanations tied directly to board highlights
So that I can connect concepts to specific positions easily
```

## Requirements

### Functional Requirements

| ID    | Requirement                                                                                              | Priority | Notes                                     |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| FR-01 | Display visual indicator (note bubble icon) next to each of the 3 move highlights                        | Must     | Icon should be color-matched to highlight |
| FR-02 | Open explanation window when user clicks bubble icon                                                     | Must     | Window displays move reasoning            |
| FR-03 | Explanation includes: why move is strong, why it's ranked at this position, tactical/positional concepts | Must     | Core value proposition                    |
| FR-04 | Close explanation window with click outside or close button                                              | Must     | Standard modal behavior                   |
| FR-05 | Bubble placement does not obscure pieces or prevent piece selection                                      | Must     | Critical for usability                    |
| FR-06 | Explanations update when engine recalculates recommendations                                             | Should   | Keep explanations synchronized            |
| FR-07 | Support for key tactical motifs (pins, forks, skewers, discovered attacks, etc.)                         | Should   | Common patterns                           |
| FR-08 | Support for positional concepts (development, control, king safety, pawn structure)                      | Should   | Strategic understanding                   |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                                              |
| ------ | ---------------------- | --------------------------------------------------------------------- |
| NFR-01 | Performance            | Explanation generation/retrieval < 100ms                              |
| NFR-02 | Accessibility          | Explanation windows are keyboard-navigable and screen-reader friendly |
| NFR-03 | Platform Compatibility | Works on all supported platforms (Windows)                            |
| NFR-04 | Visual Consistency     | Matches existing glassmorphic design aesthetic                        |

## User Experience

### User Flow

```text
1. User enters Training Mode and plays a move
2. Engine calculates top 3 moves and displays board highlights + Best Moves panel
3. User notices small note-bubble icon next to each highlighted square
4. User clicks bubble icon for Move #1
5. Explanation window appears showing:
   - Move notation and description
   - Why this move is strong
   - Why it's ranked #1
   - Tactical/positional concepts involved
6. User reads explanation and closes window
7. User compares by clicking bubble for Move #2
8. User gains understanding of relative move quality
9. User makes their move with improved understanding
```

### Mockups/Wireframes

**Board Visual:**

```text
[Highlighted square with #1] [Small bubble icon ℹ️]
[Highlighted square with #2] [Small bubble icon ℹ️]
[Highlighted square with #3] [Small bubble icon ℹ️]
```

**Explanation Window (Example):**

```text
┌─────────────────────────────────────────┐
│ Nf3 — Knight moves to f3               │
│                                         │
│ Why this move is strong:                │
│ • Develops a piece toward the center    │
│ • Controls key central squares e5/d4    │
│ • Prepares to castle kingside           │
│ • Supports future pawn advances         │
│                                         │
│ Why it's ranked #1:                     │
│ • Flexible opening move with no         │
│   weaknesses                            │
│ • Maintains all options for future play │
│                                         │
│ Concepts: Development, Central Control  │
│                                   [Close]│
└─────────────────────────────────────────┘
```

### Edge Cases

| Scenario                                      | Expected Behavior                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Multiple bubbles open simultaneously          | Only one explanation window open at a time (clicking new bubble closes previous) |
| Bubble placement overlaps with pieces         | Position bubble with offset to avoid obscuring critical squares                  |
| Very complex position with subtle differences | Explanation focuses on most relevant factors, keeps language accessible          |
| Position with forced moves                    | Explanation clarifies that move is forced (e.g., "prevents checkmate")           |
| Equal-strength moves                          | Explanation notes moves are roughly equivalent, highlights stylistic differences |
| Small screen/low resolution                   | Explanation window scales appropriately or becomes scrollable                    |
| User clicks rapidly between bubbles           | System debounces or queues requests gracefully                                   |

## Technical Considerations

### Dependencies

- Existing board highlighting system
- Chess engine move evaluation data
- Move notation/description utilities
- UI modal/popover component system

### Constraints

- Explanation generation must be fast enough for real-time use
- May need to use pattern-matching or template-based explanations initially
  rather than AI-generated content
- Bubble icon placement algorithm must account for board rotation, different
  screen sizes
- Explanations must be stored/generated in a maintainable way

### Risks

| Risk                                             | Likelihood | Impact | Mitigation                                                                        |
| ------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------- |
| Bubble icons clutter the board visually          | Medium     | Medium | Careful sizing, color-matching, placement algorithm                               |
| Generating quality explanations is too complex   | Medium     | High   | Start with template-based system, expand later; leverage engine evaluation terms  |
| Explanations become repetitive or generic        | Medium     | Medium | Build comprehensive explanation library organized by tactical/positional patterns |
| Performance impact from explanation generation   | Low        | Medium | Pre-compute common patterns, cache results, use async loading                     |
| Users ignore feature due to poor discoverability | Medium     | High   | Add first-time tooltip, mention in Training Mode onboarding                       |

## Alternatives Considered

### Option 1: Explanations in Right Panel Only

- **Pros:** Simpler to implement, no board clutter
- **Cons:** Disconnected from visual board context, less intuitive, loses
  spatial association
- **Why rejected:** Reduces learning effectiveness by separating explanation
  from visual context

### Option 2: Always-Visible Explanation Text

- **Pros:** No interaction required, immediate information
- **Cons:** Significantly clutters interface, overwhelming for users who don't
  want it
- **Why rejected:** Too intrusive, removes user control

### Option 3: Hover-Based Tooltips

- **Pros:** Lightweight, familiar interaction pattern
- **Cons:** Doesn't work on touch screens, limited space for detailed
  explanations, requires precision hovering
- **Why rejected:** Insufficient space for meaningful explanations,
  accessibility concerns

### Option 4: Audio Explanations

- **Pros:** Keeps visual interface clean
- **Cons:** Requires audio production, less accessible, can't be skimmed/re-read
  easily
- **Why rejected:** Too complex, less flexible for users

## Implementation Plan

### Phases

1. **Phase 1: Core Functionality**
   - Design and implement bubble icon UI component
   - Create explanation window modal component
   - Build bubble placement algorithm
   - Implement basic template-based explanation system for common opening moves

2. **Phase 2: Explanation Library**
   - Expand explanation templates for tactical patterns (forks, pins, skewers,
     etc.)
   - Add positional concept explanations (development, king safety, pawn
     structure)
   - Create system for mapping engine evaluation to explanation templates

3. **Phase 3: Polish & Edge Cases**
   - Refine bubble placement for edge cases
   - Improve explanation quality based on user feedback
   - Add keyboard navigation
   - Performance optimization

### Dependencies

- Completion of move notation system (if implementing
  prd-move-notation-english-descriptions.md first)
- Access to engine evaluation data beyond just move ranking
- UI component library for modals/popovers

## Open Questions

1. Should explanations include numerical evaluations (e.g., "+0.5 advantage") or
   remain conceptual only?
2. How do we handle positions where engine reasoning is too complex for
   human-readable explanation?
3. Should we allow users to disable/hide bubble icons if they find them
   distracting?
4. Do we need different explanation complexity levels for different skill
   ratings?
5. Should we track which explanations users view most to improve content?
6. Can we leverage existing chess instruction content or do we need to write all
   explanations custom?
7. Should explanations include diagram snippets or just text?

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
