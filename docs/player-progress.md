# Player Progress, Metrics & Skill Tracking

Chess-Sensai provides comprehensive performance tracking and analytics to help players understand their strengths, identify weaknesses, and measure improvement over time. All metrics are collected exclusively during **Exam Mode** games.

## Tracking Philosophy

Unlike traditional chess platforms that focus primarily on rating (Elo), Chess-Sensai takes a **multidimensional approach** to skill assessment. Rather than reducing your ability to a single number, the system tracks:

- **Multiple skill dimensions** (precision, tactics, stability, conversion, etc.)
- **Trend analysis** over time
- **Context-aware metrics** (position type, game phase, opponent strength)
- **Actionable insights** that guide training focus

This creates a **skill profile** rather than just a skill score.

## When Metrics Are Tracked

### Tracked

- **Exam Mode games only**
  - Full game history recorded
  - Every move analyzed post-game
  - All metrics calculated and stored

### Not Tracked

- **Training Mode** --- Learning environment, no pressure
- **Sandbox Mode** --- Position exploration tool, not a game

## Master Composite Indexes (Top-Level KPIs)

These are the **primary skill scores** that summarize overall performance. Each composite index is calculated from multiple underlying metrics.

### 1. Precision Score

Measures overall move accuracy and error avoidance.

**Components:**

- Overall move accuracy
- Opening accuracy
- Middlegame accuracy
- Endgame accuracy
- Average centipawn loss (CPL)
- Blunders per game
- Mistakes per game
- Inaccuracies per game
- Blunders while ahead
- Blunders in equal positions
- Blunders while behind
- Forced error rate
- Unforced error rate
- First inaccuracy move number

**Score Range:** 0-100

**What it means:**

- 90-100: Master-level precision
- 75-89: Strong accuracy
- 60-74: Solid fundamentals
- 40-59: Developing player
- Below 40: Needs fundamental work

### 2. Tactical Danger Score

Measures ability to create, find, and convert tactical opportunities.

**Components:**

- Tactical opportunities created
- Tactical opportunities converted
- Missed winning tactics
- Missed equalizing tactics
- Missed forced mates
- Forks executed
- Pins exploited
- Skewers executed
- Discovered attacks
- Back rank threats created
- Sacrifices attempted
- Successful sacrifices
- Average calculation depth

**Score Range:** 0-100

**What it means:**

- 90-100: Exceptional tactical vision
- 75-89: Strong tactical awareness
- 60-74: Competent tactically
- 40-59: Misses key tactics
- Below 40: Tactical blindness

### 3. Stability Score

Measures consistency, time management, and resilience under pressure.

**Components:**

- Time trouble frequency
- Average time per move
- Moves under 10 seconds
- Moves under 5 seconds
- Moves under 2 seconds
- Win rate above 2 minutes remaining
- Win rate under 1 minute remaining
- Win rate under 30 seconds remaining
- Post-blunder blunder rate
- Post-loss win rate (next 3 games)
- Defensive saves (draws from worse positions)
- Games lost from winning positions

**Score Range:** 0-100

**What it means:**

- 90-100: Rock-solid consistency
- 75-89: Reliable under pressure
- 60-74: Occasional instability
- 40-59: Inconsistent performance
- Below 40: High variance, tilts easily

### 4. Conversion Score

Measures ability to win advantageous positions and hold difficult ones.

**Components:**

- Win rate with 1-pawn advantage
- Win rate with exchange advantage
- Win rate with queen advantage
- Conversion rate in rook endgames
- Conversion rate in pawn endgames
- Conversion rate in minor piece endgames
- Theoretical win success rate
- Theoretical draw hold rate
- Average moves to convert winning positions

**Score Range:** 0-100

**What it means:**

- 90-100: Master-level endgame technique
- 75-89: Strong conversion ability
- 60-74: Usually converts advantages
- 40-59: Struggles to finish
- Below 40: Cannot convert wins

### 5. Preparation Score

Measures opening knowledge, repertoire depth, and theoretical understanding.

**Components:**

