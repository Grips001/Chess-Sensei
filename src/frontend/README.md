# Frontend

UI components and Neutralino window code.

## Structure

| File                      | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `index.ts`                | Main entry point, board rendering, game flow |
| `training-mode.ts`        | Training Mode UI with move guidance          |
| `exam-mode.ts`            | Exam Mode UI with game recording             |
| `sandbox-mode.ts`         | Board editor and position analysis           |
| `analysis-ui.ts`          | Post-game analysis interface                 |
| `progress-dashboard.ts`   | Player progress and achievements             |
| `data-management.ts`      | Export/import/backup UI                      |
| `move-guidance.ts`        | Real-time best-move highlighting             |
| `sound-manager.ts`        | Audio feedback for moves and events          |
| `native-menu.ts`          | Application menu system                      |
| `websocket-ipc-client.ts` | WebSocket IPC client                         |
| `clipboard-utils.ts`      | Copy to clipboard functionality              |
| `print-utils.ts`          | Print functionality                          |
| `frontend-logger.ts`      | Frontend logging                             |
| `helpers/`                | UI helper utilities                          |
| `styles/`                 | CSS design system                            |

## Technology

- **Framework:** Neutralino.js 6.4.0
- **Language:** Vanilla TypeScript
- **Build:** Vite
- **IPC:** WebSocket client connecting to port 9339
