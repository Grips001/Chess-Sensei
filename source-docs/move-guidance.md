# Best-Move Guidance System

The real-time best-move guidance system is the defining feature of Chess-Sensei,
providing visual coaching without restricting player freedom.

## Integration with the AI Engine

The guidance system is tightly integrated with the **AI engine**, ensuring
consistency between:

- What the user is taught
- What the opponent plays
- What post-game analysis reveals

### Data Flow Overview

1. The frontend sends the **current board position (FEN + move history)** to the
   Bun backend.
2. The backend queries the Stockfish WASM engine using:
   - Fixed depth
   - Or fixed time per move
3. The engine returns:
   - Evaluation score
   - Principal variation (PV)
4. The backend extracts the **top three candidate moves**.
5. These moves are sent to the UI as a structured payload.
6. The UI maps:
   - **Best move → Blue**
   - **Second-best → Green**
   - **Third-best → Yellow**

### Consistency Across Systems

- The same evaluation source is used for:
  - Visual guidance
  - Bot decision-making
  - Evaluation bars
  - Post-game analysis
- This ensures:
  - No contradictory feedback
  - No "teaching one thing, playing another" behavior
  - A unified training logic throughout the app

## Visual Highlighting System

### Color-Coded Moves

Each of the top three moves is assigned a specific color:

- **Blue** --- Best move
- **Green** --- Second-best move
- **Yellow** --- Third-best move

### Three-Way Visual Sync

For each recommended move, three elements are highlighted in the same color:

1. **The piece that can be moved** --- Highlighted on the board
2. **The destination square** --- Highlighted on the board
3. **The notation in the side panel** --- Highlighted in the text

This creates an instant visual connection between the written move and its board
representation.

### Example Visualization

If the three best moves are:

- **Bxe5** _(Blue --- best move)_
  - The notation **Bxe5** is highlighted blue in the right panel
  - The bishop is highlighted blue on the board
  - The square **e5** is highlighted blue
- **exd5** _(Green --- second-best move)_
  - The notation **exd5** is highlighted green
  - The pawn is highlighted green
  - The square **d5** is highlighted green
- **Nf3** _(Yellow --- third-best move)_
  - The notation **Nf3** is highlighted yellow
  - The knight is highlighted yellow
  - The square **f3** is highlighted yellow

## Interactive Behavior

### Hover Interactions

- Hovering over a suggested move in the notation panel:
  - Temporarily previews its board highlights
  - Increases the highlight intensity
  - Provides instant visual feedback

### Piece Selection

- Selecting a piece on the board:
  - Automatically emphasizes any matching suggested moves for that piece
  - Helps players see if their intended move aligns with recommendations

## Timing and Display

### When Guidance Appears

- The guidance panel appears **only during the player's turn**.
- Guidance is calculated in real-time based on the current position.
- Updates occur after:
  - The opponent makes a move
  - The player undoes a move (if enabled)

### When Guidance Disappears

- The guidance panel hides during:
  - The opponent's turn
  - Game-over states
  - Analysis mode (replaced with different controls)

## Training Philosophy

### Non-Intrusive Design

- Players are **never required** to follow the suggested moves.
- The game functions as a standard chess match at all times.
- Suggestions serve purely as educational aids.

### Learning Benefits

The guidance system allows players to:

- **Learn by observation** --- See what strong moves look like in real positions
- **Compare choices** --- Understand the difference between their instincts and
  optimal play
- **Experiment freely** --- Try different approaches without penalty
- **Build pattern recognition** --- Develop intuition through repeated exposure
  to good moves

### No Enforcement

- No penalties for ignoring suggestions
- No forced moves or locked pieces
- Complete player agency maintained throughout
