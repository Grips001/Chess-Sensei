# Frequently Asked Questions (FAQ)

Common questions about Chess-Sensei and their answers.

## General Questions

### What is Chess-Sensei?

Chess-Sensei is a desktop chess application with training features, designed to
help players improve their game through interactive play, analysis, and
AI-powered guidance.

### What platforms does Chess-Sensei support?

Chess-Sensei runs on:

- **Windows** (7, 10, 11)
- **macOS** (10.13+)
- **Linux** (Ubuntu, Fedora, Arch, and other modern distros)

### Is Chess-Sensei free?

Yes! Chess-Sensei is free and open-source software (FOSS), licensed under an
open-source license.

### Do I need an internet connection?

No! Chess-Sensei runs entirely offline. All features work without internet
access.

### How big is the application?

- **Download Size:** ~50-80 MB (varies by platform)
- **Installed Size:** ~100-150 MB
- **Memory Usage:** 100-200 MB RAM when running

### What chess engine does it use?

Chess-Sensei uses **Stockfish** (WASM version), one of the strongest open-source
chess engines in the world.

## Feature Questions

### Can I play against the computer?

**Yes!** Training Mode includes AI opponents with 5 unique personalities:

- **Sensei** (~2200 Elo) - Strong, consistent play
- **Student** (~1000 Elo) - Beginner-friendly
- **Club Player** (~1400 Elo) - Intermediate challenge
- **Tactician** (~1600 Elo) - Aggressive, tactical style
- **Blunder-Prone** (~1200 Elo) - Makes mistakes to exploit

You can also adjust difficulty from Beginner (800 Elo) to Master (2400 Elo).

### Can I play against other people online?

Online multiplayer is not included. Chess-Sensei focuses on single-player
training and analysis.

However, you can:

- Play local multiplayer (pass-and-play on the same computer)
- Use "Flip Board" to switch perspectives

### Does it have a timer/chess clock?

Current games are untimed to allow focus on move quality over speed.

### Can I save my games?

**Yes!** Game data is saved automatically. Your games are stored locally with
complete move history and analysis results.

Games are saved to platform-specific locations:

- **Windows:** `%APPDATA%\Chess-Sensei\`
- **macOS:** `~/Library/Application Support/Chess-Sensei/`
- **Linux:** `~/.local/share/Chess-Sensei/`

### Can I import/export PGN files?

**Yes!** Full PGN import/export is available:

- Export single games as PGN or JSON
- Export all games as batch JSON
- Import games from PGN or JSON files

See [Data Management](data-management.md) for details.

### Does it analyze my games?

**Yes!** Comprehensive post-game analysis is available:

- Move-by-move analysis with centipawn loss calculation
- Move classification (Excellent/Good/Inaccuracy/Mistake/Blunder)
- Critical moment detection (evaluation swings > 100cp)
- 9 composite performance metrics
- Three-tab interface (Review/Summary/Analytics)
- Interactive board replay with navigation
- Evaluation graph with clickable points
- Training recommendations

### Can I solve chess puzzles?

Puzzle mode is not currently included. Chess-Sensei focuses on full game
training and analysis.

### Are there training exercises?

**Yes!** Training Mode provides:

- Real-time best-move guidance (top 3 moves highlighted)
- AI opponents with adjustable difficulty (Elo 800-2400)
- 5 bot personalities with different play styles
- Color-coded move suggestions (Blue/Green/Yellow)
- Human-like thinking delays for natural gameplay

## Gameplay Questions

### How do I move pieces?

Two ways:

1. **Drag and Drop:**
   - Click and hold a piece
   - Drag to destination square
   - Release to place

2. **Click to Move:**
   - Click a piece (it glows blue)
   - Click a highlighted square to move there

See [User Guide - Playing Chess](user-guide.md#playing-chess) for details.

### Why can't I make this move?

Chess-Sensei only allows legal moves. If a move is blocked:

- The piece can't legally move there
- It would leave your king in check
- The move violates chess rules

**Tip:** Click the piece to see all legal moves highlighted in green (moves) or
red (captures).

### How do I castle?

1. Select your king
2. Click on a square **two squares** toward the rook
3. The rook moves automatically

**Castling requirements:**

- King and rook haven't moved
- No pieces between them
- King not in check
- King doesn't move through or into check

### How do I promote a pawn?

When a pawn reaches the opposite end:

1. A promotion dialog appears with piece choices
2. Select Queen, Rook, Bishop, or Knight
3. The pawn transforms and a promotion sound plays

### What is en passant?

En passant is a special pawn capture:

1. Opponent's pawn moves 2 squares forward
2. It lands next to your pawn
3. You can capture it "in passing" on your next move
4. The capture square will be highlighted if legal

Chess-Sensei handles this automatically!

### Can I take back a move?

Yes! Press **Ctrl+Z** or click **Undo**. You can undo multiple moves.

Press **Ctrl+Y** or click **Redo** to replay undone moves.

### What happens if I close the app during a game?

In **Exam Mode**, your completed games are automatically saved with full
analysis. In-progress games are not saved - be sure to finish your game before
closing.

## Interface Questions

### What does the turn indicator show?

The turn indicator displays:

- A king icon (White or Black)
- Text: "White to move" or "Black to move"
- It animates when the turn changes

### What are the colored squares on the board?

- **Blue glow** - Selected piece
- **Green circles** - Legal moves (empty squares)
- **Red circles** - Legal captures (enemy pieces)

### What is the move history format?

Moves are shown in **Standard Algebraic Notation (SAN)**:

Examples:

- `e4` = Pawn to e4
- `Nf3` = Knight to f3
- `Bxe5` = Bishop captures on e5
- `O-O` = Kingside castle
- `O-O-O` = Queenside castle
- `Qh5+` = Queen to h5, giving check
- `Nf7#` = Knight to f7, checkmate

