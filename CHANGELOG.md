# Changelog

All notable changes to Chess-Sensei will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Post-game analysis UI (Phase 5)
- Player progress dashboard (Phase 6)
- Sandbox Mode for position exploration (Phase 7)

## [0.4.0] - 2025-12-04

### Added

- **Exam Mode**
  - Play without guidance to test your skills
  - Full game recording with move timestamps
  - Complete position tracking (FEN) for each move
  - PGN generation on game completion
  - Exam Mode enabled in game mode selection

- **Post-Game Analysis Pipeline**
  - Batch analysis of all moves after game completion
  - Centipawn loss calculation per move
  - Move classification (Excellent/Good/Inaccuracy/Mistake/Blunder)
  - Critical moment detection (evaluation swings > 100cp)
  - Tactical opportunity identification (missed/found)

- **Metrics Calculation System**
  - 9 composite scores calculated per game:
    - Precision Score (move accuracy)
    - Tactical Danger Score (tactical awareness)
    - Stability Score (consistency under pressure)
    - Conversion Score (winning position conversion)
    - Preparation Score (time management)
    - Positional & Structure Score (strategic play)
    - Aggression & Risk Score (playing style)
    - Simplification Preference Score (trading patterns)
    - Training Transfer Score (improvement trends)
  - Game-level and player profile metrics

- **Data Storage System**
  - JSON-based local storage
  - Platform-specific storage paths (Windows, macOS, Linux)
  - Atomic file writes for data integrity
  - Player profile persistence
  - Game history storage

- **Documentation**
  - Exam Mode metrics guide (`documents/exam-mode-metrics.md`)

### Technical

- New files: `src/backend/exam-mode.ts`, `src/backend/analysis-pipeline.ts`
- New files: `src/backend/metrics-calculator.ts`, `src/backend/data-storage.ts`
- Updated game-state.ts with Exam Mode availability
- TypeScript 5.6+ compatibility fixes for build scripts

## [0.3.2] - 2025-12-04

### Fixed

- Flip Board button causing board grid corruption (9 columns instead of 8)
- Piece position shifts when board was flipped
- Checkerboard pattern replaced by solid color columns when flipped

### Changed

- Updated documentation build references to point to documents/building.md

## [0.3.1] - 2025-12-04

### Fixed

- Best Moves panel visibility states not toggling correctly
- Stockfish engine loading in compiled executables
- Windows build configuration and distribution path format

### Changed

- Synchronized all version numbers across project files
- Updated documentation to reflect v0.3.1

## [0.3.0] - 2025-12-04

### Added

- **AI Opponent System**
  - 5 unique bot personalities: Sensei, Student, Club Player, Tactician,
    Blunder-Prone
  - Configurable difficulty levels from Elo 800 to 2400
  - Human-like thinking delays for natural gameplay
  - Training vs. Punishing play modes

- **Training Mode**
  - Mode selection screen with Training/Exam/Sandbox options
  - Bot opponent selection with personality descriptions
  - Color selection (White/Black/Random)
  - Complete game initialization flow

- **Real-Time Best-Move Guidance**
  - Top 3 moves calculated in real-time during player's turn
  - Color-coded highlighting system (Blue/Green/Yellow)
  - Three-way visual sync between pieces, squares, and notation panel
  - Multi-color highlights for overlapping move destinations
  - Hover interactions to emphasize individual moves
  - Guidance panel with move notation and evaluation scores

- **UI Enhancements**
  - Bot thinking indicator during opponent's turn
  - Glassmorphism styling for guidance panel
  - Updated board colors (cool gray theme)
  - Smooth fade animations for highlights

- **Documentation**
  - Training Mode user guide (`documents/training-mode-guide.md`)

### Changed

- Board color scheme updated from warm beige/brown to cool gray/slate
- Right panel reorganized to accommodate guidance system

### Technical

- New files: `src/frontend/training-mode.ts`, `src/frontend/move-guidance.ts`
- New shared types: `src/shared/bot-types.ts`, `src/shared/game-state.ts`
- Backend AI opponent: `src/backend/ai-opponent.ts`
- 5 new IPC methods for bot operations

## [0.2.0] - 2025-12-04

### Added

- **Chessboard UI**
  - Responsive 8x8 grid layout with proper aspect ratio
  - SVG chess pieces with clean, readable silhouettes
  - Board coordinates (a-h, 1-8)
  - Neomorphism design with soft shadows and depth

- **Piece Movement**
  - Drag-and-drop piece movement
  - Click-to-move alternative
  - Legal move highlighting with soft glows
  - Piece animations on move and capture
  - Sound effects for moves, captures, check, and game events

- **Game State Display**
  - Turn indicator with visual feedback
  - Move history panel with SAN notation
  - Captured pieces display with material advantage
  - Check/checkmate/stalemate alerts
  - Game result modal

- **Game Controls**
  - New Game button with confirmation
  - Undo/Redo functionality (Ctrl+Z/Ctrl+Y)
  - Resign button
  - Flip Board button

- **Documentation**
  - User guide (`documents/user-guide.md`)
  - Quick start guide (`documents/quick-start.md`)
  - FAQ (`documents/faq.md`)
  - Troubleshooting guide (`documents/troubleshooting.md`)

### Technical

- Frontend built with Vite and vanilla TypeScript
- Glassmorphism styling for right panel
- Responsive layout with CSS Grid
- Custom sound manager with graceful fallbacks

## [0.1.0] - 2025-12-04

### Added

- **Stockfish WASM Integration**
  - Stockfish v17.1 NNUE Lite (single-threaded)
  - UCI protocol communication
  - Position evaluation and best move calculation
  - Multi-PV support for top N moves

- **Chess Logic**
  - chess.js integration for move validation
  - FEN and PGN import/export
  - Complete move legality checking
  - Game state management (checkmate, stalemate, draws)

- **Move Analysis**
  - Centipawn loss calculation
  - Move classification (Excellent/Good/Inaccuracy/Mistake/Blunder)
  - Accuracy scoring system

- **IPC Bridge**
  - Buntralino IPC communication between frontend and backend
  - 8 registered IPC methods for engine operations
  - Typed request/response payloads

- **Documentation**
  - Engine integration guide (`documents/engine-integration.md`)
  - Build instructions (`documents/building.md`)

### Technical

- Buntralino framework (Bun + Neutralino.js)
- TypeScript with strict mode
- ESLint, Stylelint, Prettier, Markdownlint configured
- Windows build workaround implemented

## [0.0.0] - 2025-12-04

### Added

- **Project Foundation**
  - Repository structure established
  - Buntralino initialized
  - Development environment configured

- **Documentation**
  - Comprehensive source documentation (12 design docs)
  - Project README
  - Contributing guidelines
  - License (MIT)

---

[Unreleased]: https://github.com/Grips001/Chess-Sensei/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/Grips001/Chess-Sensei/releases/tag/v0.0.0
