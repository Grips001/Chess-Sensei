# Architecture

**Analysis Date:** 2026-02-17

## Pattern Overview

**Overall:** Layered Client-Backend Architecture with WebSocket IPC

**Key Characteristics:**
- Three distinct architectural layers: **Frontend (Neutralino.js)**, **Backend (Bun)**, and **Shared Types**
- Asynchronous WebSocket communication on port 9339 for all frontend-backend interactions
- Modular backend services with dependency injection pattern for handler creation
- Game engine (Stockfish) runs in backend process with persistent in-memory state
- Frontend orchestrates UI state and game flow with delegated backend operations

## Layers

**Engine Layer:**
- Purpose: Chess engine operations via Stockfish (UCI protocol)
- Location: `src/engine/`
- Contains: Stockfish loader, engine interface, move evaluation
- Depends on: None (external: stockfish npm package)
- Used by: Backend services (AI opponent, analysis pipeline)

**Backend Service Layer:**
- Purpose: Core business logic for game AI, analysis, data persistence
- Location: `src/backend/`
- Contains: AI opponent, analysis pipeline, metrics calculator, data storage, export/import
- Depends on: Engine layer, shared types
- Used by: IPC handlers, WebSocket server

**Backend Handler Layer:**
- Purpose: RPC method handlers that expose backend functionality to frontend
- Location: `src/backend/handlers/`
- Contains: Engine handlers, bot handlers, analysis handlers, storage handlers, progress handlers, backup handlers, logging handlers
- Depends on: Backend services, shared types, error helpers
- Used by: WebSocket server to register RPC methods

**WebSocket IPC Layer:**
- Purpose: Real-time bidirectional communication between frontend and backend
- Location: `src/backend/websocket-server.ts` and `src/frontend/websocket-ipc-client.ts`
- Contains: RPC method registration/invocation, channel-based pub/sub
- Depends on: Bun native WebSocket (backend), browser WebSocket (frontend)
- Used by: All handler and frontend modules

**Shared Types Layer:**
- Purpose: Type definitions shared between frontend and backend
- Location: `src/shared/`
- Contains: Chess logic (ChessGame), engine types (BestMove, PositionEvaluation), bot types, game state types, IPC contracts
- Depends on: External: chess.js library
- Used by: Frontend and backend modules

**Frontend UI Layer:**
- Purpose: User interface and game interaction orchestration
- Location: `src/frontend/`
- Contains: Game modes (training, exam, sandbox), board renderer, components, guidance system
- Depends on: Shared types, WebSocket IPC client, Neutralino.js
- Used by: User (Neutralino entry point)

## Data Flow

**Game Move Execution (User → Backend → Engine):**

1. User clicks board square (frontend DOM event)
2. `handleDragStart` / `handleDrop` in `src/frontend/board/board-events.ts` capture move
3. `executeMove` in `src/frontend/game/game-controller.ts` validates using local `ChessGame` instance
4. Move recorded in game history, UI updated (board, turn indicator, captured pieces)
5. If bot turn: `requestBotMove` in `src/frontend/game/bot-integration.ts` calls IPC `chess:getBotMove`
6. Backend handler in `src/backend/handlers/bot-handlers.ts` queries `AIOpponent` service
7. `AIOpponent` in `src/backend/ai-opponent.ts` queries Stockfish engine for best move
8. Result returned via WebSocket, frontend plays move

**Position Analysis (User → Backend → Engine → Frontend):**

1. User requests analysis or guidance in frontend module
2. Frontend IPC call to `chess:requestBestMoves` or `chess:analyzeMove`
3. Backend handler in `src/backend/handlers/engine-handlers.ts` calls `StockfishEngine`
4. Engine evaluates position, returns structured analysis (`BestMove[]` or `MoveAnalysis`)
5. Response sent via WebSocket to frontend
6. Frontend renders analysis: highlights best moves, shows evaluation, updates guidance panel

**Game Save & Analysis (End of Game → Backend → Analysis Pipeline → Storage):**

1. Game ends, user clicks "Save & Analyze"
2. Frontend calls `chess:saveGame` via IPC with game data and moves
3. Backend `storageHandlers.saveGame` persists game JSON via `DataStorage` service
4. Frontend calls `chess:analyzeGame` with same game data
5. Backend `analysisHandlers.analyzeGame` runs `AnalysisPipeline`:
   - Re-plays all moves through engine
   - Classifies each move (best, good, dubious, blunder)
   - Calculates position metrics
   - Generates recommendations
6. Analysis results stored and/or sent back to frontend for post-game review

**Game Data Export (Storage → File System):**

1. User requests export (game, profile, or backup)
2. Frontend calls `chess:exportGame`, `chess:exportProfile`, or `chess:exportBackup`
3. Backend `exportImportHandlers` retrieves data from storage and formats
4. `ExportImportManager` service writes to platform-specific export directory (environment-aware)
5. File path returned to frontend for user notification

