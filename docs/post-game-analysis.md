# Post-Game Analysis & Review Tools

After completing an **Exam Mode** game, Chess-Sensai provides a comprehensive post-game analysis system that helps you understand your performance, identify mistakes, and learn from each game. This is where metrics come to life with actionable insights.

## When Post-Game Analysis Is Available

### Available

- **Exam Mode games only**
  - Analysis runs automatically after game completion
  - Full engine analysis of every move
  - All metrics calculated and visualized

### Not Available

- **Training Mode** --- Real-time guidance replaces post-game review
- **Sandbox Mode** --- Not a full game, just position exploration

## Analysis Launch

After an Exam Mode game concludes:

1. **Game Over Screen** appears with result (Win/Loss/Draw)
2. **Quick Stats Preview** displayed:
   - Your accuracy percentage
   - Number of blunders, mistakes, inaccuracies
   - Game duration
3. **"View Analysis"** button prominently displayed
4. Click to enter the **Post-Game Analysis Interface**

Alternatively, you can access any past Exam Mode game from the **Game History** section of your player profile.

## Post-Game Analysis Interface

The analysis interface consists of multiple sections, allowing different depths of review.

### Main View: Move-by-Move Review

The primary analysis screen shows:

#### 1. Interactive Board Replay

- **Full game replay** with navigation controls:
  - Play/Pause auto-replay
  - Step forward/backward through moves
  - Jump to specific move numbers
  - Jump to mistakes/blunders directly

- **Move highlight colors:**
  - **Green** --- Excellent move
  - **Teal** --- Good move
  - **Yellow** --- Inaccuracy
  - **Orange** --- Mistake
  - **Red** --- Blunder

#### 2. Move List Panel (Right Side)

- **Full game notation** (standard algebraic notation)
- Each move annotated with:
  - Classification symbol (✓ Excellent, ? Inaccuracy, ?? Blunder, etc.)
  - Evaluation change (+0.5, -1.2, etc.)
  - Color-coded background matching move quality

- **Click any move** to jump to that position
- **Mistake moves highlighted** for quick identification

#### 3. Engine Evaluation Graph (Top)

- **Line graph** showing position evaluation over time
  - White advantage above the line
  - Black advantage below the line
  - Y-axis: centipawn evaluation or win probability
  - X-axis: move number

- **Visual drop-offs** clearly show where mistakes occurred
- **Click graph points** to jump to that position

#### 4. Current Position Analysis Panel (Bottom)

When reviewing a specific move, this panel shows:

- **Your Move:** The move you played
- **Move Quality:** Classification and centipawn loss
- **Engine Best Move:** What the engine recommended
- **Evaluation Before:** Position evaluation before your move
- **Evaluation After:** Position evaluation after your move
- **Change:** Centipawn swing caused by your move

- **Alternative Moves Button:** Click to see other candidate moves

## Mistake Deep Dive

Click on any **mistake, inaccuracy, or blunder** to see:

### Mistake Details Modal

#### What Happened

- **Position Diagram:** Board state before the mistake
- **Your Move:** Highlighted with arrow on board
- **Why It's a Mistake:** Brief text explanation
  - "Hangs a pawn on e5"
  - "Misses winning tactic Rxh7+"
  - "Allows opponent fork on d5"

#### Better Alternatives

- **Engine Best Move:** Shown with arrow and notation
- **Expected Continuation:** Top 2-3 moves of the resulting line
- **Evaluation Comparison:**
  - After your move: -1.5
  - After best move: +0.8
  - Difference: -2.3 (mistake cost you 2.3 pawns of advantage)

#### Practice This Position

- **"Open in Sandbox" Button**
  - Loads this exact position in Sandbox Mode
  - Allows you to practice finding the right move
  - Explore alternative lines

## Alternative Lines Exploration

At any point in the review, click **"Explore Alternatives"** to see:

- **Top 3 Engine Moves** for the position
  - Each with evaluation and brief continuation
  - Visual arrows showing the moves on the board

- **Your Move Comparison**
  - Where your move ranks among all legal moves
  - How much worse it was than the best option

This allows you to understand **what you should have considered** but didn't.

## Game Summary Report

Click **"Summary Report"** to see a high-level overview of the entire game.

### Summary Report Sections

#### 1. Game Metadata

- Date and time played
- Bot opponent (personality and Elo)
- Your color
- Opening played (detected)
- Game result and termination type
- Total moves
- Game duration

#### 2. Overall Performance Card

**Accuracy Score:** 78.5%

- Opening Accuracy: 85%
- Middlegame Accuracy: 74%
- Endgame Accuracy: 72%

**Move Quality Breakdown:**

- Excellent: 12 moves
- Good: 23 moves
- Inaccuracies: 8 moves
- Mistakes: 4 moves
- Blunders: 2 moves

**Average Centipawn Loss:** 28 (lower is better)

#### 3. Critical Moments

Automatically identified **turning points** in the game:

- **Move 12 (Your Mistake):** Lost advantage
  - Evaluation swing: +1.2 to -0.3
  - Click to review

