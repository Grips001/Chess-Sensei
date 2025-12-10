# Shared

Shared types, utilities, and constants used across frontend and backend.

## Structure

| File                  | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `chess-logic.ts`      | Chess move validation and game rules               |
| `game-state.ts`       | Game state management types                        |
| `bot-types.ts`        | Bot personality definitions and difficulty presets |
| `engine-types.ts`     | Engine evaluation and analysis types               |
| `ipc-types.ts`        | IPC method definitions and contracts               |
| `logger-types.ts`     | Logging type definitions                           |
| `type-guards.ts`      | Runtime type validation utilities                  |
| `chess-constants.ts`  | Chess-related constants                            |
| `engine-constants.ts` | Engine scoring constants                           |
| `bot-constants.ts`    | Bot parameter constants                            |
| `uci-utils.ts`        | UCI protocol utilities                             |

## Purpose

Code in this directory can be safely imported by both frontend and backend
without creating circular dependencies or platform-specific issues. All types
and utilities here are runtime-agnostic.
