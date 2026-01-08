# Operations and Debugging Guide

**Version:** 1.1.0
**Last Updated:** 2026-01-08

This document provides operational procedures, debugging techniques, and
troubleshooting runbooks for Chess-Sensei developers and maintainers.

---

## Table of Contents

1. [Logging System](#logging-system)
2. [Error Handling](#error-handling)
3. [Debugging Techniques](#debugging-techniques)
4. [Performance Monitoring](#performance-monitoring)
5. [Health Checks](#health-checks)
6. [Operational Runbooks](#operational-runbooks)
7. [Common Issues](#common-issues)

---

## Logging System

### Overview

Chess-Sensei uses a two-tier logging system:
- **Frontend logs** - Sent to backend via IPC
- **Backend logs** - Written to file

### Log Levels

| Level   | Purpose                      | Example Use Case                |
| ------- | ---------------------------- | ------------------------------- |
| `DEBUG` | Detailed diagnostic info     | IPC message traces              |
| `INFO`  | General informational        | Engine initialized, game saved  |
| `WARN`  | Warning conditions           | Deprecated API usage            |
| `ERROR` | Error conditions             | Failed file write, engine crash |

### Frontend Logging

**Location:** `src/frontend/frontend-logger.ts`

**Usage:**

```typescript
import { log } from './frontend-logger';

log('INFO', 'GameController', 'Move executed', { move: 'e2e4' });
log('ERROR', 'GameController', 'Invalid move', { error: 'Illegal move' });
```

**Implementation:**

```typescript
export async function log(
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  module: string,
  message: string,
  data?: any
): Promise<void> {
  // Send to backend via IPC
  await ipcClient.call('chess:logMessage', {
    level,
    module,
    message,
    data
  });
}
```

### Backend Logging

**Location:** `src/backend/file-logger.ts`

**Log Files:**
- **Path:** `{executableDir}/logs/chess-sensei-{date}.log`
- **Format:** `[2026-01-08 10:30:45.123] [INFO] [Module] Message { data }`
- **Rotation:** Not yet implemented (manual cleanup)

**Usage:**

```typescript
import { logger } from './file-logger';

logger.info('WebSocketServer', 'Client connected', { clientId: 1 });
logger.error('DataStorage', 'Failed to write file', { path, error });
```

### Development Mode Logging

Enable verbose logging with `--dev` flag:

```bash
# Development server with debug logging
bun run dev

# Production with dev mode
Chess-Sensei.exe --dev
```

**Dev mode features:**
- Console output in addition to file
- Neutralino DevTools enabled
- More detailed IPC traces

### Log File Management

**Viewing logs:**

```bash
# Real-time log viewing (Unix)
tail -f logs/chess-sensei-2026-01-08.log

# Real-time log viewing (Windows PowerShell)
Get-Content logs\chess-sensei-2026-01-08.log -Wait -Tail 50

# Search logs
grep "ERROR" logs/*.log
```

**Log cleanup:**

```bash
# Delete logs older than 30 days
find logs/ -name "chess-sensei-*.log" -mtime +30 -delete

# Windows PowerShell
Get-ChildItem logs\ -Filter "chess-sensei-*.log" |
  Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} |
  Remove-Item
```

---

## Error Handling

### Error Response Format

All IPC errors use a consistent format:

```typescript
{
  id: number,
  error: {
    code: string,        // Error code (e.g., "INVALID_FEN")
    message: string,     // Human-readable message
    details?: object     // Additional context
  }
}
```

**Example:**

```typescript
{
  id: 123,
  error: {
    code: 'ENGINE_NOT_INITIALIZED',
    message: 'Chess engine has not been initialized',
    details: {
      method: 'chess:requestBestMoves',
      suggestion: 'Call chess:startNewGame first'
    }
  }
}
```

### Error Codes

See [API Reference - Error Handling](api-reference.md#error-handling) for
complete list.

### Frontend Error Handling

**Best practices:**

```typescript
try {
  const result = await ipcClient.call('chess:requestBestMoves', params);
  // Handle success
} catch (error) {
  // Log error
  log('ERROR', 'MyModule', 'IPC call failed', { error });

  // Show user-friendly message
  showErrorAlert('Unable to get move suggestions. Please try again.');

  // Graceful degradation
  disableGuidanceFeature();
}
```

### Backend Error Handling

**Best practices:**

```typescript
export async function myIPCHandler(params: any) {
  try {
    // Validate parameters
    if (!validateParams(params)) {
      return createErrorResponse('INVALID_PARAMETERS', 'Invalid parameters');
    }

    // Perform operation
    const result = await performOperation(params);

    return { success: true, result };
  } catch (error) {
    // Log error
    logger.error('MyHandler', 'Operation failed', { params, error });

    // Return error response
    return createErrorResponse('OPERATION_FAILED', error.message, {
      operation: 'myOperation',
      params
    });
  }
}
```

---

## Debugging Techniques

### Frontend Debugging

#### Browser DevTools

**Enable DevTools:**
1. Run app in dev mode: `bun run dev`
2. Right-click anywhere in app
3. Select "Inspect Element"

**DevTools features:**
- Console for logs and errors
- Network tab for WebSocket messages
- Elements tab for DOM inspection
- Sources tab for breakpoints

#### IPC Testing

**Test IPC connection:**

```typescript
// In browser console
await window.testIPC();

// Output:
// IPC Status: Connected
// Engine Status: Initialized
// Test Echo: Success
```

**Manual IPC call:**

```typescript
// In browser console
const ws = new WebSocket('ws://localhost:9339');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'chess:sayHello',
    params: { message: 'Test' }
  }));
};
ws.onmessage = (event) => {
  console.log('Response:', JSON.parse(event.data));
};
```

### Backend Debugging

#### Log-Based Debugging

**Add debug statements:**

```typescript
logger.debug('MyModule', 'Variable state', { variable, state });
```

**Check logs:**

```bash
tail -f logs/chess-sensei-2026-01-08.log | grep "MyModule"
```

#### Engine Debugging

**Test engine directly:**

```bash
# Run engine test
bun run src/engine/stockfish-manual-test.ts
```

**Check engine status:**

```typescript
const status = await ipcClient.call('chess:getEngineStatus');
console.log('Engine initialized:', status.initialized);
```

#### Storage Debugging

**Inspect storage files:**

```bash
# View game record
cat "%APPDATA%/Chess-Sensei/games/game-123.json" | jq .

# View profile
cat "%APPDATA%/Chess-Sensei/profile.json" | jq .
```

**Check storage path:**

```typescript
const { path } = await ipcClient.call('chess:getStoragePath');
console.log('Storage location:', path);
```

### Performance Debugging

#### Measure Operation Times

```typescript
const start = performance.now();
const result = await ipcClient.call('chess:analyzeGame', params);
const duration = performance.now() - start;
console.log(`Analysis took ${duration}ms`);
```

#### Profile Engine Performance

```typescript
// Enable engine profiling
const analysis = await ipcClient.call('chess:evaluatePosition', {
  fen,
  depth: 18
});

// Check evaluation time in logs
// [INFO] [StockfishEngine] Analysis completed in 245ms
```

---

## Performance Monitoring

### Key Metrics

| Operation              | Target Time | Acceptable | Critical |
| ---------------------- | ----------- | ---------- | -------- |
| App startup            | <2s         | <3s        | >5s      |
| Engine analysis        | <200ms      | <500ms     | >1s      |
| Save game              | <50ms       | <100ms     | >200ms   |
| Load profile           | <100ms      | <150ms     | >300ms   |
| Board render           | <16ms       | <33ms      | >50ms    |
| Full game analysis     | <10s        | <20s       | >30s     |

### Performance Testing

**Manual testing:**

```typescript
// Test analysis performance
const runs = 10;
const times = [];

for (let i = 0; i < runs; i++) {
  const start = performance.now();
  await ipcClient.call('chess:evaluatePosition', { fen, depth: 15 });
  times.push(performance.now() - start);
}

const avg = times.reduce((a, b) => a + b) / runs;
console.log(`Average: ${avg}ms`);
console.log(`Min: ${Math.min(...times)}ms`);
console.log(`Max: ${Math.max(...times)}ms`);
```

### Resource Usage

**Monitor memory usage:**

```typescript
// Frontend (browser console)
console.log('Memory:', performance.memory);

// Backend (add to code)
const mem = process.memoryUsage();
logger.info('Memory', 'Usage', {
  heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
});
```

---

## Health Checks

### Engine Status

```typescript
const { initialized } = await ipcClient.call('chess:getEngineStatus');
if (!initialized) {
  await ipcClient.call('chess:startNewGame');
}
```

### Storage Status

```typescript
try {
  const { path } = await ipcClient.call('chess:getStoragePath');
  console.log('Storage accessible at:', path);
} catch (error) {
  console.error('Storage not accessible:', error);
}
```

### IPC Connection

```typescript
try {
  const result = await ipcClient.call('chess:sayHello', { message: 'ping' });
  console.log('IPC healthy:', result.reply);
} catch (error) {
  console.error('IPC connection failed:', error);
}
```

### System Health Check Script

```typescript
async function healthCheck() {
  const checks = {
    ipc: false,
    engine: false,
    storage: false
  };

  // Test IPC
  try {
    await ipcClient.call('chess:sayHello', { message: 'test' });
    checks.ipc = true;
  } catch {}

  // Test engine
  try {
    const { initialized } = await ipcClient.call('chess:getEngineStatus');
    checks.engine = initialized;
  } catch {}

  // Test storage
  try {
    await ipcClient.call('chess:getStoragePath');
    checks.storage = true;
  } catch {}

  return checks;
}

// Run health check
const status = await healthCheck();
console.log('Health status:', status);
// Output: { ipc: true, engine: true, storage: true }
```

---

## Operational Runbooks

### Game Save Failures

**Symptoms:**
- Games not saving after completion
- Error displayed: "Failed to save game"
- Missing games in game list

**Diagnosis:**

1. Check log file for storage errors:
   ```bash
   grep "DataStorage" logs/chess-sensei-*.log | grep "ERROR"
   ```

2. Verify storage directory exists:
   ```bash
   ls "%APPDATA%/Chess-Sensei/games/"
   ```

3. Check disk space:
   ```bash
   # Windows
   wmic logicaldisk get size,freespace,caption

   # Unix
   df -h
   ```

**Resolution:**

1. **If directory missing:**
   ```typescript
   await ipcClient.call('chess:initializeStorage');
   ```

2. **If permission denied:**
   - Check directory permissions
   - Run application with correct user privileges
   - Delete and recreate directory if corrupted

3. **If disk full:**
   - Free up disk space (100+ MB recommended)
   - Delete old backups
   - Delete old log files

4. **If file corruption:**
   - Delete `.tmp` files in games directory
   - Restore from recent backup

---

### Engine Initialization Failures

**Symptoms:**
- No move suggestions displayed
- Analysis not working
- Error: "Engine not initialized"

**Diagnosis:**

1. Check engine status:
   ```typescript
   const { initialized } = await ipcClient.call('chess:getEngineStatus');
   console.log('Engine initialized:', initialized);
   ```

2. Check log file:
   ```bash
   grep "StockfishEngine" logs/chess-sensei-*.log
   ```

3. Verify Stockfish files exist:
   ```bash
   ls stockfish/stockfish-17.1-lite-single-03e3232.{js,wasm}
   ```

**Resolution:**

1. **Manual initialization:**
   ```typescript
   await ipcClient.call('chess:startNewGame');
   ```

2. **If files missing:**
   - Reinstall application
   - Verify download integrity (checksum)

3. **If persistent failure:**
   - Restart application
   - Check for Stockfish WASM support (browsers)
   - Review error logs for specific error

---

### WebSocket Connection Failures

**Symptoms:**
- Frontend not responding to interactions
- IPC methods timing out
- Error: "WebSocket connection failed"

**Diagnosis:**

1. Check backend is running:
   ```bash
   # Windows
   netstat -an | findstr "9339"

   # Unix
   netstat -an | grep 9339
   ```

2. Test connection manually:
   ```typescript
   const ws = new WebSocket('ws://localhost:9339');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (e) => console.error('Connection failed:', e);
   ```

3. Check firewall settings:
   - Ensure localhost is allowed
   - Check port 9339 not blocked

**Resolution:**

1. **Restart application:**
   - Close all Chess-Sensei windows
   - Wait 5 seconds
   - Restart application

2. **Kill orphaned backend process:**
   ```bash
   # Windows
   taskkill /F /IM Chess-Sensei.exe

   # Unix
   pkill -f chess-sensei
   ```

3. **Check port conflict:**
   ```bash
   # Find process using port 9339
   # Windows
   netstat -ano | findstr "9339"

   # Unix
   lsof -i :9339
   ```

4. **Firewall configuration:**
   - Add exception for `Chess-Sensei.exe`
   - Allow localhost connections
   - Restart firewall service

---

### Analysis Performance Issues

**Symptoms:**
- Game analysis taking >30 seconds
- Engine analysis timeouts
- UI freezing during analysis

**Diagnosis:**

1. Check game length:
   ```typescript
   const gameLength = moves.length / 2; // Full moves
   console.log('Analyzing', gameLength, 'moves');
   // Expected time: ~10s for 40 moves
   ```

2. Monitor engine during analysis:
   ```bash
   tail -f logs/chess-sensei-*.log | grep "StockfishEngine"
   ```

3. Check system resources:
   - CPU usage (should be ~100% during analysis)
   - Memory usage (should be <500MB)

**Resolution:**

1. **Reduce analysis depth:**
   ```typescript
   // Default: depth 18
   // Reduce to: depth 15 for faster analysis
   ```

2. **Analyze fewer moves:**
   - Skip opening moves (first 10)
   - Analyze critical positions only

3. **Wait for completion:**
   - Analysis is CPU-intensive
   - Expected time: 5-10s for 40-move game
   - UI updates after completion

---

### Backup Creation Failures

**Symptoms:**
- Backup operation fails with error
- Incomplete backup files
- "Backup creation failed" message

**Diagnosis:**

1. Check available disk space:
   ```bash
   # Need ~2x game data size for backup
   # Typical: 500KB - 1MB for 25 games
   ```

2. Check backup directory:
   ```bash
   ls "%APPDATA%/Chess-Sensei/backups/"
   ```

3. Review error logs:
   ```bash
   grep "Backup" logs/chess-sensei-*.log | grep "ERROR"
   ```

**Resolution:**

1. **Free disk space:**
   - Delete old backups
   - Clean temporary files
   - Minimum 10MB free recommended

2. **Verify source files:**
   ```bash
   # Check games directory
   ls "%APPDATA%/Chess-Sensei/games/"

   # Check profile
   cat "%APPDATA%/Chess-Sensei/profile.json"
   ```

3. **Manual backup:**
   ```bash
   # Create ZIP manually
   cd "%APPDATA%/Chess-Sensei"
   zip -r backup-manual.zip games/ profile.json achievements.json
   ```

4. **Verify backup integrity:**
   ```typescript
   await ipcClient.call('chess:verifyBackup', {
     backupPath: 'path/to/backup.zip'
   });
   ```

---

## Common Issues

### Issue: "Application won't start"

**Possible causes:**
- Corrupted installation
- Missing dependencies
- Port 9339 in use

**Solutions:**
1. Reinstall application
2. Check port availability
3. Review logs for startup errors

---

### Issue: "Moves not highlighting"

**Possible causes:**
- Engine not initialized
- Invalid FEN string
- JavaScript error in renderer

**Solutions:**
1. Check browser console for errors
2. Verify engine status
3. Restart application

---

### Issue: "Analysis shows no mistakes"

**Possible causes:**
- Perfect game (rare!)
- Analysis depth too low
- Classification thresholds not met

**Solutions:**
1. Verify analysis completed
2. Check CPL values (should vary)
3. Review classification thresholds

---

## See Also

- [Troubleshooting](troubleshooting.md) - User-facing troubleshooting guide
- [API Reference](api-reference.md) - IPC methods and error codes
- [Data Model](data-model.md) - Storage implementation details
- [Security](security.md) - Security considerations and validation

---

**Operations Guide Version:** 1.1.0
**Target Audience:** Developers and maintainers
**Update Frequency:** After significant architectural changes