- Opening win/draw/loss by line
- Average evaluation at move 10
- Average evaluation at move 15
- Preparation retained (10+ moves)
- Preparation exited by opponent novelty
- Preparation exited by own mistake
- Repeated transposition frequency
- Opening diversity index
- First deviation from repertoire

**Score Range:** 0-100

**What it means:**

- 90-100: Deep opening preparation
- 75-89: Solid repertoire
- 60-74: Basic opening knowledge
- 40-59: Weak opening theory
- Below 40: No preparation

### 6. Positional & Structure Score

Measures understanding of pawn structure, piece placement, and long-term planning.

**Components:**

- Isolated pawn frequency
- Doubled pawn frequency
- Backward pawn frequency
- Passed pawn creation success rate
- Bishop pair conversion rate
- Space advantage conversion rate
- Hanging pieces per game
- Defended pieces per position
- King safety violations
- Structural damage before move 15

**Score Range:** 0-100

**What it means:**

- 90-100: Exceptional positional sense
- 75-89: Strong understanding
- 60-74: Solid fundamentals
- 40-59: Positional weaknesses
- Below 40: Structural blindness

### 7. Aggression & Risk Score

Measures playing style: aggressive vs. cautious.

**Components:**

- Pawn thrusts per game
- Kingside pawn storms
- Opposite-side castling frequency
- Early sacrifices (before move 20)
- Material imbalance frequency
- High volatility positions entered
- Attacks launched per game
- Attacks successfully converted

**Score Range:** 0-100

**What it means:**

- 90-100: Hyper-aggressive player
- 75-89: Attacking style
- 50-74: Balanced approach
- 25-49: Cautious style
- Below 25: Ultra-defensive

*Note: This is a style indicator, not necessarily good or bad.*

### 8. Simplification Preference Score

Measures tendency to trade pieces and simplify positions.

**Components:**

- Queen trades before move 20
- Piece trades when ahead
- Piece trades when behind
- Simplifications from equal positions
- Draw acceptance rate in equal games

**Score Range:** 0-100

**What it means:**

- 90-100: Aggressively simplifies
- 75-89: Prefers simpler positions
- 50-74: Balanced approach
- 25-49: Keeps pieces on
- Below 25: Avoids trades

*Note: This is a style indicator, not necessarily good or bad.*

### 9. Training Transfer Score

Measures improvement trends and learning effectiveness.

**Components:**

- 30-game rolling blunder average (trend)
- 30-game rolling accuracy trend
- Tactical finds per game trend
- Endgame win rate trend
- Opening evaluation trend
- Conversion trend over time
- Time trouble trend over time

**Score Range:** 0-100

**What it means:**

- 90-100: Rapidly improving
- 75-89: Steady improvement
- 50-74: Maintaining level
- 25-49: Slight decline
- Below 25: Significant regression

## Detailed Metrics Categories

For comprehensive details on every tracked metric, see [tracked-metrics.md](tracked-metrics.md).

### Quick Reference by Category

- **Precision Score** --- Move accuracy, error types and frequency
- **Tactical Danger Score** --- Tactical motifs found and missed
- **Stability Score** --- Time management, consistency, resilience
- **Conversion Score** --- Winning technique in advantageous positions
- **Preparation Score** --- Opening repertoire and theoretical knowledge
- **Positional & Structural Score** --- Pawn structure, piece coordination
- **Aggression & Risk Profile** --- Playing style preferences
- **Simplification & Control Profile** --- Trading patterns
- **Opponent Adjusted Performance** --- Performance vs. different strengths
- **Training Transfer Metrics** --- Improvement trends over time

## Visual Analytics & Reporting

Chess-Sensai provides rich visual representations of your performance data.

### Dashboard Overview

The main **Progress Dashboard** displays:

1. **Composite Index Radar Chart**
   - Spider/radar chart showing all 9 master scores
   - Instantly see strengths and weaknesses
   - Compare against previous periods

2. **Trend Graphs**
   - Line charts for each composite index over time
   - 10-game, 30-game, and all-time views
   - Identify improvement or regression patterns

