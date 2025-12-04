# Training Mode Guide

This guide explains how to use Training Mode in Chess-Sensei, including the AI
opponent system and real-time move guidance features.

## Getting Started with Training Mode

### Starting a Training Game

1. Launch Chess-Sensei
2. On the Mode Selection screen, click the **Training Mode** card
3. Configure your game:
   - **Choose Your Opponent**: Select a bot personality
   - **Difficulty Level**: Pick from Beginner to Master
   - **Choose Your Color**: White, Black, or Random
   - **Options**: Enable/disable move guidance and human-like bot timing
4. Click **Start Game**

### Game Flow

- If you play as White, you move first
- If you play as Black, the bot makes the opening move
- The guidance panel shows suggested moves during your turn
- Take your time - Training Mode is for learning, not timed play

## Bot Personalities

Chess-Sensei offers five unique bot personalities, each with distinct playing
styles:

### Sensei (Rating: ~2200)

- Near-optimal play with low randomness
- Best for serious training and improvement
- Makes very few mistakes
- Ideal for testing your skills against strong opposition

### Student (Rating: ~1000)

- Beginner-level play with high randomness
- Prioritizes simple piece development
- Makes frequent small errors
- Perfect for new players learning the basics

### Club Player (Rating: ~1400)

- Moderate tactical ability
- Occasional tactical oversights
- Balanced positional and tactical play
- Good for intermediate players

### Tactician (Rating: ~1600)

- Aggressive, attack-oriented play
- Favors sharp positions and sacrifices
- May miss quieter positional moves
- Great for practicing defensive skills

### Blunder-Prone (Rating: ~1200)

- Elevated mistake frequency
- Regularly makes errors to convert
- Helps practice winning technique
- Useful for learning to capitalize on opponent mistakes

## Difficulty Levels

Each difficulty level adjusts the bot's playing strength:

| Level        | Rating | Description                     |
| ------------ | ------ | ------------------------------- |
| Beginner     | ~800   | Very forgiving, frequent errors |
| Intermediate | ~1400  | Moderate challenge              |
| Advanced     | ~2000  | Strong, few mistakes            |
| Master       | ~2400  | Near-engine level play          |

The difficulty level overrides the bot's default rating, so you can play against
a "Beginner Sensei" or "Master Student" for unique experiences.

## Move Guidance System

The real-time move guidance is Training Mode's signature feature. It shows you
strong moves without restricting your freedom to play anything you want.

### Understanding the Guidance Panel

When it's your turn, the **Best Moves** panel appears showing:

1. **Blue (Rank 1)**: The best move in the position
2. **Green (Rank 2)**: The second-best move
3. **Yellow (Rank 3)**: The third-best move

Each entry shows:

- A colored rank badge (1, 2, or 3)
- The move in standard notation (e.g., "Nf3")
- The engine evaluation (e.g., "+0.35")

### Visual Highlights on the Board

The guidance system highlights moves directly on the board:

- **Source squares**: Where the recommended pieces are located (highlighted
  background)
- **Destination squares**: Where the pieces can move (highlighted outline)
- **Pieces**: The actual pieces glow with their guidance color

### Interactive Features

- **Hover over a move** in the panel to emphasize just that move's highlights
- **Click a piece** on the board to see if any recommended moves involve it
- All highlights **fade smoothly** in and out for a polished experience

### Guidance Timing

The guidance panel:

- **Appears** only during your turn
- **Hides** during the bot's turn (with "Bot is thinking..." indicator)
- **Hides** when the game ends (checkmate, stalemate, draw)

### Learning Without Pressure

Remember:

- You are **never required** to play the suggested moves
- There are **no penalties** for ignoring suggestions
- The game functions as normal chess - guidance is purely educational
- Experiment freely and learn from both good and bad moves!

## Tips for Effective Training

### For Beginners

1. Start with Student or Blunder-Prone at Beginner difficulty
2. Pay attention to the blue (best) move before each turn
3. Try to understand why that move is considered best
4. Don't worry about playing perfectly - focus on learning patterns

### For Intermediate Players

1. Use Club Player at Intermediate or Advanced difficulty
2. Before looking at guidance, try to guess the best move
3. Compare your intuition with the engine's suggestion
4. Focus on positions where your guess differs from the engine

### For Advanced Players

1. Play against Sensei or Tactician at Advanced or Master difficulty
2. Use guidance to study opening ideas and endgame technique
3. Analyze positions where even good moves aren't clearly best
4. Practice converting advantages against skilled opposition

## Options

### Show Move Guidance

When enabled (default), displays the Best Moves panel with real-time analysis.
Turn this off if you want to play without hints while still facing the AI.

### Human-like Bot Timing

When enabled (default), the bot takes variable amounts of time to "think" based
on position complexity. This creates a more natural playing experience. Disable
for instant responses.

## Keyboard Shortcuts

While playing Training Mode:

- **Ctrl+Z** (Cmd+Z on Mac): Undo last move
- **Ctrl+Y** (Cmd+Y on Mac): Redo undone move

## Troubleshooting

### Guidance Not Appearing

- Ensure "Show move guidance" is enabled in setup
- Guidance only shows during your turn
- Wait a moment - analysis takes a second or two

### Bot Not Moving

- Check if the game is over (checkmate, stalemate, draw)
- The bot has a brief thinking delay - this is normal
- Look for the "Bot is thinking..." indicator

### Slow Analysis

- The engine analyzes positions to depth 15 for accuracy
- Initial analysis after a move may take 1-2 seconds
- This is normal and ensures quality recommendations

## What's Next?

After practicing in Training Mode, you'll be ready for:

- **Exam Mode** (coming soon): Test your skills without guidance
- **Sandbox Mode** (coming soon): Set up custom positions and experiment

Happy training!
