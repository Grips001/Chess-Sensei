# Chess-Sensei Setup Complete

The Chess-Sensei project has been successfully initialized as a Buntralino
application.

## What Was Done

### 1. Project Initialization

- Initialized Buntralino project with Vite template
- Configured package.json with project metadata
- Set up Neutralino config with proper application settings
- Created .gitignore for development artifacts

### 2. Directory Structure

Created the following structure as per
[architecture.md](source-docs/architecture.md):

```text
Chess-Sensei/
├── src/
│   ├── frontend/        # Neutralino UI code (Vite + TypeScript)
│   ├── backend/         # Bun-powered services
│   ├── engine/          # Chess engine + AI logic
│   ├── shared/          # Shared types and utilities
│   └── assets/          # Source assets (development only)
├── public/              # Static files (copied to app/ during build)
│   └── assets/          # Chess pieces, icons, sounds
├── source-docs/         # Design & development specifications
├── documents/           # End-user documentation
└── Configuration files
```

### 3. Configuration Files

- **package.json** - Project metadata and dependencies
- **neutralino.config.json** - Neutralino window settings (1200x800 default)
- **vite.config.mts** - Vite build configuration
- **.gitignore** - Excludes node_modules, build artifacts, etc.

### 4. Documentation

- Created README files in each source directory
- Added CONTRIBUTING.md with development guidelines
- All comprehensive docs already in `source-docs/` folder

### 5. Initial Code

- Frontend entry point with Neutralino initialization
- Backend entry point with Buntralino IPC setup
- Placeholder UI showing successful initialization

## Current Technology Stack

### Runtime & Framework

- ✅ **Bun** v1.3+ - Runtime and package manager
- ✅ **Buntralino** v1.0.10 - Desktop framework
- ✅ **Neutralinojs** v5.6.0 - Native window shell
- ✅ **Vite** v6.1.0 - Frontend build tool
- ✅ **TypeScript** - Type-safe development

### Chess Engine

- ✅ **Stockfish** v17.1 - NNUE Lite WASM build
- ✅ **chess.js** v1.4.0 - Move validation and game state

### Code Quality

- ✅ **ESLint** v9+ - TypeScript/JavaScript linting
- ✅ **Stylelint** v16+ - CSS linting
- ✅ **Prettier** v3+ - Code formatting
- ✅ **Markdownlint** - Documentation linting

## Running the Project

### Development Mode

```bash
bun run dev
```

This starts the Vite dev server and launches the Neutralino window.

### Build for Production

The build process has two stages:

1. **Vite build** - Compiles frontend and copies `public/assets/` to
   `app/assets/`
2. **Platform build** - Packages the app for distribution

```bash
# Build frontend assets only (Vite → app/)
bun run build

# Windows build (Vite + Buntralino with rcedit workaround)
bun run build:windows

# Linux build
bun run build:linux

# macOS build
bun run build:macos
```

Note: Platform-specific builds run Vite first, then package for distribution.

See [documents/building.md](documents/building.md) for detailed build
instructions and troubleshooting.

### Code Quality

```bash
# Run all linters
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code
bun run format
```

## Project Status

**Phase:** Phase 6 Complete ✓ **Version:** v0.6.0 **Next:** Phase 7 - Sandbox
Mode

### Completed Phases

- ✅ **Phase 1:** Stockfish WASM, chess.js, UCI protocol, IPC bridge
- ✅ **Phase 2:** Chessboard UI, drag-and-drop, game controls, sound effects
- ✅ **Phase 3:** AI opponent (5 bot personalities), Training Mode, real-time
  best-move guidance
- ✅ **Phase 4:** Exam Mode, post-game analysis pipeline, metrics calculation,
  data storage
- ✅ **Phase 5:** Post-game analysis UI, evaluation graph, export options,
  advanced debug logging
- ✅ **Phase 6:** Progress dashboard, radar charts, game history, achievements,
  training suggestions

See [roadmap.md](source-docs/roadmap.md) for full development plan.

## Next Steps

According to the roadmap, Phase 7 involves:

1. **Sandbox Mode**
   - Position setup and exploration
   - Import/export FEN positions
   - Engine analysis at any position

2. **Practice Tools**
   - Study opening lines
   - Practice specific positions
   - Explore alternative variations

## Development Resources

- **Documentation:** See `source-docs/` folder for comprehensive guides
- **Architecture:** [source-docs/architecture.md](source-docs/architecture.md)
- **Roadmap:** [source-docs/roadmap.md](source-docs/roadmap.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

## Useful Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build commands
bun run build           # Frontend only (Vite)
bun run build:app       # Full app (all platforms)
bun run build:windows   # Windows with rcedit workaround

# Code quality
bun run lint            # Run all linters
bun run lint:fix        # Auto-fix issues
bun run format          # Format with Prettier

# Check versions
bun --version

# Run engine tests
bun run src/engine/test-engine-interface.ts
```

## Troubleshooting

### Port Already in Use

If Vite can't start, another process might be using the port. Close other dev
servers or change the port in `vite.config.mts`.

### Build Failures

Ensure all dependencies are installed: `bun install`

### Windows Build: pe-library Error

If you see "After Resource section, sections except for relocation are not
supported", use the Windows-specific build:

```bash
bun run build:windows
```

This uses rcedit instead of resedit to patch the executable. See
[documents/building.md](documents/building.md) for details.

### Neutralino Not Starting

Check that `neutralino.config.json` is valid JSON and paths are correct.

## Notes

- The project uses the Vite template which provides hot module replacement (HMR)
- Backend runs in Bun runtime (not Node.js)
- Frontend runs in Neutralino's native window (not Electron/Chromium)
- All documentation is comprehensive and ready to guide development

## Success

Chess-Sensei is ready for active development. Phase 6 (Player Progress
Dashboard) is complete with version v0.6.0.

Next up: Phase 7 - Sandbox Mode!
