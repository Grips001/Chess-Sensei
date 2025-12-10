# Backend

Bun-powered backend services and game logic.

## Structure

| File                    | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `index.ts`              | Main entry point, WebSocket server, IPC handlers |
| `ai-opponent.ts`        | Bot personality logic and move selection         |
| `analysis-pipeline.ts`  | Post-game move analysis and classification       |
| `metrics-calculator.ts` | Composite score calculations (9 dimensions)      |
| `data-storage.ts`       | JSON file persistence for games and profiles     |
| `export-import.ts`      | Export/import functionality and backup system    |
| `file-logger.ts`        | Structured logging to file                       |
| `websocket-server.ts`   | WebSocket IPC server implementation              |
| `helpers/`              | Error handling and response utilities            |

## Technology

- **Runtime:** Bun 1.3.4
- **IPC:** WebSocket server on port 9339
- **Storage:** JSON files in platform-specific user data directory
- **Type Safety:** Full TypeScript with strict mode
