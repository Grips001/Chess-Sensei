# Chess-Sensei User Guide

Welcome to Chess-Sensei! This guide will help you get started with using the
application and understanding all available features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Playing Chess](#playing-chess)
3. [Game Controls](#game-controls)
4. [Understanding the Interface](#understanding-the-interface)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Tips and Tricks](#tips-and-tricks)

## Getting Started

### Launching Chess-Sensei

1. Download and install Chess-Sensei for your platform (Windows, macOS, or
   Linux)
2. Launch the application
3. You'll see an interactive chessboard with starting position

The application loads instantly and is ready to play!

### First Game

When you first open Chess-Sensei, you'll see:

- **Chessboard** - The main playing area with pieces in starting position
- **Game Status Panel** - Shows whose turn it is
- **Game Controls** - Buttons for game management
- **Move History** - Records all moves played
- **Captured Pieces** - Shows pieces captured by each player

## Playing Chess

### Making Moves

Chess-Sensei offers two convenient ways to move pieces:

#### Drag and Drop

1. **Click and hold** on a piece you want to move
2. **Drag** it to the destination square
3. **Release** to complete the move

The piece will animate smoothly to its new position!

#### Click to Move

1. **Click** on a piece to select it (the square will glow blue)
2. **Legal moves** are highlighted:
   - **Green circles** - Empty squares you can move to
   - **Red circles** - Opponent pieces you can capture
3. **Click** on a highlighted square to move there
4. **Click** the same piece again to deselect it

### Legal Moves

Chess-Sensei automatically:

- ✅ Only allows legal moves according to chess rules
- ✅ Highlights all legal moves when you select a piece
- ✅ Prevents illegal moves (won't let you move into check)
- ✅ Handles special moves automatically (castling, en passant, promotion)

### Special Moves

#### Castling

To castle:

1. Select your king
2. Legal castling squares will be highlighted (if available)
3. Click on the destination square (two squares toward the rook)
4. The rook will automatically move to complete the castle

#### Pawn Promotion

When a pawn reaches the opposite end of the board:

1. A promotion dialog appears with four piece options
2. Click Queen, Rook, Bishop, or Knight to choose
3. The pawn transforms and a special promotion sound plays

#### En Passant

En passant captures work automatically:

1. If the opponent's pawn moves two squares and lands beside your pawn
2. The en passant capture square will be highlighted as a legal move
3. Click it to perform the special capture

### Sound Effects

Chess-Sensei plays sounds for different move types:

- 🎵 **Regular move** - Soft movement sound
- 🎵 **Capture** - Distinct capture sound
- 🎵 **Check** - Alert notification
- 🎵 **Checkmate** - Victory fanfare
- 🎵 **Stalemate/Draw** - Draw notification
- 🎵 **Castling** - Special move sound
- 🎵 **Promotion** - Achievement sound

You can adjust or disable sounds in the settings (coming in a future update).

## Game Controls

The **Game Controls** panel provides buttons to manage your game:

### New Game

**Purpose:** Start a fresh game from the initial position

- Click **"New Game"** button
- If a game is in progress, you'll see a confirmation dialog
- Click **"Confirm"** to reset or **"Cancel"** to continue playing

**Shortcut:** There's also a "New Game" button in the game result modal after a
game ends

### Undo

**Purpose:** Take back your last move

- Click **"Undo"** button or press **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac)
- The last move will be reversed
- You can undo multiple moves by pressing repeatedly
- The button is disabled when there are no moves to undo

**Use Cases:**

- Made a mistake? Undo it!
- Exploring different lines? Undo to try alternatives
- Reviewing a game? Undo to see earlier positions

### Redo

**Purpose:** Replay a move that was undone

- Click **"Redo"** button or press **Ctrl+Y** (Windows/Linux) or **Cmd+Y** (Mac)
- The previously undone move will be replayed
- You can redo multiple moves
- Making a new move clears the redo history
- The button is disabled when there are no moves to redo

**Note:** Redo is only available for moves you've undone. Once you make a new
move, the redo stack is cleared.

### Resign

**Purpose:** Forfeit the current game

- Click **"Resign"** button
- A confirmation dialog appears to prevent accidental resignation
- Click **"Confirm"** to resign or **"Cancel"** to continue
- The game ends immediately with the opponent winning
- Only available when a game is in progress

### Flip Board

**Purpose:** Rotate the board 180 degrees to view from the opposite perspective

- Click **"Flip Board"** button
- The board rotates to show Black's perspective (or back to White's)
- Coordinate labels (a-h, 1-8) update accordingly
- Useful when playing from Black's side or analyzing positions

**Tip:** You can flip the board at any time during the game!

## Understanding the Interface

### Game Status Panel

Located at the top of the right panel, this shows:

#### Current Turn Indicator

- **King Icon** - Shows which player's turn it is (White or Black)
- **Turn Text** - "White to move" or "Black to move"
- **Animation** - Pulses gently when turn changes

#### Game Alerts

Alerts appear when important game events occur:

- **⚠ Yellow Alert** - King in check (with pulsing animation)
- **♔ Red Alert** - Checkmate! (shows winner)
- **⚖ Blue Alert** - Stalemate or draw

### Move History

Tracks all moves played in the game:

- **Move Numbers** - Shows move count (1, 2, 3...)
- **White Moves** - Light background with Black text
- **Black Moves** - Dark background with White text
- **Latest Move** - Highlighted with a blue glow animation
- **Auto-Scroll** - Automatically scrolls to show the latest move

**Format:** Standard Algebraic Notation (SAN)

Examples:

- `e4` - Pawn to e4
- `Nf3` - Knight to f3
- `O-O` - Kingside castle
- `Qxe5+` - Queen captures on e5, check

### Captured Pieces

Shows pieces captured by each player:

#### White Captured (Black pieces taken)

- Displays captured Black pieces as small icons
- Shows material advantage (if White is ahead)
- Example: `+3` means White is up 3 points of material

#### Black Captured (White pieces taken)

- Displays captured White pieces as small icons
- Shows material advantage (if Black is ahead)
- Example: `+5` means Black is up 5 points of material

#### Material Values

- Pawn = 1 point
- Knight = 3 points
- Bishop = 3 points
- Rook = 5 points
- Queen = 9 points

### Chessboard

The main playing area features:

- **8×8 Grid** - Standard chessboard layout
- **High-Contrast Squares** - Light cream and soft brown colors
- **Coordinate Labels** - Files (a-h) along bottom, ranks (1-8) along left side
- **Neomorphic Design** - Soft shadows for depth
- **Responsive** - Automatically resizes to fit your screen
- **SVG Pieces** - Crisp, scalable chess pieces

### Game Result Modal

When a game ends, a modal appears showing:

- **Title** - Winner announcement or "Draw"
- **Game Type** - Checkmate, Stalemate, Resignation, etc.
- **Reason** - Explanation of why the game ended
- **New Game Button** - Start another game immediately

## Keyboard Shortcuts

Chess-Sensei supports convenient keyboard shortcuts:

| Shortcut                  | Action         | Notes                         |
| ------------------------- | -------------- | ----------------------------- |
| **Ctrl+Z** (Cmd+Z on Mac) | Undo last move | Can be pressed multiple times |
| **Ctrl+Y** (Cmd+Y on Mac) | Redo last move | Only works after undo         |

**Tip:** More keyboard shortcuts (arrow keys for move navigation, etc.) are
planned for future releases!

## Tips and Tricks

### Exploring Variations

Want to explore different move options?

1. Make a move
2. Press **Ctrl+Z** to undo it
3. Try a different move
4. Use **Ctrl+Z** and **Ctrl+Y** to compare variations

### Analyzing Positions

To study a position:

1. Play out the game or set up a position
2. Use **Flip Board** to see from both perspectives
3. Use **Undo/Redo** to step through moves
4. Check **Move History** to review the notation

### Understanding Game State

Keep an eye on:

- **Turn Indicator** - Know whose move it is
- **Captured Pieces** - Track material balance
- **Move History** - Review what's been played
- **Game Alerts** - Watch for checks and game-ending conditions

### Practice Mode

Currently, you can play against yourself:

1. Start a game
2. Make moves for both White and Black
3. Use this to practice tactics, openings, and endgames

**Training Mode Available:** Play against AI opponents with 5 personalities
(Sensei, Student, Club Player, Tactician, Blunder-Prone) and multiple difficulty
levels. See [Training Mode Guide](training-mode-guide.md).

## What's Next?

Chess-Sensei is under active development!

### Current Release: Phase 4 (v0.4.0)

Exam Mode and Metrics Collection are now available:

- **Exam Mode** - Play without guidance to test your skills
- **Game Recording** - Full move history with timestamps
- **Post-Game Analysis** - Automatic move classification and evaluation
- **9 Composite Scores** - Precision, Tactics, Stability, Conversion, and more
- **Local Data Storage** - Your progress saved securely on your device

See [Exam Mode Metrics Guide](exam-mode-metrics.md) for details on metrics.

Training Mode continues to be available with:

- **AI Opponent** - 5 bot personalities (Sensei, Student, Club Player,
  Tactician, Blunder-Prone)
- **Adjustable Difficulty** - From 800 to 2400 Elo
- **Real-time Best-Move Guidance** - Top 3 moves highlighted (Blue/Green/Yellow)
- **Human-like Bot Timing** - Natural gameplay feel

See [Training Mode Guide](training-mode-guide.md) for details.

### Upcoming Features

#### Phase 5: Post-Game Analysis UI

- Move-by-move analysis with engine insights
- Mistake identification and visualization
- Evaluation graph display
- Game summary report

#### Phase 6: Player Progress Dashboard

- Track improvement over time
- Detailed statistics and trends
- Radar charts for composite scores

Stay tuned for updates!

## Need Help?

- **Bug Reports:** Open an issue on our GitHub repository
- **Feature Requests:** Let us know what you'd like to see!
- **Questions:** Check the FAQ or contact support

Enjoy playing Chess-Sensei! ♟️
