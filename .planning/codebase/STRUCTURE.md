# Codebase Structure

**Analysis Date:** 2026-02-17

## Directory Layout

```
Chess-Sensei/
├── src/                           # Source code (TypeScript)
│   ├── backend/                   # Bun backend (port 9339)
│   │   ├── handlers/              # IPC RPC method handlers
│   │   ├── helpers/               # Shared backend utilities
│   │   ├── index.ts               # Backend entry point
│   │   ├── websocket-server.ts    # WebSocket IPC server
│   │   ├── ai-opponent.ts         # Bot personality & skill management
│   │   ├── analysis-pipeline.ts   # Post-game analysis & classification
│   │   ├── data-storage.ts        # File-based data persistence
│   │   ├── metrics-calculator.ts  # Player stats and achievement logic
│   │   ├── export-import.ts       # Game/profile import-export
│   │   ├── file-logger.ts         # Backend file logging
│   │   └── *-manual-test.ts       # Manual test files (not deployed)
│   ├── engine/                    # Stockfish chess engine interface
│   │   ├── stockfish-engine.ts    # UCI protocol wrapper
│   │   ├── stockfish-loader.ts    # Engine initialization & selection
│   │   └── *-manual-test.ts       # Manual test files
│   ├── frontend/                  # Neutralino.js UI
│   │   ├── board/                 # Board rendering & interaction
│   │   ├── game/                  # Game flow (execution, guidance, bots)
│   │   ├── modes/                 # Game mode controllers
│   │   ├── ui/                    # UI element updates (turn, history, alerts)
│   │   ├── components/            # Reusable UI components
│   │   ├── styles/                # CSS stylesheets
│   │   ├── helpers/               # Frontend utilities
│   │   ├── analysis/              # Post-game analysis UI
│   │   ├── analysis-ui/           # Analysis panel components
│   │   ├── index.ts               # Frontend entry point
│   │   ├── websocket-ipc-client.ts # WebSocket RPC client
│   │   ├── training-mode.ts       # Training mode manager
│   │   ├── exam-mode.ts           # Exam mode manager
│   │   ├── sandbox-mode.ts        # Sandbox mode manager
│   │   ├── move-guidance.ts       # Best move guidance system
│   │   ├── sound-manager.ts       # Sound effect playback
│   │   ├── progress-dashboard.ts  # Player stats UI
│   │   ├── data-management.ts     # Game save/load UI
│   │   ├── native-menu.ts         # Native menu bar
│   │   └── *-utils.ts             # Utilities (clipboard, print, logging)
│   └── shared/                    # Type definitions & shared logic
│       ├── chess-logic.ts         # ChessGame class (board state)
│       ├── ipc-types.ts           # Frontend-backend RPC contracts
│       ├── engine-types.ts        # Move/evaluation types
│       ├── bot-types.ts           # Bot personality/skill types
│       ├── game-state.ts          # Game mode & phase types
│       ├── analysis-types.ts      # Move classification types
│       ├── explanation-generator.ts # Move explanation text
│       ├── notation-parser.ts     # PGN/algebraic notation parsing
│       ├── *-constants.ts         # FEN, UCI, bot constants
│       ├── logger-types.ts        # Logging interface types
│       ├── type-guards.ts         # Runtime type validation
│       └── uci-utils.ts           # UCI notation utilities
├── index.html                     # Neutralino window entry
├── neutralino.config.json         # Neutralino app configuration
├── package.json                   # Dependencies & build scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
├── eslint.config.mjs              # Linting rules
├── .config/                       # Tool configurations
│   ├── .prettierrc.json           # Code formatting
│   ├── .stylelintrc.json          # CSS linting
│   └── .markdownlint-cli2.jsonc   # Markdown linting
├── .claude/                       # AI agent guidelines
│   ├── rules/                     # Path-specific rules
│   ├── commands/                  # Custom slash commands
│   ├── agents/                    # Agent definitions
│   └── hooks/                     # Lifecycle automation
├── .github/                       # GitHub workflows & templates
│   ├── specs/                     # PRDs and Tech Specs
│   ├── process/                   # Development process docs
│   └── workflows/                 # CI/CD pipelines
├── public/                        # Static assets (symlink to app/assets)
├── app/assets/                    # Game assets (pieces, icons, sounds)
├── build/                         # Built executables (Windows, Linux, macOS)
├── dist/                          # Vite build output
├── tests/                         # Test files (unit & integration)
├── documents/                     # User-facing documentation
├── scripts/                       # Build scripts for platforms
├── .planning/                     # GSD planning documents
│   └── codebase/                  # Architecture & structure docs
└── bin/                           # Binary executables (Stockfish)
```

## Directory Purposes

**src/backend/:**
- Purpose: All server-side application logic and IPC
- Contains: Engine operations, AI opponent behavior, game analysis, data persistence
- Key files: `index.ts` (entry), `websocket-server.ts` (IPC), handler modules

