# Backend / Technical Architecture

The technical foundation of the application is built for **speed, efficiency,
and true cross-platform desktop performance**, avoiding the overhead of
traditional Chromium-based solutions while maintaining modern web-based
development workflows.

## Core Technology Stack

- **Bun** (1.3.4+) - High-performance JavaScript runtime
  - 7x faster WebSocket than Node.js (1M+ messages/second)
  - 2-3x faster file I/O with `Bun.file()`
  - Native process management with `Bun.spawn()`
  - Built-in SQLite support
- **Neutralino.js** (6.4.0+) - Lightweight, native desktop shell
  - Native window menus with keyboard shortcuts
  - Print and clipboard HTML support
  - No Chromium bundling (uses OS native webview)
  - Cross-platform (Windows, macOS, Linux)
- **WebSocket IPC Architecture**
  - Native Bun WebSocket server (port 9339) for all frontend↔backend
    communication
  - Single protocol handles both RPC calls and real-time streaming
- This architecture enables:
  - Native desktop execution without bundling Chromium
  - Sub-millisecond IPC latency for real-time updates
  - Faster startup times
  - Lower RAM and CPU usage compared to Electron-based apps

## Performance & Platform Goals

- Primary focus:
  - **High-performance cross-platform desktop application**
  - Native feel across:
    - Windows
    - macOS
    - Linux
- Bun is used over Node.js to provide:
  - Faster dependency installation
  - Faster runtime execution
  - Lower memory overhead
  - Modern JavaScript and TypeScript support out of the box
- All rendering and interaction remains GPU-accelerated through the OS-native
  window layer rather than a full browser engine.

## Architecture Overview

### Frontend Layer

- Runs inside the Neutralino window
- Built using standard HTML/CSS/JS or a lightweight UI framework
- Glassmorphism + neomorphism styles rendered entirely via CSS and SVG
- Matte vector assets used for chess pieces where possible

### Backend / Logic Layer

- Powered entirely by Bun
- Handles:
  - Game state management
  - Notation generation
  - Training logic
  - Save/load operations (using `Bun.file()` for 2-3x faster I/O)
  - Stockfish engine management (using `Bun.spawn()`)
- Communicates with the frontend via:
  - **Bun WebSocket Server** (port 9339) for all IPC communication
  - RPC calls for commands (request/response pattern)
  - Pub/sub channels for real-time streaming (engine analysis, progress updates)

## Open Source Assets & Licensing Strategy

- Since chess assets are widely available:
  - **Open-source PNG and SVG chess piece sets will be researched and
    evaluated**
  - Priority is given to:
    - Clean silhouettes
    - High readability at small sizes
    - Compatibility with matte vector styling
- Every asset must meet:
  - Permissive licensing requirements (MIT, CC0, or equivalent)
  - Clear attribution rules where required
  - Long-term maintainability
- Where needed:
  - Custom vector redraws may be created from permissively licensed references
  - All asset licenses will be documented in the repository

## Security & Data Handling

- No cloud dependency required for core gameplay.
- All game data stored locally by default.
- Future online features (if added) must follow:
  - End-to-end secure communication
  - Encrypted local storage
  - Explicit user opt-in for any telemetry
- No third-party trackers or analytics baked into the core product.

## Project Structure

The codebase follows a layered architecture:

```text
Chess-Sensei/
├── src/
│   ├── frontend/     # Neutralino UI code (Vite + TypeScript)
│   ├── backend/      # Bun-powered services and IPC handlers
│   ├── engine/       # Chess engine + AI logic (Stockfish WASM)
│   ├── shared/       # Shared types and utilities (chess-logic, IPC types)
│   └── assets/       # Source assets (development only)
├── scripts/          # Build scripts (platform-specific builds)
├── public/           # Static files (copied to app/ during Vite build)
│   └── assets/       # Chess pieces, icons, sounds
├── source-docs/      # Design & development specifications
└── documents/        # End-user documentation
```

## Code Quality Tools

The project uses automated code quality enforcement:

- **ESLint** (v9+) - TypeScript/JavaScript linting with flat config
- **Stylelint** (v16+) - CSS linting
- **Prettier** (v3+) - Code formatting for all file types
- **Markdownlint** - Documentation consistency

Run `bun run lint` to check all files, `bun run lint:fix` to auto-fix issues.

## Packaging & Distribution

- Native binary packaging per OS:
  - `.exe` for Windows
  - `.app` / `.dmg` for macOS
  - `.AppImage` or `.deb` for Linux
- Auto-updater architecture designed but disabled by default.
- Offline-first execution model.

### Windows Build Process

Chess-Sensei uses a custom build script (`scripts/build-windows.ts`) that uses
`rcedit` for Windows executable metadata patching (icon, version info, etc.).

Use `bun run build:windows` for Windows builds. See
[documents/building.md](../documents/building.md) for details.

## Technical Philosophy Summary

The backend and platform strategy is driven by:

- **Performance over convenience**
- **Native desktop feel without Chromium bloat**
- **Long-term maintainability**
- **Open-source alignment**
- **Security and privacy by default**

This ensures the chess trainer remains fast, lean, portable, and future-proof.
