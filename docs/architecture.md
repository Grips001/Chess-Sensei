# Backend / Technical Architecture

The technical foundation of the application is built for **speed, efficiency,
and true cross-platform desktop performance**, avoiding the overhead of
traditional Chromium-based solutions while maintaining modern web-based
development workflows.

## Core Technology Stack

- **Buntralino** The project is built using Buntralino as the primary
  application framework, combining:
  - The raw performance of **Bun**
  - The lightweight, native desktop shell of **Neutralinojs**
- This architecture enables:
  - Native desktop execution without bundling Chromium
  - Sub-10MB application footprints
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
  - Save/load operations
- Communicates with the frontend via Neutralino's native IPC bridge

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

## Packaging & Distribution

- Native binary packaging per OS:
  - `.exe` for Windows
  - `.app` / `.dmg` for macOS
  - `.AppImage` or `.deb` for Linux
- Auto-updater architecture designed but disabled by default.
- Offline-first execution model.

## Technical Philosophy Summary

The backend and platform strategy is driven by:

- **Performance over convenience**
- **Native desktop feel without Chromium bloat**
- **Long-term maintainability**
- **Open-source alignment**
- **Security and privacy by default**

This ensures the chess trainer remains fast, lean, portable, and future-proof.
