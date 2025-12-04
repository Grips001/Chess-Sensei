# Game Persistence & Data Storage

Chess-Sensai stores all game data, player metrics, and analysis results
**locally** on the user's device. This ensures privacy, offline functionality,
and full user control over their chess training data.

## Storage Philosophy

### Core Principles

1. **Privacy First**
   - All data stored locally by default
   - No cloud uploads without explicit user consent
   - No third-party analytics or tracking
   - User owns their data completely

2. **Offline First**
   - Full functionality without internet connection
   - No dependencies on external services
   - Reliable access in any environment

3. **Portability**
   - Standard JSON format for easy export/import
   - Human-readable structure
   - Compatible with external tools
   - Easy migration to new devices

4. **Durability**
   - Automatic backups
   - Corruption detection
   - Data integrity validation
   - Recovery mechanisms

## What Gets Stored

### Data Categories

| Data Type           | Stored?   | Mode(s)  | Format     | Size Estimate       |
| ------------------- | --------- | -------- | ---------- | ------------------- |
| Training Mode Games | No        | Training | -          | -                   |
| Exam Mode Games     | Yes       | Exam     | JSON + PGN | ~5-10 KB per game   |
| Sandbox Positions   | Temporary | Sandbox  | FEN        | Session only        |
| Player Metrics      | Yes       | Exam     | JSON       | ~2-5 KB per game    |
| Analysis Results    | Yes       | Exam     | JSON       | ~10-20 KB per game  |
| User Settings       | Yes       | All      | JSON       | ~1 KB               |
| Game History Index  | Yes       | Exam     | JSON       | ~1 KB per 100 games |

### Storage by Game Mode

#### Training Mode

- **Nothing permanently stored**
- Game state kept in memory during play (for undo/redo)
- Cleared after game ends or app closes
- Rationale: Training Mode is for practice, not evaluation

#### Exam Mode

- **Everything permanently stored**
- Complete game data (moves, times, positions)
- Full engine analysis results
- All calculated metrics
- Critical positions and alternatives
- Rationale: Exam Mode is for measurement and improvement

#### Sandbox Mode

- **Position temporarily stored**
- Current board state kept in memory
- Cleared when exiting Sandbox Mode
- Can manually save interesting positions (optional feature)
- Rationale: Sandbox is an exploration tool, not a game

## Storage Location

### Cross-Platform Paths

Chess-Sensai uses platform-appropriate user data directories:

#### Windows

```text
%APPDATA%\Chess-Sensai\
C:\Users\[username]\AppData\Roaming\Chess-Sensai\
```

#### macOS

```text
~/Library/Application Support/Chess-Sensai/
/Users/[username]/Library/Application Support/Chess-Sensai/
```

#### Linux

```text
~/.local/share/chess-sensai/
/home/[username]/.local/share/chess-sensai/
```

### Directory Structure

```text
Chess-Sensai/
├── games/
│   ├── 2025/
│   │   ├── 01/
│   │   │   ├── game_uuid1.json
│   │   │   ├── game_uuid2.json
│   │   │   └── ...
│   │   ├── 02/
│   │   └── ...
│   └── index.json
├── analysis/
│   ├── game_uuid1_analysis.json
│   ├── game_uuid2_analysis.json
│   └── ...
├── metrics/
│   ├── player_profile.json
│   ├── aggregate_stats.json
│   └── trends.json
├── settings/
│   └── user_settings.json
├── exports/
│   └── [user-created exports]
└── backups/
    └── [automatic backups]
```

### File Organization

- **Games organized by date** (year/month folders)
  - Easy to locate specific time periods
  - Efficient file system performance
  - Simple cleanup of old games if needed

- **Analysis files separate from game files**
  - Analysis can be regenerated if needed
  - Keeps game files clean and small
  - Allows independent backup strategies

- **Metrics aggregated separately**
  - Fast loading of player stats
  - No need to parse all games for trends
  - Incremental updates

## Data Formats

### Game Data Format

Each Exam Mode game is stored as a JSON file.

