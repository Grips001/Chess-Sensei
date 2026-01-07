# PRD: Right Panel Layout Redesign

> **Status:** Implemented **Author:** Grips001 **Created:** 2025-12-22 **Last
> Updated:** 2025-12-22 **Related Issues:** N/A

---

## Executive Summary

Redesign the right panel layout in Training Mode and Exam Mode to reduce visual
crowding and improve information hierarchy while preserving the app's signature
glassmorphic aesthetic. This involves detaching control buttons to a dedicated
toolbar, organizing panel content into collapsible sections, and maintaining the
board-centric visual focus.

## Problem Statement

### Current State

The right panel in Training Mode and Exam Mode serves as a catch-all container
for multiple unrelated UI elements: control buttons, best moves recommendations,
move history, position information, and settings. This creates visual density
issues, especially on smaller screens or when not running fullscreen.

### User Pain Points

- Right panel feels cramped and cluttered with competing elements
- Control buttons compete for space with informational content
- Visual hierarchy is unclear—everything appears equally important
- Difficult to quickly scan for specific information
- Panel becomes a "dumping ground" rather than organized information space
- On smaller displays, content may be cut off or compressed
- No way to prioritize or hide less-relevant information

### Impact

This affects **all users of Training and Exam modes**, particularly those on
smaller screens (laptops, non-fullscreen usage). The poor organization reduces
usability and creates unnecessary cognitive load when trying to focus on chess
improvement.

## Goals

### Primary Goals

1. Detach control buttons from right panel into a dedicated toolbar with
   consistent visibility
2. Organize right panel content into clearly defined, logically grouped sections
3. Reduce visual crowding without sacrificing functionality
4. Maintain and enhance the glassmorphic aesthetic throughout the redesign
5. Keep the chessboard as the dominant visual element (board-centric layout)
6. Improve scanability and information hierarchy

### Non-Goals

1. Complete visual redesign or style change (preserve existing aesthetic)
2. Adding new features or functionality (purely organizational/layout changes)
3. Supporting different layout modes or customization options (at this stage)
4. Redesigning other modes beyond Training and Exam
5. Mobile/responsive design for phone screens (Windows desktop only)

### Success Metrics

| Metric                              | Current      | Target                  | Measurement Method             |
| ----------------------------------- | ------------ | ----------------------- | ------------------------------ |
| User-reported panel clarity         | Baseline TBD | 30% improvement         | User surveys                   |
| Time to locate specific information | Baseline TBD | 25% reduction           | User testing with tasks        |
| Panel usability on smaller screens  | Unknown      | Qualitative improvement | Testing at various resolutions |

## User Stories

### Primary User Story

```text
As a user of Training Mode on a laptop screen
I want the right panel to be organized and scannable
So that I can quickly find relevant information without feeling overwhelmed
```

### Secondary User Stories

```text
As a user focused on move recommendations
I want control buttons moved out of the way
So that recommendation content has more room and visual priority

As a user reviewing move history
I want panel sections to be clearly separated
So that I can distinguish between history, recommendations, and settings at a glance

As a user with limited screen space
I want to collapse sections I'm not currently using
So that I can maximize space for information I care about
```

## Requirements

### Functional Requirements

| ID    | Requirement                                                                                    | Priority | Notes                                  |
| ----- | ---------------------------------------------------------------------------------------------- | -------- | -------------------------------------- |
| FR-01 | Move control buttons from right panel to dedicated toolbar (top or bottom)                     | Must     | Prevents space competition             |
| FR-02 | Organize right panel into distinct sections: Best Moves, Move History, Training Info, Settings | Must     | Clear information architecture         |
| FR-03 | Each section should be a visually distinct card/panel using glassmorphic styling               | Must     | Maintains aesthetic consistency        |
| FR-04 | Sections should be collapsible (expand/collapse)                                               | Should   | User control over density              |
| FR-05 | Default section states (expanded/collapsed) should be sensible for typical use                 | Should   | Best Moves/History expanded by default |
| FR-06 | Toolbar maintains glassmorphic aesthetic (translucency, blur, subtle shadows)                  | Must     | Visual consistency requirement         |
| FR-07 | Board remains visually dominant—panel width should not increase                                | Must     | Board-centric design constraint        |
| FR-08 | Panel sections have appropriate spacing and padding                                            | Must     | Prevents cramped feeling               |
| FR-09 | Section headers clearly label content                                                          | Must     | Scanability                            |
| FR-10 | Support for both Training Mode and Exam Mode layouts                                           | Must     | Consistent experience                  |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                                                                   |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------ |
| NFR-01 | Performance            | Layout rendering/transitions < 16ms (60fps)                                                |
| NFR-02 | Accessibility          | Sections keyboard-navigable, screen-reader friendly                                        |
| NFR-03 | Platform Compatibility | Works on all supported Windows screen sizes down to 1280x720                               |
| NFR-04 | Visual Consistency     | Matches existing glassmorphic design system (translucency, blur, shadows, rounded corners) |

## User Experience

### User Flow

```text
1. User enters Training Mode or Exam Mode
2. Control buttons are in fixed toolbar (top or bottom), always visible
3. Right panel displays organized sections:
   - Best Moves / Recommendations (expanded)
   - Move History (expanded)
   - Training Info / Position Info (expanded or collapsed)
   - Settings / Training Options (collapsed)
4. User can click section headers to collapse/expand as needed
5. User interacts with board and panel content without feeling cramped
6. Visual hierarchy guides user to most relevant information first
```

### Mockups/Wireframes

**Current Layout (Conceptual):**

