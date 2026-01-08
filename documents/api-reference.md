# Chess-Sensei IPC API Reference

**Version:** 1.1.0 **Last Updated:** 2026-01-08 **Protocol:** WebSocket RPC
(Port 9339)

This document provides a complete reference for all IPC methods available in
Chess-Sensei's WebSocket-based communication protocol.

---

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Engine Methods](#engine-methods)
4. [Bot Methods](#bot-methods)
5. [Analysis Methods](#analysis-methods)
6. [Storage Methods](#storage-methods)
7. [Profile Methods](#profile-methods)
8. [Export/Import Methods](#exportimport-methods)
9. [Backup Methods](#backup-methods)
10. [Logging Methods](#logging-methods)
11. [Error Handling](#error-handling)
12. [Type Definitions](#type-definitions)

---

## Overview

Chess-Sensei uses a WebSocket-based IPC (Inter-Process Communication) system for
all frontend-backend communication. The backend runs a WebSocket server on port
**9339**, and the frontend connects as a client.

### Message Format

**Request:**

```typescript
{
  id: number,           // Unique request ID
  method: string,       // IPC method name (e.g., "chess:requestBestMoves")
  params: object        // Method parameters
}
```

**Response (Success):**

```typescript
{
  id: number,           // Matching request ID
  result: object        // Method result
}
```

**Response (Error):**

```typescript
{
  id: number,           // Matching request ID
  error: {
    code: string,       // Error code
    message: string,    // Human-readable message
    details?: object    // Additional context
  }
}
```

---

## Connection

### WebSocket URL

```text
ws://localhost:9339
```

### Connection Example

```typescript
const ws = new WebSocket('ws://localhost:9339');

ws.onopen = () => {
  console.log('Connected to backend');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle response
};
```

---

## Engine Methods

### chess:sayHello

Test IPC connection.

**Parameters:**

```typescript
{
  message: string; // Test message
}
```

**Response:**

```typescript
{
  reply: string; // Echo response
}
```

**Example:**

```typescript
await ipcClient.call('chess:sayHello', { message: 'Hello' });
// Returns: { reply: 'Hello from backend!' }
```

---

### chess:startNewGame

Initialize the chess engine for a new game.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
await ipcClient.call('chess:startNewGame');
// Returns: { success: true }
```

---

### chess:requestBestMoves

Get the top N best moves from the engine using Multi-PV analysis.

**Parameters:**

```typescript
{
  fen: string,          // Position in FEN notation
  depth: number,        // Search depth (8-20 recommended)
  count: number         // Number of moves to return (1-5)
}
```

**Response:**

```typescript
{
  moves: Array<{
    move: string; // UCI move (e.g., "e2e4")
    score: number; // Evaluation in centipawns
    pv: string[]; // Principal variation
    mate?: number; // Moves to mate (if applicable)
  }>;
}
```

**Example:**

```typescript
await ipcClient.call('chess:requestBestMoves', {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  depth: 15,
  count: 3,
});
// Returns top 3 moves with evaluations
```

---

### chess:evaluatePosition

Get position evaluation from the engine.

**Parameters:**

```typescript
{
  fen: string,          // Position in FEN notation
  depth: number         // Search depth (12-20 recommended)
}
```

**Response:**

```typescript
{
  evaluation: {
    score: number,      // Centipawns (positive = white advantage)
    type: 'cp' | 'mate',
    mate?: number,      // Moves to mate (if applicable)
    bestMove: string    // UCI best move
  },
  formattedScore: string  // Human-readable (e.g., "+1.5", "M3")
}
```

**Example:**

```typescript
await ipcClient.call('chess:evaluatePosition', {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  depth: 18,
});
// Returns: { evaluation: { score: 25, type: 'cp', bestMove: 'e7e5' }, formattedScore: '+0.25' }
```

---

### chess:analyzeMove

Analyze a single move to determine its quality.

**Parameters:**

```typescript
{
  fen: string,          // Position before the move
  playedMove: string,   // UCI move that was played
  depth: number         // Search depth (15-20 recommended)
}
```

**Response:**

```typescript
{
  cpl: number,          // Centipawn loss (0 = best move)
  classification: 'brilliant' | 'good' | 'ok' | 'inaccuracy' | 'mistake' | 'blunder',
  evaluationBefore: {
    score: number,
    type: 'cp' | 'mate',
    mate?: number,
    bestMove: string
  },
  evaluationAfter: {
    score: number,
    type: 'cp' | 'mate',
    mate?: number,
    bestMove: string
  }
}
```

**Example:**

```typescript
await ipcClient.call('chess:analyzeMove', {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playedMove: 'e2e4',
  depth: 18,
});
// Returns move quality analysis
```

---

### chess:getGuidanceMoves

Get top 3 moves for real-time guidance (optimized for Training Mode).

**Parameters:**

```typescript
{
  fen: string,          // Current position
  depth: number         // Search depth (12 recommended)
}
```

**Response:**

```typescript
{
  moves: Array<{
    move: string; // UCI move
    score: number; // Evaluation
    pv: string[]; // Principal variation
    color: 'blue' | 'green' | 'yellow'; // Guidance color
  }>;
}
```

**Example:**

```typescript
await ipcClient.call('chess:getGuidanceMoves', {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  depth: 12,
});
// Returns: { moves: [{ move: 'e7e5', score: 30, color: 'blue' }, ...] }
```

---

### chess:setSkillLevel

Adjust engine playing strength.

**Parameters:**

```typescript
{
  level: number; // Skill level (0-20, where 20 = max strength)
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
await ipcClient.call('chess:setSkillLevel', { level: 10 });
// Sets engine to intermediate strength
```

---

### chess:getEngineStatus

Check engine initialization status.

**Parameters:** None

**Response:**

```typescript
{
  initialized: boolean;
}
```

---

## Bot Methods

### chess:configureBot

Configure AI opponent personality and difficulty.

**Parameters:**

```typescript
{
  personality: 'sensei' | 'student' | 'club-player' | 'tactician' | 'blunder-prone',
  elo: number,          // Target Elo rating (800-2400)
  mode: 'training' | 'punishing'
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
await ipcClient.call('chess:configureBot', {
  personality: 'sensei',
  elo: 1500,
  mode: 'training',
});
```

---

### chess:getBotMove

Request AI opponent move.

**Parameters:**

```typescript
{
  fen: string; // Current position
}
```

**Response:**

```typescript
{
  move: string; // UCI move
}
```

**Example:**

```typescript
await ipcClient.call('chess:getBotMove', {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
});
// Returns: { move: 'e7e5' }
```

---

### chess:getBotProfiles

Get list of available bot personalities.

**Parameters:** None

**Response:**

```typescript
{
  profiles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

---

### chess:getCurrentBotConfig

Get current bot configuration.

**Parameters:** None

**Response:**

```typescript
{
  personality: string,
  elo: number,
  mode: string
}
```

---

### chess:getDifficultyPresets

Get available difficulty presets.

**Parameters:** None

**Response:**

```typescript
{
  presets: Array<{
    name: string;
    elo: number;
    description: string;
  }>;
}
```

---

## Analysis Methods

### chess:analyzeGame

Batch-analyze all moves in a completed game.

**Parameters:**

```typescript
{
  gameId: string,       // Unique game identifier
  moves: Array<{
    moveNumber: number,
    white?: { san: string, uci: string, fen: string },
    black?: { san: string, uci: string, fen: string }
  }>
}
```

**Response:**

```typescript
{
  analysis: {
    moves: Array<{
      moveNumber: number,
      san: string,
      uci: string,
      fen: string,
      evaluationBefore: Evaluation,
      evaluationAfter: Evaluation,
      cpl: number,
      classification: string,
      alternatives: BestMove[]
    }>,
    summary: {
      totalMoves: number,
      brilliantMoves: number,
      goodMoves: number,
      inaccuracies: number,
      mistakes: number,
      blunders: number,
      averageCPL: number
    }
  }
}
```

**Example:**

```typescript
await ipcClient.call('chess:analyzeGame', {
  gameId: 'game-123',
  moves: [
    /* move list */
  ],
});
// Returns complete game analysis
```

---

### chess:getAnalysisConfig

Get current analysis configuration.

**Parameters:** None

**Response:**

```typescript
{
  depth: number,
  multiPVCount: number
}
```

---

### chess:calculateMetrics

Calculate 9-dimension player metrics from analysis.

**Parameters:**

```typescript
{
  analysis: GameAnalysis,
  gameMetadata: {
    mode: string,
    result: string,
    duration: number
  }
}
```

**Response:**

```typescript
{
  metrics: {
    tacticalVision: number,           // 0-100
    positionalUnderstanding: number,  // 0-100
    endgameTechnique: number,         // 0-100
    openingPreparation: number,       // 0-100
    timeManagement: number,           // 0-100
    calculationDepth: number,         // 0-100
    decisionAccuracy: number,         // 0-100
    blunderAvoidance: number,         // 0-100
    consistency: number               // 0-100
  }
}
```

---

## Storage Methods

### chess:initializeStorage

Initialize storage directories.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean,
  path: string          // Storage directory path
}
```

---

### chess:saveGame

Save a game record to storage.

**Parameters:**

```typescript
{
  gameRecord: {
    gameId: string,
    metadata: {
      date: string,
      mode: string,
      result: string,
      termination: string,
      playerColor: string,
      duration: number,
      totalMoves: number,
      botConfig?: object,
      opening?: string
    },
    moves: Array<Move>,
    pgn: string
  }
}
```

**Response:**

```typescript
{
  success: boolean,
  gameId: string
}
```

---

### chess:saveAnalysis

Save game analysis to storage.

**Parameters:**

```typescript
{
  gameId: string,
  analysis: GameAnalysis
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### chess:getGamesList

Get list of all saved games.

**Parameters:** None

**Response:**

```typescript
{
  games: Array<{
    gameId: string;
    date: string;
    mode: string;
    result: string;
    duration: number;
  }>;
}
```

---

### chess:loadGame

Load a specific game by ID.

**Parameters:**

```typescript
{
  gameId: string;
}
```

**Response:**

```typescript
{
  gameRecord: GameRecord;
}
```

---

### chess:loadAnalysis

Load analysis for a specific game.

**Parameters:**

```typescript
{
  gameId: string;
}
```

**Response:**

```typescript
{
  analysis: GameAnalysis;
}
```

---

### chess:getStoragePath

Get the storage directory path.

**Parameters:** None

**Response:**

```typescript
{
  path: string; // Platform-specific path
}
```

---

## Profile Methods

### chess:loadPlayerProfile

Load player profile and statistics.

**Parameters:** None

**Response:**

```typescript
{
  profile: {
    playerId: string,
    createdAt: string,
    lastUpdated: string,
    totalGames: number,
    wins: number,
    losses: number,
    draws: number,
    metrics: {
      tacticalVision: number,
      positionalUnderstanding: number,
      endgameTechnique: number,
      openingPreparation: number,
      timeManagement: number,
      calculationDepth: number,
      decisionAccuracy: number,
      blunderAvoidance: number,
      consistency: number
    },
    recentGames: string[],
    achievements: string[]
  }
}
```

---

### chess:savePlayerProfile

Save updated player profile.

**Parameters:**

```typescript
{
  profile: PlayerProfile;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### chess:getAchievements

Get list of all achievements with unlock status.

**Parameters:** None

**Response:**

```typescript
{
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: string;
    progress?: {
      current: number;
      target: number;
    };
  }>;
}
```

---

### chess:unlockAchievement

Unlock an achievement.

**Parameters:**

```typescript
{
  achievementId: string;
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

## Export/Import Methods

### chess:exportGame

Export a single game to PGN format.

**Parameters:**

```typescript
{
  gameId: string;
}
```

**Response:**

```typescript
{
  success: boolean,
  path: string,         // Export file path
  pgn: string          // PGN content
}
```

---

### chess:exportAllGames

Export all games to PGN files.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean,
  count: number,        // Number of games exported
  path: string         // Export directory path
}
```

---

### chess:exportProfile

Export player profile to JSON.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean,
  path: string,         // Export file path
  profile: object      // Profile data
}
```

---

### chess:exportBackup

Create a complete backup ZIP archive.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean,
  path: string,         // Backup file path
  size: number         // Backup size in bytes
}
```

---

### chess:importGame

Import a game from PGN format.

**Parameters:**

```typescript
{
  pgn: string; // PGN content
}
```

**Response:**

```typescript
{
  success: boolean,
  gameId: string
}
```

---

### chess:importBatchGames

Import multiple games from PGN.

**Parameters:**

```typescript
{
  pgn: string; // PGN content (multiple games)
}
```

**Response:**

```typescript
{
  success: boolean,
  count: number,        // Number of games imported
  gameIds: string[]    // Imported game IDs
}
```

---

### chess:mergeProfiles

Merge an imported profile with existing profile.

**Parameters:**

```typescript
{
  importedProfile: PlayerProfile,
  mergeStrategy: 'replace' | 'merge' | 'keep-existing'
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### chess:getExportsPath

Get the exports directory path.

**Parameters:** None

**Response:**

```typescript
{
  path: string;
}
```

---

## Backup Methods

### chess:getBackupSettings

Get current backup configuration.

**Parameters:** None

**Response:**

```typescript
{
  autoBackupEnabled: boolean,
  backupFrequency: string,
  maxBackups: number
}
```

---

### chess:saveBackupSettings

Update backup configuration.

**Parameters:**

```typescript
{
  autoBackupEnabled: boolean,
  backupFrequency: string,
  maxBackups: number
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### chess:checkBackupNeeded

Check if a backup is needed based on settings.

**Parameters:** None

**Response:**

```typescript
{
  needed: boolean,
  lastBackup?: string,
  reason?: string
}
```

---

### chess:createAutomaticBackup

Create an automatic backup.

**Parameters:** None

**Response:**

```typescript
{
  success: boolean,
  path: string
}
```

---

### chess:listBackups

List all available backups.

**Parameters:** None

**Response:**

```typescript
{
  backups: Array<{
    filename: string;
    date: string;
    size: number;
    type: 'automatic' | 'manual';
  }>;
}
```

---

### chess:verifyBackup

Verify backup integrity.

**Parameters:**

```typescript
{
  backupPath: string;
}
```

**Response:**

```typescript
{
  valid: boolean,
  errors?: string[]
}
```

---

### chess:getBackupsPath

Get the backups directory path.

**Parameters:** None

**Response:**

```typescript
{
  path: string;
}
```

---

## Logging Methods

### chess:logMessage

Send log message from frontend to backend.

**Parameters:**

```typescript
{
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  module: string,
  message: string,
  data?: object
}
```

**Response:**

```typescript
{
  success: boolean;
}
```

---

### chess:getLogPath

Get the log file path.

**Parameters:** None

**Response:**

```typescript
{
  path: string;
}
```

---

### chess:isLoggingEnabled

Check if logging is enabled.

**Parameters:** None

**Response:**

```typescript
{
  enabled: boolean;
}
```

---

## Error Handling

### Error Codes

| Code                     | Description                       |
| ------------------------ | --------------------------------- |
| `ENGINE_NOT_INITIALIZED` | Engine not ready                  |
| `INVALID_FEN`            | Invalid FEN string                |
| `INVALID_MOVE`           | Invalid UCI move                  |
| `ANALYSIS_FAILED`        | Analysis error                    |
| `STORAGE_ERROR`          | File system error                 |
| `GAME_NOT_FOUND`         | Game ID not found                 |
| `IMPORT_ERROR`           | Import validation failed          |
| `BACKUP_ERROR`           | Backup creation failed            |
| `BOT_NOT_CONFIGURED`     | Bot must be configured before use |
| `INVALID_PARAMETERS`     | Invalid method parameters         |

### Error Response Example

```typescript
{
  id: 123,
  error: {
    code: 'INVALID_FEN',
    message: 'Invalid FEN string: missing king',
    details: {
      fen: 'rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    }
  }
}
```

---

## Type Definitions

### BestMove

```typescript
interface BestMove {
  move: string; // UCI move (e.g., "e2e4")
  score: number; // Evaluation in centipawns
  pv: string[]; // Principal variation
  mate?: number; // Moves to mate (if applicable)
}
```

### Evaluation

```typescript
interface Evaluation {
  score: number; // Centipawns
  type: 'cp' | 'mate';
  mate?: number; // Moves to mate
  bestMove: string; // UCI best move
}
```

### GameRecord

```typescript
interface GameRecord {
  gameId: string;
  metadata: {
    date: string;
    mode: string;
    result: string;
    termination: string;
    playerColor: string;
    duration: number;
    totalMoves: number;
    botConfig?: object;
    opening?: string;
  };
  moves: Array<Move>;
  pgn: string;
}
```

### GameAnalysis

```typescript
interface GameAnalysis {
  moves: Array<{
    moveNumber: number;
    san: string;
    uci: string;
    fen: string;
    evaluationBefore: Evaluation;
    evaluationAfter: Evaluation;
    cpl: number;
    classification: string;
    alternatives: BestMove[];
  }>;
  summary: {
    totalMoves: number;
    brilliantMoves: number;
    goodMoves: number;
    inaccuracies: number;
    mistakes: number;
    blunders: number;
    averageCPL: number;
  };
}
```

### PlayerProfile

```typescript
interface PlayerProfile {
  playerId: string;
  createdAt: string;
  lastUpdated: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  metrics: {
    tacticalVision: number;
    positionalUnderstanding: number;
    endgameTechnique: number;
    openingPreparation: number;
    timeManagement: number;
    calculationDepth: number;
    decisionAccuracy: number;
    blunderAvoidance: number;
    consistency: number;
  };
  recentGames: string[];
  achievements: string[];
}
```

---

## Usage Example

```typescript
import { WebSocketIPCClient } from './websocket-ipc-client';

// Initialize client
const ipcClient = new WebSocketIPCClient('ws://localhost:9339');

// Wait for connection
await ipcClient.connect();

// Start new game
await ipcClient.call('chess:startNewGame');

// Get best moves
const result = await ipcClient.call('chess:requestBestMoves', {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  depth: 15,
  count: 3,
});

console.log('Top 3 moves:', result.moves);

// Configure bot
await ipcClient.call('chess:configureBot', {
  personality: 'sensei',
  elo: 1500,
  mode: 'training',
});

// Get bot move
const botMove = await ipcClient.call('chess:getBotMove', {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
});

console.log('Bot plays:', botMove.move);
```

---

## See Also

- [User Guide](user-guide.md) - Complete feature documentation
- [Engine Integration](engine-integration.md) - Chess engine technical details
- [Data Management](data-management.md) - Export/import procedures
- [Architecture](../.github/process/ARCHITECTURE.md) - System architecture

---

**Total IPC Methods:** 45
