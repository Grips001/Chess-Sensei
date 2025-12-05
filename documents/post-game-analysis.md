# Post-Game Analysis UI Guide

## Overview

The Post-Game Analysis UI in Chess-Sensei provides a comprehensive review system
for Exam Mode games. After completing an exam, players can analyze their
performance with detailed move-by-move analysis, evaluation graphs, and
personalized training recommendations.

## Accessing Analysis

### From Game Over Screen

When an Exam Mode game ends, the game over modal displays:

1. **Game Result** - Victory, Defeat, or Draw
2. **Quick Stats** - Accuracy, blunders, mistakes, inaccuracies, duration
3. **View Analysis Button** - Opens the full analysis interface

### From Game History

(Coming in Phase 6) Access previous games from the Player Progress Dashboard.

## Analysis Interface

The analysis UI consists of three main tabs:

### 1. Move Review Tab

The primary review interface featuring:

#### Interactive Board

- Full game replay with navigation controls
- Play/Pause auto-replay (1.5 second intervals)
- Step forward/backward through moves
- Jump to start/end of game
- Jump directly to mistakes/blunders
- Keyboard navigation (Arrow keys, Home, End, Space, Escape)
- Flip board orientation

#### Move List Panel

- Full game notation in SAN format
- Color-coded move classification:
  - **Green**: Excellent moves (!!)
  - **Teal**: Good moves (!)
  - **Yellow**: Inaccuracies (?!)
  - **Orange**: Mistakes (?)
  - **Red**: Blunders (??)
- Evaluation change indicators
- Click any move to jump to position
- Auto-scroll synchronized with board

#### Evaluation Graph

- Line graph showing position evaluation over time
- White advantage above center line, Black below
- Y-axis: ±5 pawns (clamped for display)
- X-axis: move number
- Visual drop-offs indicate mistakes
- Click graph points to jump to position
- Current position marker

#### Position Analysis Panel

For each position displays:

- Your move played
- Move quality classification and CPL (centipawn loss)
- Engine's best move recommendation
- Evaluation before and after move
- Centipawn swing indicator
- "View Alternatives" button for mistakes/blunders

### 2. Game Summary Tab

Overview of game performance:

#### Game Overview Card

- Result (Victory/Defeat/Draw)
- Termination reason
- Opponent (personality and Elo)
- Game duration
- Total moves played

#### Accuracy Card

- Overall accuracy percentage
- Phase-by-phase breakdown:
  - Opening accuracy
  - Middlegame accuracy
  - Endgame accuracy

#### Move Quality Card

- Excellent moves count
- Good moves count
- Inaccuracies count
- Mistakes count
- Blunders count
- Average centipawn loss

#### Critical Moments Card

- Automatically identified turning points
- Types: blunder, missed_win, turning_point, brilliant
- Evaluation swings
- Click to navigate to position

#### Tactical Opportunities Card

- Found vs. missed tactics
- Tactic type and description
- Move number reference

#### Export Actions

- Export PGN
- Export JSON
- Export Report (Markdown)

### 3. Deep Analytics Tab

Advanced statistics and insights:

#### Time Management

- Average time per move
- Fast move accuracy (<5 seconds)
- Slow move accuracy (>10 seconds)
- Time-accuracy correlation insights

#### Accuracy Charts

- Bar chart visualization by game phase
- Color-coded by accuracy level

#### Move Distribution

- Visual distribution of move classifications
- Percentage breakdown

#### Training Recommendations

Personalized suggestions based on:

- Opening accuracy
- Blunder/mistake frequency
- Time management patterns
- Middlegame strategy
- Endgame technique
- Missed tactical opportunities

## Mistake Deep Dive

Click "View Alternatives" on any mistake/blunder to see:

### What Happened

- The move played with classification
- Evaluation impact (centipawn loss)

### Better Alternatives

- Engine's best move
- Alternative moves with evaluations
- Evaluation comparison showing loss

### Open in Sandbox

Button to load position in Sandbox Mode (Phase 6) for practice.

## Export Options

### PGN Export

Standard PGN format with:

- Complete game headers
- Move annotations (!, !!, ?!, ?, ??)
- Comments for mistakes/blunders
- Periodic evaluation comments
- Player accuracy in header

### JSON Export

Complete data package containing:

- Game data (moves, metadata)
- Analysis data (evaluations, classifications)
- Metrics data (if available)
- Export metadata

### Report Export (Markdown)

Comprehensive analysis report including:

- Game information table
- Accuracy summary
- Move quality breakdown
- Critical moments documentation
- Tactical opportunities summary
- Moves to review list
- Training recommendations

## Keyboard Shortcuts

| Key    | Action           |
| ------ | ---------------- |
| ←      | Previous move    |
| →      | Next move        |
| Home   | Go to start      |
| End    | Go to end        |
| Space  | Toggle auto-play |
| Escape | Close analysis   |

## Move Classification Colors

| Classification | Color  | Hex Code | Symbol |
| -------------- | ------ | -------- | ------ |
| Excellent      | Green  | #22c55e  | !!     |
| Good           | Teal   | #14b8a6  | !      |
| Inaccuracy     | Yellow | #eab308  | ?!     |
| Mistake        | Orange | #f97316  | ?      |
| Blunder        | Red    | #ef4444  | ??     |

## Technical Implementation

### Files

- `src/frontend/analysis-ui.ts` - Main analysis UI module
- `src/frontend/styles/index.css` - Styling (analysis section)
- `index.html` - Analysis overlay markup

### Key Components

- `AnalysisUIManager` class - Main controller
- `StoredGameData` / `StoredAnalysisData` - Type definitions
- Export functions (PGN, JSON, Markdown)

### Backend Dependencies

- `LOAD_GAME` IPC method
- `LOAD_ANALYSIS` IPC method
- `GET_GAMES_LIST` IPC method

## Version History

- **v0.5.0** - Initial implementation (Phase 5)
  - Full analysis UI with three tabs
  - Move-by-move review with interactive board
  - Evaluation graph and position analysis
  - Game summary and deep analytics
  - Training recommendations
  - Export options (PGN, JSON, Markdown)
