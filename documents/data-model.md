# Data Model and Storage

**Version:** 1.1.0
**Last Updated:** 2026-01-08

This document describes Chess-Sensei's data structures, storage implementation,
and persistence mechanisms.

---

## Table of Contents

1. [Storage Overview](#storage-overview)
2. [Storage Location](#storage-location)
3. [Data Schemas](#data-schemas)
4. [Storage Implementation](#storage-implementation)
5. [Backup System](#backup-system)
6. [Data Migration](#data-migration)
7. [Performance Characteristics](#performance-characteristics)

---

## Storage Overview

Chess-Sensei uses a **JSON-based file storage** system with the following
characteristics:

- **Format:** JSON files for structured data
- **Atomic Writes:** All writes are atomic to prevent corruption
- **Automatic Backups:** Configurable automatic backup system
- **Export/Import:** Full data portability via PGN and JSON formats
- **No Database:** Simple file-based persistence (no SQL or NoSQL)

### Storage Architecture

```text
%APPDATA%/Chess-Sensei/
├── games/                      # Game records and analysis
│   ├── {gameId}.json           # Individual game records
│   └── {gameId}-analysis.json  # Game analysis data
├── profile.json                # Player profile and metrics
├── achievements.json           # Achievement status
├── backups/                    # Automatic backups
│   └── auto-{timestamp}.zip    # Backup archives
└── exports/                    # User exports
    ├── games/                  # Exported PGN files
    └── profiles/               # Exported profile JSON
```

---

## Storage Location

Chess-Sensei stores all user data in platform-specific directories:

| Platform | Path                                                  |
| -------- | ----------------------------------------------------- |
| Windows  | `%APPDATA%\Chess-Sensei\`                             |
|          | Example: `C:\Users\YourName\AppData\Roaming\Chess-Sensei\` |
| macOS    | `~/Library/Application Support/Chess-Sensei/`         |
| Linux    | `~/.config/Chess-Sensei/`                             |

### Getting Storage Path

You can retrieve the storage path programmatically:

```typescript
const result = await ipcClient.call('chess:getStoragePath');
console.log('Storage location:', result.path);
```

---

## Data Schemas

### Game Record

Complete record of a finished game.

```typescript
interface GameRecord {
  gameId: string;              // Unique identifier (UUID)
  metadata: {
    date: string;              // ISO 8601 timestamp
    mode: 'training' | 'exam' | 'sandbox';
    result: '1-0' | '0-1' | '1/2-1/2';
    termination: 'checkmate' | 'resignation' | 'draw' | 'stalemate';
    playerColor: 'white' | 'black';
    duration: number;          // Game duration in seconds
    totalMoves: number;        // Total half-moves
    botConfig?: {
      personality: string;
      elo: number;
      mode: string;
    };
    opening?: string;          // Opening name (e.g., "Sicilian Defense")
  };
  moves: Array<{
    moveNumber: number;        // Full move number (1, 2, 3, ...)
    white?: {
      san: string;             // Standard Algebraic Notation (e.g., "e4")
      uci: string;             // UCI notation (e.g., "e2e4")
      fen: string;             // Position after move
    };
    black?: {
      san: string;
      uci: string;
      fen: string;
    };
  }>;
  pgn: string;                 // Complete PGN notation
}
```

**Example:**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "date": "2026-01-08T14:30:00.000Z",
    "mode": "training",
    "result": "1-0",
    "termination": "checkmate",
    "playerColor": "white",
    "duration": 1245,
    "totalMoves": 42,
    "botConfig": {
      "personality": "sensei",
      "elo": 1500,
      "mode": "training"
    },
    "opening": "Sicilian Defense"
  },
  "moves": [
    {
      "moveNumber": 1,
      "white": {
        "san": "e4",
        "uci": "e2e4",
        "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
      },
      "black": {
        "san": "c5",
        "uci": "c7c5",
        "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"
      }
    }
  ],
  "pgn": "[Event \"Chess-Sensei Training Game\"]..."
}
```

---

### Game Analysis

Detailed analysis of each move in a game.

```typescript
interface GameAnalysis {
  gameId: string;              // Links to GameRecord
  analysisDate: string;        // ISO 8601 timestamp
  moves: Array<{
    moveNumber: number;
    san: string;
    uci: string;
    fen: string;
    evaluationBefore: {
      score: number;           // Centipawns (positive = white advantage)
      type: 'cp' | 'mate';
      mate?: number;           // Moves to mate (if mate found)
      bestMove: string;        // UCI best move
    };
    evaluationAfter: {
      score: number;
      type: 'cp' | 'mate';
      mate?: number;
      bestMove: string;
    };
    cpl: number;               // Centipawn Loss (quality metric)
    classification: 'brilliant' | 'good' | 'ok' | 'inaccuracy' | 'mistake' | 'blunder';
    alternatives: Array<{
      move: string;            // UCI move
      score: number;
      pv: string[];            // Principal variation
    }>;
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

**Move Classifications:**

| Classification | CPL Range    | Description                                  |
| -------------- | ------------ | -------------------------------------------- |
| Brilliant      | 0 (special)  | Exceptional move, often sacrificial         |
| Good           | 0-10         | Strong move, minimal loss                   |
| OK             | 10-25        | Reasonable move                             |
| Inaccuracy     | 25-100       | Suboptimal but not critical                 |
| Mistake        | 100-300      | Significant error                           |
| Blunder        | 300+         | Severe error, potentially game-losing       |

**Example:**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "analysisDate": "2026-01-08T14:55:00.000Z",
  "moves": [
    {
      "moveNumber": 1,
      "san": "e4",
      "uci": "e2e4",
      "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "evaluationBefore": {
        "score": 20,
        "type": "cp",
        "bestMove": "e2e4"
      },
      "evaluationAfter": {
        "score": 25,
        "type": "cp",
        "bestMove": "c7c5"
      },
      "cpl": 0,
      "classification": "good",
      "alternatives": []
    }
  ],
  "summary": {
    "totalMoves": 42,
    "brilliantMoves": 2,
    "goodMoves": 28,
    "inaccuracies": 8,
    "mistakes": 3,
    "blunders": 1,
    "averageCPL": 45.3
  }
}
```

---

### Player Profile

Player statistics and skill metrics.

```typescript
interface PlayerProfile {
  playerId: string;            // Unique player identifier
  createdAt: string;           // ISO 8601 timestamp
  lastUpdated: string;         // ISO 8601 timestamp
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  metrics: {
    tacticalVision: number;          // 0-100
    positionalUnderstanding: number; // 0-100
    endgameTechnique: number;        // 0-100
    openingPreparation: number;      // 0-100
    timeManagement: number;          // 0-100
    calculationDepth: number;        // 0-100
    decisionAccuracy: number;        // 0-100
    blunderAvoidance: number;        // 0-100
    consistency: number;             // 0-100
  };
  recentGames: string[];       // Array of gameIds (most recent first)
  achievements: string[];      // Array of unlocked achievement IDs
}
```

**Metrics Explanation:**

| Metric                      | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| Tactical Vision             | Ability to spot tactical opportunities                       |
| Positional Understanding    | Strategic play and long-term planning                        |
| Endgame Technique           | Performance in endgame positions                             |
| Opening Preparation         | Knowledge and accuracy in opening phase                      |
| Time Management             | Efficiency of move selection                                 |
| Calculation Depth           | Ability to calculate long variations                         |
| Decision Accuracy           | Overall quality of move choices                              |
| Blunder Avoidance           | Consistency in avoiding major errors                         |
| Consistency                 | Stability of performance across games                        |

**Example:**

```json
{
  "playerId": "player-001",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastUpdated": "2026-01-08T14:55:00.000Z",
  "totalGames": 25,
  "wins": 12,
  "losses": 10,
  "draws": 3,
  "metrics": {
    "tacticalVision": 72,
    "positionalUnderstanding": 65,
    "endgameTechnique": 58,
    "openingPreparation": 68,
    "timeManagement": 75,
    "calculationDepth": 70,
    "decisionAccuracy": 73,
    "blunderAvoidance": 80,
    "consistency": 69
  },
  "recentGames": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ],
  "achievements": [
    "first-win",
    "tactical-master",
    "endgame-expert"
  ]
}
```

---

### Achievement

Achievement definition and unlock status.

```typescript
interface Achievement {
  id: string;                  // Unique achievement ID
  name: string;                // Display name
  description: string;         // Achievement description
  icon: string;                // Icon identifier
  unlockedAt?: string;         // ISO 8601 timestamp (if unlocked)
  progress?: {
    current: number;           // Current progress
    target: number;            // Target for unlock
  };
}
```

**Example:**

```json
{
  "id": "first-win",
  "name": "First Victory",
  "description": "Win your first game",
  "icon": "trophy",
  "unlockedAt": "2026-01-05T12:30:00.000Z"
}
```

---

## Storage Implementation

### Atomic Write Pattern

All file writes use an atomic pattern to prevent data corruption:

1. Write to temporary file (`.tmp` extension)
2. Verify write success
3. Rename temporary file to target filename
4. Delete temporary file on failure

**Implementation:**

```typescript
async function atomicWrite(path: string, data: any): Promise<void> {
  const tempPath = `${path}.tmp`;

  try {
    // Write to temporary file
    await Bun.write(tempPath, JSON.stringify(data, null, 2));

    // Verify write
    const written = await Bun.file(tempPath).text();
    const parsed = JSON.parse(written);

    // Rename to target
    await fs.rename(tempPath, path);
  } catch (error) {
    // Clean up on failure
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}
```

### File Format

All JSON files use:
- **Encoding:** UTF-8
- **Indentation:** 2 spaces
- **Line Endings:** LF (Unix-style)

### Directory Creation

Storage directories are created automatically on first use:

```typescript
await ipcClient.call('chess:initializeStorage');
// Creates all required directories
```

---

## Backup System

### Automatic Backups

Chess-Sensei can automatically create backups based on:
- Game count threshold (e.g., every 10 games)
- Time interval (e.g., daily, weekly)
- Manual trigger

### Backup Format

Backups are ZIP archives containing:
- All game records (`games/*.json`)
- Player profile (`profile.json`)
- Achievements (`achievements.json`)
- Metadata file (`backup-manifest.json`)

**Manifest Example:**

```json
{
  "backupDate": "2026-01-08T15:00:00.000Z",
  "appVersion": "1.1.0",
  "gameCount": 25,
  "totalSize": 1024576
}
```

### Backup Management

```typescript
// Create manual backup
await ipcClient.call('chess:exportBackup');

// List backups
const { backups } = await ipcClient.call('chess:listBackups');

// Verify backup
await ipcClient.call('chess:verifyBackup', { backupPath: 'path/to/backup.zip' });
```

### Backup Retention

- Maximum backups retained: Configurable (default: 10)
- Oldest backups deleted automatically
- Manual backups never auto-deleted

---

## Data Migration

### Version Tracking

Each data file includes a version field for migration tracking:

```json
{
  "dataVersion": "1.1.0",
  "data": { /* actual data */ }
}
```

### Migration Strategy

**Current Version:** 1.1.0 (no migrations yet, first stable release)

**Future migrations will:**
1. Detect data version on load
2. Apply migrations sequentially (1.0.0 → 1.1.0 → 1.2.0)
3. Create backup before migration
4. Update version number after success
5. Rollback on failure

**Example Migration:**

```typescript
async function migrateFrom_1_0_to_1_1(data: any): Promise<any> {
  // Add new fields
  data.metadata.opening = identifyOpening(data.moves);

  // Update version
  data.dataVersion = '1.1.0';

  return data;
}
```

---

## Performance Characteristics

### Operation Times

| Operation           | Typical Time | Notes                                   |
| ------------------- | ------------ | --------------------------------------- |
| Save game           | <50ms        | Atomic write with verification          |
| Load game           | <100ms       | JSON parse                              |
| Load profile        | <100ms       | JSON parse                              |
| Save profile        | <50ms        | Atomic write                            |
| Create backup       | 1-5s         | ZIP compression, size-dependent         |
| Export PGN (single) | <100ms       | String formatting                       |
| Export PGN (all)    | 500ms-2s     | Multiple file writes, game count dependent |

### Storage Size Estimates

| Data Type          | Per Item Size | Notes                                |
| ------------------ | ------------- | ------------------------------------ |
| Game record        | ~5-15 KB      | Depends on game length               |
| Game analysis      | ~20-50 KB     | Depends on move count and alternatives |
| Player profile     | ~2-5 KB       | Fixed size                           |
| Backup (25 games)  | ~500 KB-1 MB  | Compressed ZIP                       |

### Disk Space Requirements

- **Minimal:** ~10 MB (app data + initial games)
- **Typical:** ~50-100 MB (100 games with analysis)
- **Heavy Use:** ~200-500 MB (500+ games with analysis)

---

## Export Formats

### PGN Export

Standard Portable Game Notation format:

```pgn
[Event "Chess-Sensei Training Game"]
[Site "Chess-Sensei v1.1.0"]
[Date "2026.01.08"]
[Round "?"]
[White "Player"]
[Black "Sensei Bot (1500)"]
[Result "1-0"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]
[PlyCount "83"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0
```

### JSON Export

Complete data export including:
- All game records
- All analysis data
- Player profile
- Achievements

```typescript
{
  "exportDate": "2026-01-08T15:00:00.000Z",
  "appVersion": "1.1.0",
  "profile": { /* PlayerProfile */ },
  "games": [ /* Array of GameRecord */ ],
  "analyses": [ /* Array of GameAnalysis */ ],
  "achievements": [ /* Array of Achievement */ ]
}
```

---

## Data Privacy

### Local Storage Only

- ✅ All data stored locally
- ✅ No cloud synchronization
- ✅ No telemetry or analytics
- ✅ User controls all exports

### No Personal Information

- No user accounts
- No email addresses
- No passwords
- No payment information
- No tracking identifiers

### User Data Control

Users can:
- Export all data at any time
- Import data from backups
- Delete all data (delete storage directory)
- Transfer data between computers (via export/import)

---

## Troubleshooting

### Storage Initialization Failed

**Symptoms:** Cannot save games or profiles

**Solution:**
1. Verify disk space available (100+ MB recommended)
2. Check directory permissions
3. Call `chess:initializeStorage` manually
4. Check logs for specific errors

### Data Corruption

**Symptoms:** Cannot load game or profile

**Solution:**
1. Check for `.tmp` files in storage directory
2. Restore from recent backup
3. Delete corrupted file and recreate

### Backup Creation Failed

**Symptoms:** Backup operation returns error

**Solution:**
1. Verify disk space for backup size
2. Check exports directory permissions
3. Verify source files are readable
4. Check logs for ZIP errors

---

## See Also

- [API Reference](api-reference.md) - IPC methods for storage operations
- [Data Management](data-management.md) - User guide for export/import
- [Troubleshooting](troubleshooting.md) - Common storage issues

---

**Storage Version:** 1.1.0
**Format:** JSON with atomic writes
**Backup:** ZIP archives with manifest
