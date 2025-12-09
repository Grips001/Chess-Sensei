# Chess-Sensei

A modern chess training application designed to help players improve
decision-making through real-time AI-assisted move guidance---without
restricting player freedom. Chess-Sensei blends traditional chess gameplay with
real-time visual coaching, offering immediate strategic insight through
non-intrusive training.

## Key Features

### Real-Time Best-Move Guidance (Key Differentiator)

The defining feature of Chess-Sensei is its **visual best-move guidance
system**:

- **Top 3 moves highlighted** in real-time during your turn
- **Color-coded system**: Blue (best), Green (second-best), Yellow (third-best)
- **Visual sync** between board highlights and notation panel
- **Non-intrusive** --- play freely or learn from suggestions

### AI Opponent

- **Embedded Stockfish WASM engine** --- world-class chess strength
- **Human-like bot personalities** --- Sensei, Student, Club Player, Tactician,
  and more
- **Adjustable difficulty** --- from beginner (800 Elo) to master (2400+ Elo)
- **Training vs. Punishing modes** --- choose your learning style

### Modern UI/UX

- **Neomorphism + glassmorphism design** --- calm, premium aesthetic
- **Board-first layout** --- maximum focus on gameplay
- **Matte vector pieces** --- clean, readable, distraction-free
- **Full accessibility support** --- color-blind modes, adjustable highlights

### Offline-First & Lightweight

- **No external dependencies** --- fully self-contained
- **No Chromium bloat** --- uses Neutralino.js native webview
- **Cross-platform desktop** --- Windows, macOS, Linux
- **Privacy-focused** --- all data stored locally by default

## Tech Stack

- **WebSocket IPC Architecture** (Bun 1.3.4 + Neutralino.js 6.4.0)
  - Bun runtime for high-performance backend (7x faster WebSocket, 2-3x faster
    file I/O)
  - Neutralino.js 6.4.0 for native desktop shell (no Chromium bundling)
  - Native window menus, print, and clipboard HTML support
  - WebSocket server (port 9339) for all IPC (1M+ messages/second)
- **Stockfish 17.1 (WebAssembly)** for chess engine
- **Vite 7.2.7** for frontend build tooling
- **Modern HTML/CSS/JS** for frontend UI

## Documentation

Complete documentation is available in the [`documents/`](documents/) directory:

### User Guides

- [**Quick Start Guide**](documents/quick-start.md) --- Get started in under 2
  minutes
- [**User Guide**](documents/user-guide.md) --- Complete guide to all features
- [**Training Mode Guide**](documents/training-mode-guide.md) --- AI opponents
  and move guidance
- [**Exam Mode & Metrics**](documents/exam-mode-metrics.md) --- Test skills and
  view performance scores
- [**Post-Game Analysis**](documents/post-game-analysis.md) --- Review games
  with move-by-move analysis
- [**Progress Dashboard**](documents/progress-dashboard.md) --- Track
  improvement with radar charts and achievements
- [**Sandbox Mode**](documents/sandbox-mode.md) --- Board editor and position
  analysis
- [**Data Management**](documents/data-management.md) --- Export, import, and
  backup your data

### Reference

- [**FAQ**](documents/faq.md) --- Frequently asked questions
- [**Troubleshooting**](documents/troubleshooting.md) --- Common problems and
  solutions
- [**Changelog**](CHANGELOG.md) --- Version history and release notes

### Technical Documentation

- [**Building Guide**](documents/building.md) --- Build from source
- [**Engine Integration**](documents/engine-integration.md) --- Chess engine
  technical details

## Project Status

**Current Phase:** Phase 9 Complete ✓ (Polish & Optimization)

- ✅ Foundation and project setup complete
- ✅ WebSocket IPC architecture initialized (port 9339)
- ✅ Comprehensive documentation written
- ✅ Phase 1: Core Chess Engine Integration complete
  - Stockfish WASM integrated (v17.1 NNUE Lite)
  - Chess.js for move validation
  - Full UCI protocol communication
  - Move analysis with classification
    (Excellent/Good/Inaccuracy/Mistake/Blunder)
  - IPC bridge between frontend and backend
- ✅ Phase 2: Minimal UI & Chessboard complete
  - Fully functional chessboard with drag-and-drop and click-to-move
  - Modern neomorphism/glassmorphism design system
  - Game state management (New Game, Undo/Redo, Resign, Flip Board)
  - Move history with SAN notation
  - Captured pieces display with material advantage
  - Turn indicator and game status panel
  - Sound effects for moves, captures, and game events
  - Responsive layout that adapts to window size
  - Complete end-user documentation (User Guide, FAQ, Troubleshooting)
- ✅ Phase 3: AI Opponent & Training Mode complete
  - 5 bot personalities (Sensei, Student, Club Player, Tactician, Blunder-Prone)
  - Configurable difficulty levels (Elo 800-2400)
  - Real-time best-move guidance with color-coded highlights (Blue/Green/Yellow)
  - Three-way visual sync (piece, square, notation panel)
  - Multi-color highlights for overlapping move destinations
  - Training Mode setup flow with bot and color selection
  - Human-like thinking delays for natural gameplay
  - Complete end-user documentation (Training Mode Guide)
- ✅ Phase 4: Exam Mode & Metrics Collection complete
  - Exam Mode with disabled guidance for testing skills
  - Full game recording with timestamps and FEN positions
  - Post-game analysis pipeline with batch move analysis
  - Comprehensive metrics calculation (9 composite scores)
  - Local JSON data storage with atomic writes
  - Platform-specific storage paths (Windows, macOS, Linux)
  - Complete metrics documentation (documents/exam-mode-metrics.md)