#### Example: `game_uuid1.json`

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "version": "1.0",
  "timestamp": "2025-03-15T14:32:00Z",
  "mode": "exam",

  "metadata": {
    "playerColor": "white",
    "botPersonality": "Club Player",
    "botElo": 1600,
    "opening": "Ruy Lopez, Berlin Defense",
    "result": "0-1",
    "termination": "checkmate",
    "duration": 1845
  },

  "moves": [
    {
      "moveNumber": 1,
      "white": {
        "move": "e4",
        "san": "e4",
        "uci": "e2e4",
        "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        "timestamp": 1710513130,
        "timeSpent": 5.2
      },
      "black": {
        "move": "e5",
        "san": "e5",
        "uci": "e7e5",
        "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
        "timestamp": 1710513133,
        "timeSpent": 2.8
      }
    },
    {
      "moveNumber": 2,
      "white": {
        "move": "Nf3",
        "san": "Nf3",
        "uci": "g1f3",
        "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
        "timestamp": 1710513138,
        "timeSpent": 3.5
      },
      "black": {
        "move": "Nc6",
        "san": "Nc6",
        "uci": "b8c6",
        "fen": "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        "timestamp": 1710513141,
        "timeSpent": 2.1
      }
    }
  ],

  "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 ... 0-1"
}
```

### Analysis Data Format

Analysis results are stored separately for each game.

#### Example: `game_uuid1_analysis.json`

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "analysisVersion": "1.0",
  "analysisTimestamp": "2025-03-15T16:45:00Z",
  "engineVersion": "Stockfish 16 WASM",

  "summary": {
    "overallAccuracy": 78.5,
    "openingAccuracy": 85.0,
    "middlegameAccuracy": 74.0,
    "endgameAccuracy": 72.0,
    "averageCentipawnLoss": 28,
    "blunders": 2,
    "mistakes": 4,
    "inaccuracies": 8,
    "excellentMoves": 12,
    "goodMoves": 23
  },

  "moveAnalysis": [
    {
      "moveNumber": 1,
      "color": "white",
      "move": "e4",
      "evaluationBefore": 0.0,
      "evaluationAfter": 0.3,
      "centipawnLoss": 0,
      "classification": "excellent",
      "bestMove": "e4",
      "alternativeMoves": [
        { "move": "d4", "evaluation": 0.3 },
        { "move": "Nf3", "evaluation": 0.2 }
      ]
    },
    {
      "moveNumber": 12,
      "color": "white",
      "move": "Bd3",
      "evaluationBefore": 1.2,
      "evaluationAfter": -0.3,
      "centipawnLoss": 150,
      "classification": "mistake",
      "bestMove": "O-O",
      "alternativeMoves": [
        { "move": "O-O", "evaluation": 1.3 },
        { "move": "Qe2", "evaluation": 0.9 }
      ],
      "explanation": "Allows Bxd3 with tempo, losing development advantage"
    }
  ],

  "criticalMoments": [
    {
      "moveNumber": 12,
      "type": "mistake",
      "evaluationSwing": -1.5,
      "description": "Lost advantage with Bd3"
    },
    {
      "moveNumber": 24,
      "type": "blunder",
      "evaluationSwing": -4.3,
      "description": "Decisive mistake, position now lost"
    }
  ],

  "tacticalOpportunities": [
    {
      "moveNumber": 18,
      "type": "missed",
      "tactic": "fork",
      "bestMove": "Nf5+",
      "evaluation": "+2.5",
      "description": "Missed winning knight fork"
    }
  ],

  "gamePhases": {
    "opening": { "start": 1, "end": 12, "accuracy": 85.0 },
    "middlegame": { "start": 13, "end": 35, "accuracy": 74.0 },
    "endgame": { "start": 36, "end": 49, "accuracy": 72.0 }
  }
}
```

### Player Metrics Format

Aggregated player statistics and trends.

#### Example: `player_profile.json`

