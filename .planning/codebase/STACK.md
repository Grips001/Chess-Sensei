# Technology Stack

**Analysis Date:** 2026-02-17

## Languages

**Primary:**
- TypeScript 5.x (ES2022 target) - Entire codebase (backend, frontend, shared)
- JavaScript - ESLint configuration (`eslint.config.mjs`), Vite configuration (`vite.config.mts`)

**Secondary:**
- HTML5 - Neutralino UI templates and frontend components
- CSS3 - Styling for frontend UI

## Runtime

**Environment:**
- Bun 1.x (primary runtime for backend)
  - Native WebSocket support
  - File I/O via `Bun.file()` and `Bun.write()`
  - Test runner built-in

**Package Manager:**
- Bun v1.x
- Lockfile: `bun.lockb` (present, binary format)

## Frameworks

**Core:**
- Neutralino.js 6.4.0 - Desktop application shell and native OS integration
  - Handles window management, file system access, clipboard operations
  - Provides native menu support
  - Client library: `@neutralinojs/lib` v6.4.0

- Vite 7.2.7 - Frontend build tool and development server
  - Custom Chess-Sensei plugin (`vite.config.mts`) for multi-process coordination
  - Serves frontend assets during development on `127.0.0.1:[port]`

**Backend Frameworks:**
- Bun native WebSocket server (built-in, no external package)
  - Port 9339 for IPC between frontend and backend
  - RPC method handling and pub/sub channels

**Chess Logic:**
- chess.js 1.4.0 - Move validation, board state, FEN parsing, PGN generation
  - Provides `Chess` class, `Move`, `Square`, `PieceSymbol`, `Color` types
  - Wrapped by `ChessGame` abstraction in `src/shared/chess-logic.ts`

**Engine:**
- Stockfish 17.1.0 - Node.js wrapper for UCI engine
- stockfish.wasm 0.10.0 - WebAssembly binary
  - Loaded dynamically via `src/engine/stockfish-loader.ts`
  - Abstracted through `StockfishEngine` class implementing `Engine` interface

**Testing:**
- Bun test (built-in) - Unit and integration test runner
  - Configured with preload: `tests/setup.ts`
  - Supports watch mode and coverage
  - No external test framework needed

- happy-dom 20.0.11 - DOM implementation for component testing
  - Provides lightweight DOM environment (no browser required)
  - Used in `tests/setup.ts` to expose globals: `window`, `document`, `HTMLElement`, etc.

**Build/Dev:**
- @neutralinojs/neu 11.3.0 - Neutralino CLI for building cross-platform executables
  - Invoked via `bunx @neutralinojs/neu` commands
  - Builds for Windows, macOS, Linux
  - Handles icon generation via `@ctjs/png2icons`

- TypeScript compiler (tsc) - Type checking (no emit)
  - Configured via `tsconfig.json` with strict mode

- ESLint 9.39.1 - Code linting
  - Flat config format via `eslint.config.mjs`
  - TypeScript plugin: `@typescript-eslint/eslint-plugin` v8.48.1
  - Parser: `@typescript-eslint/parser` v8.48.1

- Prettier 3.7.4 - Code formatting
  - Configuration: `.config/.prettierrc.json`
  - Supports TypeScript, JavaScript, JSON, Markdown, CSS, HTML

- stylelint 16.26.1 - CSS linting
  - Configuration: `.config/.stylelintrc.json`
  - Uses standard config

- markdownlint-cli2 0.19.1 - Markdown linting
  - Configuration: `.config/.markdownlint-cli2.jsonc`

## Key Dependencies

**Critical:**
- chess.js 1.4.0 - Core chess move logic (legal moves, validation, board state)
  - Single dependency for chess rules in `src/shared/chess-logic.ts`
  - Risk: Blocking dependency for all game operations

- stockfish 17.1.0 + stockfish.wasm 0.10.0 - UCI engine analysis
  - Provides engine evaluation, best move calculation, multi-PV analysis
  - Risk: WASM binary loading and worker management

- @neutralinojs/lib 6.4.0 - Native OS integration
  - Provides file system, clipboard, window, and menu APIs
  - Risk: Platform-specific behavior differences (Windows, macOS, Linux)

**Infrastructure:**
- execa 9.5.2 - Child process execution (Bun backend only)
  - Used for spawning Stockfish instances and Neutralino processes
  - Used in `src/backend/index.ts` for process management

- fs-extra 11.3.2 - Extended file system utilities
  - Provides synchronous and asynchronous file operations
  - Used in data storage and backup operations

- path - Node.js/Bun built-in for file path operations
  - Used throughout for cross-platform path handling

- os - Node.js/Bun built-in for OS detection
  - Used for home directory detection in `src/backend/data-storage.ts`

**DevDependencies:**
- @types/bun 1.1.14 - Type definitions for Bun APIs
- @types/fs-extra 11.0.4 - Type definitions for fs-extra
- rcedit 5.0.2 - Windows executable icon editing
- eslint-config-prettier 10.1.8 - ESLint + Prettier integration

## Configuration

**Environment:**
- No `.env` file used (application self-contained)
- Configuration via `neutralino.config.json`:
  - Application ID: `com.chess-sensei.app`
  - Version: `1.1.0`
  - Window dimensions: 1200x1000 (minimum 400x600)
  - Native API allowlist: events, app, os, debug, window, clipboard
  - Dev mode: Inspector disabled in production, enabled with `--window-enable-inspector=true` flag
  - Logging: Enabled, writes to log file

**TypeScript Compilation:**
- File: `tsconfig.json`
- Target: ES2022
- Module: ESNext
- Strict mode: Enabled (all strict checks)
- Path aliases:
  - `@/*` → `src/*`
  - `@shared/*` → `src/shared/*`
  - `@backend/*` → `src/backend/*`
  - `@frontend/*` → `src/frontend/*`
  - `@engine/*` → `src/engine/*`
- Source maps: Enabled (for debugging)
- Declaration files: Enabled

**Build:**
- Frontend build: Vite (outDir: `./app/resources/`)
- Backend build: Bun compile (via `scripts/build-*.ts`)
- Windows: `src/backend/index.ts` → `Chess-Sensei.exe` using rcedit
- macOS: Build via `scripts/build-macos.ts`
- Linux: Build via `scripts/build-linux.ts`

## Platform Requirements

**Development:**
- Bun 1.x runtime
- Node.js 18+ (fallback, for npm scripts if Bun unavailable)
- Python (optional, for build scripts)
- 200+ MB free disk space

**Production:**
- Deployment target: Cross-platform desktop (Windows, macOS, Linux)
  - Windows 64-bit executable (`Chess-Sensei.exe`)
  - macOS app bundle (`.app`)
  - Linux executable (`chess-sensei`)
- ~100 MB disk space for installed application
- No external services required (fully offline)

**Bun-specific:**
- Uses Bun native APIs in backend only:
  - `Bun.file()` for file reading
  - `Bun.write()` for atomic writes (auto-creates directories)
  - `Bun.serve()` for WebSocket server
  - Built-in test runner

---

*Stack analysis: 2026-02-17*
