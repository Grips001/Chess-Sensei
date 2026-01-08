# Frontend

UI components and Neutralino window code.

## Structure

### Core Modules

| Directory / File          | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `index.ts`                | Main orchestrator, coordinates modules via DI    |
| `board/`                  | Board rendering and interaction modules          |
| `ui/`                     | UI component modules (indicators, history, etc.) |
| `game/`                   | Game logic modules (controller, bot, guidance)   |
| `modes/`                  | Game mode initialization (Training, Exam)        |
| `analysis/`               | Post-game analysis UI modules                    |
| `components/`             | Reusable UI components                           |
| `training-mode.ts`        | Training Mode UI with move guidance              |
| `exam-mode.ts`            | Exam Mode UI with game recording                 |
| `sandbox-mode.ts`         | Board editor and position analysis               |
| `analysis-ui.ts`          | Post-game analysis factory function              |
| `progress-dashboard.ts`   | Player progress and achievements                 |
| `data-management.ts`      | Export/import/backup UI                          |
| `move-guidance.ts`        | Real-time best-move highlighting                 |
| `sound-manager.ts`        | Audio feedback for moves and events              |
| `native-menu.ts`          | Application menu system                          |
| `websocket-ipc-client.ts` | WebSocket IPC client                             |
| `clipboard-utils.ts`      | Copy to clipboard functionality                  |
| `print-utils.ts`          | Print functionality                              |
| `frontend-logger.ts`      | Frontend logging                                 |
| `helpers/`                | UI helper utilities                              |
| `styles/`                 | CSS design system                                |

### Module Details

#### `board/` - Board Rendering & Interaction

- `board-renderer.ts` - Board rendering, FEN parsing, piece display
- `board-events.ts` - Drag-and-drop, click-to-move handlers
- `board-highlights.ts` - Legal moves, selection, multi-color highlight system

#### `ui/` - UI Components

- `turn-indicator.ts` - Turn display updates
- `move-history.ts` - Move list rendering with collapsible UI
- `captured-pieces.ts` - Material advantage display
- `game-alerts.ts` - Check/checkmate/draw indicators
- `dialogs.ts` - Confirmation and promotion dialogs

#### `game/` - Game Logic Controllers

- `game-controller.ts` - Move execution, undo/redo, game state management
- `bot-integration.ts` - Bot move requests for Training/Exam modes
- `guidance-controller.ts` - Move guidance UI and highlighting
- `save-analyze.ts` - Game saving and analysis pipeline
- `sandbox-controller.ts` - Sandbox mode board editing and analysis

#### `modes/` - Game Mode Initialization

- `mode-controller.ts` - Training and Exam mode game initialization flows

#### `analysis/` - Post-Game Analysis

- `analysis-controller.ts` - Main analysis UI manager (AnalysisUIManager class)
- `components/` - 9 analysis component modules:
  - `board-renderer.ts` - Interactive replay board
  - `evaluation-graph.ts` - Position evaluation visualization
  - `move-list.ts` - Annotated move list with navigation
  - `position-analysis.ts` - Move-by-move analysis panel
  - `summary-panel.ts` - Game summary and statistics
  - `recommendations.ts` - Training recommendations
  - `alternatives-modal.ts` - Mistake deep-dive modal
  - `navigation-controls.ts` - Playback controls
  - `index.ts` - Barrel export

## Technology

- **Framework:** Neutralino.js 6.4.0
- **Language:** Vanilla TypeScript
- **Build:** Vite
- **IPC:** WebSocket client connecting to port 9339
