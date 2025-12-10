# Architecture Overview

This document provides architectural diagrams and component descriptions for
Chess-Sensei.

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Chess-Sensei Application                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           FRONTEND (Neutralino.js)                      │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │  Training   │  │    Exam     │  │   Sandbox   │  │  Analysis   │   │ │
│  │  │    Mode     │  │    Mode     │  │    Mode     │  │     UI      │   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │ │
│  │         │                │                │                │          │ │
│  │  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐   │ │
│  │  │                      Move Guidance System                       │   │ │
│  │  │                   (Real-time best-move hints)                   │   │ │
│  │  └──────────────────────────┬─────────────────────────────────────┘   │ │
│  │                             │                                          │ │
│  │  ┌────────────┐  ┌──────────┴──────────┐  ┌────────────────────────┐  │ │
│  │  │   Sound    │  │  WebSocket IPC      │  │  Progress Dashboard    │  │ │
│  │  │  Manager   │  │     Client          │  │  + Data Management     │  │ │
│  │  └────────────┘  └──────────┬──────────┘  └────────────────────────┘  │ │
│  │                             │                                          │ │
│  └─────────────────────────────│──────────────────────────────────────────┘ │
│                                │                                             │
│                    WebSocket   │   Port 9339                                 │
│                                │                                             │
│  ┌─────────────────────────────│──────────────────────────────────────────┐ │
│  │                           BACKEND (Bun)                                 │ │
│  │                             │                                           │ │
│  │  ┌──────────────────────────┴───────────────────────────────────────┐  │ │
│  │  │                    WebSocket IPC Server                           │  │ │
│  │  │                   (Request/Response + Pub/Sub)                    │  │ │
│  │  └──────────────────────────┬───────────────────────────────────────┘  │ │
│  │                             │                                           │ │
│  │  ┌───────────┐  ┌───────────┴──────┐  ┌──────────────┐  ┌──────────┐  │ │
│  │  │    AI     │  │     Analysis     │  │    Data      │  │  Export  │  │ │
│  │  │  Opponent │  │     Pipeline     │  │   Storage    │  │  Import  │  │ │
│  │  └─────┬─────┘  └────────┬─────────┘  └──────┬───────┘  └────┬─────┘  │ │
│  │        │                 │                   │               │         │ │
│  │        │    ┌────────────┴────────────┐     │               │         │ │
│  │        │    │    Metrics Calculator   │     │               │         │ │
│  │        │    │    (9 Dimensions)       │     │               │         │ │
│  │        │    └────────────┬────────────┘     │               │         │ │
│  │        │                 │                   │               │         │ │
│  └────────│─────────────────│───────────────────│───────────────│─────────┘ │
│           │                 │                   │               │           │
│  ┌────────┴─────────────────┴───────────────────┴───────────────┴─────────┐ │
│  │                         ENGINE (Stockfish WASM)                         │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Stockfish 17.1 NNUE Lite                      │   │ │
│  │  │                      (Single-threaded)                           │   │ │
│  │  │                                                                  │   │ │
│  │  │  • Position Evaluation    • Best Move Calculation                │   │ │
│  │  │  • Multi-PV Analysis      • Mate Detection                       │   │ │
│  │  │  • UCI Protocol           • ~7MB WASM                            │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           SHARED (Types & Utils)                         │ │
│  │                                                                          │ │
│  │  • IPC Types        • Chess Logic       • Game State Types              │ │
│  │  • Bot Types        • Engine Types      • Type Guards                   │ │
│  │  • Constants        • UCI Utilities     • Logger Types                  │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Components                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  index.ts ─────────────────────────────────────────────────────────────────  │
│     │    Main entry point, board rendering, game flow orchestration          │
│     │                                                                        │
│     ├── training-mode.ts ────────────────────────────────────────────────── │
│     │      Training Mode UI, bot selection, move guidance integration        │
│     │                                                                        │
│     ├── exam-mode.ts ────────────────────────────────────────────────────── │
│     │      Exam Mode UI, game recording, triggers post-game analysis         │
│     │                                                                        │
│     ├── sandbox-mode.ts ─────────────────────────────────────────────────── │
│     │      Board editor, piece placement, position analysis                  │
│     │                                                                        │
│     ├── analysis-ui.ts ──────────────────────────────────────────────────── │
│     │      Post-game analysis, replay, evaluation graph, deep analytics      │
│     │                                                                        │
│     ├── progress-dashboard.ts ───────────────────────────────────────────── │
│     │      Player stats, radar chart, achievements, game history             │
│     │                                                                        │
│     ├── data-management.ts ──────────────────────────────────────────────── │
│     │      Export/import wizards, backup management UI                       │
│     │                                                                        │
│     ├── move-guidance.ts ────────────────────────────────────────────────── │
│     │      Real-time best-move highlighting, multi-color sync                │
│     │                                                                        │
│     ├── sound-manager.ts ────────────────────────────────────────────────── │
│     │      Audio feedback for moves, captures, check, game events            │
│     │                                                                        │
│     └── websocket-ipc-client.ts ─────────────────────────────────────────── │
│            WebSocket connection, RPC calls, pub/sub subscriptions            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend Components                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  index.ts ─────────────────────────────────────────────────────────────────  │
│     │    Entry point, initializes services, registers IPC handlers           │
│     │                                                                        │
│     ├── websocket-server.ts ─────────────────────────────────────────────── │
│     │      WebSocket server, message routing, pub/sub channels               │
│     │                                                                        │
│     ├── ai-opponent.ts ──────────────────────────────────────────────────── │
│     │      Bot personalities, difficulty scaling, move selection             │
│     │                                                                        │
│     ├── analysis-pipeline.ts ────────────────────────────────────────────── │
│     │      Batch move analysis, CPL calculation, move classification         │
│     │                                                                        │
│     ├── metrics-calculator.ts ───────────────────────────────────────────── │
│     │      9-dimension composite scores, player profile aggregation          │
│     │                                                                        │
│     ├── data-storage.ts ─────────────────────────────────────────────────── │
│     │      JSON persistence, atomic writes, backup system                    │
│     │                                                                        │
│     ├── export-import.ts ────────────────────────────────────────────────── │
│     │      PGN/JSON export, import validation, profile merging               │
│     │                                                                        │
│     └── file-logger.ts ──────────────────────────────────────────────────── │
│            Structured file logging, log levels, dev mode support             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Game Move Flow