```text
┌─────────────────┬──────────────┐
│                 │ [Buttons]    │
│                 │ Best Moves   │
│   Chessboard    │ Move 1       │
│                 │ Move 2       │
│                 │ Move 3       │
│                 │ Move History │
│                 │ 1. e4        │
│                 │ 2. e5        │
│                 │ [Settings]   │
│                 │ [Info]       │
└─────────────────┴──────────────┘
```

**Proposed Layout:**

```text
┌─────────────────────────────────┐
│ [Control Toolbar - Glassmorphic]│
├─────────────────┬───────────────┤
│                 │ ┌───────────┐ │
│                 │ │Best Moves │ │
│                 │ │ • Move 1  │ │
│                 │ │ • Move 2  │ │
│   Chessboard    │ │ • Move 3  │ │
│                 │ └───────────┘ │
│                 │ ┌───────────┐ │
│                 │ │Move Hist. │ │
│                 │ │ 1. e4 e5  │ │
│                 │ └───────────┘ │
│                 │ ┌───────────┐ │
│                 │ │Position▼  │ │
│                 │ └───────────┘ │
│                 │ ┌───────────┐ │
│                 │ │Settings▼  │ │
│                 │ └───────────┘ │
└─────────────────┴───────────────┘
```

### Edge Cases

| Scenario                              | Expected Behavior                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| User collapses all sections           | Panel shows only section headers, maximum board space                             |
| Very long move history                | Section becomes scrollable with fixed max height                                  |
| All sections expanded on small screen | Sections stack cleanly with scrolling, critical sections (Best Moves) prioritized |
| User resizes window                   | Layout adapts gracefully, maintains minimum usable dimensions                     |
| Toolbar at bottom vs top              | Both positions should work visually, user preference or design decision           |
| Rapid expand/collapse interactions    | Smooth animations, no visual glitches                                             |

## Technical Considerations

### Dependencies

- Existing right panel UI component
- Control button components
- CSS/styling system for glassmorphic effects
- Collapsible panel/accordion component (may need creation)
- Layout management system

### Constraints

- Must not increase total panel width (board must remain dominant)
- Must preserve existing glassmorphic visual language (translucency, blur,
  shadows, rounded corners)
- Must work within Neutralino framework limitations
- Cannot use libraries incompatible with current tech stack (Bun, TypeScript,
  Neutralino)

### Risks

| Risk                                                     | Likelihood | Impact | Mitigation                                                                          |
| -------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------- |
| Toolbar position feels awkward or blocks content         | Medium     | Medium | User testing for top vs bottom placement, ensure translucency doesn't obscure board |
| Collapsible sections add complexity                      | Low        | Low    | Use simple, standard interaction patterns                                           |
| Glassmorphic effects perform poorly on older hardware    | Low        | Medium | Test on range of hardware, provide fallback styles if needed                        |
| Users dislike new organization                           | Low        | High   | Conduct user testing before implementation, iterate based on feedback               |
| Panel height becomes too long when all sections expanded | Medium     | Medium | Set reasonable max heights, use scrolling, smart defaults for collapsed states      |

## Alternatives Considered

### Option 1: Tabbed Panel Interface

- **Pros:** Maximum space efficiency, familiar pattern
- **Cons:** Hides information, requires clicking to switch contexts, less
  scannable
- **Why rejected:** Reduces ability to see multiple information types
  simultaneously, which is valuable in Training Mode

### Option 2: Floating Panel System (Moveable Windows)

- **Pros:** Ultimate flexibility, user can arrange as desired
- **Cons:** Complex to implement, overwhelming, breaks board-centric aesthetic,
  can obstruct board
- **Why rejected:** Too complex, violates design principle of board-centric
  focus

### Option 3: Single Vertical Stack with Fixed Sizing

- **Pros:** Simple implementation, predictable layout
- **Cons:** Doesn't solve crowding problem, content may still be cut off
- **Why rejected:** Doesn't address core problem of visual density

### Option 4: Expand Panel Width, Shrink Board

- **Pros:** More room for panel content
- **Cons:** Violates board-centric design principle, reduces board prominence
- **Why rejected:** Board must remain dominant visual element

## Implementation Plan

### Phases

1. **Phase 1: Toolbar Extraction**
   - Design toolbar component with glassmorphic styling
   - Determine optimal toolbar position (top vs bottom)
   - Migrate control buttons to toolbar
   - Update layout to remove button space from panel

2. **Phase 2: Panel Sectioning**
   - Create collapsible section component (accordion-style)
   - Apply glassmorphic styling to section cards
   - Organize existing panel content into defined sections:
     - Best Moves / Recommendations
     - Move History
     - Training Info / Position Info
     - Settings / Training Options
   - Set sensible default expanded/collapsed states

3. **Phase 3: Responsive & Polish**
   - Test on various screen sizes (1280x720 up to 4K)
   - Refine spacing, padding, max heights
   - Add smooth expand/collapse animations
   - Keyboard navigation support
   - Final visual polish and accessibility testing

### Implementation Dependencies

- Completion of glassmorphic component design system (if not already documented)
- Access to existing panel and button components
- Design decision on toolbar placement (top vs bottom)

## Open Questions

1. Should the toolbar be positioned at the top or bottom of the screen?
2. What should the default state (expanded/collapsed) be for each section?
3. Should section states persist between sessions (remember user's
   collapsed/expanded preferences)?
4. Do we need different layouts for Training Mode vs Exam Mode, or can they
   share the same structure?
5. Should there be a "collapse all" / "expand all" shortcut?
6. What is the maximum acceptable panel height before we require scrolling?
7. Should we add icons to section headers for faster scanning?
8. Can we get inspiration from Chess.com's layout without copying their flat
   design aesthetic?

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