- **Move 24 (Your Blunder):** Decisive mistake
  - Evaluation swing: -0.5 to -4.8
  - Click to review

- **Move 31 (Opponent Blunder):** Missed win
  - You failed to capitalize (missed tactic)
  - Click to review

#### 4. Tactical Opportunities

- **Tactics Found:** 3
- **Tactics Missed:** 2

**Missed Tactics:**

1. **Move 18:** Missed winning fork with Nf5+
2. **Move 27:** Missed back-rank mate threat

Click each to review in detail.

#### 5. Game Phase Breakdown

Visual timeline showing game phases:

```text
[======Opening======|===========Middlegame===========|====Endgame====]
Move 1            12                              35              49

Opening: Solid, no major mistakes
Middlegame: 2 blunders hurt your position
Endgame: Opponent converted advantage
```

#### 6. Time Management

- Average time per move: 18 seconds
- Moves under 5 seconds: 8 (potentially rushed)
- Longest think: 2m 15s (Move 24 - the blunder!)
- Time trouble: No

**Insight:** "You blundered after long thinking on Move 24. Consider simplifying your calculations."

## Deep Analytics View

For players who want **maximum detail**, click **"Deep Analytics"** to open the advanced metrics dashboard for this specific game.

### Deep Analytics Sections

#### 1. Metrics Scorecard

See your composite index scores **for this game only**:

- Precision Score: 72 (vs. your average: 68) ✓ Above average!
- Tactical Danger Score: 55 (vs. your average: 60) ✗ Below average
- Stability Score: 80 (vs. your average: 77) ✓
- Conversion Score: 45 (vs. your average: 65) ✗✗ Much worse!

**Key Insight:** "Your conversion was poor this game. You failed to win a rook endgame with a 2-pawn advantage."

#### 2. Detailed Metric Breakdown

Drill into any composite score to see individual metrics:

##### Example: Precision Score Details

- Overall move accuracy: 78.5%
- Opening accuracy: 85%
- Middlegame accuracy: 74%
- Endgame accuracy: 72%
- Average CPL: 28
- Blunders: 2 (both in middlegame)
- Mistakes: 4
- Inaccuracies: 8
- Blunders while ahead: 1 (critical!)
- Blunders in equal positions: 1
- Unforced error rate: 75% (most errors self-inflicted)

#### 3. Positional Heatmap

Visual board heatmap showing:

- **Where you made mistakes** (red squares)
- **Where you played well** (green squares)
- **Tactical hotspots** (yellow squares - high complexity)

Helps identify spatial blindspots.

#### 4. Move Time Distribution

Chart showing how much time you spent per move:

- Bar chart: move number vs. time spent
- Identify rushed moves (potential mistakes)
- Identify overthinking (long think, still blunder)

**Correlation:** "Your mistakes often occur on moves under 10 seconds."

#### 5. Evaluation Stability Graph

Shows how volatile the evaluation was:

- Flat line = stable position
- Sharp swings = tactical chaos

**Insight:** "You thrive in stable positions (80% accuracy) but drop to 65% in tactical positions."

#### 6. Opening Analysis

- **Opening Name:** Ruy Lopez, Berlin Defense
- **Your Preparation Depth:** 9 moves (deviated on move 10)
- **Evaluation at Move 10:** +0.3 (slight advantage)
- **Evaluation at Move 15:** -0.5 (lost advantage in middlegame)

**Recommendation:** "Review your middlegame plan after the Berlin Defense opening."

#### 7. Endgame Analysis

If the game reached an endgame:

- **Endgame Type:** Rook + Pawns
- **Material Advantage at Endgame Start:** +2 pawns
- **Expected Result:** Win (theoretical)
- **Actual Result:** Loss
- **Conversion Success:** Failed ✗

**Critical Mistakes:**

- Move 42: Allowed opponent rook to 7th rank
- Move 45: Blundered pawn, lost material advantage

**Recommendation:** "Practice rook endgames in Sandbox Mode. Focus on rook activity."

## Training Recommendations

Based on the analysis, Chess-Sensai provides **actionable training advice**.

### Example Recommendations for This Game

**Top Priority:**

#### Improve Conversion in Rook Endgames

- Your conversion score was 45 this game (avg: 65)
- Suggested training:
  - Play Sandbox Mode with rook endgame positions
  - Review endgame principles (rook on 7th rank, active king)
  - Play Training Mode focusing on rook endgames

**Secondary Focus:**

#### Reduce Time-Pressure Mistakes

- 4 mistakes occurred on moves under 10 seconds
- Suggested training:
  - Slow down in complex positions
  - Use Training Mode to practice pattern recognition
  - Review time management in post-game analysis

#### Improve Tactical Vision

- Missed 2 winning tactics
- Suggested training:
  - Play against "Tactician" bot in Exam Mode
  - Use Sandbox Mode to practice forks and back-rank threats
  - Review missed tactics in previous games

## Exporting and Sharing Analysis

### Export Options

