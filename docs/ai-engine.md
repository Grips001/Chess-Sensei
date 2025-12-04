# AI Engine & Bot Architecture

The AI opponent in Chess-Sensai is powered by a **fully embedded engine**, with
no external executables or system-level dependencies. All chess logic runs
inside the application via **WebAssembly (WASM)**, ensuring a portable,
self-contained experience across platforms.

## Engine Choice: Stockfish via WebAssembly

At the core of Chess-Sensai is a **WebAssembly build of Stockfish**, one of the
strongest open-source chess engines available.

- The engine is compiled to a **`stockfish.wasm`** module (plus a small JS glue
  layer where required).
- This WASM module is bundled directly with the application, avoiding:
  - External binary downloads
  - System-installed engines
  - Platform-specific engine management

Benefits:

- **World-class playing strength** for analysis and high-level training.
- **Deterministic behavior** across Windows, macOS, and Linux.
- **Single code path** for engine logic, simplifying testing and maintenance.

## WASM Integration in Buntralino

Chess-Sensai uses Buntralino (Bun + Neutralinojs) as the runtime and desktop
shell. The Stockfish WASM engine is integrated as follows:

- The **Bun backend**:
  - Loads and initializes the `stockfish.wasm` module at startup.
  - Maintains one or more persistent engine instances in memory.
  - Exposes a clean internal API for:
    - Setting positions (via FEN + move history)
    - Requesting best moves / analysis
    - Controlling search depth, time, and skill level
- The **Neutralino frontend**:
  - Communicates with the backend via IPC messages such as:
    - `requestBestMoves`
    - `evaluatePosition`
    - `startNewGame`
  - Receives structured JSON responses that drive:
    - The **top 3 move suggestions**
    - Evaluation bars
    - Training feedback

```ts
interface Engine {
  init(): Promise<void>;
  setPosition(fen: string, moves?: string[]): Promise<void>;
  getBestMoves(options: {
    depth?: number;
    movetime?: number;
    count?: number;
  }): Promise<BestMove[]>;
  quit(): Promise<void>;
}

interface BestMove {
  move: string;
  score: number;
  pv?: string[];
}
```

## Bot Personalities & Human-Like Play

Chess-Sensai supports a variety of **distinct AI bot personalities**, each
designed to emulate specific skill levels, play styles, and learning
environments. Rather than relying solely on raw engine strength, the system
layers **human-like decision modeling** on top of the embedded Stockfish WASM
engine.

Each bot is implemented as a **behavioral profile** that modifies how the
engine's candidate moves are selected and executed.

### Core Behavior Controls

Each bot personality can adjust:

- **Search Depth Limits** -- Controls tactical and strategic foresight.
- **Move Sampling Window** -- Selects from the top _N_ candidate moves rather
  than always choosing the absolute best.
- **Evaluation Noise Injection** -- Introduces controlled inaccuracies.
- **Blunder & Inaccuracy Rates** -- Models realistic human errors.
- **Style Biasing** -- Aggressive, defensive, positional, tactical preferences.

### Example Bot Archetypes

- **Sensei**
  - Near-optimal engine play.
  - Low randomness.
  - Designed for serious training and post-game analysis.
- **Student**
  - Low depth, high randomness.
  - Prioritizes simple development principles.
  - Ideal for beginners.
- **Club Player**
  - Moderate depth.
  - Occasional tactical oversights.
  - Realistic amateur-level opponent.
- **Tactician**
  - High aggression.
  - Favors attacks over long-term positional safety.
- **Blunder-Prone**
  - Elevated mistake frequency.
  - Useful for training conversion and punishment of errors.

These personalities allow users to **practice against realistic opponents**, not
just perfect machines.

## Difficulty & Strength Scaling

Chess-Sensai exposes AI strength through **transparent, player-facing difficulty
systems** that map directly to engine and personality parameters.

### Player-Facing Controls

- **Rating-Style Difficulty Slider**
  - Maps a notional Elo range (e.g., 800--2400+) to:
    - Engine depth
    - Search time
    - Randomness factor
    - Error probability
- **Preset Difficulty Modes**
  - **Beginner**
    - Very low depth
    - High randomness
    - Frequent small inaccuracies
  - **Intermediate**
    - Moderate depth
    - Selective randomness
  - **Advanced**
    - High depth
    - Low error rates
  - **Master**
    - Near-engine-perfect play
    - Minimal randomness

### Training vs. Punishing Modes

- **Training Mode**
  - Engine avoids immediate crushing continuations in some positions.
  - Encourages longer instructional sequences.
  - Useful for guided learning.
- **Punishing Mode**
  - Engine fully exploits inaccuracies.
  - Highlights tactical and positional weaknesses.
  - Suitable for competitive preparation.

This system allows the same underlying engine to support **both
learning-oriented play and high-level competitive testing**.

## No External Binaries & Offline-First Design

A core architectural requirement of Chess-Sensai is to operate as a **fully
self-contained desktop application** with **no external runtime dependencies**.

### Self-Contained AI Execution

- The Stockfish engine is compiled to **WebAssembly (WASM)** and bundled
  directly with the app.
- No system-installed engines.
- No separately managed executables.
- No OS-level process spawning for AI.

### Offline-First Philosophy

- All functionality works:
  - Without internet access
  - Without external services
  - Without cloud computation
- Game history, analysis data, and settings are stored locally by default.
- Optional future online features (if introduced) will always be:
  - Explicitly opt-in
  - Fully sandboxed from core gameplay

### Advantages of This Approach

- Predictable behavior across all platforms
- Simple installation and distribution
- No antivirus false positives from bundled executables
- Reliable performance in restricted or offline environments
- Long-term maintainability without third-party service risk
