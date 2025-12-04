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

Comprehensive design documentation is available in the [`source-docs/`](source-docs/) directory:

### Core Concept & Design

- [**Overview**](source-docs/overview.md) --- Game concept, core features, and training
  philosophy
- [**UI/UX Design**](source-docs/ui-ux-design.md) --- Visual theme, layout, and
  interaction patterns
- [**Game Modes**](source-docs/game-modes.md) --- Training, Exam, and Sandbox modes
  explained

### Technical Architecture

- [**Architecture**](source-docs/architecture.md) --- Technical stack, platform goals,
  and system design
- [**AI Engine**](source-docs/ai-engine.md) --- Stockfish WASM integration, bot
  personalities, and difficulty scaling
- [**Move Guidance**](source-docs/move-guidance.md) --- Best-move guidance system and
  visual highlighting

### Player Progress & Analytics

- [**Player Progress**](source-docs/player-progress.md) --- Metrics tracking, composite
  scores, and visual analytics
- [**Tracked Metrics**](source-docs/tracked-metrics.md) --- Complete list of all
  performance metrics
- [**Post-Game Analysis**](source-docs/post-game-analysis.md) --- Review tools, mistake
  analysis, and deep analytics

### Data & Development

- [**Data Storage**](source-docs/data-storage.md) --- Local storage, import/export, and
  data management
- [**Development**](source-docs/development.md) --- Best practices, GitHub workflow,
  and contributing guidelines
- [**Roadmap**](source-docs/roadmap.md) --- Development phases, milestones, and future
  plans

### End-User Documentation

User guides and operational documentation will be available in the
[`documents/`](documents/) directory as features are implemented.

## Project Status

**Current Phase:** Phase 0 Complete ✓ → Phase 1 Starting

- ✅ Foundation and project setup complete
- ✅ Buntralino initialized with proper structure
- ✅ Comprehensive documentation written
- 🚧 Phase 1: Core Chess Engine Integration (Next)

See [roadmap.md](source-docs/roadmap.md) for detailed development plan and current
progress.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Chess-Sensei.git
cd Chess-Sensei

# Install dependencies
bun install

# Run development server
bun run dev
```

See [SETUP.md](SETUP.md) for complete setup documentation.

## Contributing

Interested in contributing? Check out our guidelines:

- [**CONTRIBUTING.md**](CONTRIBUTING.md) --- Contribution workflow and standards
- [**source-docs/development.md**](source-docs/development.md) --- Development best practices

Key resources:

- Project structure and conventions
- Development workflow
- Coding standards
- Testing requirements
- Pull request process

## License

### To be determined

## Philosophy

Chess-Sensei prioritizes:

- **Learning without intimidation** --- guidance, not enforcement
- **Performance over convenience** --- native desktop feel
- **Privacy and security** --- offline-first, no tracking
- **Open-source alignment** --- transparent, maintainable, community-driven
