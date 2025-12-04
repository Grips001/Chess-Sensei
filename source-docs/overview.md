# Chess-Sensei - Overview

## Game Concept

A modern chess training application designed to help players improve
decision-making through real-time AI-assisted move guidance---without
restricting player freedom. This app blends traditional chess gameplay with
real-time visual coaching, offering:

- Immediate strategic insight
- Non-intrusive training
- A natural learning curve without removing player agency

## Core Features

### AI Opponent

Play against a built-in AI opponent that adapts to the current board state and
provides high-quality opposition for practice and learning.

### Real-Time Best-Move Guidance (Key Differentiator)

The defining feature of this app is its **visual best-move guidance system**,
which activates during the user's turn.

#### How It Works

- When it is the player's turn, the app calculates and highlights the **top
  three best moves** based on the current board position.
- A **right-side panel** displays the three recommended moves in standard chess
  notation.
- Each move is color-coded for instant visual clarity:
  - **Blue** --- Best move
  - **Green** --- Second-best move
  - **Yellow** --- Third-best move

#### Visual Sync Between Board and Notation

For each of the three recommended moves:

- The **piece that can be moved** is highlighted in the corresponding color.
- The **destination square** is highlighted in the same color.
- The **notation in the side panel** is also highlighted using that same color.

This creates a direct visual link between:

- The suggested move in text
- The piece involved
- The target square on the board

#### Example

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

### Player Freedom & Training Philosophy

- The player is **not required** to use any of the suggested moves.
- The game can be played like a **standard chess match against an AI opponent**
  at all times.
- The suggested moves serve purely as a **training aid**, allowing players to:
  - Learn by observation
  - Compare their own choices against optimal play
  - Experiment freely without enforcement or penalties
