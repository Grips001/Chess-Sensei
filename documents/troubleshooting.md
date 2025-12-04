# Troubleshooting Guide

Having issues with Chess-Sensei? This guide covers common problems and their
solutions.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Game Play Problems](#game-play-problems)
3. [UI and Display Issues](#ui-and-display-issues)
4. [Performance Issues](#performance-issues)
5. [Sound Problems](#sound-problems)
6. [Getting More Help](#getting-more-help)

## Installation Issues

### Application Won't Launch (Windows)

**Problem:** Double-clicking the executable does nothing or shows an error.

**Solutions:**

1. **Check Windows Defender/Antivirus:**
   - Windows may block unsigned executables
   - Right-click → Properties → Check "Unblock"
   - Add exception to your antivirus software

2. **Install Visual C++ Redistributables:**
   - Download from Microsoft's website
   - Required for Neutralino.js runtime

3. **Run as Administrator:**
   - Right-click the executable
   - Select "Run as administrator"

### Application Won't Launch (macOS)

**Problem:** "Chess-Sensei can't be opened because it is from an unidentified
developer"

**Solutions:**

1. **Allow the app in Security Settings:**
   - Go to System Preferences → Security & Privacy
   - Click "Open Anyway" when prompted
   - Or: Right-click app → Open → Confirm

2. **Remove Quarantine Flag:**

   ```bash
   xattr -d com.apple.quarantine /path/to/Chess-Sensei.app
   ```

### Application Won't Launch (Linux)

**Problem:** AppImage doesn't run or shows permission error.

**Solutions:**

1. **Make it executable:**

   ```bash
   chmod +x Chess-Sensei.AppImage
   ```

2. **Install FUSE (if needed):**

   ```bash
   sudo apt install libfuse2  # Ubuntu/Debian
   sudo dnf install fuse-libs # Fedora
   ```

3. **Run from terminal to see error messages:**

   ```bash
   ./Chess-Sensei.AppImage
   ```

## Game Play Problems

### Can't Move Pieces

**Problem:** Pieces won't move when clicked or dragged.

**Possible Causes:**

1. **Not Your Turn:**
   - Check the turn indicator in the top-right panel
   - Make sure you're moving the correct color

2. **Wrong Color:**
   - You can only move pieces of the current player
   - Turn indicator shows White or Black king icon

3. **Illegal Move:**
   - Chess-Sensei only allows legal moves
   - If a move is blocked, it's illegal according to chess rules
   - Select the piece to see highlighted legal moves

**Solution:** Click the piece you want to move. Legal destination squares will
be highlighted in green (moves) or red (captures).

### Undo/Redo Buttons Disabled

**Problem:** Can't click Undo or Redo buttons.

**Explanation:**

- **Undo disabled:** No moves have been made yet
- **Redo disabled:** No moves have been undone, or you made a new move after
  undoing (which clears redo history)

**This is normal behavior!** The buttons enable automatically when actions are
available.

### Castling Doesn't Work

**Problem:** Can't castle even though king and rook haven't moved.

**Chess Rules for Castling:**

Castling is only legal when ALL of these are true:

1. ✅ King hasn't moved yet
2. ✅ Rook hasn't moved yet
3. ✅ No pieces between king and rook
4. ✅ King is NOT in check
5. ✅ King doesn't move through check
6. ✅ King doesn't land in check

**Solution:** If castling isn't highlighted as a legal move, one of these
conditions isn't met. Most commonly, the king or rook has already moved earlier
in the game.

### Pawn Won't Promote to Desired Piece

**Problem:** Pawn automatically promotes to Queen, but I want a different piece.

**Current Limitation:** Auto-promotion to Queen is the current behavior. Custom
piece selection for promotion is planned for a future update.

**Workaround:** None currently. All promotions become Queens.

### En Passant Not Working

**Problem:** Can't perform en passant capture.

**Chess Rules for En Passant:**

En passant is only legal when ALL of these are true:

1. ✅ Your pawn is on the 5th rank (White) or 4th rank (Black)
2. ✅ Opponent's pawn just moved 2 squares forward on the previous move
3. ✅ Opponent's pawn is now next to your pawn
4. ✅ You capture immediately on the next move (can't delay)

**Solution:** If the move isn't highlighted, one of these conditions isn't met.
En passant must be performed immediately after the opponent's pawn moves two
squares.

## UI and Display Issues

### Board Not Displaying Correctly

**Problem:** Chessboard appears broken, misaligned, or pieces overlap.

**Solutions:**

1. **Reload the application:**
   - Close and reopen Chess-Sensei

2. **Check window size:**
   - Maximize the window
   - Board scales to fit available space

3. **Clear cache (if running dev build):**
   - Close application
   - Delete cache files
   - Restart

### Pieces Look Blurry

**Problem:** Chess pieces appear fuzzy or low-quality.

**Explanation:** Chess-Sensei uses SVG pieces that should scale perfectly at any
size.

**Solutions:**

1. **Check GPU acceleration:**
   - Ensure graphics drivers are up to date
   - Some older systems may have rendering issues

2. **Try different zoom level:**
   - Resize the window to see if rendering improves

### UI Text Too Small/Large

**Problem:** Interface text is hard to read.

**Solutions:**

1. **Adjust OS display scaling:**
   - Windows: Settings → Display → Scale
   - macOS: System Preferences → Displays → Resolution
   - Linux: Display settings in your desktop environment

2. **Resize application window:**
   - The UI is responsive and adjusts to window size
   - Try maximizing the window

### Move History Doesn't Scroll

**Problem:** Can't see older moves in the move history panel.

**Solution:** The move history panel should auto-scroll to show the latest move.
If it doesn't:

1. Click inside the move history panel
2. Use mouse wheel to scroll
3. If still not working, close and reopen the app

### Board Coordinates Wrong After Flip

**Problem:** After flipping the board, files/ranks are in the wrong order.

**This is expected behavior!** When you flip the board:

- Files go from **h-a** (instead of a-h)
- Ranks go from **1-8** (instead of 8-1)

This shows the board from Black's perspective. Click **Flip Board** again to
return to normal orientation.

## Performance Issues

### Application Runs Slowly

**Problem:** Chess-Sensei feels sluggish or laggy.

**Solutions:**

1. **Check system resources:**
   - Close other applications
   - Chess-Sensei is lightweight but needs basic resources

2. **Disable animations (future feature):**
   - Animation settings coming in a future update

3. **Update graphics drivers:**
   - Outdated drivers can cause rendering lag

### High CPU/Memory Usage

**Problem:** Task manager shows Chess-Sensei using too many resources.

**Expected Usage:**

- **CPU:** Should be near 0% when idle, brief spikes during moves
- **Memory:** 100-200 MB typical

**If usage is higher:**

1. Check for other processes
2. Restart the application
3. Update to the latest version

### Animations Stutter

**Problem:** Piece movement animations are choppy.

**Solutions:**

1. **Update graphics drivers**
2. **Close background applications**
3. **Check if system is under load**

**Note:** Animation performance depends on your GPU and system resources.

## Sound Problems

### No Sound Effects

**Problem:** Chess-Sensei is silent when making moves.

**Solutions:**

1. **Check system volume:**
   - Ensure system sound isn't muted
   - Check application volume in system mixer

2. **Check Chess-Sensei volume:**
   - Default volume is 50%
   - Volume controls coming in future update

3. **Verify sound files:**
   - Sound files should be in `assets/sounds/` directory
   - Check console for "Sound file not found" errors

4. **Browser autoplay policy (dev builds only):**
   - Some browsers block audio until user interaction
   - Click anywhere in the app first, then sounds should work

### Sound Plays Too Loud/Quiet

**Problem:** Volume is not comfortable.

**Current Limitation:** Volume is fixed at 50% in the current version.

**Workaround:** Adjust system volume or application volume in your OS mixer.

**Coming Soon:** In-app volume slider planned for future update!

### Wrong Sound Plays

**Problem:** Incorrect sound for move type (e.g., capture sounds like normal
move).

**This might be a bug!** Please report it with:

1. Describe the move made
2. What sound played
3. What sound should have played

### Sounds Continue After Closing App

**Problem:** Audio keeps playing after quitting.

**Solution:**

1. Force quit the application
2. Check system audio mixer for lingering processes
3. Restart your computer if issue persists

## Getting More Help

### Check the Console (For Advanced Users)

If you're comfortable with technical details:

1. **Development Build:**
   - Open developer console (varies by platform)
   - Check for error messages

2. **Report errors:**
   - Copy error messages
   - Include them in bug reports

### Report a Bug

If you've found a bug:

1. **Check existing issues:**
   - Visit the GitHub Issues page
   - Search for similar problems

2. **Create a new issue:**
   - Describe the problem clearly
   - Include steps to reproduce
   - Mention your OS and version
   - Attach screenshots if helpful

3. **Include system info:**
   - Operating system and version
   - Chess-Sensei version
   - Any error messages from console

### Request a Feature

Have an idea for improvement?

1. Open a feature request on GitHub
2. Describe the feature and use case
3. Explain why it would be valuable

### Get Support

- **GitHub Discussions:** Ask questions and get community help
- **Documentation:** Check the [User Guide](user-guide.md) for detailed info
- **FAQ:** See [Frequently Asked Questions](faq.md)

## Known Issues

Current known limitations (will be addressed in future updates):

1. **Pawn promotion:** Only promotes to Queen (custom selection coming)
2. **No game saving:** Games are session-only (save/load coming in Phase 4)
3. **No volume control:** Fixed at 50% (settings panel coming soon)
4. **No time controls:** Untimed games only (chess clock coming in Phase 5)

## Still Having Problems?

If your issue isn't covered here:

1. Check the [User Guide](user-guide.md) for detailed feature documentation
2. Visit our GitHub repository and open an issue
3. Include as much detail as possible about your problem

We're here to help! 🛠️