```json
{
  "profileVersion": "1.0",
  "lastUpdated": "2025-03-15T16:45:00Z",

  "totalGames": 87,
  "gamesAnalyzed": 87,

  "compositeScores": {
    "precision": 72,
    "tacticalDanger": 58,
    "stability": 81,
    "conversion": 65,
    "preparation": 45,
    "positional": 70,
    "aggression": 62,
    "simplification": 55,
    "trainingTransfer": 78
  },

  "overallStats": {
    "averageAccuracy": 74.2,
    "averageCentipawnLoss": 32,
    "blundersPerGame": 1.8,
    "mistakesPerGame": 3.2,
    "inaccuraciesPerGame": 6.5
  },

  "records": {
    "winRate": 0.48,
    "drawRate": 0.21,
    "lossRate": 0.31,
    "longestWinStreak": 7,
    "longestLoseStreak": 4
  },

  "trends": {
    "last10GamesAccuracy": 76.5,
    "last30GamesAccuracy": 74.8,
    "accuracyTrend": "improving",
    "blunderTrend": "decreasing"
  },

  "detailedMetrics": {
    // See tracked-metrics.md for full list
  }
}
```

### Settings Format

User preferences and configuration.

#### Example: `user_settings.json`

```json
{
  "version": "1.0",

  "appearance": {
    "theme": "dark",
    "boardStyle": "neomorphic",
    "pieceSet": "matte-vector-modern",
    "highlightIntensity": 0.8,
    "animationSpeed": "normal"
  },

  "gameplay": {
    "defaultMode": "training",
    "defaultColor": "random",
    "enableSounds": true,
    "enableHaptics": true,
    "confirmMoves": false,
    "showLegalMoves": true
  },

  "analysis": {
    "autoAnalyze": true,
    "analysisDepth": 20,
    "showEvaluationBar": true,
    "showBestMoveArrow": true
  },

  "accessibility": {
    "colorblindMode": "none",
    "largePieceMode": false,
    "textOnlyNotation": false,
    "highContrast": false
  },

  "privacy": {
    "saveTrainingGames": false,
    "allowTelemetry": false,
    "autoBackup": true,
    "backupFrequency": "daily"
  }
}
```

## Data Operations

### Game Save Flow (Exam Mode)

1. **Game Completion**
   - Final game state captured
   - Move list finalized
   - PGN generated

2. **Generate UUID**
   - Unique game ID created
   - Used as filename and reference

3. **Create Game JSON**
   - Game data serialized to JSON
   - All moves and metadata included

4. **Save to Disk**
   - File written to `games/YYYY/MM/game_uuid.json`
   - Atomic write operation (prevents corruption)

5. **Update Index**
   - Game added to `games/index.json`
   - Sorted by date for quick retrieval

6. **Trigger Analysis**
   - Post-game analysis starts asynchronously
   - Results saved to `analysis/game_uuid_analysis.json`

7. **Update Player Metrics**
   - Metrics recalculated with new game
   - `player_profile.json` updated

8. **Backup (if enabled)**
   - Copy saved to `backups/` folder

### Game Load Flow

1. **User Requests Game**
   - From game history list or post-game analysis

2. **Load Game JSON**
   - Read from `games/YYYY/MM/game_uuid.json`
   - Parse JSON

3. **Load Analysis JSON** (if viewing analysis)
   - Read from `analysis/game_uuid_analysis.json`
   - Parse JSON

4. **Reconstruct Board States**
   - Use move list to rebuild positions
   - Or load directly from saved FEN strings

5. **Render UI**
   - Display game replay or analysis interface

### Metrics Update Flow

After each Exam Mode game:

1. **Calculate Game Metrics**
   - All metrics for this game computed from analysis

2. **Load Current Profile**
   - Read `player_profile.json`

3. **Aggregate New Data**
   - Add new game to rolling averages
   - Update trends
   - Recalculate composite scores

4. **Save Updated Profile**
   - Write updated `player_profile.json`
   - Atomic write to prevent corruption

## Import & Export

### Export Functionality

Users can export their data in multiple formats:

#### 1. Export Single Game (PGN)