```text
User Input          Frontend              IPC                Backend           Engine
    │                   │                  │                    │                 │
    │  Click/Drag       │                  │                    │                 │
    ├──────────────────>│                  │                    │                 │
    │                   │  Validate Move   │                    │                 │
    │                   │  (chess.js)      │                    │                 │
    │                   │                  │                    │                 │
    │                   │  GET_GUIDANCE    │                    │                 │
    │                   ├─────────────────>│                    │                 │
    │                   │                  │  Analyze Position  │                 │
    │                   │                  ├───────────────────>│                 │
    │                   │                  │                    │  UCI: go        │
    │                   │                  │                    ├────────────────>│
    │                   │                  │                    │                 │
    │                   │                  │                    │  Best Moves     │
    │                   │                  │                    │<────────────────┤
    │                   │                  │  Top 3 Moves       │                 │
    │                   │<─────────────────┤                    │                 │
    │                   │                  │                    │                 │
    │  Highlight Moves  │                  │                    │                 │
    │<──────────────────┤                  │                    │                 │
    │                   │                  │                    │                 │
```

### Post-Game Analysis Flow

```text
Game End            Frontend              IPC                Backend           Storage
    │                   │                  │                    │                 │
    │  Game Over        │                  │                    │                 │
    │──────────────────>│                  │                    │                 │
    │                   │  ANALYZE_GAME    │                    │                 │
    │                   ├─────────────────>│                    │                 │
    │                   │                  │  Batch Analysis    │                 │
    │                   │                  │  (all moves)       │                 │
    │                   │                  │                    │                 │
    │                   │                  │  Calculate CPL     │                 │
    │                   │                  │  Classify Moves    │                 │
    │                   │                  │  Find Critical     │                 │
    │                   │                  │  Moments           │                 │
    │                   │                  │                    │                 │
    │                   │                  │  SAVE_GAME         │                 │
    │                   │                  ├────────────────────────────────────>│
    │                   │                  │                    │                 │
    │                   │                  │  UPDATE_PROFILE    │                 │
    │                   │                  ├────────────────────────────────────>│
    │                   │                  │                    │                 │
    │                   │  Analysis Result │                    │                 │
    │                   │<─────────────────┤                    │                 │
    │                   │                  │                    │                 │
    │  Show Analysis UI │                  │                    │                 │
    │<──────────────────┤                  │                    │                 │
```

