# Third-Party Attributions

Chess-Sensei is built on the shoulders of giants. This document acknowledges the
open-source projects and resources that make Chess-Sensei possible.

## Core Technologies

### Chess Engine

#### Stockfish

- **Project:** Stockfish Chess Engine
- **License:** GPL-3.0
- **Website:** <https://stockfishchess.org/>
- **Usage:** Chess position evaluation and best-move calculation
- **Notes:** One of the strongest open-source chess engines in the world

#### Stockfish WASM

- **Project:** stockfish.wasm
- **License:** GPL-3.0
- **Repository:** <https://github.com/lichess-org/stockfish.wasm>
- **Usage:** WebAssembly build of Stockfish for browser/desktop environments
- **Notes:** WASM port by Lichess

### Chess Logic

#### chess.js

- **Project:** chess.js
- **License:** BSD-2-Clause
- **Repository:** <https://github.com/jhlywa/chess.js>
- **Usage:** Move validation, game state management, PGN/FEN handling
- **Author:** Jeff Hlywa
- **Notes:** Comprehensive JavaScript chess library

### Desktop Framework

#### Neutralino.js

- **Project:** Neutralino.js
- **License:** MIT
- **Website:** <https://neutralino.js.org/>
- **Repository:** <https://github.com/neutralinojs/neutralinojs>
- **Usage:** Lightweight desktop application framework
- **Notes:** Creates native desktop apps with minimal resource usage

#### Buntralino

- **Project:** Buntralino
- **License:** MIT
- **Repository:** <https://github.com/buntralino/buntralino>
- **Usage:** Bridge between Bun runtime and Neutralino.js
- **Notes:** Enables Bun backend with Neutralino frontend

#### Bun

- **Project:** Bun
- **License:** MIT
- **Website:** <https://bun.sh/>
- **Repository:** <https://github.com/oven-sh/bun>
- **Usage:** JavaScript/TypeScript runtime for backend services
- **Notes:** Fast all-in-one JavaScript runtime

### Frontend Build Tools

#### Vite

- **Project:** Vite
- **License:** MIT
- **Website:** <https://vitejs.dev/>
- **Repository:** <https://github.com/vitejs/vite>
- **Usage:** Frontend build tool and dev server
- **Author:** Evan You and Vite contributors

## Visual Assets

### Chess Pieces

#### SVG Chess Pieces

- **Source:** Wikimedia Commons (CBurnett's chess set)
- **License:** CC BY-SA 3.0 / GPL
- **Artist:** Colin M.L. Burnett (CBurnett)
- **Link:** <https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces>
- **Usage:** Chess piece SVG graphics
- **Modifications:** Cleaned up and optimized for web use

### Sound Effects

#### Chess.com Sounds

- **Source:** Chess.com Open Source Sounds
- **License:** Public Domain / CC0
- **Link:** <http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/>
- **Files Used:**
  - `move.mp3` - Standard piece movement
  - `capture.mp3` - Piece capture
  - `notify.mp3` - Check, checkmate, and special moves
- **Usage:** Move sound effects

## Development Tools

### Linting & Formatting

#### ESLint

- **License:** MIT
- **Usage:** JavaScript/TypeScript linting

#### Prettier

- **License:** MIT
- **Usage:** Code formatting

#### Stylelint

- **License:** MIT
- **Usage:** CSS linting

#### Markdownlint

- **License:** MIT
- **Usage:** Markdown documentation linting

### TypeScript

#### TypeScript

- **Project:** TypeScript
- **License:** Apache-2.0
- **Website:** <https://www.typescriptlang.org/>
- **Repository:** <https://github.com/microsoft/TypeScript>
- **Author:** Microsoft
- **Usage:** Type-safe JavaScript development

### Icon Generation

#### png2icons

- **Project:** @ctjs/png2icons
- **License:** MIT
- **Usage:** Generate application icons for multiple platforms

## Documentation

### Markdown Rendering

- Chess-Sensei documentation follows CommonMark specification
- Rendered using standard markdown processors

## Font Stack

Chess-Sensei uses system fonts to ensure optimal performance and native
appearance:

- **Sans-Serif:** System UI fonts (SF Pro, Segoe UI, Roboto, etc.)
- **Monospace:** System monospace fonts (SF Mono, Consolas, Monaco, etc.)

No web fonts are loaded, respecting user bandwidth and privacy.

## Dependency Licenses Summary

| Component     | License             | Type               |
| ------------- | ------------------- | ------------------ |
| Stockfish     | GPL-3.0             | Chess Engine       |
| chess.js      | BSD-2-Clause        | Chess Logic        |
| Neutralino.js | MIT                 | Desktop Framework  |
| Buntralino    | MIT                 | IPC Bridge         |
| Bun           | MIT                 | JavaScript Runtime |
| Vite          | MIT                 | Build Tool         |
| TypeScript    | Apache-2.0          | Language           |
| ESLint        | MIT                 | Linting            |
| Prettier      | MIT                 | Formatting         |
| Chess Pieces  | CC BY-SA 3.0 / GPL  | Graphics           |
| Sound Effects | CC0 / Public Domain | Audio              |

## License Compatibility

Chess-Sensei is licensed under the **MIT License**, which is compatible with all
dependencies except Stockfish (GPL-3.0).

**Important Note:** Stockfish is distributed as a separate binary/WASM module
and is not directly linked into Chess-Sensei's codebase. This separation
maintains license compatibility while allowing Chess-Sensei to remain under the
permissive MIT license.

## Contributing

If you contribute to Chess-Sensei, your contributions will be licensed under the
MIT License unless explicitly stated otherwise. By submitting a pull request,
you agree to license your contribution under the MIT License.

## Updates

This attributions file is maintained as dependencies change. If you notice any
missing attributions or licensing concerns, please open an issue on our GitHub
repository.

**Last Updated:** December 5, 2025

## Thank You

We extend our deepest gratitude to all the developers, designers, and
contributors of the open-source projects listed above. Your work makes projects
like Chess-Sensei possible. 🙏