- **Export Game PGN**
  - Standard chess notation format
  - Includes annotations (?, ??, !, !!)
  - Can be imported into other chess software

- **Export Analysis Report (PDF)**
  - Full summary report
  - Includes graphs and key metrics
  - Printable for offline review

- **Export Game Data (JSON)**
  - Complete game data including metrics
  - Can be imported back into Chess-Sensai
  - Useful for backup or transferring to another device

### Sharing (Future Feature)

*Note: Currently, all data is local. Future versions may allow optional sharing.*

- Share game link with other Chess-Sensai users
- Compare your analysis with friend's games
- Community game library (opt-in only)

## Re-Analyzing Old Games

All Exam Mode games are saved and can be re-analyzed at any time:

1. Go to **Game History** in your profile
2. Select any past game
3. Click **"View Analysis"**
4. Full post-game analysis interface loads

This allows you to:

- Review old games with fresh perspective
- Track improvement over time
- Compare similar positions from different games
- Build a personal game library

## Analysis Performance

### Engine Depth

Post-game analysis uses **deeper engine analysis** than real-time guidance:

- Real-time (Training Mode): Depth 15-18 or 1-2 seconds per move
- Post-game (Exam Mode): Depth 20-25 or 5-10 seconds per position

This provides more accurate evaluations and better alternative move suggestions.

### Analysis Time

- **Quick Analysis:** ~10-30 seconds for a full game (automatic)
  - Basic move classification
  - Evaluation graph
  - Mistake identification

- **Deep Analysis:** ~2-5 minutes (on-demand)
  - Detailed tactical scanning
  - Critical position identification
  - All metrics calculated

Users can choose the depth of analysis based on time available.

## Learning from Analysis

### Effective Analysis Workflow

#### Step 1: Quick Scan

- Look at evaluation graph
- Identify major mistakes (red drops)

#### Step 2: Review Critical Moments

- Click on each blunder/mistake
- Understand what went wrong
- Note the better alternative

#### Step 3: Identify Patterns

- Do you blunder in time pressure?
- Do you miss certain tactical motifs?
- Do you struggle in specific endgames?

#### Step 4: Practice Problem Areas

- Use Sandbox Mode for specific positions
- Play Training Mode focusing on weak areas
- Test improvement in next Exam Mode game

#### Step 5: Track Trends

- Compare this game's metrics to your average
- Are you improving in your focus areas?
- Set new goals based on current weaknesses

### Spaced Repetition

Chess-Sensai can **track positions you struggled with** and present them again later:

- Positions where you blundered are saved
- Periodic review prompts: "Revisit this position?"
- Load in Sandbox Mode for practice
- Test if you've improved

This reinforces learning and prevents repeated mistakes.

## Mobile and Accessibility

The post-game analysis interface is **fully responsive**:

- Desktop: Full dual-panel layout with all features
- Tablet: Adaptive layout, collapsible panels
- Mobile: Stacked layout, swipe navigation between sections

All graphs and visualizations scale appropriately.

## Technical Implementation Notes

### Analysis Pipeline

```text
1. Game Completion (Exam Mode)
   ↓
2. Extract all positions (FEN strings)
   ↓
3. Batch analysis with Stockfish WASM
   ↓
4. Calculate centipawn loss per move
   ↓
5. Classify moves (excellent, good, inaccuracy, mistake, blunder)
   ↓
6. Detect tactical motifs (fork, pin, skewer, etc.)
   ↓
7. Identify critical moments (evaluation swings)
   ↓
8. Calculate all metrics (see tracked-metrics.md)
   ↓
9. Generate recommendations
   ↓
10. Save analysis results to JSON
   ↓
11. Render analysis UI
```

### Data Storage

All analysis results are stored alongside game data:

```json
{
  "gameId": "uuid",
  "analysis": {
    "overallAccuracy": 78.5,
    "moves": [
      {
        "moveNumber": 1,
        "move": "e4",
        "evaluation": 0.3,
        "centipawnLoss": 0,
        "classification": "excellent",
        "bestMove": "e4",
        "alternativeMoves": ["d4", "Nf3"]
      },
      ...
    ],
    "criticalMoments": [...],
    "tacticalOpportunities": [...],
    "metrics": {...}
  }
}
```

See [data-storage.md](data-storage.md) for complete format specification.

### Performance Optimization

- Analysis runs **asynchronously** after game completion
- Results are cached (no reanalysis on subsequent views)
- Graphs rendered with lightweight charting library
- Lazy loading for deep analytics (only rendered when accessed)

This ensures the analysis interface loads quickly even for long games.

## Future Enhancements

Potential future features for post-game analysis:

- **Computer voice explanations** (text-to-speech for mistakes)
- **Opening database integration** (compare your moves to master games)
- **Puzzle generation** (convert critical positions into training puzzles)
- **Video replay with annotations** (screen recording of key moments)
- **Comparative analysis** (compare two games side-by-side)
- **AI coach comments** (natural language explanations of strategic ideas)

These will be considered in future development phases. See [roadmap.md](roadmap.md).
