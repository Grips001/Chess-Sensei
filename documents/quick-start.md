# Quick Start Guide

Get up and running with Chess-Sensei in under 2 minutes!

## Installation

1. Download Chess-Sensei for your platform:
   - **Windows:** `Chess-Sensei-Setup.exe`
   - **macOS:** `Chess-Sensei.dmg`
   - **Linux:** `Chess-Sensei.AppImage`

2. Install and launch the application

3. You're ready to play!

## Playing Your First Game

### Move Pieces

#### Option 1: Drag and Drop

- Click and hold a piece, drag it to a square, release

#### Option 2: Click to Move

- Click a piece to select it (glows blue)
- Click a highlighted square to move there

### Only Legal Moves

- Green circles = Empty squares you can move to
- Red circles = Enemy pieces you can capture
- Illegal moves are automatically blocked

### Special Moves Work Automatically

- **Castling:** Select king, click castling square
- **Pawn Promotion:** Choose Queen, Rook, Bishop, or Knight when reaching the
  end
- **En Passant:** Highlighted as a legal move when available

## Essential Controls

Located in the right panel:

- **New Game** - Start fresh
- **Undo** (Ctrl+Z) - Take back last move
- **Redo** (Ctrl+Y) - Replay undone move
- **Resign** - Forfeit current game
- **Flip Board** - Rotate to see from Black's perspective

## Interface Overview

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│              CHESSBOARD                         │
│         (Interactive 8x8 Grid)                  │
│                                                 │
├─────────────────────┬───────────────────────────┤
│                     │  ┌─ GAME STATUS          │
│                     │  │  • Turn Indicator      │
│                     │  │  • Check/Mate Alerts   │
│                     │  └────────────────────    │
│                     │  ┌─ GAME CONTROLS        │
│                     │  │  • New Game            │
│                     │  │  • Undo / Redo         │
│                     │  │  • Resign / Flip       │
│                     │  └────────────────────    │
│                     │  ┌─ MOVE HISTORY         │
│                     │  │  1. e4    e5           │
│                     │  │  2. Nf3   Nc6          │
│                     │  └────────────────────    │
│                     │  ┌─ CAPTURED PIECES       │
│                     │  │  White: ♟♟♞ (+3)      │
│                     │  │  Black: ♙♖ (+4)       │
│                     │  └────────────────────    │
└─────────────────────┴───────────────────────────┘
```

## Tips for Beginners

### Learning Mode

Play against yourself to practice:

1. Make a move for White
2. Make a move for Black
3. Use **Undo** to explore different options
4. Use **Flip Board** to see from both perspectives

### Exploring Variations

Want to try different moves?

1. Make a move
2. Press **Ctrl+Z** to undo
3. Try another move
4. Compare which one works better

### Understanding Notation

The move history shows Standard Algebraic Notation (SAN):

- **e4** = Pawn to e4
- **Nf3** = Knight to f3
- **Bxc4** = Bishop captures on c4
- **O-O** = Kingside castle
- **Qh5+** = Queen to h5, check

## Common Questions

### How do I castle?

1. Select your king
2. If castling is legal, you'll see highlighted squares 2 squares away
3. Click on the highlighted square
4. The rook moves automatically!

### Can I take back a move?

Yes! Press **Ctrl+Z** or click the **Undo** button.

### How do I promote a pawn?

When a pawn reaches the opposite end, a dialog appears letting you choose Queen,
Rook, Bishop, or Knight.

### Can I play against the computer?

**Yes!** Training Mode includes AI opponents. Select "Training Mode" from the
mode selection screen, choose a bot personality (Sensei, Student, Club Player,
Tactician, or Blunder-Prone), and start playing! You'll also see real-time
best-move guidance.

### How do I save my game?

**Exam Mode games are saved automatically!** As of Phase 4 (v0.4.0), completed
Exam Mode games are stored locally with full analysis data.

See [FAQ](faq.md#can-i-save-my-games) for storage location details.

## Next Steps

- Read the full [User Guide](user-guide.md) for detailed feature explanations
- Check out [Building Guide](building.md) if you want to build from source
- See [Engine Integration](engine-integration.md) for technical details about
  chess logic

**Ready to play?** Launch Chess-Sensei and make your first move! ♟️
