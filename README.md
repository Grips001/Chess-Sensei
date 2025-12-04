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
- **Sub-10MB application size** --- no Chromium bloat
- **Cross-platform desktop** --- Windows, macOS, Linux
- **Privacy-focused** --- all data stored locally by default

## Tech Stack

- **Buntralino** (Bun + Neutralinojs)
  - Bun runtime for backend performance
  - Neutralinojs for native desktop shell
- **Stockfish (WebAssembly)** for chess engine
- **Modern HTML/CSS/JS** for frontend UI

## Documentation

### Design & Development Specifications

Comprehensive design documentation is available in the
[`source-docs/`](source-docs/) directory:

### Core Concept & Design

- [**Overview**](source-docs/overview.md) --- Game concept, core features, and
  training philosophy
- [**UI/UX Design**](source-docs/ui-ux-design.md) --- Visual theme, layout, and
  interaction patterns
- [**Game Modes**](source-docs/game-modes.md) --- Training, Exam, and Sandbox
  modes explained

### Technical Architecture

- [**Architecture**](source-docs/architecture.md) --- Technical stack, platform
  goals, and system design
- [**AI Engine**](source-docs/ai-engine.md) --- Stockfish WASM integration, bot
  personalities, and difficulty scaling
- [**Move Guidance**](source-docs/move-guidance.md) --- Best-move guidance
  system and visual highlighting

### Player Progress & Analytics

- [**Player Progress**](source-docs/player-progress.md) --- Metrics tracking,
  composite scores, and visual analytics
- [**Tracked Metrics**](source-docs/tracked-metrics.md) --- Complete list of all
  performance metrics
- [**Post-Game Analysis**](source-docs/post-game-analysis.md) --- Review tools,
  mistake analysis, and deep analytics

### Data & Development

- [**Data Storage**](source-docs/data-storage.md) --- Local storage,
  import/export, and data management
- [**Development**](source-docs/development.md) --- Best practices, GitHub
  workflow, and contributing guidelines
- [**Roadmap**](source-docs/roadmap.md) --- Development phases, milestones, and
  future plans
- [**Changelog**](CHANGELOG.md) --- Version history and release notes

### End-User Documentation

User guides and operational documentation will be available in the
[`documents/`](documents/) directory as features are implemented.

## Project Status

**Current Phase:** Phase 3 Complete ✓ → Phase 4 Next

- ✅ Foundation and project setup complete
- ✅ Buntralino initialized with proper structure
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
- 🚧 Phase 4: Exam Mode & Metrics Collection (Next)

See [roadmap.md](source-docs/roadmap.md) and [TASKS.md](source-docs/TASKS.md)
for detailed development plan and current progress.

## Download

### Pre-built Releases

Download the latest release for your platform from
[**GitHub Releases**](https://github.com/Grips001/Chess-Sensei/releases):

| Platform | File                                   |
| -------- | -------------------------------------- |
| Windows  | `Chess-Sensei-{version}-windows-x64.zip` |
| macOS    | `Chess-Sensei-{version}-macos-x64.tar.gz` |
| Linux    | `Chess-Sensei-{version}-linux-x64.tar.gz` |

**Current Version:** v0.3.1 (Phase 3: AI Opponent & Training Mode)

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

Interested in contributing? Check out our guidelines:

- [**CONTRIBUTING.md**](CONTRIBUTING.md) --- Contribution workflow and standards
- [**source-docs/development.md**](source-docs/development.md) --- Development
  best practices

Key resources:

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
- **Buntralino** (MIT) - IPC bridge
- **Chess pieces** (CC BY-SA 3.0) - SVG graphics
- **Sound effects** (CC0) - Move sounds from Chess.com

All third-party licenses are compatible with Chess-Sensei's MIT license.

## Philosophy

Chess-Sensei prioritizes:

- **Learning without intimidation** --- guidance, not enforcement
- **Performance over convenience** --- native desktop feel
- **Privacy and security** --- offline-first, no tracking
- **Open-source alignment** --- transparent, maintainable, community-driven
