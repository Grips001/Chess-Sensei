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

**Version:** v1.0.0 - Stable Release

Chess-Sensei is a complete, fully-featured chess training application.

### Features

- **Chess Engine:** Stockfish WASM v17.1 with full UCI protocol
- **Training Mode:** Practice with AI guidance (Blue/Green/Yellow move hints)
- **Exam Mode:** Test your skills without assistance, with post-game analysis
- **Sandbox Mode:** Board editor, FEN import/export, position analysis
- **5 Bot Personalities:** Sensei, Student, Club Player, Tactician,
  Blunder-Prone
- **Difficulty Levels:** Configurable Elo from 800-2400
- **Post-Game Analysis:** Move classification, evaluation graph, critical
  moments
- **Progress Dashboard:** Radar charts, game history, achievements, analytics
- **Data Management:** Export/import games (PGN/JSON), automatic backups
- **Modern UI:** Neomorphism design, responsive layout, WCAG AA accessibility
- **Cross-Platform:** Windows, macOS, and Linux support

## Download

### Pre-built Releases

Download the latest release for your platform from
[**GitHub Releases**](https://github.com/Grips001/Chess-Sensei/releases):

| Platform | File                                      |
| -------- | ----------------------------------------- |
| Windows  | `Chess-Sensei-{version}-windows-x64.zip`  |
| macOS    | `Chess-Sensei-{version}-macos-x64.tar.gz` |
| Linux    | `Chess-Sensei-{version}-linux-x64.tar.gz` |

**Current Version:** v1.0.0

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
