# Game Modes

Chess-Sensai offers three distinct game modes, each designed for different
learning and practice scenarios. Understanding when to use each mode is key to
maximizing your training effectiveness.

## Mode Overview

| Mode     | Trainer Active    | Metrics Tracked | Post-Game Analysis | Best For              |
| -------- | ----------------- | --------------- | ------------------ | --------------------- |
| Training | Yes               | No              | No                 | Learning new concepts |
| Exam     | No                | Yes             | Yes                | Testing skills        |
| Sandbox  | Yes (Single Move) | No              | No                 | Position exploration  |

## Training Mode

**Purpose:** Learn and practice with real-time guidance

Training Mode is the core learning environment where the **visual best-move
guidance system** is fully active. This mode is designed for stress-free
learning and experimentation.

### Features

- **Real-time best-move highlighting**
  - Top 3 moves displayed with color coding (Blue, Green, Yellow)
  - Piece and square highlights synced with notation panel
  - Updates after every opponent move

- **No performance tracking**
  - Metrics are not recorded
  - No pressure to perform perfectly
  - Focus purely on learning patterns and strategies

- **No post-game analysis**
  - The training happens in real-time
  - No need for review since guidance was present throughout

### Setup Flow

1. Click **Training Mode** from the main menu
2. Select your **bot opponent** (personality and difficulty)
3. Choose your **color** (White, Black, or Random)
4. Game begins with trainer active

### When to Use Training Mode

- Learning new openings or positions
- Practicing against specific bot personalities
- Understanding tactical patterns
- Experimenting with different playing styles
- Low-pressure practice sessions
- Building confidence before testing yourself in Exam Mode

### Training Mode Philosophy

Training Mode embodies the core philosophy of Chess-Sensai: **learning without
intimidation**. The constant guidance allows you to:

- Observe optimal play in real-time
- Compare your instincts against engine recommendations
- Build pattern recognition naturally
- Develop confidence through supported practice

## Exam Mode

**Purpose:** Test your skills and measure progress

Exam Mode removes all training wheels. The **guidance system is disabled**,
forcing you to rely entirely on your own skills and judgment. This is where you
prove what you've learned.

### Exam Mode Features

- **No real-time guidance**
  - Trainer is completely disabled
  - No best-move highlights
  - No notation suggestions
  - Pure, unassisted play

- **Comprehensive metrics tracking**
  - All performance metrics are recorded
  - Every move is analyzed for accuracy
  - Positional understanding is evaluated
  - Tactical opportunities are measured
  - See [tracked-metrics.md](tracked-metrics.md) for full details

- **Full post-game analysis**
  - Detailed review of every move
  - Mistake identification and classification
  - Alternative line exploration
  - Deep analytics with charts and graphs
  - See [post-game-analysis.md](post-game-analysis.md) for details

### Exam Mode Setup Flow

1. Click **Exam Mode** from the main menu
2. Select your **bot opponent** (personality and difficulty)
3. Choose your **color** (White, Black, or Random)
4. Game begins with trainer disabled
5. After the game, enter **Post-Game Analysis**

### When to Use Exam Mode

- Testing what you've learned in Training Mode
- Measuring your improvement over time
- Challenging yourself against higher-rated bots
- Building your game history and statistics
- Identifying weaknesses for future training focus
- Competitive practice before tournaments

### Exam Mode Philosophy

Exam Mode is where **growth is measured**. By removing the guidance system and
tracking every detail, you get honest feedback about your current skill level
and specific areas for improvement.

The comprehensive metrics allow you to:

- See exactly where mistakes occur (opening, middlegame, endgame)
- Understand your tactical blindspots
- Track improvement trends over time
- Identify patterns in your play style
- Set specific training goals based on data

## Sandbox Mode

**Purpose:** Explore specific positions and scenarios

Sandbox Mode is a **position setup and analysis tool**. It allows you to create
any board state and immediately see the engine's best move recommendation.

### Sandbox Mode Features

- **Full board editor**
  - Place any piece on any square
  - Set custom positions freely
  - Clear board and start fresh
  - Load positions from FEN notation

- **Position validation**
  - Ensures legal positions (valid king placement, pawn rules, etc.)
  - Warns about illegal or impossible positions

- **Single-move best-move display**
  - After setting up the position, select which color to analyze
  - Trainer displays the **best move only** (single blue highlight)
  - Shows evaluation score for the position
  - Can toggle to see top 3 moves if desired

- **No game progression**
  - This is not a playable game mode
  - Used purely for position exploration
  - No opponent moves
  - No game history