**State Management:**

**Backend Persistent State:**
- Single `StockfishEngine` instance in memory (`src/backend/index.ts` line 66)
- Single `AIOpponent` instance for bot personalities
- Single `AnalysisPipeline` instance for game analysis
- Single `DataStorage` instance for database access
- Global state accessed via `stateAccessors` object passed to handler creators

**Frontend Ephemeral State:**
- `ChessGame` instance maintains current game board state
- Game mode managers (`TrainingMode`, `ExamMode`, `SandboxMode`) hold mode-specific state
- UI state (board flip, selected square, guidance panel visibility) stored in module scope variables
- Undo/redo stacks maintained per game instance

## Key Abstractions

**ChessGame (Shared):**
- Purpose: Board state representation and move validation
- Examples: `src/shared/chess-logic.ts`
- Pattern: Wrapper around chess.js library with typed move representation

**StockfishEngine:**
- Purpose: UCI engine abstraction for analysis and evaluation
- Examples: `src/engine/stockfish-engine.ts`
- Pattern: Promise-based async interface to synchronous UCI protocol

**AIOpponent:**
- Purpose: Bot personality and skill level management
- Examples: `src/backend/ai-opponent.ts`
- Pattern: Configurable skill profiles with ELO rating, blunder rates, opening books

**AnalysisPipeline:**
- Purpose: Post-game move classification and metrics computation
- Examples: `src/backend/analysis-pipeline.ts`
- Pattern: Sequential move re-play with classification at each ply

**DataStorage:**
- Purpose: Atomic file-based data persistence with schema versioning
- Examples: `src/backend/data-storage.ts`
- Pattern: JSON-based storage with game/profile/achievement separation

**WebSocketServer / WebSocketIPCClient:**
- Purpose: RPC-style method dispatch with channel subscriptions
- Examples: `src/backend/websocket-server.ts`, `src/frontend/websocket-ipc-client.ts`
- Pattern: Request ID tracking with timeout handling, Bun-native for performance

## Entry Points

**Backend Entry Point:**
- Location: `src/backend/index.ts`
- Triggers: Launched by Neutralino (built executable) or manually in dev
- Responsibilities:
  - Logger initialization
  - Stockfish engine initialization
  - Handler creation with dependency injection
  - WebSocket server startup on port 9339
  - Neutralino UI launch (production only)
  - RPC method registration (37 total methods across 8 handler groups)

**Frontend Entry Point:**
- Location: `src/frontend/index.ts`
- Triggers: Loaded by Neutralino via `index.html`
- Responsibilities:
  - Neutralino.js initialization
  - WebSocket IPC client initialization
  - Global state creation (game, sound, managers)
  - Board and UI module initialization
  - Mode selection menu setup
  - Event listener attachment

**Build Entry Point (Vite):**
- Location: `index.html`
- Loads: `src/frontend/index.ts` as main script
- Builds: Frontend assets for Neutralino consumption

## Error Handling

**Strategy:** Typed error responses with specific error codes

**Patterns:**

**Backend RPC Errors:**
- Handler catches exceptions, returns `ErrorResponse` with error code and message
- Helper: `createErrorResponse()` in `src/backend/helpers/error-response.ts`
- Frontend checks `isErrorResponse()` type guard from `src/shared/ipc-types.ts`

**Frontend IPC Call Errors:**
- Promise rejection for timeout or network failures
- Try-catch in frontend modules catches rejections
- User shown error dialog with actionable message

**Engine Errors:**
- Stockfish crashes or timeout → logged, engine re-initialized on next call
- Invalid FEN/move → caught by ChessGame validation before engine call
- UCI protocol errors → logged, error returned to caller

**Data Persistence Errors:**
- File write failures → logged, operation returns error to frontend
- Schema version mismatch → logged, data migration attempted
- Storage path invalid → initialization fails, logged to file and stderr

## Cross-Cutting Concerns

**Logging:**
- Backend: File-based via `src/backend/file-logger.ts` (writes to `logs/` directory)
- Frontend: Memory-based via `src/frontend/frontend-logger.ts` (can export via IPC)
- Shared: Logger types in `src/shared/logger-types.ts`

**Validation:**
- Move validation: `ChessGame.makeMove()` in `src/shared/chess-logic.ts`
- IPC parameters: Type guards in `src/shared/type-guards.ts`
- FEN validation: Chess.js built-in validation
- Bot configuration: Enum checks for personality, difficulty, play mode

**Authentication:**
- Not applicable (desktop application, single user)
- Neutralino handles native window security
- No remote authentication needed

**State Synchronization:**
- WebSocket pub/sub channels for real-time updates (engine analysis, progress)
- Frontend subscribes to channels via `ipcClient.subscribe()` during game
- Backend publishes on channels during long-running operations (analysis)