**src/backend/handlers/:**
- Purpose: RPC method implementations (request handlers)
- Contains: Engine methods, bot methods, analysis methods, storage methods, progress methods, backup/restore, logging
- Pattern: Each handler group created by factory function (e.g., `createEngineHandlers`)
- Key files: `index.ts` (barrel export), `ipc-types.ts` (RPC type definitions)

**src/backend/helpers/:**
- Purpose: Backend utility functions and services
- Contains: Error response formatting, service initialization helpers
- Key files: `error-response.ts` (consistent error formatting)

**src/engine/:**
- Purpose: Chess engine abstraction layer
- Contains: Stockfish loader (WASM vs native selection), UCI protocol implementation, engine initialization
- Key files: `stockfish-engine.ts` (main engine class), `stockfish-loader.ts` (platform selection)

**src/frontend/:**
- Purpose: All user interface logic and Neutralino.js integration
- Contains: Game modes, board interaction, UI components, game flow orchestration
- Key files: `index.ts` (entry), `websocket-ipc-client.ts` (IPC), mode managers

**src/frontend/board/:**
- Purpose: Chess board rendering and user interaction
- Contains: Board SVG generation, square rendering, piece positioning, drag-and-drop handling, highlight system
- Key files: `board-renderer.ts` (SVG render), `board-events.ts` (drag/drop), `board-highlights.ts` (legal moves)

**src/frontend/game/:**
- Purpose: Game state execution and control flow
- Contains: Move execution, undo/redo, bot integration, guidance requests, game analysis triggers
- Key files: `game-controller.ts` (move execution), `bot-integration.ts` (bot move requests), `guidance-controller.ts` (move guidance)

**src/frontend/modes/:**
- Purpose: Game mode orchestration and selection
- Contains: Training/exam/sandbox mode initialization and transitions
- Key files: `mode-controller.ts` (mode selection UI)

**src/frontend/ui/:**
- Purpose: DOM element updates for game state changes
- Contains: Turn indicator, move history, captured pieces, game status alerts, promotion dialogs
- Key files: Separate module per UI element (turn-indicator.ts, move-history.ts, etc.)

**src/frontend/components/:**
- Purpose: Reusable UI component abstractions
- Contains: Modal dialogs, control toolbar, collapsible sections, explanation modals
- Pattern: Class-based with DOM manipulation, event handling, show/hide logic

**src/frontend/styles/:**
- Purpose: CSS stylesheets for all UI
- Contains: Main stylesheet, component-specific styles
- Key files: `index.css` (main), `components/` subdirectory for component styles

**src/frontend/analysis/:**
- Purpose: Post-game analysis UI and visualization
- Contains: Analysis controller, component library (board renderer, evaluation graph, move list, recommendations)
- Key files: `analysis-controller.ts` (orchestration), `components/` (individual analysis elements)

**src/frontend/helpers/:**
- Purpose: Frontend utility functions
- Contains: Sound effect helpers, UI constants (colors, sizing, timeouts)

**src/shared/:**
- Purpose: Type definitions and logic shared between frontend and backend
- Contains: Chess.js wrapper (ChessGame), engine types, bot configuration, game mode types, IPC contracts
- Pattern: Pure types and constants, no imports from frontend or backend
- Key files: `chess-logic.ts` (game state wrapper), `ipc-types.ts` (RPC contracts), `*-types.ts` (domain types)

**tests/:**
- Purpose: Unit and integration tests
- Contains: Test files organized by module, setup configuration, test utilities
- Patterns: Bun test framework, describe/test blocks, happy-dom for DOM testing

**.planning/codebase/:**
- Purpose: GSD agent documentation
- Contains: Architecture, structure, conventions, testing patterns, concerns

## Key File Locations

**Entry Points:**
- `index.html`: Neutralino window definition (loads `src/frontend/index.ts`)
- `src/backend/index.ts`: Backend entry point (Bun process, WebSocket server, handler registration)
- `src/frontend/index.ts`: Frontend entry point (Neutralino init, game initialization)

**Configuration:**
- `package.json`: Dependencies, scripts, project metadata
- `tsconfig.json`: TypeScript strict mode configuration
- `vite.config.ts`: Frontend bundling (entry: index.html)
- `neutralino.config.json`: Neutralino app settings (window size, icon, title)
- `eslint.config.mjs`: Code linting rules
- `.config/.prettierrc.json`: Code formatting settings

**Core Logic:**
- `src/shared/chess-logic.ts`: Game board state (ChessGame class wrapping chess.js)
- `src/engine/stockfish-engine.ts`: Engine interface (evaluation, analysis)
- `src/backend/ai-opponent.ts`: Bot personality system (personality selection, skill levels)
- `src/backend/analysis-pipeline.ts`: Post-game move classification
- `src/backend/data-storage.ts`: Game/profile persistence to disk
- `src/frontend/game/game-controller.ts`: Move validation and execution

