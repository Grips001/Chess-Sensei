# Chess-Sensei Setup Complete

The Chess-Sensei project has been successfully initialized with a WebSocket IPC
architecture (Bun backend + Neutralino.js 6.4.0 frontend).

## What Was Done

### 1. Project Initialization

- Initialized WebSocket IPC project with Vite template
- Configured package.json with project metadata
- Set up Neutralino config with proper application settings
- Created .gitignore for development artifacts

### 2. Directory Structure

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
├── documents/           # User guides and technical documentation
├── tests/               # Test suites
├── scripts/             # Build and utility scripts
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
- Complete documentation in `documents/` folder

### 5. Initial Code

- Frontend entry point with Neutralino initialization
- Backend entry point with WebSocket IPC setup (port 9339)
- Placeholder UI showing successful initialization

## Current Technology Stack

### Runtime & Framework

- ✅ **Bun** v1.3+ - Runtime and package manager
- ✅ **Neutralino.js** v6.4.0+ - Native window shell
- ✅ **Vite** v7.2.10 - Frontend build tool
- ✅ **WebSocket IPC** - Port 9339 (1M+ msgs/sec)
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

# Windows build (Vite + platform packaging with rcedit)
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

**Version:** v1.0.3 - Stable Release

Chess-Sensei is a complete chess training application with all features
implemented and tested.

## Development Resources

- **Documentation:** See [`documents/`](documents/) folder for all guides
- **Building:** [documents/building.md](documents/building.md)
- **Engine Details:**
  [documents/engine-integration.md](documents/engine-integration.md)
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
bun run src/engine/engine-interface-manual-test.ts
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

Chess-Sensei v1.0.3 is complete and ready for use.