- ✅ Phase 5: Post-Game Analysis UI complete
  - Full analysis interface with three-tab layout (Review/Summary/Analytics)
  - Interactive board replay with navigation and keyboard shortcuts
  - Color-coded move classification (Excellent/Good/Inaccuracy/Mistake/Blunder)
  - Evaluation graph with clickable points
  - Mistake deep dive with alternatives modal
  - Game summary with accuracy, move quality, and critical moments
  - Deep analytics dashboard with time management insights
  - Training recommendations based on game analysis
  - Export options (PGN, JSON, Markdown report)
  - Complete documentation (documents/post-game-analysis.md)
- ✅ Phase 6: Player Progress Dashboard complete
  - Composite score radar chart with 9 skill dimensions
  - Game history with filtering and sorting
  - Analytics with accuracy trends, error distribution, CPL analysis
  - Achievement system with unlockable badges
  - Training suggestions based on performance
  - Opponent-adjusted performance by Elo range
  - Complete documentation (documents/progress-dashboard.md)
- ✅ Phase 7: Sandbox Mode complete
  - Board editor with drag-and-drop piece placement
  - Piece palette with all pieces (K, Q, R, B, N, P) in both colors
  - Position validation (king placement, pawn ranks, piece counts)
  - FEN import/export with copy-to-clipboard
  - Quick position templates (Starting, Empty, K+Q vs K, K+R vs K, etc.)
  - Color-to-move toggle
  - Engine analysis with best move highlighting
  - Optional top-3 moves display (Training Mode style)
  - Evaluation bar and score display
  - Complete documentation (documents/sandbox-mode.md)
- ✅ Phase 8: Import/Export & Data Management complete
  - Export single game (PGN, JSON) or all games (batch JSON)
  - Export player profile with statistics and composite scores
  - Import games from JSON or PGN format
  - Merge player profiles from multiple devices
  - Automatic backup system with configurable frequency
  - Manual backup creation and verification
  - Backup retention policy (7 daily, 4 weekly)
  - Data Management UI with export/import wizards
  - Complete documentation (documents/data-management.md)
- ✅ Phase 9: Polish & Optimization complete
  - Enhanced animations with soft haptic-feel transitions
  - Comprehensive WCAG AA compliant color system
  - Loading states (progress bars, skeleton loaders, spinners)
  - Toast notifications and inline alerts for error handling
  - Engine performance optimization (MultiPV caching)
  - Accessibility improvements (keyboard navigation, screen reader support)
  - Responsive design for tablet, mobile, and large screens
  - Bug fixes including in-memory storage fallback
  - Comprehensive test suite (114 tests, 40 chess logic tests)
  - In-app user guide with keyboard shortcuts reference

All nine development phases are complete. Chess-Sensei v1.0 release is next.

## Download

### Pre-built Releases

Download the latest release for your platform from
[**GitHub Releases**](https://github.com/Grips001/Chess-Sensei/releases):

| Platform | File                                      |
| -------- | ----------------------------------------- |
| Windows  | `Chess-Sensei-{version}-windows-x64.zip`  |
| macOS    | `Chess-Sensei-{version}-macos-x64.tar.gz` |
| Linux    | `Chess-Sensei-{version}-linux-x64.tar.gz` |

**Current Version:** v0.9.0 (Phase 9: Polish & Optimization)

### Installation

1. Download the appropriate file for your operating system
2. Extract the archive
3. Run the Chess-Sensei executable

No installation required --- Chess-Sensei is a portable application.

## Building from Source

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Grips001/Chess-Sensei.git
cd Chess-Sensei

# Install dependencies
bun install

# Run development server
bun run dev
```

### Build Commands

```bash
# Build frontend assets (Vite)
bun run build

# Full app build (all platforms)
bun run build:app

# Windows-specific build (workaround for pe-library issue)
bun run build:windows
```

### Code Quality

```bash
# Run all linters
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code with Prettier
bun run format
```

See [SETUP.md](SETUP.md) for complete setup documentation and
[documents/building.md](documents/building.md) for detailed build instructions.

## Contributing

Interested in contributing? See [**CONTRIBUTING.md**](CONTRIBUTING.md) for:

- Project structure and conventions
- Development workflow
- Coding standards
- Testing requirements
- Pull request process

## License

Chess-Sensei is licensed under the **MIT License**. See the [LICENSE](LICENSE)
file for details.

### Open Source

This project is free and open-source software (FOSS). You are free to:

- ✅ Use Chess-Sensei for any purpose (personal, educational, commercial)
- ✅ Study and modify the source code
- ✅ Distribute original or modified versions
- ✅ Create derivative works

### Third-Party Licenses

Chess-Sensei uses several open-source components with various licenses. See
[ATTRIBUTIONS.md](ATTRIBUTIONS.md) for complete details on third-party software,
including:

- **Stockfish** (GPL-3.0) - Chess engine
- **chess.js** (BSD-2-Clause) - Chess logic library
- **Neutralino.js** (MIT) - Desktop framework
- **Bun** (MIT) - JavaScript runtime
- **Chess pieces** (CC BY-SA 3.0) - SVG graphics
- **Sound effects** (CC0) - Move sounds from Chess.com

All third-party licenses are compatible with Chess-Sensei's MIT license.

## Philosophy

Chess-Sensei prioritizes:

- **Learning without intimidation** --- guidance, not enforcement
- **Performance over convenience** --- native desktop feel
- **Privacy and security** --- offline-first, no tracking
- **Open-source alignment** --- transparent, maintainable, community-driven
