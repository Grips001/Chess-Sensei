# Changelog

All notable changes to Chess-Sensei will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Import/Export & Data Management (Phase 8)
- Polish & Optimization (Phase 9)

## [0.7.0] - 2025-12-06

### Added

- **Sandbox Mode** (Phase 7)
  - Board editor with drag-and-drop piece placement
  - Piece palette with all pieces (K, Q, R, B, N, P) in both colors
  - Position validation (king placement, pawn ranks, piece counts)
  - FEN import/export with copy-to-clipboard
  - Quick position templates (Starting, Empty, K+Q vs K, K+R vs K, K+P vs K,
    Lucena)
  - Color-to-move toggle
  - Engine analysis with best move highlighting
  - Optional top-3 moves display (Training Mode style)
  - Evaluation bar and score display
- User documentation: `documents/sandbox-mode.md`

### Technical

- New file: `src/frontend/sandbox-mode.ts`
- SandboxModeManager and SandboxUIManager classes
- Integration with existing IPC method `GET_GUIDANCE_MOVES` for analysis
- Follows established manager/UI manager pattern from Training/Exam modes

## [0.6.1] - 2025-12-06

### Fixed

- **Progress Dashboard not appearing** - Dashboard overlay had same z-index as
  mode selection screen, causing it to render behind. Increased z-index from
  2000 to 3000.
- **Radar chart labels cut off** - Skill Profile chart labels were being
  clipped. Implemented dynamic SVG viewBox calculation that automatically
  adjusts to fit all labels regardless of content length.

### Changed

- Radar chart now uses origin-centered coordinates with dynamic bounds
  calculation
- Removed hardcoded CSS constraints on radar chart container for better
  flexibility

## [0.6.0] - 2025-12-06

### Added

- **Player Progress Dashboard** (Phase 6)
  - Composite score radar chart displaying 9 skill dimensions
  - Game history table with filtering (All/Last 10/Last 30/This Month)
  - Overview tab with quick stats, game record, and accuracy trends
  - Analytics tab with phase accuracy, error distribution, CPL trends
  - Period comparison (last 10 games vs. previous 10)
  - Performance by opponent strength breakdown
  - Achievement system with 9 unlockable badges
  - Training suggestions based on performance metrics
  - "View Progress" button on main mode selection screen
- New IPC methods for player profile and achievements
- Backend achievement storage with atomic file writes
- User documentation: `documents/progress-dashboard.md`

### Changed

- Dashboard button styling to match mode selection theme
- CSS organization for dashboard-specific overrides

## [0.5.2] - 2025-12-05

### Fixed

- **Game mode switching bug**: Fixed issue where switching from Training Mode to
  Exam Mode (or vice versa) after completing a game would show the previous
  game's result overlay instead of starting a fresh game
- **Stale timeout cleanup**: Added proper cancellation of pending game result
  timeouts when starting a new game to prevent race conditions
- **Consolidated new game flow**: Unified all "New Game" paths to use a single
  `showModeSelection()` function for consistent hard reset behavior

### Changed

- Removed redundant `startNewGame()` and `handleNewGameControl()` functions in
  favor of centralized `showModeSelection()` reset logic
- All "New Game" actions now perform a complete state reset including game
  state, board orientation, overlays, and pending timeouts

## [0.5.1] - 2025-12-05

### Added

- **Post-Game Analysis UI** (Phase 5)
  - Three-tab analysis interface (Review/Summary/Analytics)
  - Interactive board replay with move navigation
  - Keyboard shortcuts (Arrow keys, Home, End)
  - Color-coded move classification display
  - Evaluation graph with clickable points
  - Mistake deep-dive modal with alternative moves
  - Game summary with accuracy and move quality breakdown
  - Critical moments highlighting
  - Deep analytics dashboard with time management insights
  - Training recommendations based on game analysis
  - Export options (PGN, JSON, Markdown report)

- **Advanced Debug Logging System**
  - File-based logging enabled via `--dev` flag
  - Frontend-to-backend log forwarding via IPC
  - Four log levels: debug, info, warn, error
  - Timestamped log files in `logs/` directory
  - Structured logging with component names
  - Automatic console output in dev mode

- **Documentation**
  - Post-game analysis guide (`documents/post-game-analysis.md`)
  - Debug logging documentation in TASKS.md

### Technical

- New files: `src/frontend/analysis-ui.ts`, `src/frontend/frontend-logger.ts`
- New files: `src/backend/file-logger.ts`, `src/shared/logger-types.ts`
- New IPC methods: `logMessage`, `getLogPath`, `isLoggingEnabled`
- Updated `ipc-types.ts` with logging method definitions

## [0.5.0] - 2025-12-05

### Added

- **Post-Game Analysis Pipeline** (Phase 4 continuation)
  - Batch analysis infrastructure for game review
  - Integration preparation for Analysis UI

### Technical

- Intermediate release for Phase 5 development base

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

[Unreleased]: https://github.com/Grips001/Chess-Sensei/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/Grips001/Chess-Sensei/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.5.2...v0.6.0
[0.5.2]: https://github.com/Grips001/Chess-Sensei/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/Grips001/Chess-Sensei/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Grips001/Chess-Sensei/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Grips001/Chess-Sensei/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/Grips001/Chess-Sensei/releases/tag/v0.0.0
