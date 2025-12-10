# Engine

Chess engine integration using Stockfish WASM.

## Structure

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `stockfish-engine.ts` | Stockfish WASM wrapper and UCI communication |
| `stockfish/`          | Stockfish 17.1 WASM files                    |

## Technology

- **Engine:** Stockfish 17.1 NNUE Lite (~7MB)
- **Format:** WebAssembly (single-threaded)
- **Protocol:** UCI (Universal Chess Interface)
- **Features:** Position analysis, best move calculation, MultiPV support

## Engine Capabilities

- Move analysis with centipawn evaluation
- Best move calculation at configurable depth
- Multi-PV analysis for alternative moves
- Mate detection and distance calculation
- Position evaluation with NNUE neural network

See [STOCKFISH_SELECTION.md](STOCKFISH_SELECTION.md) for selection rationale.
