# Sandbox Mode User Guide

Sandbox Mode is a position editor and analysis tool for Chess-Sensei. It allows
you to set up custom chess positions and analyze them with Stockfish.

## Getting Started

1. From the main menu, click the **Sandbox Mode** card
2. The Board Editor opens with the standard starting position

## Board Editor

### Placing Pieces

**From the Piece Palette:**

1. Click a piece in the palette to select it (highlighted in blue)
2. Click any square on the board to place that piece
3. Or drag a piece from the palette directly onto a square

**Moving Pieces:**

- Drag pieces on the board to move them to new squares

### Viewing Legal Moves

Click on any piece (without a palette piece selected) to see its legal moves:

- **Green circles** indicate squares the piece can move to
- **Red circles** indicate squares where the piece can capture

This helps you verify that your position is set up correctly.

### Removing Pieces

- **Right-click** any piece to remove it from the board

### Clear Board

Click the **Clear Board** button and confirm to remove all pieces.

## FEN Notation

### Loading a Position

1. Paste a FEN string into the FEN input field
2. Click **Load** to apply it to the board

### Copying a Position

Click **Copy** to copy the current position's FEN to your clipboard.

### FEN Format

FEN (Forsyth-Edwards Notation) describes a chess position. Example:

```text
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
```

- Piece placement (rank 8 to rank 1)
- Active color (`w` = White, `b` = Black)
- Castling rights (`KQkq` or `-`)
- En passant target square (or `-`)
- Halfmove clock
- Fullmove number

## Quick Setup Templates

Use the template buttons for common positions:

| Template          | Description                   |
| ----------------- | ----------------------------- |
| Starting Position | Standard chess starting setup |
| Empty Board       | Clear board with no pieces    |
| K+Q vs K          | Queen endgame practice        |
| K+R vs K          | Rook endgame practice         |
| K+P vs K          | Pawn endgame practice         |
| Lucena Position   | Famous rook endgame           |

## Color to Move

Click the color toggle button to switch between:

- **White to move** (default)
- **Black to move**

This affects the FEN and which side the engine analyzes for.

## Position Validation

The editor validates your position in real-time:

### Valid Position Requirements

- Both sides have exactly one king
- Kings are not adjacent (touching)
- No pawns on the 1st or 8th rank

### Warnings (Non-blocking)

- More than 16 pieces per side
- More than 8 pawns per side

Invalid positions cannot be analyzed. Fix the errors to enable the Analyze
button.

## Analyzing Positions

1. Set up your position in the editor
2. Select the color to move
3. Click **Analyze Position**
4. View the engine's top 3 recommendations

### Analysis Display

- **Evaluation Score:** Shows advantage in centipawns (e.g., `+1.50`) or mate
  count (e.g., `M5`)
- **Evaluation Bar:** Visual representation of the position's balance
- **Top 3 Moves:** Highlighted on the board with colored borders

### Move Highlighting

Analysis always shows the top 3 moves with color-coded highlights:

| Color  | Meaning     |
| ------ | ----------- |
| Blue   | Best move   |
| Green  | Second best |
| Yellow | Third best  |

### Continuous Editing

You can modify the position at any time - piece placement, removal, or color
toggle. Analysis results are automatically cleared when the position changes,
allowing you to re-analyze the new position.

## Tips for Using Sandbox Mode

### Studying Openings

1. Set up an opening position you want to study
2. Analyze to see the engine's preferred continuation
3. Modify and explore variations

### Practicing Endgames

1. Use the endgame templates (K+Q vs K, K+R vs K, etc.)
2. Analyze to understand winning technique
3. Practice the mating patterns

### Analyzing Published Games

1. Find a position from a book or online resource
2. Copy the FEN and paste it into Sandbox Mode
3. Analyze to see engine recommendations

### Testing Tactical Ideas

1. Set up a tactical position
2. Analyze to verify your calculation
3. Compare your ideas with engine suggestions

## Technical Notes

- Sandbox Mode does **not** save positions or track progress
- Each analysis request goes to Stockfish at depth 18
- Positions are temporary and lost when exiting

## Related Documentation

- [Game Modes Overview](../source-docs/game-modes.md)
- [Move Guidance System](../source-docs/move-guidance.md)
- [User Guide](./user-guide.md)
