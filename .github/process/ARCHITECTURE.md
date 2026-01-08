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
│     │    Main orchestrator, coordinates all modules via dependency injection │
│     │                                                                        │
│     ├── board/ ──────────────────────────────────────────────────────────── │
│     │   ├── board-renderer.ts    Board rendering, FEN parsing, piece display │
│     │   ├── board-events.ts      Drag-and-drop, click-to-move handlers      │
│     │   └── board-highlights.ts  Legal moves, selection, multi-color system │
│     │                                                                        │
│     ├── ui/ ─────────────────────────────────────────────────────────────── │
│     │   ├── turn-indicator.ts    Turn display updates                       │
│     │   ├── move-history.ts      Move list rendering with collapsible UI    │
│     │   ├── captured-pieces.ts   Material advantage display                 │
│     │   ├── game-alerts.ts       Check/checkmate/draw indicators            │
│     │   └── dialogs.ts           Confirmation and promotion dialogs         │
│     │                                                                        │
│     ├── game/ ───────────────────────────────────────────────────────────── │
│     │   ├── game-controller.ts      Move execution, undo/redo, game state   │
│     │   ├── bot-integration.ts      Bot move requests for Training/Exam     │
│     │   ├── guidance-controller.ts  Move guidance UI and highlighting       │
│     │   ├── save-analyze.ts         Game saving and analysis pipeline       │
│     │   └── sandbox-controller.ts   Sandbox mode board editing and analysis │
│     │                                                                        │
│     ├── modes/ ──────────────────────────────────────────────────────────── │
│     │   └── mode-controller.ts   Training and Exam mode initialization      │
│     │                                                                        │
│     ├── analysis/ ───────────────────────────────────────────────────────── │
│     │   ├── analysis-controller.ts  Main analysis UI manager (AnalysisUIManager) │
│     │   └── components/             9 analysis component modules:          │
│     │       ├── board-renderer.ts      Interactive replay board            │
│     │       ├── evaluation-graph.ts    Position evaluation visualization   │
│     │       ├── move-list.ts           Annotated move list with navigation │
│     │       ├── position-analysis.ts   Move-by-move analysis panel         │
│     │       ├── summary-panel.ts       Game summary and statistics         │
│     │       ├── recommendations.ts     Training recommendations            │
│     │       ├── alternatives-modal.ts  Mistake deep-dive modal             │
│     │       └── navigation-controls.ts Playback controls                   │
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
│     │      Post-game analysis factory function (creates AnalysisUIManager)   │
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
│     │    Main entry point, initializes services, orchestrates IPC handlers   │
│     │                                                                        │
│     ├── handlers/ ───────────────────────────────────────────────────────── │
│     │   ├── engine-handlers.ts    Core engine IPC methods                   │
│     │   ├── bot-handlers.ts       AI opponent IPC methods                   │
│     │   └── storage-handlers.ts   Data persistence IPC methods              │
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