- **Format:** Standard PGN (Portable Game Notation)
- **Includes:** Move list, annotations, result
- **Use case:** Share game with others, import to other chess software

**Example PGN:**

```text
[Event "Chess-Sensai Exam Mode"]
[Site "Chess-Sensai"]
[Date "2025.03.15"]
[White "Player"]
[Black "Club Player (1600)"]
[Result "0-1"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 ...  0-1
```

#### 2. Export Single Game (JSON)

- **Format:** Complete game + analysis JSON
- **Includes:** All moves, analysis, metrics, positions
- **Use case:** Backup, deep analysis in external tools, re-import to
  Chess-Sensai

#### 3. Export All Games (Batch JSON)

- **Format:** Array of game JSON objects
- **Includes:** All Exam Mode games
- **Use case:** Full backup, migrate to new device

#### 4. Export Player Profile (JSON)

- **Format:** Player metrics and statistics
- **Includes:** Composite scores, trends, all metrics
- **Use case:** Track progress externally, backup stats

#### 5. Export Analysis Report (PDF)

- **Format:** PDF document
- **Includes:** Summary report, graphs, key positions
- **Use case:** Offline review, printing, sharing

### Import Functionality

Users can import previously exported data:

#### 1. Import Single Game (JSON)

- Load a previously exported game JSON file
- Restores game, analysis, and metrics
- Assigned new UUID if duplicate detected

#### 2. Import Game Collection (Batch JSON)

- Load multiple games at once
- Validates each game before import
- Skips duplicates (based on content hash)
- Updates player metrics after import

#### 3. Import from PGN

- Parse standard PGN files
- Creates new game entry
- Triggers analysis (since PGN lacks analysis data)
- Updates metrics

#### 4. Merge Player Profiles

- Combine metrics from two devices
- Useful when using Chess-Sensai on multiple computers
- Conflict resolution: most recent data wins

### Export/Import UI Flow

#### Export

1. Navigate to **Settings > Data Management**
2. Click **"Export Data"**
3. Select export type:
   - Single game
   - All games
   - Player profile
   - Everything (full backup)
4. Choose format (JSON, PGN, PDF)
5. Select destination folder
6. Click **"Export"**
7. Confirmation message with file location

#### Import

1. Navigate to **Settings > Data Management**
2. Click **"Import Data"**
3. Select file(s) to import
4. Preview import (shows what will be added)
5. Confirm import
6. Progress bar during import
7. Summary message (X games imported, Y skipped as duplicates)

## Data Integrity & Validation

### Validation on Load

Every time data is loaded, it is validated:

1. **JSON Schema Validation**
   - Ensure structure matches expected format
   - Detect missing fields or invalid types

2. **Chess Logic Validation**
   - Verify moves are legal
   - Ensure FEN strings are valid
   - Check position integrity

3. **Metric Range Validation**
   - Ensure metrics are within expected ranges
   - Flag anomalies for review

4. **Corruption Detection**
   - Checksum validation
   - Detect truncated files

If validation fails:

- User is warned
- Corrupted file moved to quarantine folder
- Backup restored if available

### Atomic Writes

All file writes use atomic operations:

1. Write to temporary file
2. Verify write succeeded
3. Rename temporary file to target filename (atomic operation)

This prevents corruption from crashes or power loss during writes.

### Backups

Automatic backups (if enabled):

- **Frequency:** Daily, Weekly, or after every game (user choice)
- **Location:** `backups/` folder
- **Retention:** Last 7 daily, last 4 weekly
- **Format:** Full copy of all data
- **Compression:** Optional zip compression to save space

Manual backup:

- Export everything as JSON
- User stores wherever they want (external drive, cloud storage, etc.)

## Performance Considerations

### File System Performance

- **Small files preferred:** Each game is 5-10 KB
  - Fast read/write operations
  - Minimal memory usage
  - Easy to manage

- **Organized by date:** Games in year/month folders
  - Limits files per directory
  - Fast file system operations
  - Easy to archive old games

