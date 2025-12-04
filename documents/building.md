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
    ├── chess-sensei.exe    # Main application (Bun runtime)
    ├── neutralino.exe      # UI runtime (Neutralino.js)
    └── resources.neu       # Application resources
```

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
| `bun run build`         | Build frontend assets only (Vite)             |
| `bun run build:app`     | Full app build via Buntralino (all platforms) |
| `bun run build:windows` | Windows-specific build with rcedit            |

## Build Output Structure

After a successful Windows build:

```text
build/
└── Windows x64/
    ├── chess-sensei.exe    # 115MB - Bun + Stockfish WASM
    ├── neutralino.exe      # 2.7MB - Neutralino runtime
    └── resources.neu       # ~76KB - Frontend bundle
```

### File Descriptions

- **chess-sensei.exe**: The main application containing the Bun runtime, backend
  code, and Stockfish WASM engine (~115MB due to embedded WASM)
- **neutralino.exe**: The lightweight Neutralino.js runtime that provides the
  native window and web view (~2.7MB)
- **resources.neu**: Compressed bundle of frontend HTML, CSS, JS, and assets

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
- Stockfish WASM (~7MB)
- Application code

This is expected for a Bun-compiled application with WASM.

### Missing Dependencies

If the build fails with missing modules:

```bash
bun install
```

## Related Documentation

- [engine-integration.md](./engine-integration.md) - Chess engine details
- [architecture.md](../source-docs/architecture.md) - System architecture
- [development.md](../source-docs/development.md) - Development workflow
