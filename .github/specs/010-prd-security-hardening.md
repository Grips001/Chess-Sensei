# PRD: Security Hardening - Input Validation & Rate Limiting

> **Status:** Draft
> **Author:** Claude (AI Assistant)
> **Created:** 2026-01-08
> **Last Updated:** 2026-01-08
> **Related Issues:** N/A

---

## Executive Summary

Enhance Chess-Sensei's security through comprehensive input validation, file path sanitization, and IPC rate limiting. While the app is offline and local, proper security hardening prevents bugs, improves robustness, and protects against edge cases and malicious inputs.

## Problem Statement

### Current State

Chess-Sensei v1.1.0 has basic security but room for improvement:

- **Input Validation:** Basic FEN validation, minimal parameter checking
- **File Path Validation:** No explicit path sanitization or traversal prevention
- **IPC Security:** No rate limiting on expensive operations
- **Error Handling:** Generic errors, may leak implementation details
- **Schema Validation:** Manual checks, inconsistent across handlers

### User Pain Points

**Security Concerns:**
- Malformed FEN strings could crash engine
- Path traversal in file operations (export/import)
- Expensive IPC operations could hang app (no rate limiting)
- Poorly validated inputs cause cryptic runtime errors

**Developer Concerns:**
- Difficult to validate inputs consistently
- No protection against edge cases
- Time-consuming manual validation code
- Hard to ensure all inputs are validated

### Impact

**Affected Users:** All users (security), developers (validation complexity)

**Severity:** Medium-Low - App works but lacks defense-in-depth

## Goals

### Primary Goals

1. **Implement comprehensive FEN validation** with detailed error messages
2. **Add file path sanitization** to prevent path traversal
3. **Implement IPC rate limiting** for expensive operations
4. **Standardize input validation** across all IPC handlers
5. **Improve error messages** without leaking sensitive details

### Non-Goals

1. Cryptographic security (no secrets, no encryption needed)
2. Network security (app is offline-only)
3. User authentication (single-user local app)
4. Code obfuscation or anti-tampering
5. Sandboxing beyond what's already in place (WASM)

### Success Metrics

| Metric                        | Current | Target | Measurement Method                |
| ----------------------------- | ------- | ------ | --------------------------------- |
| Input validation coverage     | 40%     | 100%   | Review all IPC handlers           |
| Path traversal vulnerabilities| Unknown | 0      | Security audit                    |
| Rate limit coverage           | 0%      | 100%   | Expensive operations identified   |
| Invalid input crashes         | 2/month | 0      | Error tracking                    |
| Validation error clarity      | Low     | High   | User testing                      |

## User Stories

### Primary User Story

```text
As a user of Chess-Sensei
I want my data to be protected from accidental corruption
So that my games and progress are safe even with malformed inputs
```

### Secondary User Stories

```text
As a developer
I want comprehensive input validation
So that I can trust all inputs are safe and well-formed

As a user importing games
I want clear error messages for invalid PGN files
So that I know exactly what's wrong and how to fix it

As a user
I want the app to be responsive even during heavy operations
So that I can cancel or continue working
```

## Requirements

### Functional Requirements

| ID    | Requirement                                              | Priority | Notes                                   |
| ----- | -------------------------------------------------------- | -------- | --------------------------------------- |
| FR-01 | Comprehensive FEN validation library                     | Must     | Detailed error messages, edge cases     |
| FR-02 | File path sanitization for all file operations           | Must     | Prevent traversal, restrict to user dir |
| FR-03 | IPC rate limiting for expensive operations               | Must     | Analysis, guidance, bot move requests   |
| FR-04 | Schema validation for all IPC method parameters          | Must     | Using Zod (from code quality PRD)       |
| FR-05 | Sanitized error messages (no sensitive details)          | Must     | Safe for user display                   |
| FR-06 | Input length limits for all string parameters            | Should   | Prevent DoS via huge inputs             |
| FR-07 | File size limits for import operations                   | Should   | Prevent memory exhaustion               |

### Non-Functional Requirements

| ID     | Requirement            | Criteria                                           |
| ------ | ---------------------- | -------------------------------------------------- |
| NFR-01 | Performance            | Validation overhead <5ms per request               |
| NFR-02 | Usability              | Clear error messages with actionable guidance      |
| NFR-03 | Robustness             | Handle all edge cases gracefully                   |
| NFR-04 | Maintainability        | Validation logic centralized and reusable          |

## User Experience

### User Experience Flow: Invalid FEN Input

**Before (Current):**

```text
User enters invalid FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 extra"

System response:
"Invalid FEN"

User confused:
- What's wrong with my FEN?
- Which part is invalid?
- How do I fix it?
```

**After (Improved):**

```text
User enters invalid FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 extra"

System response:
"Invalid FEN format:
 - FEN must have exactly 6 space-separated components
 - Found 7 components (extra: 'extra')
 - Expected format: [pieces] [turn] [castling] [en passant] [halfmove] [fullmove]"

User understands and can fix:
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
```

### User Experience Flow: File Import with Path Traversal

**Before (Current):**

