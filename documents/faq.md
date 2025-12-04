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

Online multiplayer is not currently planned. Chess-Sensei focuses on
single-player training and analysis.

However, you can:

- Play local multiplayer (pass-and-play on the same computer)
- Use "Flip Board" to switch perspectives

### Does it have a timer/chess clock?

Time controls are planned for **Phase 5**. Current games are untimed.

### Can I save my games?

Game save/load functionality is coming in **Phase 4**. Currently, games only
exist during the current session.

**Workaround:** You can screenshot the position or copy moves from the move
history panel (manual process).

### Can I import/export PGN files?

PGN import/export is planned for **Phase 4**. Not yet available.

### Does it analyze my games?

Post-game analysis features are coming in **Phase 4**, including:

- Move-by-move analysis
- Mistake identification
- Alternative move suggestions
- Performance metrics

### Can I solve chess puzzles?

Puzzle mode is planned for **Phase 5** of development.

### Are there training exercises?

**Yes!** Training Mode (Phase 3) is now available with:

- Real-time best-move guidance (top 3 moves highlighted)
- AI opponents with adjustable difficulty
- Color-coded move suggestions (Blue/Green/Yellow)
- Human-like thinking delays for natural gameplay

Additional training features (opening trainer, puzzles) are planned for future
phases.

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

- It **automatically promotes to a Queen**
- You'll hear a promotion sound

**Note:** Custom piece selection (Knight, Bishop, Rook) coming in future update!

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

The game is lost. There's no auto-save currently.

**Coming in Phase 4:** Automatic game state saving!

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

Sound controls are coming in a future update. Currently, sounds can only be
adjusted via your system volume.

**Workaround:** Mute Chess-Sensei in your OS audio mixer.

### Can I adjust the volume?

In-app volume control is planned. For now, use system volume or audio mixer.

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
- **Architecture:** Buntralino (Bun + Neutralino bridge)

See [Architecture Documentation](../source-docs/architecture.md) for details.

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

**Phase 3 (v0.3.0)** is complete and includes:

- AI opponent with 5 bot personalities
- Difficulty levels from 800 to 2400 Elo
- Real-time best-move guidance (top 3 moves)
- Training Mode with full game flow

### What features are planned?

See the full roadmap in [source-docs/roadmap.md](../source-docs/roadmap.md).

**Upcoming phases:**

- **Phase 4:** Exam Mode & Metrics Collection
- **Phase 5:** Post-Game Analysis UI
- **Phase 6:** Player Progress Dashboard

### Can I request a feature?

Yes! Open a feature request on GitHub with:

- Description of the feature
- Use case / why it's valuable
- Any examples from other apps

### How often are updates released?

Chess-Sensei is in active development. Update frequency varies by phase.

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
- **Technical Docs:** See [source-docs/](../source-docs/)
- **Support:** Open an issue on GitHub
- **Discussions:** Join GitHub Discussions for community help

We're here to help! 💡