- **Separate analysis files:** Analysis can be large (10-20 KB)
  - Games load quickly without analysis
  - Analysis loaded only when needed

### Memory Efficiency

- **Lazy loading:** Only load games when requested
- **Pagination:** Game history shows 50 games at a time
- **Caching:** Recently viewed games cached in memory
- **Garbage collection:** Cache cleared periodically

### Database Alternative (Future Consideration)

For users with hundreds or thousands of games, a lightweight database (e.g.,
SQLite) could be considered:

**Advantages:**

- Faster querying and filtering
- Efficient aggregate calculations
- Better indexing for searches

**Disadvantages:**

- More complex data management
- Less human-readable
- Harder to manually edit/inspect

Current JSON approach is sufficient for initial release. Database option can be
added later if needed.

## Data Migration

### Version Upgrades

When Chess-Sensai updates data formats:

1. **Detect Old Version**
   - Check `version` field in JSON files
   - Identify files needing migration

2. **Automatic Migration**
   - Convert old format to new format
   - Preserve all data
   - Create backup before migration

3. **Validation**
   - Ensure migration succeeded
   - Verify data integrity

4. **Rollback on Failure**
   - Restore from backup if migration fails
   - User notified of issue

### Cross-Device Sync (Future Feature)

While currently local-only, future versions could support optional sync:

- **Export/Import workflow** (manual sync)
- **Cloud storage integration** (Google Drive, Dropbox, iCloud)
  - User-controlled, opt-in only
  - End-to-end encryption
  - Conflict resolution (most recent wins)

See [roadmap.md](roadmap.md) for future data sync plans.

## Privacy & Security

### No Telemetry by Default

Chess-Sensai does **not** send any data to external servers unless explicitly
enabled by the user.

- No usage tracking
- No analytics
- No crash reports (unless opted in)

### Optional Telemetry (Future)

If users opt in, minimal telemetry could include:

- App version
- OS version
- Anonymous usage statistics (e.g., "Games played: X")

**Never included:**

- Game data
- Player metrics
- Personal information

### Data Encryption (Future)

For users who want extra security:

- **Local encryption** of game data
- **Password-protected** exports
- **Encrypted backups**

See [roadmap.md](roadmap.md) for security enhancements.

## Data Size Estimates

For a typical user:

| Data           | Size per Item | 100 Games   | 1000 Games    |
| -------------- | ------------- | ----------- | ------------- |
| Game JSON      | 5-10 KB       | 0.5-1 MB    | 5-10 MB       |
| Analysis JSON  | 10-20 KB      | 1-2 MB      | 10-20 MB      |
| Player Profile | 2-5 KB        | 2-5 KB      | 2-5 KB        |
| Settings       | 1 KB          | 1 KB        | 1 KB          |
| **Total**      | -             | **~2-3 MB** | **~15-30 MB** |

Even with 1000 games, total storage is only ~30 MB, which is negligible on
modern devices.

## Cleanup & Maintenance

### Old Game Archival

Users can archive old games:

1. **Manual Archive**
   - Select games older than X months
   - Export to archive folder
   - Optionally delete from active storage

2. **Automatic Archive** (optional)
   - Games older than 1 year auto-archived
   - Archived games excluded from metrics
   - Can be restored if needed

### Cache Clearing

Settings include option to:

- Clear cached data
- Rebuild indexes
- Recalculate all metrics
- Verify data integrity

Useful for troubleshooting or freeing space.

## Technical Implementation Notes

### File I/O Library

- **Bun runtime** provides fast file system access
- **Neutralino IPC** bridge for frontend access
- **Atomic writes** using rename operation
- **JSON parsing** with native Bun APIs

### Error Handling

Robust error handling for file operations:

- Graceful degradation on write failures
- Automatic retry with exponential backoff
- Fallback to in-memory storage if disk unavailable
- User notification with actionable steps

### Testing

Comprehensive tests for data operations:

- File write/read correctness
- Corruption detection
- Migration between versions
- Import/export round-trip validation
- Performance benchmarks

See [development.md](development.md) for testing standards.