**IPC Contracts:**
- `src/shared/ipc-types.ts`: Frontend-visible RPC method types
- `src/backend/handlers/ipc-types.ts`: Backend RPC response types
- `src/frontend/websocket-ipc-client.ts`: IPC client implementation

**Game Modes:**
- `src/frontend/training-mode.ts`: Training game mode (vs configurable bot)
- `src/frontend/exam-mode.ts`: Exam mode (timed, no guidance, recorded)
- `src/frontend/sandbox-mode.ts`: Sandbox mode (board setup, position analysis)

**Testing:**
- `tests/setup.ts`: Test environment initialization
- `tests/unit/`: Unit tests for individual functions
- `tests/integration/`: Integration tests for game flow

## Naming Conventions

**Files:**
- Lowercase with hyphens: `board-renderer.ts`, `game-controller.ts`, `move-guidance.ts`
- Exceptions:
  - React/component classes: Capitalize first letter (if added in future)
  - Manual test files: Suffix with `-manual-test.ts` (e.g., `stockfish-manual-test.ts`)
- Constants files: Suffix with `-constants.ts` (e.g., `chess-constants.ts`)
- Type definition files: Suffix with `-types.ts` (e.g., `engine-types.ts`)

**Directories:**
- Lowercase plural for feature groupings: `handlers/`, `components/`, `styles/`
- Lowercase singular for layers: `backend/`, `frontend/`, `engine/`, `shared/`

**Functions:**
- Camel case: `executeMove()`, `requestBotMove()`, `createEngineHandlers()`
- Handlers: Factory pattern `create<Feature>Handlers()` returning object with method handlers
- Async operations: Declared `async` with return type `Promise<T>`

**Types:**
- Pascal case: `BestMove`, `StockfishEngine`, `AIOpponent`, `GameController`
- Request/response types: Suffix `Request`, `Response`, or combined in handler IPC types
- Enums/unions: Pascal case, descriptive: `GameMode = 'training' | 'exam' | 'sandbox'`

**Constants:**
- Uppercase with underscores: `STARTPOS_FEN`, `MAX_DEPTH`, `DEFAULT_BOT_ELO`
- Config objects: Pascal case: `DEFAULT_TRAINING_SETTINGS`

## Where to Add New Code

**New Feature (Complete Game Mode):**
- Mode logic: `src/frontend/<mode-name>.ts` (manager class)
- Game flow: `src/frontend/game/<mode>-controller.ts` (if complex)
- UI components: `src/frontend/components/` (reusable parts)
- Tests: `tests/integration/<mode>-mode.test.ts`

**New Game Component/Module:**
- Implementation: `src/frontend/<feature>/` directory
- Index barrel export: `src/frontend/<feature>/index.ts`
- Tests: `tests/unit/<feature>.test.ts`

**New Backend Service:**
- Service class: `src/backend/<service-name>.ts`
- Handler wrapper: `src/backend/handlers/<service>-handlers.ts`
- Handler factory: Export `create<Service>Handlers()` function
- Register in: `src/backend/index.ts` wsServer.registerMethod calls (line ~160+)
- Tests: `tests/integration/backend/<service>.test.ts`

**New Shared Type:**
- Type definition: `src/shared/<domain>-types.ts` (group by domain)
- Constants: `src/shared/<domain>-constants.ts`
- Validation: Add to `src/shared/type-guards.ts`

**Utilities:**
- Frontend helpers: `src/frontend/helpers/<utility>.ts`
- Backend helpers: `src/backend/helpers/<utility>.ts`
- Shared utilities: `src/shared/<utility>.ts`

**Styles:**
- Component styles: `src/frontend/styles/components/<component>.css`
- Layout/theme: `src/frontend/styles/index.css`

## Special Directories

**app/assets/:**
- Purpose: Game resource files (copied to public/ during build)
- Generated: No (manually maintained)
- Committed: Yes
- Contents: Chess piece SVGs, board icons, sound files (MP3), cursor icons
- Structure:
  - `pieces/`: Chess piece images by color and type
  - `icons/`: App and UI icons
  - `sounds/`: Move, capture, check, checkmate audio files

**build/:**
- Purpose: Compiled executables and installers
- Generated: Yes (by build scripts: `scripts/build-windows.ts`, etc.)
- Committed: No (in .gitignore)
- Platforms: Windows x64, Linux x64, macOS universal

**dist/:**
- Purpose: Vite transpiled frontend assets
- Generated: Yes (by `bun run build`)
- Committed: No (in .gitignore)
- Contents: JS bundles, CSS bundles, HTML

**tests/fixtures/:**
- Purpose: Test data (game files, FEN strings, bot configs)
- Generated: No (manually maintained)
- Committed: Yes
- Pattern: Per-feature fixture directories with JSON game data

**.planning/codebase/:**
- Purpose: GSD agent documentation (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (reference for future development)

**localonly/:**
- Purpose: Development-only files (local config, test games, debug outputs)
- Generated: Yes (during development)
- Committed: No (in .gitignore)

