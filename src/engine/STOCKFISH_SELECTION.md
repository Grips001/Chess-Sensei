# Stockfish WASM Build Selection

## Selected Package

**Package:** `stockfish` (npm) **Version:** 17.1 **Variant:** NNUE Lite
Single-threaded **Source:**
[https://github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)

## Selection Rationale

### Requirements from ai-engine.md

1. **NNUE Support** - Required for "world-class playing strength"
2. **Single WASM Module** - Target: single `stockfish.wasm` plus JS glue layer
3. **No External Binaries** - Must be self-contained
4. **Offline-First** - No external dependencies
5. **GPL License** - Must be compatible with open-source

### Options Evaluated

| Package                         | Version | NNUE | Size   | License | Status      |
| ------------------------------- | ------- | ---- | ------ | ------- | ----------- |
| `stockfish` (Chess.com)         | 17.1    | Yes  | 7-75MB | GPL-3.0 | Active      |
| `stockfish.wasm` (Lichess)      | 0.10.0  | No   | 433KB  | GPL-3.0 | Passive     |
| `stockfish.js` (Lichess legacy) | Older   | No   | 1.4MB  | GPL-3.0 | Bugfix only |
| `hi-ogawa/Stockfish`            | Latest  | Yes  | -      | GPL-3.0 | Archived    |

### Decision: `stockfish` v17.1 NNUE Lite Single-threaded

**Why this variant:**

1. **NNUE Support**: Essential for strongest analysis and accurate evaluations
2. **Size (~7MB)**: Fits within <10MB application size target (per
   architecture.md)
3. **Single-threaded**: Sufficient for desktop chess training (one analysis at a
   time)
4. **No CORS Required**: Simpler deployment for desktop app
5. **Latest Engine**: Stockfish 17.1 includes all modern improvements
6. **Active Maintenance**: Maintained by Chess.com for their analysis tool

### Alternatives Rejected

- **NNUE Full (75MB)**: Too large for <10MB target
- **stockfish.wasm (Lichess)**: No NNUE - weaker analysis
- **Multi-threaded variants**: Adds complexity, requires CORS headers
- **ASM-JS fallback**: Much weaker, larger than WASM

## Technical Details

### Build Characteristics

- **Engine Version**: Stockfish 17.1
- **NNUE Network**: Embedded lite neural network (~7MB)
- **Thread Model**: Single-threaded (no SharedArrayBuffer required)
- **WASM Features**: Standard WebAssembly (no threading proposals)
- **Runtime Compatibility**: Node.js, modern browsers, expected Bun
  compatibility

### API Interface

The package exposes a message-based UCI interface:

```javascript
const stockfish = require('stockfish');
const engine = stockfish();

// Send UCI commands
engine.postMessage('uci');
engine.postMessage('isready');
engine.postMessage('position fen <fen>');
engine.postMessage('go depth 20');

// Receive responses
engine.onmessage = (line) => {
  console.log(line);
};
```

### UCI Commands Supported

- `uci` - Initialize UCI mode
- `isready` - Check engine ready state
- `ucinewgame` - Reset for new game
- `position fen <fen> [moves <move list>]` - Set position
- `go depth <n>` - Search to depth N
- `go movetime <ms>` - Search for N milliseconds
- `go infinite` - Search until stopped
- `stop` - Stop current search
- `quit` - Terminate engine
- `setoption name <name> value <value>` - Set engine options

### Relevant Engine Options

- `Skill Level` (0-20): Adjust playing strength
- `MultiPV` (1-500): Number of principal variations
- `Threads` (1): Single-threaded in this variant
- `Hash` (MB): Hash table size

## Installation

```bash
bun add stockfish
```

## License Compliance

- **License**: GPL-3.0
- **Copyright**: (c) 2025, Chess.com, LLC (JS port); Stockfish team (engine)
- **Requirements**: Source code must be available, license must be included
- **Compatibility**: Compatible with open-source Chess-Sensei distribution

## References

- [Stockfish.js GitHub](https://github.com/nmrugg/stockfish.js)
- [Stockfish Official](https://stockfishchess.org/)
- [ai-engine.md](../../source-docs/ai-engine.md)
- [architecture.md](../../source-docs/architecture.md)