3. **Game History Table**
   - Recent Exam Mode games
   - Quick stats per game (accuracy, blunders, result)
   - Click to open post-game analysis

4. **Key Metrics Summary**
   - Current accuracy percentage
   - Recent blunder rate
   - Win/draw/loss record
   - Most played openings

### Detailed Analytics Views

Click on any composite index to see detailed breakdowns:

#### Example: Precision Score Detail View

- **Accuracy by Game Phase**
  - Bar chart: Opening / Middlegame / Endgame accuracy
  - Identify which phase needs work

- **Error Distribution**
  - Pie chart: Blunders / Mistakes / Inaccuracies / Good moves
  - Track error reduction over time

- **Centipawn Loss Trends**
  - Line graph of average CPL per game
  - Lower is better, shows improving precision

- **Error Context Analysis**
  - When do you blunder? (Ahead / Equal / Behind)
  - Are errors forced or unforced?

### Historical Comparison

- Compare any two time periods
- "Last 10 games vs. previous 10 games"
- "This month vs. last month"
- See exactly what's improving or declining

### Heatmaps

**Board Position Heatmaps** (advanced feature):

- Visualize where on the board you make mistakes
- Identify spatial blindspots
- See which squares you miss tactics on

**Move Number Heatmaps:**

- At what move numbers do blunders occur?
- Identify critical pressure points in your games

## Opponent-Adjusted Performance

All metrics are tracked **against bot difficulty levels**, allowing you to see:

- How do you perform vs. 1200-rated bots?
- How does your accuracy change vs. 1800-rated bots?
- Are you improving against higher-rated opponents?

### Performance by Opponent Strength

The system tracks:

- **Accuracy vs. higher-rated opponents**
- **Accuracy vs. equal-rated opponents**
- **Accuracy vs. lower-rated opponents**
- **Blunder rate vs. weaker opponents** (should be low)
- **Conversion rate vs. equal opponents**
- **Upset win frequency** (beating much stronger bots)
- **Upset loss frequency** (losing to much weaker bots)

This context helps identify:

- Are you playing to your level?
- Do you "play down" to weaker opponents?
- Can you step up against stronger opposition?

## Training Goals & Focus Areas

Based on your metrics, Chess-Sensai can **suggest training focus areas**.

### Example: Low Conversion Score

**Suggested Training:**

- Play Sandbox Mode with winning endgame positions
- Practice rook endgames specifically
- Review post-game analysis for missed winning continuations
- Train against "Student" bot in easy endgames to build confidence

### Example: High Blunder Rate in Opening

**Suggested Training:**

- Use Sandbox Mode to study your opening lines
- Play Training Mode to learn better opening moves
- Review "Average evaluation at move 10" metric
- Focus preparation on first 15 moves

### Example: Poor Tactical Danger Score

**Suggested Training:**

- Play Exam Mode against "Tactician" bot
- Review missed tactical opportunities in post-game analysis
- Use Sandbox Mode to practice tactical motifs (forks, pins, etc.)
- Focus on games with "tactical opportunities missed" highlighted

## Progress Milestones & Achievements

While not tied to traditional Elo, Chess-Sensai can recognize milestones:

### Precision Milestones

- First game with 0 blunders
- 10 consecutive games with <1 blunder per game
- Achieve 85%+ accuracy in a game

### Tactical Milestones

- Execute your first successful sacrifice
- Find 5+ tactical opportunities in a single game
- Convert 10 winning tactics in a row

### Conversion Milestones

- Win a rook endgame with only 1-pawn advantage
- Hold a theoretical draw in a worse position
- Win 5 games in a row from advantageous positions

### Consistency Milestones

- 10 games without time trouble
- Win 3 games in a row after a loss (resilience)
- Play 20 games with <5% accuracy variance

These achievements provide positive reinforcement and clear goals.

## Data Privacy & Storage

All metrics and game data are stored **locally** on your device. See [data-storage.md](data-storage.md) for technical details.

- No cloud upload by default
- Full control over your data
- Export and backup at any time
- Import data on a new device if needed

## Metrics Calculation Methodology

