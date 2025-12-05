# Exam Mode & Metrics Collection

This document describes the Exam Mode implementation and metrics collection
system in Chess-Sensei, completed in Phase 4.

## Overview

Exam Mode provides a way to test your chess skills without any guidance or
hints. After completing an Exam Mode game, the system runs a comprehensive
post-game analysis and calculates performance metrics to help you understand
your strengths and weaknesses.

## Exam Mode Features

### No Guidance

Unlike Training Mode, Exam Mode provides:

- **No best-move highlights** - You must find moves on your own
- **No move suggestions** - The guidance panel is completely hidden
- **No evaluation hints** - Pure, unassisted play

This creates an environment where your true skill level can be measured.

### Full Game Recording

Every move in Exam Mode is recorded with:

- **Move notation** (SAN and UCI formats)
- **Position** (FEN string after each move)
- **Timestamp** (Unix timestamp)
- **Time spent** (seconds per move)

### Game Setup

When starting an Exam Mode game, you can choose:

1. **Bot opponent** - Select from available personalities
2. **Difficulty level** - Beginner (~800), Intermediate (~1400), Advanced
   (~2000), or Master (~2400)
3. **Your color** - White, Black, or Random

## Post-Game Analysis

After completing an Exam Mode game, the analysis pipeline processes your game:

### Analysis Pipeline Steps

1. **Extract positions** - Get FEN string for each move
2. **Engine analysis** - Stockfish evaluates each position
3. **Calculate CPL** - Centipawn loss compared to best move
4. **Classify moves** - Rate as excellent, good, inaccuracy, mistake, or blunder
5. **Detect tactics** - Find tactical opportunities (found or missed)
6. **Identify critical moments** - Large evaluation swings
7. **Determine game phases** - Opening (1-12), Middlegame (13-35), Endgame (35+)
8. **Calculate metrics** - All 9 composite scores

### Move Classifications

| Classification | Centipawn Loss | Accuracy |
| -------------- | -------------- | -------- |
| Excellent      | 0-10 cp        | 100%     |
| Good           | 10-25 cp       | 90%      |
| Inaccuracy     | 25-75 cp       | 70%      |
| Mistake        | 75-200 cp      | 40%      |
| Blunder        | 200+ cp        | 0%       |

### Analysis Depth

- **Quick Analysis** - Depth 15, runs automatically after game
- **Deep Analysis** - Depth 20, can be requested for more accuracy

## Metrics System

### The 9 Composite Scores

Each score ranges from 0-100:

#### 1. Precision Score

Measures overall move accuracy and error avoidance.

**Components:**

- Overall move accuracy
- Opening/Middlegame/Endgame accuracy
- Average centipawn loss
- Blunders, mistakes, inaccuracies count
- Blunders while ahead/equal/behind
- Forced vs unforced error rate
- First inaccuracy move number

#### 2. Tactical Danger Score

Measures ability to find and execute tactics.

**Components:**

- Tactical opportunities created/converted
- Missed winning tactics
- Missed equalizing tactics
- Missed forced mates

#### 3. Stability Score

Measures consistency and resilience under pressure.

**Components:**

- Time management (fast moves rate)
- Post-blunder blunder rate
- Games lost from winning positions
- Defensive saves (draws from worse)

#### 4. Conversion Score

Measures ability to win advantageous positions.

**Components:**

- Did you convert winning positions?
- Based on game result and position history

#### 5. Preparation Score

Measures opening knowledge.

**Components:**

- Opening accuracy
- Evaluation at move 10 and 15

#### 6. Positional & Structure Score

Measures positional understanding.

**Components:**

- Based on precision metrics as proxy
- Low blunder rate indicates good positional play

#### 7. Aggression & Risk Score

Style indicator (not quality measure).

- High = aggressive style
- Low = cautious style

#### 8. Simplification Preference Score

Style indicator (not quality measure).

- High = prefers to trade pieces
- Low = keeps pieces on the board

#### 9. Training Transfer Score

Measures improvement trends over time.

- Compares recent games to older games
- Detects improving, stable, or declining trends

## Data Storage

### Storage Location

- **Windows**: `%APPDATA%\Chess-Sensei\`
- **macOS**: `~/Library/Application Support/Chess-Sensei/`
- **Linux**: `~/.local/share/chess-sensei/`

### Directory Structure

```text
Chess-Sensei/
├── games/          # Game data organized by year/month
│   ├── 2025/
│   │   └── 12/
│   │       └── game_uuid.json
│   └── index.json  # Quick lookup index
├── analysis/       # Analysis results per game
│   └── game_uuid_analysis.json
├── metrics/        # Aggregated player statistics
│   └── player_profile.json
├── settings/       # User preferences
├── exports/        # User-created exports
└── backups/        # Automatic backups
```

### Data Formats

All data is stored in JSON format for:

- Easy human readability
- Simple export/import
- No external database dependencies
- Full offline functionality

## Implementation Files

### Backend

- `src/backend/analysis-pipeline.ts` - Post-game analysis engine
- `src/backend/metrics-calculator.ts` - Composite score calculations
- `src/backend/data-storage.ts` - File persistence layer
- `src/backend/index.ts` - IPC methods for frontend

### Frontend

- `src/frontend/exam-mode.ts` - Exam Mode manager and UI
- `src/frontend/index.ts` - Game flow integration

### IPC Methods

| Method              | Description                   |
| ------------------- | ----------------------------- |
| `analyzeGame`       | Run post-game analysis        |
| `calculateMetrics`  | Calculate 9 composite scores  |
| `initializeStorage` | Set up storage directories    |
| `saveGame`          | Save game data to disk        |
| `saveAnalysis`      | Save analysis results to disk |
| `loadGame`          | Load a saved game             |
| `loadAnalysis`      | Load analysis for a game      |
| `getGamesList`      | Get list of all saved games   |
| `getStoragePath`    | Get storage base path         |

## Future Enhancements

The following features are planned for Phase 5 (Post-Game Analysis UI):

- Interactive board replay with move navigation
- Evaluation graph visualization
- Move list with color-coded annotations
- Mistake deep-dive with better alternatives
- Game summary report
- Export to PGN/PDF
