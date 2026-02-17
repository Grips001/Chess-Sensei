# External Integrations

**Analysis Date:** 2026-02-17

## APIs & External Services

**None - Fully Offline Application**

Chess-Sensei is designed with privacy-first, offline-first architecture. There are no external API dependencies or cloud service integrations.

## Data Storage

**Databases:**
- None - Application uses local file system only

**File Storage:**
- Local filesystem via Bun/Node.js APIs
  - User data stored in platform-specific directories:
    - Windows: `C:\Users\[username]\AppData\Local\Chess-Sensei\`
    - macOS: `~/Library/Application Support/Chess-Sensei/`
    - Linux: `~/.local/share/chess-sensei/`
  - Client: `Bun.file()`, `Bun.write()`, `fs-extra` for file operations
  - Path management via `path.join()` and `os.homedir()`

**Data Structure:**
- JSON format for games, analyses, and player profiles
- Location: `src/backend/data-storage.ts`
- Atomic writes for data integrity
- Backup system with automatic file versioning

**Caching:**
- In-memory engine cache (Stockfish instance persists across games)
- No external cache service

## Authentication & Identity

**Auth Provider:**
- None - No authentication required
- Single-user, local application
- No user accounts or cloud synchronization

## Monitoring & Observability

**Error Tracking:**
- None - No external error reporting service

**Logs:**
- Local file logging
  - File location: Platform-specific data directory (Chess-Sensei folder)
  - Implementation: `src/backend/file-logger.ts`
  - Log levels: info, warn, error
  - Enabled in dev and production modes
  - Structured logging with component, message, and optional data fields
  - Frontend logs sent to backend via `chess:logMessage` IPC call

**Telemetry:**
- None - No analytics or telemetry collection

## CI/CD & Deployment

**Hosting:**
- Desktop-only (not web-based)
- Runs as native executable via Neutralino shell
- Distributed via GitHub Releases (manual upload)

**Build System:**
- Vite (frontend assets) → `app/resources/`
- Bun native compilation (backend) → platform-specific executable
- Build scripts: `scripts/build-windows.ts`, `scripts/build-macos.ts`, `scripts/build-linux.ts`
- Icon generation: `@ctjs/png2icons` (PNG → Windows icons)

**CI Pipeline:**
- None detected - Manual build and release process
- Project uses bun run commands:
  - `bun run verify` - Full verification (typecheck + lint + test)
  - `bun run test` - Run test suite
  - `bun run build:windows` - Windows build
  - `bun run build:linux` - Linux build
  - `bun run build:macos` - macOS build

## Environment Configuration

**Required env vars:**
- None - Application is fully self-contained
- No API keys, tokens, or secrets needed

**Secrets location:**
- Not applicable (offline-first design)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Process Communication

**Internal WebSocket IPC:**
- Port: 9339
- Protocol: Custom RPC + pub/sub over WebSocket
- Location: `src/backend/websocket-server.ts`
- Bidirectional communication between:
  - Frontend (Neutralino UI) → Backend (Bun process)
  - Backend → Frontend (push notifications via channels)

**RPC Methods (45+ methods across 8 categories):**

*Engine Operations (8 methods):*
- `chess:sayHello` - Ping/health check
- `chess:startNewGame` - Initialize game state
- `chess:requestBestMoves` - Get top N moves for position
- `chess:evaluatePosition` - Evaluate current position
- `chess:analyzeMove` - Deep analysis of single move
- `chess:getGuidanceMoves` - Weak moves with explanations
- `chess:setSkillLevel` - Adjust engine strength (0-20)
- `chess:getEngineStatus` - Query engine readiness

*AI Opponent (5 methods):*
- `chess:configureBot` - Set bot difficulty/personality
- `chess:getBotMove` - Request bot's next move
- `chess:getBotProfiles` - Available bot personalities
- `chess:getCurrentBotConfig` - Get active bot config
- `chess:getDifficultyPresets` - List difficulty levels

*Analysis (3 methods):*
- `chess:analyzeGame` - Full game analysis
- `chess:getAnalysisConfig` - Analysis parameters
- `chess:calculateMetrics` - Player performance metrics

*Data Storage (7 methods):*
- `chess:initializeStorage` - Setup data directories
- `chess:saveGame` - Persist game to disk
- `chess:saveAnalysis` - Persist analysis results
- `chess:getGamesList` - List stored games
- `chess:loadGame` - Load game from disk
- `chess:loadAnalysis` - Load analysis from disk
- `chess:getStoragePath` - Query storage directory

*Player Progress (4 methods):*
- `chess:loadPlayerProfile` - Load player data
- `chess:savePlayerProfile` - Save player data
- `chess:getAchievements` - List unlocked achievements
- `chess:unlockAchievement` - Mark achievement earned

*Export/Import (8 methods):*
- `chess:exportGame` - Export single game (PGN/JSON)
- `chess:exportAllGames` - Export all games
- `chess:exportProfile` - Export player profile
- `chess:exportBackup` - Create full backup
- `chess:importGame` - Import single game
- `chess:importBatchGames` - Import multiple games
- `chess:mergeProfiles` - Merge player profiles
- `chess:getExportsPath` - Query export directory

*Backup (7 methods):*
- `chess:getBackupSettings` - Get backup configuration
- `chess:saveBackupSettings` - Update backup settings
- `chess:checkBackupNeeded` - Check if backup required
- `chess:createAutomaticBackup` - Trigger backup
- `chess:listBackups` - List existing backups
- `chess:verifyBackup` - Validate backup integrity
- `chess:getBackupsPath` - Query backup directory

*Logging (3 methods):*
- `chess:logMessage` - Frontend log message to file
- `chess:getLogPath` - Query log file location
- `chess:isLoggingEnabled` - Check logging status

**Pub/Sub Channels:**
- `engine:*` - Real-time engine analysis updates (depth, eval, PV line)
- `progress:*` - Player progress and achievement notifications
- `sync:*` - Data synchronization events

## Native OS Integration

**Neutralino APIs Used:**
- `os.getEnv()` - OS detection, environment variables
- `os.platform()` - Identify OS (Windows/macOS/Linux)
- `app.exit()` - Application shutdown
- `app.getAppPath()` - Get app installation directory
- `window.*` - Window management, native menu creation
- `window.setMainMenu` - Custom native menu (allowed)
- `window.print` - Print functionality (allowed)
- `clipboard.writeHTML` - Clipboard write (allowed)
- `debug.log` - Debug logging (allowed)
- `events.*` - Event system (allowed)

**File System:**
- No direct Neutralino file API used
- Uses Bun/Node.js `fs-extra` instead for better control

## External Dependencies Risk Assessment

**Low Risk:**
- chess.js (1.4.0) - Mature, single-purpose, no dependencies
- stockfish/stockfish.wasm (17.1.0 / 0.10.0) - Stable UCI engine, well-maintained
- Neutralino.js (6.4.0) - Lightweight, no external services

**Medium Risk:**
- execa (9.5.2) - Process spawning; update frequently for security
- fs-extra (11.3.2) - File operations; fork of standard Node.js APIs

**Mitigated Risks:**
- No cloud API keys → No credential exposure risk
- Offline-first → No network security concerns
- Local data → No remote data breach exposure

---

*Integration audit: 2026-02-17*