### Accuracy Calculation

Move accuracy is determined by comparing your move to the engine's top recommendation:

- **Excellent Move**: Within 10 centipawns of best move (100% accuracy)
- **Good Move**: Within 10-25 centipawns (90% accuracy)
- **Inaccuracy**: 25-75 centipawns worse (70% accuracy)
- **Mistake**: 75-200 centipawns worse (40% accuracy)
- **Blunder**: 200+ centipawns worse (0% accuracy)

Overall accuracy is the average across all moves in the game.

### Composite Index Calculation

Each composite index is a weighted average of its components:

```text
Example: Precision Score

Precision = (
  overall_accuracy * 0.30 +
  (100 - blunders_per_game * 10) * 0.25 +
  (100 - avg_centipawn_loss / 2) * 0.20 +
  opening_accuracy * 0.10 +
  middlegame_accuracy * 0.10 +
  endgame_accuracy * 0.05
)
```

Weights are tuned to emphasize most important factors.

### Trend Calculation

Trends use **rolling averages** to smooth variance:

- **10-game rolling average** for short-term trends
- **30-game rolling average** for medium-term assessment
- **All-time average** for overall skill level

Linear regression detects upward or downward trends in Training Transfer Score.

## Using Metrics to Improve

### Step 1: Identify Your Weakest Score

Look at your **Composite Index Radar Chart**. Which score is lowest?

### Step 2: Drill Into Details

Click the weak score to see detailed metrics. Which specific metric is dragging it down?

### Step 3: Review Games

Look at recent Exam Mode games where that metric was poor. Use post-game analysis to understand *why*.

### Step 4: Targeted Training

Use Training Mode or Sandbox Mode to specifically practice that area.

### Step 5: Test Again

Play new Exam Mode games. Is the metric improving?

### Step 6: Iterate

Repeat the cycle. As one area improves, focus on the next weakest score.

## Example Player Profile

### Player: "ChessEnthusiast42"

**Games Played (Exam Mode):** 87

**Composite Scores:**

- Precision: 72 (Solid)
- Tactical Danger: 58 (Needs work)
- Stability: 81 (Strong)
- Conversion: 65 (Solid)
- Preparation: 45 (Weak)
- Positional: 70 (Solid)
- Aggression: 62 (Balanced)
- Simplification: 55 (Balanced)
- Training Transfer: 78 (Improving steadily)

**Analysis:**
This player is **consistent and stable**, with decent overall precision. However, they have significant weaknesses in:

1. **Tactical vision** (score: 58) --- Missing key tactics
2. **Opening preparation** (score: 45) --- Weak theoretical knowledge

**Recommended Training Focus:**

1. Play against "Tactician" bot in Exam Mode
2. Use Sandbox Mode to study opening positions
3. Review post-game analysis for missed tactics
4. Study first 15 moves of recent games

**Expected Improvement Path:**
With focused training, Tactical Danger and Preparation scores could improve to 70+ within 30 games, raising overall playing strength significantly.

## Technical Implementation Notes

### Metrics Collection Pipeline

1. **Game Completion** (Exam Mode)
   - Full game PGN saved
   - All board positions stored as FEN strings

2. **Engine Analysis**
   - Stockfish WASM analyzes each position
   - Best move and evaluation calculated
   - Centipawn loss per move determined

3. **Classification**
   - Moves classified (excellent, good, inaccuracy, mistake, blunder)
   - Tactical motifs detected (fork, pin, skewer, etc.)
   - Game phase determined (opening, middlegame, endgame)

4. **Metric Calculation**
   - Individual metrics computed
   - Composite indexes calculated
   - Trends updated

5. **Storage**
   - Metrics saved to JSON format
   - Indexed by game ID and date
   - Aggregated into player profile

See [data-storage.md](data-storage.md) for storage format details.

### Performance Optimization

- Analysis runs **after the game** (not during play)
- Results cached to avoid recomputation
- Trend calculations performed on-demand
- Large datasets aggregated incrementally

This ensures the UI remains responsive even with hundreds of games tracked.