## IPC Architecture

### RPC Pattern

```text
Frontend                                Backend
    │                                      │
    │  { id, method, params }              │
    ├─────────────────────────────────────>│
    │                                      │
    │  { id, result }  OR  { id, error }   │
    │<─────────────────────────────────────┤
```

### Pub/Sub Pattern

```text
Frontend                                Backend
    │                                      │
    │  subscribe(channel)                  │
    ├─────────────────────────────────────>│
    │                                      │
    │        Event 1                       │
    │<─────────────────────────────────────┤
    │        Event 2                       │
    │<─────────────────────────────────────┤
    │        Event N                       │
    │<─────────────────────────────────────┤
    │                                      │
    │  unsubscribe(channel)                │
    ├─────────────────────────────────────>│
```

## Directory Structure

```text
Chess-Sensei/
├── .github/
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   ├── workflows/          # CI/CD workflows
│   └── process/            # Engineering process docs
│
├── src/
│   ├── frontend/           # Neutralino UI code
│   │   ├── helpers/        # UI utilities
│   │   ├── styles/         # CSS design system
│   │   └── *.ts            # Component modules
│   │
│   ├── backend/            # Bun server code
│   │   ├── helpers/        # Backend utilities
│   │   └── *.ts            # Service modules
│   │
│   ├── engine/             # Stockfish integration
│   │   ├── stockfish/      # WASM files
│   │   └── stockfish-engine.ts
│   │
│   └── shared/             # Shared types/utils
│       └── *.ts            # Type definitions
│
├── documents/              # User documentation
├── tests/                  # Test suites
├── scripts/                # Build scripts
├── public/                 # Static assets
│   ├── icons/              # App icons
│   ├── pieces/             # Chess piece SVGs
│   └── sounds/             # Audio files
│
└── [config files]          # Root config files
```

## Technology Stack

| Layer     | Technology     | Version | Purpose                    |
| --------- | -------------- | ------- | -------------------------- |
| Runtime   | Bun            | 1.3.4   | Backend JavaScript runtime |
| Framework | Neutralino.js  | 6.4.0   | Desktop app framework      |
| Engine    | Stockfish WASM | 17.1    | Chess engine               |
| Chess     | chess.js       | 1.4.0   | Move validation            |
| Build     | Vite           | 7.x     | Frontend bundling          |
| Language  | TypeScript     | 5.x     | Type-safe JavaScript       |
| IPC       | WebSocket      | -       | Frontend-backend comms     |

## Security Boundaries

```text
┌────────────────────────────────────────────────────────────────┐
│                        User System                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Chess-Sensei Process                     │  │
│  │                                                           │  │
│  │  ┌─────────────────┐        ┌─────────────────────────┐  │  │
│  │  │    Frontend     │        │        Backend          │  │  │
│  │  │   (Renderer)    │<──────>│       (Bun)             │  │  │
│  │  │                 │  WS    │                         │  │  │
│  │  │  - No file I/O  │  9339  │  - File read/write      │  │  │
│  │  │  - Sandboxed    │        │  - User data only       │  │  │
│  │  │                 │        │  - No network (offline) │  │  │
│  │  └─────────────────┘        └─────────────────────────┘  │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Data Location: %APPDATA%/Chess-Sensei/  (platform-specific)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

| Operation       | Typical Time | Notes                  |
| --------------- | ------------ | ---------------------- |
| App startup     | ~2s          | Engine init is slowest |
| Engine analysis | 100-500ms    | Depth-dependent        |
| Save game       | <50ms        | Atomic write           |
| Load profile    | <100ms       | JSON parse             |
| Board render    | <16ms        | 60fps target           |
| Guidance update | ~200ms       | Engine + UI update     |