### What does +3 mean next to captured pieces?

That's the **material advantage**:

- Pawn = 1 point
- Knight/Bishop = 3 points
- Rook = 5 points
- Queen = 9 points

`+3` means that player is ahead by 3 points of material (e.g., a bishop or
knight).

### Can I resize the board?

The board automatically resizes to fit your window. Try:

- Maximizing the window
- Resizing the window
- The board stays square and scales proportionally

### Why are the coordinates reversed?

You probably clicked **Flip Board**! This rotates the board 180° to show Black's
perspective.

When flipped:

- Files go from h→a (instead of a→h)
- Ranks go from 1→8 (instead of 8→1)

Click **Flip Board** again to return to normal.

## Sound Questions

### Can I turn off sounds?

Sound volume is currently controlled via your system volume.

**Tip:** Use your OS audio mixer to adjust or mute Chess-Sensei independently.

### Can I adjust the volume?

Use your system volume or OS audio mixer to control Chess-Sensei's volume.

### What sounds play for different moves?

- 🎵 Regular move
- 🎵 Capture
- 🎵 Check
- 🎵 Checkmate
- 🎵 Stalemate/Draw
- 🎵 Castling
- 🎵 Promotion

### Where do the sounds come from?

Sound effects are from **Chess.com's open-source sound library**, used with
permission.

## Technical Questions

### What technologies power Chess-Sensei?

- **Runtime:** Neutralino.js (lightweight desktop framework)
- **Backend:** Bun (fast JavaScript runtime)
- **Frontend:** Vite + TypeScript
- **Chess Logic:** chess.js (move validation)
- **Chess Engine:** Stockfish WASM
- **Architecture:** WebSocket IPC (Bun backend + Neutralino.js 6.4.0 frontend,
  port 9339)

See [Engine Integration](./engine-integration.md) for technical details.

### Why Neutralino instead of Electron?

Neutralino is:

- **Smaller** (~5 MB vs ~100+ MB for Electron)
- **Faster** (no Chromium overhead)
- **More efficient** (uses OS webview instead of bundled browser)

Perfect for a lightweight chess app!

### Can I build from source?

Yes! See [Building Guide](building.md) for instructions.

Requirements:

- Bun runtime
- Node.js (for Neutralino build)
- Git

### How do I contribute?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See `CONTRIBUTING.md` for detailed guidelines.

### Is the code open-source?

Yes! Chess-Sensei is fully open-source. Check the repository for the license.

## Comparison Questions

### Chess-Sensei vs Chess.com?

**Chess.com:**

- ✅ Online multiplayer
- ✅ Massive user base
- ✅ Extensive puzzle database
- ❌ Requires internet
- ❌ Subscription for advanced features

**Chess-Sensei:**

- ✅ Fully offline
- ✅ Free and open-source
- ✅ Privacy-focused (no data collection)
- ✅ AI training features with real-time guidance
- ❌ No online play
- ❌ Smaller feature set (for now)

### Chess-Sensei vs Lichess?

**Lichess:**

- ✅ Free and open-source
- ✅ Online play
- ✅ Puzzle training
- ✅ Analysis board
- ❌ Requires internet

**Chess-Sensei:**

- ✅ Fully offline
- ✅ Desktop application
- ✅ AI-powered training with real-time guidance
- ❌ No online play

### Chess-Sensei vs Arena/ChessBase?

**Arena/ChessBase:**

- ✅ Professional analysis tools
- ✅ Database management
- ✅ Tournament organization
- ❌ Complex interface
- ❌ Paid (ChessBase)

**Chess-Sensei:**

- ✅ Beginner-friendly interface
- ✅ Free and open-source
- ✅ Focused on learning/training
- ❌ Less advanced analysis (for now)

## Roadmap Questions

### What's in the current release?

**Version 1.0.3** is the latest stable release and includes:

- **Training Mode** - Practice against AI with real-time move guidance
- **Exam Mode** - Test skills without assistance, with post-game analysis
- **Sandbox Mode** - Board editor, FEN import/export, position analysis
- **Progress Dashboard** - Track improvement with radar charts and analytics
- **Data Management** - Export/import games (PGN/JSON), automatic backups
- **5 Bot Personalities** - Sensei, Student, Club Player, Tactician,
  Blunder-Prone
- **Post-Game Analysis** - Move classification, evaluation graph, critical
  moments
- **Achievement System** - Unlock badges based on performance
- **Comprehensive UI** - WCAG AA accessible, responsive design

### What features are planned?

Chess-Sensei v1.0.3 is a complete, stable release. Future updates will focus on
bug fixes and community-requested improvements.

### Can I request a feature?

Yes! Open a feature request on GitHub with:

- Description of the feature
- Use case / why it's valuable
- Any examples from other apps

### How often are updates released?

Chess-Sensei v1.0.3 is stable. Updates are released for bug fixes and
improvements as needed.

Major releases are announced on GitHub.

## Troubleshooting

For common problems and solutions, see the
[Troubleshooting Guide](troubleshooting.md).

Quick fixes:

- **App won't launch:** Check antivirus, run as admin, or remove quarantine
  (macOS)
- **Can't move pieces:** Check if it's your turn and the move is legal
- **No sound:** Check system volume and browser autoplay policy
- **Board looks wrong:** Try reloading or resizing the window

## Still Have Questions?

- **Documentation:** Check the [User Guide](user-guide.md)
- **Technical Docs:** See [Engine Integration](./engine-integration.md) or
  [Building Guide](./building.md)
- **Support:** Open an issue on GitHub
- **Discussions:** Join GitHub Discussions for community help

We're here to help!
