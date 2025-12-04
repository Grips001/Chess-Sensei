# Building Chess-Sensei

This document describes how to build Chess-Sensei for different platforms.

## Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- Node.js 18+ (for some dev dependencies)
- Git

## Development Mode

Run the development server with hot reload:

```bash
bun run dev
```

This starts:

- Vite development server for the frontend
- Bun backend with the chess engine

## Build Process Overview

The build has two stages:

1. **Vite build** - Compiles frontend TypeScript/CSS and copies `public/` to
   `app/`
2. **Platform build** - Packages Bun backend + Neutralino + resources for
   distribution

Assets (chess pieces, sounds, icons) are stored in `public/assets/` and get
copied to `app/assets/` during the Vite build stage.

## Production Builds

### Windows Build

For Windows builds, use the custom build script that works around Buntralino's
pe-library incompatibility:

```bash
bun run build:windows
```

This creates:

```text
build/
└── Windows x64/
    └── Chess-Sensei/
        ├── Chess-Sensei.exe    # Main application (Bun runtime)
        ├── neutralino.exe      # UI runtime (Neutralino.js)
        ├── resources.neu       # Application resources
        └── stockfish/          # Chess engine files
            ├── stockfish-17.1-lite-single-*.js
            └── stockfish-17.1-lite-single-*.wasm
```

**Developer mode:** Run `Chess-Sensei.exe --dev` to enable Chrome DevTools
(F12).

### Linux Build

```bash
bun run build:linux
```

Creates `dist/chess-sensei/` with Linux x64 binaries.

### macOS Build

```bash
bun run build:macos
```

Creates `.app` bundles for both x64 and arm64 architectures.

#### Technical Details

The standard `buntralino build` command fails on Windows with:

```text
error: After Resource section, sections except for relocation are not supported
```

This error occurs because:

1. Buntralino uses `pe-library` (via `resedit-cli`) to patch Windows executables
2. Bun-compiled executables have a PE (Portable Executable) section layout that
   `pe-library` cannot handle
3. The error is thrown in `NtExecutableResource.from()` at line 434

**Solution**: Our custom build script (`scripts/build-windows.ts`) uses
[rcedit](https://github.com/electron/rcedit) instead, which handles Bun
executables correctly.

### Cross-Platform Build (Standard Buntralino)

For other platforms (macOS, Linux), you can use the standard Buntralino build:

```bash
bun run build:app
```

Note: This may fail on Windows due to the pe-library issue described above.

## Build Scripts

| Script                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `bun run dev`           | Development mode with hot reload              |
| `bun run build`         | Build frontend assets only (Vite → app/)      |
| `bun run build:windows` | Windows build with rcedit (includes Vite)     |
| `bun run build:linux`   | Linux x64 build (includes Vite)               |
| `bun run build:macos`   | macOS x64/arm64 build (includes Vite)         |
| `bun run build:app`     | Full app build via Buntralino (legacy)        |

## Build Output Structure

After a successful Windows build:

```text
build/
└── Windows x64/
    └── Chess-Sensei/
        ├── Chess-Sensei.exe    # ~115MB - Bun runtime + backend
        ├── neutralino.exe      # ~2.7MB - Neutralino runtime
        ├── resources.neu       # ~76KB - Frontend bundle + assets
        └── stockfish/          # ~7MB - Chess engine
            ├── stockfish-17.1-lite-single-*.js
            └── stockfish-17.1-lite-single-*.wasm
```

### File Descriptions

- **Chess-Sensei.exe**: The main application containing the Bun runtime and
  backend code (~115MB due to Bun runtime)
- **neutralino.exe**: The lightweight Neutralino.js runtime that provides the
  native window and web view (~2.7MB)
- **resources.neu**: Compressed bundle of frontend HTML, CSS, JS, and assets
- **stockfish/**: Directory containing the Stockfish WASM chess engine files.
  These are loaded dynamically at runtime because Bun's bundler cannot correctly
  handle the stockfish.js IIFE module pattern.

## Troubleshooting

### Windows Build: pe-library Error

If you see this error:

```text
error: After Resource section, sections except for relocation are not supported
```

Use `bun run build:windows` instead of `bun run build:app`.

### Windows Build: rcedit Fails

If rcedit fails to set icons/metadata:

1. The build will still complete
2. The executable will work but won't have a custom icon
3. Check that an icon file exists at `app/icon.png`

### Large Executable Size

The main executable (~115MB) includes:

- Bun runtime (~90MB)
- Application code

The stockfish directory (~7MB) contains the WASM chess engine files which are
loaded at runtime. This is expected for a Bun-compiled application.

### Missing Dependencies

If the build fails with missing modules:

```bash
bun install
```

## Related Documentation

- [engine-integration.md](./engine-integration.md) - Chess engine details
- [architecture.md](../source-docs/architecture.md) - System architecture
- [development.md](../source-docs/development.md) - Development workflow
