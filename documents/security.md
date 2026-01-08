# Security Model

**Version:** 1.1.0
**Last Updated:** 2026-01-08

This document describes Chess-Sensei's security architecture, threat model, and
security considerations.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Security Principles](#security-principles)
4. [Input Validation](#input-validation)
5. [Data Privacy](#data-privacy)
6. [Neutralino Security](#neutralino-security)
7. [Known Security Considerations](#known-security-considerations)
8. [Security Best Practices](#security-best-practices)

---

## Security Overview

Chess-Sensei is designed as a **privacy-first, offline desktop application** with
no external dependencies, no network access, and no cloud services.

### Security Model Summary

```text
┌────────────────────────────────────────────────────────────────┐
│                        User System                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Chess-Sensei Process                     │  │
│  │                                                           │  │
│  │  ┌─────────────────┐        ┌─────────────────────────┐  │  │
│  │  │    Frontend     │        │        Backend          │  │  │
│  │  │   (Renderer)    │<──────>│       (Bun)             │  │  │
│  │  │                 │  WS    │                         │  │  │
│  │  │  - No file I/O  │  9339  │  - File read/write      │  │  │
│  │  │  - Sandboxed    │        │  - User data only       │  │  │
│  │  │                 │        │  - No network (offline) │  │  │
│  │  └─────────────────┘        └─────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌───────────────────────────────────────────────────┐   │  │
│  │  │            Stockfish Engine (WASM)                │   │  │
│  │  │         - Sandboxed (no file/network)             │   │  │
│  │  └───────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Data Location: %APPDATA%/Chess-Sensei/  (platform-specific)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trust Boundaries

| Component       | Trust Level | File Access | Network Access | Notes               |
| --------------- | ----------- | ----------- | -------------- | ------------------- |
| Frontend        | Low         | ❌ No       | ❌ No          | Sandboxed renderer  |
| Backend         | High        | ✅ Yes      | ❌ No          | User data only      |
| Stockfish WASM  | Low         | ❌ No       | ❌ No          | WASM sandbox        |
| IPC (WebSocket) | Medium      | N/A         | Localhost only | Port 9339           |

---

## Threat Model

### Threat Categories

#### 1. **External Network Attacks**

**Risk:** ❌ **Not Applicable**

Chess-Sensei is **completely offline** with:
- No external network connections
- No HTTP/HTTPS requests
- No cloud services
- No telemetry or analytics
- No automatic updates over network

**Mitigation:** Application does not expose any network services beyond
localhost WebSocket (127.0.0.1:9339).

---

#### 2. **Malicious Input (FEN Strings, File Paths)**

**Risk:** 🟡 **Medium**

User-provided FEN strings and file paths could potentially:
- Crash the engine with malformed FEN
- Cause path traversal attacks (e.g., `../../etc/passwd`)
- Inject malicious data into storage

**Mitigations:**
- FEN validation before engine processing
- Path sanitization for all file operations
- Type checking on all IPC parameters
- Bounded recursion and resource limits

See [Input Validation](#input-validation) for details.

---

#### 3. **Data Corruption**

**Risk:** 🟡 **Medium**

File system errors or application crashes could corrupt:
- Game records
- Player profiles
- Backups

**Mitigations:**
- Atomic file writes (write to `.tmp`, then rename)
- Automatic backup system
- Backup verification checksums
- JSON schema validation on load

See [Data Model](data-model.md#storage-implementation) for details.

---

#### 4. **Local Privilege Escalation**

**Risk:** 🟢 **Low**

Application runs with user privileges (not elevated).

**Mitigations:**
- No system-wide changes required
- No elevated permissions requested
- User data directory only (`%APPDATA%`)
- No registry modifications (Windows)
- No system daemon/service installation

---

#### 5. **Dependency Vulnerabilities**

**Risk:** 🟡 **Medium**

Third-party dependencies (Stockfish, chess.js, Neutralino) could have security
vulnerabilities.

**Mitigations:**
- Regular dependency updates
- Security advisories monitoring
- Minimal dependency footprint
- Sandboxed WASM engine (cannot access OS)

**Key Dependencies:**
- **Stockfish WASM:** GPL-3.0, widely audited, sandboxed
- **chess.js:** BSD-2-Clause, chess logic only
- **Neutralino.js:** MIT, native shell framework
- **Bun:** MIT, JavaScript runtime

---

#### 6. **Data Privacy Leaks**

**Risk:** 🟢 **Low**

No personal information collected or transmitted.

**Mitigations:**
- No telemetry
- No analytics
- No cloud sync
- No user accounts
- All data local

See [Data Privacy](#data-privacy) for details.

---

## Security Principles

Chess-Sensei follows these security principles:

### 1. Offline-First

✅ **No network access** - Application never connects to external servers
✅ **No cloud dependencies** - Fully functional without internet
✅ **Local-only data** - All user data stored locally

### 2. Minimal Attack Surface

✅ **No web server** - Only localhost WebSocket
✅ **No remote code execution** - No plugin system
✅ **No dynamic code loading** - All code bundled
✅ **Sandboxed components** - WASM engine has no OS access

### 3. Defense in Depth

✅ **Input validation** - All external input validated
✅ **Type safety** - TypeScript strict mode
✅ **Atomic operations** - Prevent partial writes
✅ **Error handling** - Graceful failure modes

### 4. Privacy by Design

✅ **No telemetry** - Zero data collection
✅ **No tracking** - No analytics or identifiers
✅ **User control** - Complete data ownership
✅ **Transparent storage** - Human-readable JSON

---

## Input Validation

All user-provided input is validated before processing.

### FEN String Validation

FEN (Forsyth-Edwards Notation) strings describe chess positions.

**Validation Rules:**
1. Format: 6 space-separated fields
2. Board: 8 ranks, valid pieces only
3. Kings: Exactly 1 per side
4. Turn: 'w' or 'b' only
5. Castling: Valid rights only (K, Q, k, q)
6. En passant: Valid square or '-'
7. Halfmove clock: Non-negative integer
8. Fullmove number: Positive integer

**Implementation:**

```typescript
function validateFEN(fen: string): boolean {
  try {
    const game = new Chess(fen); // chess.js validation
    return game.isValid();
  } catch {
    return false;
  }
}
```

**Example:**

```typescript
// Valid FEN
const validFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
validateFEN(validFEN); // true

// Invalid FEN (missing king)
const invalidFEN = "rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
validateFEN(invalidFEN); // false
```

### UCI Move Validation

UCI (Universal Chess Interface) moves are validated against current position.

**Format:** `<from><to>[promotion]`
**Examples:** `e2e4`, `e7e8q` (pawn promotion to queen)

**Validation:**
```typescript
function validateUCIMove(fen: string, uciMove: string): boolean {
  const game = new Chess(fen);
  const move = game.move(uciMove);
  return move !== null;
}
```

### File Path Sanitization

All file operations validate and sanitize paths.

**Security Rules:**
1. No path traversal (no `..` components)
2. Must be within user data directory
3. No absolute paths accepted from user
4. Filename length limits (255 characters)
5. No special characters in filenames

**Implementation:**

```typescript
function sanitizeFilePath(userPath: string, baseDir: string): string | null {
  // Resolve to absolute path
  const resolved = path.resolve(baseDir, userPath);

  // Check if within base directory
  if (!resolved.startsWith(baseDir)) {
    return null; // Path traversal attempt
  }

  // Validate filename
  const filename = path.basename(resolved);
  if (filename.length > 255) {
    return null;
  }

  // Reject special characters
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return null;
  }

  return resolved;
}
```

**Example:**

```typescript
// Valid paths
sanitizeFilePath("games/game-123.json", appDataDir); // OK
sanitizeFilePath("profile.json", appDataDir);        // OK

// Invalid paths (rejected)
sanitizeFilePath("../../etc/passwd", appDataDir);    // null (traversal)
sanitizeFilePath("/etc/passwd", appDataDir);         // null (absolute)
sanitizeFilePath("file<script>.json", appDataDir);   // null (special chars)
```

### IPC Parameter Validation

All IPC method parameters are type-checked.

**Validation Layers:**
1. **Schema validation** - TypeScript types enforced
2. **Runtime type guards** - Check types at runtime
3. **Parameter bounds** - Numeric ranges validated
4. **Required fields** - Missing parameters rejected

**Example:**

```typescript
function validateAnalysisParams(params: any): boolean {
  return (
    typeof params.fen === 'string' &&
    typeof params.depth === 'number' &&
    params.depth >= 1 &&
    params.depth <= 30
  );
}
```

---

## Data Privacy

### No Personal Information Collected

Chess-Sensei **does not collect** any of the following:

❌ Email addresses
❌ Usernames
❌ Passwords
❌ Payment information
❌ IP addresses
❌ Device identifiers
❌ Location data
❌ Browsing history
❌ Usage analytics

### What Data Is Stored

✅ **Game records** - Your chess games (local only)
✅ **Player profile** - Your metrics and stats (local only)
✅ **Achievements** - Unlocked achievements (local only)
✅ **Settings** - Application preferences (local only)

### Data Storage Location

All data is stored locally in platform-specific directories:

- **Windows:** `%APPDATA%\Chess-Sensei\`
- **macOS:** `~/Library/Application Support/Chess-Sensei/`
- **Linux:** `~/.config/Chess-Sensei/`

**No cloud storage** - Data never leaves your device.

### Data Export

Users have complete control over their data:

✅ Export games to PGN format (portable)
✅ Export profile to JSON (portable)
✅ Create full backups (ZIP archives)
✅ Import data from backups
✅ Delete all data (delete directory)

See [Data Management](data-management.md) for export procedures.

### No Telemetry

Chess-Sensei does **not** send any data to external servers:

❌ No usage tracking
❌ No crash reports
❌ No error telemetry
❌ No analytics
❌ No A/B testing
❌ No automatic updates over network

---

## Neutralino Security

Chess-Sensei uses Neutralino.js for the desktop shell, which provides security
features:

### Native API Whitelist

Only specific Neutralino APIs are allowed:

```json
{
  "nativeAllowList": [
    "events.*",           // Event system
    "app.*",              // App lifecycle
    "os.*",               // OS info (version, platform)
    "debug.log",          // Debug logging
    "window.setMainMenu", // Native menus
    "window.print",       // Print functionality
    "clipboard.writeHTML" // Clipboard operations
  ]
}
```

**Blocked APIs:**
- `filesystem.*` - No direct file access from frontend
- `computer.*` - No system commands
- `storage.*` - No native storage access
- `updater.*` - No automatic updates

### Token Security

- **One-time token** - Generated at runtime
- **Not persisted** - Token never stored to disk
- **Localhost only** - WebSocket bound to 127.0.0.1

### WebView Isolation

- **No Node.js access** - Frontend is pure browser environment
- **No require()** - Cannot load native modules
- **Content Security Policy** - XSS protection
- **Same-origin policy** - Enforced

---

## Known Security Considerations

### Low Risk

✅ **Local WebSocket port (9339)** - Only accessible from localhost, not exposed
to network
✅ **User-level permissions** - No elevated privileges required
✅ **WASM sandboxing** - Stockfish engine has no OS access
✅ **Read-only assets** - Chess piece SVGs and sounds are static
✅ **No external resources** - All resources bundled

### Medium Risk

⚠️ **File system access** - Backend can read/write user data directory
  - **Mitigation:** Path sanitization, no traversal allowed
  - **Mitigation:** User data directory only, no system files

⚠️ **User-provided FEN strings** - Could crash engine with invalid input
  - **Mitigation:** FEN validation before engine processing
  - **Mitigation:** Engine errors caught and logged

⚠️ **Dependency vulnerabilities** - Third-party packages could have CVEs
  - **Mitigation:** Regular updates, security advisories monitored
  - **Mitigation:** Minimal dependencies, widely-used packages

### Accepted Risks

🔵 **No code signing** - Executables not digitally signed (future enhancement)
🔵 **No sandboxing on Windows** - Backend runs with full user privileges
🔵 **No automatic updates** - Manual download required for updates

---

## Security Best Practices

### For Users

1. **Download from official sources only**
   - GitHub Releases: <https://github.com/Grips001/Chess-Sensei/releases>
   - Verify file checksums if provided

2. **Keep application updated**
   - Check for new releases periodically
   - Read CHANGELOG for security fixes

3. **Backup your data**
   - Use automatic backup feature
   - Export games to PGN regularly
   - Store backups securely

4. **Report security issues**
   - Open GitHub issue (public)
   - Contact maintainers (for sensitive issues)

### For Developers

1. **Input validation**
   - Validate all user input
   - Use type guards at runtime
   - Sanitize file paths

2. **Error handling**
   - Catch all exceptions
   - Log errors securely
   - Fail gracefully

3. **Dependency management**
   - Run `bun audit` regularly
   - Update dependencies promptly
   - Review security advisories

4. **Code review**
   - Review all PR changes
   - Check for security issues
   - Use linters and type checking

---

## Security Reporting

If you discover a security vulnerability in Chess-Sensei:

### Public Issues (Non-Critical)

For non-critical security issues, please:
1. Open a GitHub issue: <https://github.com/Grips001/Chess-Sensei/issues>
2. Label it as `security`
3. Describe the issue and impact

### Sensitive Issues (Critical)

For critical security vulnerabilities that could be exploited:
1. **Do not** open a public issue
2. Contact project maintainers directly
3. Allow time for patch before public disclosure

**Response Time:**
- Acknowledgment: Within 48 hours
- Initial assessment: Within 1 week
- Fix timeline: Based on severity

---

## Security Checklist

Use this checklist when reviewing code or features:

- [ ] All user input validated
- [ ] File paths sanitized (no traversal)
- [ ] FEN strings validated before engine use
- [ ] UCI moves validated against position
- [ ] IPC parameters type-checked
- [ ] Error handling for all operations
- [ ] No sensitive data logged
- [ ] No network requests made
- [ ] Atomic file writes used
- [ ] Backup integrity verified
- [ ] TypeScript strict mode enabled
- [ ] All tests passing
- [ ] Linters passing (no unsafe patterns)

---

## See Also

- [Data Model](data-model.md) - Storage implementation and atomic writes
- [API Reference](api-reference.md) - IPC method parameters and validation
- [Architecture](../.github/process/ARCHITECTURE.md) - System architecture
- [Contributing](../CONTRIBUTING.md) - Security review process

---

**Security Model Version:** 1.1.0
**Last Security Audit:** 2026-01-08
**Next Review:** After any major architectural changes
