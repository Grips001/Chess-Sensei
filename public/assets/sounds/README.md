# Chess Sound Effects

This directory contains sound effects for chess moves.

## Included Sound Files

The following sound files are included from Chess.com (opensource):

- **`move.mp3`** - Standard piece movement sound
- **`capture.mp3`** - Piece capture sound
- **`notify.mp3`** - Universal notification sound used for:
  - King in check
  - Checkmate
  - Stalemate/draw
  - Castling
  - Pawn promotion

## Sound Specifications

- Format: MP3
- Sample rate: 44.1 kHz
- Bit rate: 128-192 kbps
- Duration: 0.2-0.5 seconds (short, non-intrusive)
- Volume: Normalized to prevent clipping

## Source

Sound files sourced from Chess.com's opensource theme sounds:

- <http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/>

## Implementation

Sounds are triggered by the `SoundManager` class in
[src/frontend/sound-manager.ts](../../src/frontend/sound-manager.ts).

The sound manager automatically plays the appropriate sound based on the move
type:

- Regular moves → `move.mp3`
- Captures → `capture.mp3`
- Special events (check, checkmate, castling, etc.) → `notify.mp3`
