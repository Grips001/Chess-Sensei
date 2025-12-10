# Operational Runbook

This document provides operational procedures for common issues and incidents
related to Chess-Sensei.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Build Issues](#build-issues)
3. [Runtime Issues](#runtime-issues)
4. [Data Issues](#data-issues)
5. [Engine Issues](#engine-issues)
6. [CI/CD Issues](#cicd-issues)
7. [Incident Response](#incident-response)

---

## Quick Reference

### Common Commands

```bash
# Development
bun run dev              # Start dev server

# Testing
bun run test             # Run tests
bun run verify           # Full verification

# Building
bun run build:windows    # Windows build
bun run build:linux      # Linux build
bun run build:macos      # macOS build

# Debugging
bun run dev -- --dev     # Enable debug logging
```

### Log Locations

| Platform | Log Directory                                      |
| -------- | -------------------------------------------------- |
| Windows  | `%APPDATA%/Chess-Sensei/logs/`                     |
| macOS    | `~/Library/Application Support/Chess-Sensei/logs/` |
| Linux    | `~/.local/share/Chess-Sensei/logs/`                |

### Data Locations

| Platform | Data Directory                                |
| -------- | --------------------------------------------- |
| Windows  | `%APPDATA%/Chess-Sensei/`                     |
| macOS    | `~/Library/Application Support/Chess-Sensei/` |
| Linux    | `~/.local/share/Chess-Sensei/`                |

---

## Build Issues

### Issue: Windows Build Fails with pe-library Error

**Symptoms:**

```text
Error: Cannot find module 'pe-library'
```

**Cause:** Using `bun run build:app` on Windows

**Resolution:**

1. Use platform-specific build command:

   ```bash
   bun run build:windows
   ```

2. Never use `bun run build:app` on Windows

**Prevention:** Document in build instructions

---

### Issue: Neutralino Binary Not Found

**Symptoms:**

```text
Error: neutralino binary not found
```

**Resolution:**

1. Ensure `bin/` directory exists
2. Run:

   ```bash
   bunx neu update
   ```

3. Rebuild

---

### Issue: rcedit Fails on Windows

**Symptoms:**

```text
Error: rcedit failed to set icon
```

**Resolution:**

1. Verify icon file exists: `public/icons/chess-sensei.ico`
2. Check icon format (must be .ico for Windows)
3. Run as administrator if permission denied
4. Try rebuilding with clean dist:

   ```bash
   rm -rf dist build
   bun run build:windows
   ```

---

## Runtime Issues

### Issue: Application Won't Start

**Symptoms:** Application opens and immediately closes

**Diagnosis:**

1. Check for crash log in log directory
2. Run from command line to see console output:

   ```bash
   ./Chess-Sensei.exe  # Windows
   ./Chess-Sensei      # Linux/macOS
   ```

**Common Causes:**

1. **Port 9339 in use:**

   ```bash
   # Windows
   netstat -ano | findstr 9339

   # Linux/macOS
   lsof -i :9339
   ```

   Kill conflicting process and retry

2. **Corrupted data file:**
   - Rename data directory and restart (creates fresh)
   - Restore from backup if needed

3. **Missing resources:**
   - Verify `resources.neu` exists in app directory

---

### Issue: WebSocket Connection Failed

**Symptoms:**

- "Connecting to backend..." never completes
- IPC calls time out

**Diagnosis:**

1. Check if backend process is running
2. Check port 9339 availability
3. Check firewall settings

**Resolution:**

1. Restart application
2. If persists, check for antivirus blocking WebSocket
3. Check log files for specific error

---

### Issue: UI Not Responding

**Symptoms:** Clicks have no effect, UI appears frozen

**Diagnosis:**

1. Open DevTools (F12 or right-click → Inspect)
2. Check Console for JavaScript errors
3. Check Network tab for failed requests

**Resolution:**

1. If JavaScript error: Note error and file bug report
2. If network timeout: Check backend status
3. Try refreshing (Ctrl+R / Cmd+R)

---

## Data Issues

### Issue: Game Data Not Saving

**Symptoms:** Games not appearing in history after restart

**Diagnosis:**

1. Check data directory exists and is writable
2. Check for disk space
3. Check log files for write errors

**Resolution:**

1. Verify data path permissions
2. Check disk space
3. If file corrupted, restore from backup:

   ```bash
   # Backups location
   Chess-Sensei/backups/
   ```

---

### Issue: Corrupted Player Profile

**Symptoms:**

- Progress Dashboard shows errors
- Statistics display incorrectly

**Resolution:**

1. Locate profile file:

   ```text
   Chess-Sensei/player-profile.json
   ```

2. Option A: Restore from backup

   ```bash
   cp backups/profile-YYYY-MM-DD.json player-profile.json
   ```

3. Option B: Reset profile (loses data)

   ```bash
   rm player-profile.json
   # Restart app - creates fresh profile
   ```

---

### Issue: Import Fails

**Symptoms:** Import wizard shows error

**Diagnosis:**

1. Check file format (PGN or JSON)
2. Check file encoding (UTF-8 required)
3. Check file size (very large files may timeout)

**Resolution:**

1. Validate file format
2. For large imports, split into smaller files
3. Check log files for specific error

---

## Engine Issues

### Issue: Engine Not Initializing

**Symptoms:**

- "Engine loading..." never completes
- Analysis not available

**Diagnosis:**

1. Check `stockfish/` directory exists in app folder
2. Check WASM file integrity
3. Check console for WASM errors

**Resolution:**

1. Verify stockfish files present:

   ```text
   stockfish/stockfish-nnue-17.js
   stockfish/stockfish-nnue-17.wasm
   ```

2. Reinstall/re-extract application

---

### Issue: Engine Crashes During Analysis

**Symptoms:**

- Analysis stops unexpectedly
- Error in console about engine

**Diagnosis:**

1. Check position validity (FEN)
2. Check memory usage
3. Note position that caused crash

**Resolution:**

1. Restart application
2. If reproducible, file bug report with FEN

---

### Issue: Slow Engine Response

**Symptoms:** Analysis takes very long

**Possible Causes:**

1. Deep analysis depth setting
2. Complex position
3. System resource constraints

**Resolution:**

1. Check analysis depth settings
2. Close other applications
3. For very complex positions, expect longer times

---

## CI/CD Issues

### Issue: GitHub Actions Build Fails

**Symptoms:** CI shows red X on PR or release

**Diagnosis:**

1. Click on failing job
2. Read error message
3. Check which step failed

**Common Failures:**

1. **Test failure:**
   - Run tests locally: `bun run test`
   - Fix failing test

2. **Type error:**
   - Run typecheck locally: `bun run typecheck`
   - Fix type issue

3. **Lint error:**
   - Run lint locally: `bun run lint:fix`
   - Commit fixes

4. **Build failure:**
   - Check platform-specific build logs
   - May be CI environment issue (retry)

---

### Issue: Release Not Publishing

**Symptoms:** Tag pushed but no release created

**Diagnosis:**

1. Check GitHub Actions tab for workflow run
2. Check workflow permissions

**Resolution:**

1. Verify tag format matches `v*` pattern
2. Check `GITHUB_TOKEN` permissions
3. Manually trigger workflow if needed:

   ```bash
   gh workflow run release.yml --ref v1.0.0
   ```

---

## Incident Response

### Severity Levels

| Level    | Definition                          | Response Time |
| -------- | ----------------------------------- | ------------- |
| Critical | App unusable, data loss             | Immediate     |
| High     | Major feature broken                | Same day      |
| Medium   | Feature impaired, workaround exists | Within week   |
| Low      | Minor issue, cosmetic               | Next release  |

### Incident Process

1. **Identify**
   - Reproduce the issue
   - Document steps to reproduce
   - Note affected version and platform

2. **Assess**
   - Determine severity
   - Identify affected users
   - Check for workarounds

3. **Communicate**
   - Create GitHub issue
   - Update status if widespread

4. **Resolve**
   - Develop fix
   - Test fix thoroughly
   - Release hotfix if critical

5. **Review**
   - Document root cause
   - Update runbook if needed
   - Consider prevention measures

### Contact Escalation

| Issue Type               | Primary Contact        |
| ------------------------ | ---------------------- |
| Bug reports              | GitHub Issues          |
| Security vulnerabilities | Security contact (TBD) |
| General questions        | GitHub Discussions     |

---

## Observability

### Health Checks

**Application Health:**

- Can load application
- Can start new game
- Engine responds to analysis

**Data Health:**

- Profile loads without error
- Games save correctly
- Backups created on schedule

### Monitoring Points

For future implementation:

- [ ] Error rate tracking
- [ ] Performance metrics
- [ ] Usage analytics (opt-in)

### Log Levels

| Level | Use For                      |
| ----- | ---------------------------- |
| DEBUG | Detailed debugging info      |
| INFO  | Normal operations            |
| WARN  | Recoverable issues           |
| ERROR | Failures requiring attention |

Enable debug logging with `--dev` flag:

```bash
Chess-Sensei --dev
```