```text
Malicious input: Import from "../../../../etc/passwd"

System may:
- Attempt to read system files
- Crash with unclear error
- Leak file paths in error message
```

**After (Improved):**

```text
Malicious input: Import from "../../../../etc/passwd"

System response:
"Invalid file path: Path traversal detected"

User sees:
- Clear security message
- No access to system files
- App remains stable
```

### User Experience Flow: Rate Limiting

**Before (Current):**

```text
User rapidly clicks "Analyze" button 20 times

System:
- Queues 20 analysis operations
- UI becomes unresponsive
- App appears frozen
- User must force quit
```

**After (Improved):**

```text
User rapidly clicks "Analyze" button 20 times

System:
- First request processes normally
- Subsequent requests within 1 second are debounced
- After 10 requests/second, show message:
  "Analysis rate limit reached. Please wait..."
- UI remains responsive
- User sees feedback, can wait or cancel
```

### Edge Cases

| Scenario                              | Expected Behavior                                      |
| ------------------------------------- | ------------------------------------------------------ |
| FEN with 3 kings                      | ValidationError: "Must have exactly 1 king per side"   |
| Import path with ".."                 | SecurityError: "Path traversal detected"               |
| 1000 analysis requests/second         | Rate limited after 10/sec, clear error message         |
| Import 1GB PGN file                   | Error: "File too large (max 10MB)"                     |
| FEN with invalid square notation      | ValidationError: "Invalid square 'i9' (must be a1-h8)" |

## Technical Considerations

### Dependencies

- **Zod:** Schema validation (from code quality PRD)
- **Backend:** data-storage.ts, export-import.ts (file operations)
- **Shared:** FEN validation, path sanitization utilities
- **No new external dependencies**

### Constraints

- Validation must not significantly impact performance
- Error messages must be user-friendly, not technical
- Rate limiting must not impact normal usage
- File path validation must work across all platforms (Windows, macOS, Linux)

### Risks

| Risk                                  | Likelihood | Impact | Mitigation                                        |
| ------------------------------------- | ---------- | ------ | ------------------------------------------------- |
| Validation too strict, rejects valid input | Medium | Medium | Comprehensive testing, allow edge cases      |
| Rate limiting impacts legitimate use  | Low        | Medium | Tune limits based on user testing                 |
| Path sanitization breaks valid paths  | Low        | High   | Test on all platforms, use path.resolve()         |
| Validation overhead impacts perf      | Low        | Low    | Benchmark, optimize if needed                     |

## Alternatives Considered

### Option 1: No Rate Limiting (Trust User)

- **Pros:** Simpler implementation, no restrictions
- **Cons:** App can hang from rapid requests, poor UX
- **Why rejected:** Professional apps should be robust against misuse

### Option 2: Aggressive Rate Limiting

- **Pros:** Maximum protection against abuse
- **Cons:** Could frustrate legitimate users
- **Why rejected:** Balance needed, tune based on actual usage patterns

### Option 3: Trust All File Paths

- **Pros:** No validation overhead
- **Cons:** Potential security issues, unexpected behavior
- **Why rejected:** Defense-in-depth principle, prevent bugs

## Implementation Plan

### Phases

1. **Phase 6A: Input Validation (Week 11)**
   - Implement comprehensive FEN validation library
   - Add Zod schemas for all IPC methods (if not done in code quality PRD)
   - Validate all string lengths and numeric ranges
   - Add file size limits for imports

2. **Phase 6B: File Path Security (Week 11)**
   - Implement path sanitization utility
   - Audit all file operations (storage, export, import)
   - Add path validation to all file I/O functions
   - Test on all platforms

3. **Phase 6C: Rate Limiting (Week 12)**
   - Implement RateLimiter class with sliding window
   - Identify expensive operations to rate limit
   - Add rate limiting to IPC handlers
   - Add user-friendly rate limit error messages

4. **Phase 6D: Testing & Security Audit (Week 12)**
   - Comprehensive testing of validation edge cases
   - Security audit of all inputs and file operations
   - Fuzz testing with invalid inputs
   - Document security measures

### Implementation Dependencies

- Input validation can be done incrementally per handler
- File path sanitization must be complete before any file operations
- Rate limiting is independent, can be added last

## Open Questions

1. **What rate limits are appropriate for each operation?**
   - Proposal: Analysis: 1/sec, Guidance: 10/sec, Bot move: 1/sec
   - Tune based on user testing

2. **Should rate limits be configurable by users?**
   - Proposal: Not initially, hardcode reasonable limits

3. **Should we implement CAPTCHA-like protection?**
   - Proposal: No, unnecessary for offline single-user app

4. **Should file path validation be platform-specific?**
   - Proposal: Use Node.js path module for cross-platform safety

---

## Approval

| Role           | Name | Date | Status  |
| -------------- | ---- | ---- | ------- |
| Product Owner  |      |      | Pending |
| Tech Lead      |      |      | Pending |
| Design (if UI) | N/A  | N/A  | N/A     |

## Revision History

| Version | Date       | Author  | Changes         |
| ------- | ---------- | ------- | --------------- |
| 0.1     | 2026-01-08 | Claude  | Initial draft   |