- **No metrics or analysis**
  - Not tracked in player statistics
  - No post-game review
  - Purely a reference tool

### Sandbox Mode Setup Flow

1. Click **Sandbox Mode** from the main menu
2. Enter **Board Editor**
3. Arrange pieces on the board
4. Click **Analyze Position**
5. Select **color to move** (White or Black)
6. View best-move recommendation(s)
7. Modify position and repeat, or exit

### When to Use Sandbox Mode

- Studying specific opening positions
- Analyzing endgame scenarios
- Exploring tactical puzzles
- Testing theoretical positions
- Preparing for specific lines
- Understanding complex middlegame structures
- Verifying book positions
- Training specific weaknesses identified in Exam Mode

### Sandbox Mode Use Cases

#### Example 1: Studying a Rook Endgame

1. Set up a rook endgame position from a chess book
2. Analyze the best move for White
3. Execute the move manually
4. Analyze Black's best response
5. Continue exploring the critical variations

#### Example 2: Opening Preparation

1. Set up a position from your opening repertoire
2. Analyze your opponent's most common response
3. See what the engine recommends
4. Compare against your prepared line
5. Identify improvements

#### Example 3: Tactical Training

1. Set up a tactical position from a puzzle
2. Try to find the solution yourself
3. Check your answer against the engine
4. Understand why it's the best move

### Sandbox Mode Philosophy

Sandbox Mode is your **chess laboratory**. It allows you to explore, experiment,
and learn without the constraints of a full game. By focusing on specific
positions, you can:

- Deepen understanding of critical moments
- Study without time pressure
- Verify your analysis against the engine
- Build a personal repertoire
- Target specific weaknesses

## Mode Selection Strategy

### For Beginners

1. **Start with Training Mode**
   - Play multiple games with guidance active
   - Learn basic patterns and tactics
   - Build confidence

2. **Try Sandbox Mode for specific positions**
   - Study checkmate patterns
   - Explore simple endgames
   - Understand piece coordination

3. **Test yourself in Exam Mode**
   - Play against easier bots first
   - Review post-game analysis carefully
   - Focus on one improvement area at a time

### For Intermediate Players

1. **Use Training Mode for new openings**
   - Learn new repertoire lines
   - Understand middlegame plans

2. **Regular Exam Mode sessions**
   - Test skills against appropriate difficulty
   - Track progress over time
   - Identify persistent weaknesses

3. **Sandbox Mode for deep analysis**
   - Study positions from your Exam games
   - Explore critical moments
   - Prepare specific scenarios

### For Advanced Players

1. **Training Mode for refinement**
   - Fine-tune opening choices
   - Explore edge cases in known positions

2. **Exam Mode as primary practice**
   - Play against Master-level bots
   - Focus on reducing blunders
   - Perfect conversion techniques

3. **Sandbox Mode for preparation**
   - Study opponent-specific positions
   - Analyze complex endgames
   - Verify deep calculations

## Mode Comparison Summary

### Training Mode Summary

- **Goal:** Learn with guidance
- **Guidance:** Full (top 3 moves)
- **Tracking:** None
- **Review:** None
- **Stress:** Low
- **Best for:** Building skills

### Exam Mode Summary

- **Goal:** Test and measure
- **Guidance:** None
- **Tracking:** Comprehensive
- **Review:** Full post-game analysis
- **Stress:** Medium-High
- **Best for:** Proving skills

### Sandbox Mode Summary

- **Goal:** Explore positions
- **Guidance:** Single position analysis
- **Tracking:** None
- **Review:** None
- **Stress:** None
- **Best for:** Deep study

## Technical Implementation Notes

### Mode State Management

Each mode maintains distinct application state:

- **Training Mode**
  - Guidance engine runs continuously
  - No metric collection pipeline active
  - Game state saved only for undo/redo

- **Exam Mode**
  - Guidance engine disabled
  - Full metric collection pipeline active
  - Complete game history saved for analysis
  - All board states recorded

- **Sandbox Mode**
  - Board editor active
  - Single-position analysis only
  - No game state persistence
  - Position saved temporarily only

### Data Flow

```text
Training Mode:
Board State → Stockfish → Top 3 Moves → UI Highlights

Exam Mode:
Board State → Game History Storage
After Game → Stockfish Analysis → Metrics → Post-Game UI

Sandbox Mode:
Custom Board State → FEN Validation → Stockfish → Best Move → UI Display
```

### Performance Considerations

- Training Mode requires continuous engine calls (may impact battery on laptops)
- Exam Mode defers engine analysis until post-game (more efficient during play)
- Sandbox Mode analyzes only on-demand (most efficient)
