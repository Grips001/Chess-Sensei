# Tech Spec: Security Hardening - Input Validation & Rate Limiting

> **Status:** Draft **Author:** Claude (AI Assistant) **Created:** 2026-01-08
> **Last Updated:** 2026-01-08 **Related PRD:**
> [010-prd-security-hardening.md](./010-prd-security-hardening.md)

---

## 1. Overview

### 1.1 Summary

Implement comprehensive security hardening through input validation, file path
sanitization, and IPC rate limiting. This includes a robust FEN validation
library, path traversal prevention, rate limiting for expensive operations, and
integration with Zod schema validation.

### 1.2 Goals

1. Prevent crashes from malformed inputs with detailed error messages
2. Protect against path traversal attacks in file operations
3. Prevent UI hangs through rate limiting of expensive operations
4. Standardize input validation across all IPC handlers
5. Maintain performance (<5ms validation overhead)

### 1.3 Non-Goals

1. Cryptographic security (no encryption/secrets needed)
2. Network security (offline-only app)
3. User authentication systems
4. Code obfuscation or anti-tampering
5. Additional sandboxing beyond WASM

---

## 2. Background

### 2.1 Current Architecture

**Input Validation:**

- Basic FEN validation in chess-logic.ts
- Manual parameter checking in IPC handlers
- Generic error messages
- No centralized validation library

**File Operations:**

- Direct file path usage in data-storage.ts
- No explicit path sanitization
- Trust user-provided paths

**IPC Security:**

- No rate limiting
- Synchronous expensive operations
- No protection against rapid requests

### 2.2 Key Concepts

**FEN (Forsyth-Edwards Notation):**

- Standard notation for chess positions
- Format: `[pieces] [turn] [castling] [en passant] [halfmove] [fullmove]`
- Must be thoroughly validated to prevent engine crashes

**Path Traversal:**

- Security vulnerability where `../` in paths access parent directories
- Can expose system files or corrupt user data
- Prevented through path normalization and validation

**Rate Limiting:**

- Throttle expensive operations to prevent resource exhaustion
- Sliding window algorithm for fair distribution
- Per-operation limits based on computational cost

**Defense in Depth:**

- Multiple layers of security validation
- Fail-safe defaults
- Clear error messages without sensitive details

---

## 3. Detailed Design

### 3.1 Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                           Frontend                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  IPC Calls with User Input                                 │ │
│  │  - FEN strings, file paths, numeric parameters            │ │
│  └────────────────┬───────────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    IPC Handler Layer                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Zod Schema Validation (Type + Format)                 │ │
│  │  2. Rate Limit Check (Expensive Operations)               │ │
│  │  3. Custom Validation (FEN, Paths)                        │ │
│  └────────────────┬───────────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  FEN Validator   │  │  Path Sanitizer  │  │ Rate Limiter  │ │
│  │                  │  │                  │  │               │ │
│  │  - Piece count   │  │  - Normalize     │  │  - Per-op     │ │
│  │  - Board state   │  │  - Traversal     │  │  - Sliding    │ │
│  │  - King check    │  │  - Whitelist dir │  │  - Debounce   │ │
│  │  - Turn/Castling │  │  - Platform safe │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Engine, Storage, Game Logic                               │ │
│  │  (Receives only validated, sanitized inputs)              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Changes

#### 3.2.1 New Component: FEN Validator

**File:** `backend/src/validators/fen-validator.ts`

```typescript
import { ValidationError } from '../errors/chess-sensei-error';

export interface FENComponents {
  pieces: string;
  turn: 'w' | 'b';
  castling: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
}

export interface FENValidationResult {
  valid: boolean;
  components?: FENComponents;
  errors: string[];
}

export class FENValidator {
  private static readonly FEN_COMPONENT_COUNT = 6;
  private static readonly VALID_PIECES = 'pnbrqkPNBRQK';
  private static readonly RANK_SEPARATOR = '/';
  private static readonly BOARD_RANKS = 8;
  private static readonly BOARD_FILES = 8;

  /**
   * Validates a FEN string with comprehensive error messages
   */
  static validate(fen: string): FENValidationResult {
    const errors: string[] = [];

    // Basic format check
    if (typeof fen !== 'string') {
      return { valid: false, errors: ['FEN must be a string'] };
    }

    if (fen.trim() === '') {
      return { valid: false, errors: ['FEN cannot be empty'] };
    }

    // Split into components
    const parts = fen.trim().split(/\s+/);
    if (parts.length !== this.FEN_COMPONENT_COUNT) {
      errors.push(
        `FEN must have exactly ${this.FEN_COMPONENT_COUNT} space-separated components`,
        `Found ${parts.length} component${parts.length !== 1 ? 's' : ''}`,
        `Expected format: [pieces] [turn] [castling] [en passant] [halfmove] [fullmove]`
      );
      return { valid: false, errors };
    }

    const [pieces, turn, castling, enPassant, halfmove, fullmove] = parts;

    // Validate pieces placement
    const piecesErrors = this.validatePiecePlacement(pieces);
    errors.push(...piecesErrors);

    // Validate turn
    if (turn !== 'w' && turn !== 'b') {
      errors.push(`Turn must be 'w' (white) or 'b' (black), got '${turn}'`);
    }

    // Validate castling rights
    const castlingErrors = this.validateCastling(castling);
    errors.push(...castlingErrors);

    // Validate en passant
    const enPassantErrors = this.validateEnPassant(enPassant);
    errors.push(...enPassantErrors);

    // Validate halfmove clock
    const halfmoveNum = parseInt(halfmove, 10);
    if (isNaN(halfmoveNum) || halfmoveNum < 0) {
      errors.push(
        `Halfmove clock must be a non-negative integer, got '${halfmove}'`
      );
    }

    // Validate fullmove number
    const fullmoveNum = parseInt(fullmove, 10);
    if (isNaN(fullmoveNum) || fullmoveNum < 1) {
      errors.push(
        `Fullmove number must be a positive integer, got '${fullmove}'`
      );
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      components: {
        pieces,
        turn: turn as 'w' | 'b',
        castling,
        enPassant,
        halfmove: halfmoveNum,
        fullmove: fullmoveNum,
      },
      errors: [],
    };
  }

  /**
   * Validates the piece placement component
   */
  private static validatePiecePlacement(pieces: string): string[] {
    const errors: string[] = [];

    const ranks = pieces.split(this.RANK_SEPARATOR);
    if (ranks.length !== this.BOARD_RANKS) {
      errors.push(
        `Piece placement must have exactly ${this.BOARD_RANKS} ranks separated by '/'`,
        `Found ${ranks.length} rank${ranks.length !== 1 ? 's' : ''}`
      );
      return errors;
    }

    const pieceCount = {
      K: 0, // White king
      k: 0, // Black king
      Q: 0, // White queens
      q: 0, // Black queens
      P: 0, // White pawns
      p: 0, // Black pawns
    };

    ranks.forEach((rank, rankIndex) => {
      let fileCount = 0;
      let prevWasDigit = false;

      for (let i = 0; i < rank.length; i++) {
        const char = rank[i];

        if (char >= '1' && char <= '8') {
          if (prevWasDigit) {
            errors.push(
              `Rank ${rankIndex + 1}: Consecutive digits not allowed ('${rank[i - 1]}${char}')`
            );
          }
          fileCount += parseInt(char, 10);
          prevWasDigit = true;
        } else if (this.VALID_PIECES.includes(char)) {
          fileCount++;
          prevWasDigit = false;

          // Count special pieces
          if (char === 'K') pieceCount.K++;
          if (char === 'k') pieceCount.k++;
          if (char === 'Q') pieceCount.Q++;
          if (char === 'q') pieceCount.q++;
          if (char === 'P') pieceCount.P++;
          if (char === 'p') pieceCount.p++;
        } else {
          errors.push(
            `Rank ${rankIndex + 1}: Invalid character '${char}'`,
            `Valid pieces: ${this.VALID_PIECES}, valid digits: 1-8`
          );
        }
      }

      if (fileCount !== this.BOARD_FILES) {
        errors.push(
          `Rank ${rankIndex + 1}: Must have exactly ${this.BOARD_FILES} squares`,
          `Found ${fileCount} square${fileCount !== 1 ? 's' : ''}`
        );
      }
    });

    // Validate king count
    if (pieceCount.K !== 1) {
      errors.push(`Must have exactly 1 white king (found ${pieceCount.K})`);
    }
    if (pieceCount.k !== 1) {
      errors.push(`Must have exactly 1 black king (found ${pieceCount.k})`);
    }

    // Validate queen count (can be promoted, so up to 9)
    if (pieceCount.Q > 9) {
      errors.push(
        `Cannot have more than 9 white queens (found ${pieceCount.Q})`
      );
    }
    if (pieceCount.q > 9) {
      errors.push(
        `Cannot have more than 9 black queens (found ${pieceCount.q})`
      );
    }

    // Validate pawn count and position
    if (pieceCount.P > 8) {
      errors.push(
        `Cannot have more than 8 white pawns (found ${pieceCount.P})`
      );
    }
    if (pieceCount.p > 8) {
      errors.push(
        `Cannot have more than 8 black pawns (found ${pieceCount.p})`
      );
    }

    // Check pawns not on first/last rank
    const firstRank = ranks[0];
    const lastRank = ranks[7];
    if (firstRank.includes('P') || firstRank.includes('p')) {
      errors.push('Pawns cannot be on the first rank (rank 8)');
    }
    if (lastRank.includes('P') || lastRank.includes('p')) {
      errors.push('Pawns cannot be on the last rank (rank 1)');
    }

    return errors;
  }

  /**
   * Validates castling rights component
   */
  private static validateCastling(castling: string): string[] {
    const errors: string[] = [];

    if (castling === '-') {
      return errors; // Valid: no castling rights
    }

    const validChars = 'KQkq';
    const seen = new Set<string>();

    for (const char of castling) {
      if (!validChars.includes(char)) {
        errors.push(
          `Invalid castling character '${char}'`,
          `Valid characters: K (white kingside), Q (white queenside), k (black kingside), q (black queenside), or '-' (none)`
        );
      }

      if (seen.has(char)) {
        errors.push(`Duplicate castling character '${char}'`);
      }
      seen.add(char);
    }

    // Check correct order: KQkq
    const correctOrder = ['K', 'Q', 'k', 'q'];
    const castlingArray = castling.split('');
    const sortedCastling = castlingArray
      .slice()
      .sort((a, b) => correctOrder.indexOf(a) - correctOrder.indexOf(b))
      .join('');

    if (castling !== sortedCastling) {
      errors.push(
        `Castling rights must be in order 'KQkq'`,
        `Expected: '${sortedCastling}', got: '${castling}'`
      );
    }

    return errors;
  }

  /**
   * Validates en passant target square
   */
  private static validateEnPassant(enPassant: string): string[] {
    const errors: string[] = [];

    if (enPassant === '-') {
      return errors; // Valid: no en passant
    }

    // Must be algebraic notation: file (a-h) + rank (3 or 6)
    const match = /^([a-h])([36])$/.exec(enPassant);
    if (!match) {
      errors.push(
        `En passant target must be '-' or a square like 'e3' or 'e6'`,
        `Got: '${enPassant}'`,
        `En passant square must be on rank 3 (for white) or rank 6 (for black)`
      );
    }

    return errors;
  }

  /**
   * Throws ValidationError if FEN is invalid
   */
  static validateOrThrow(fen: string): FENComponents {
    const result = this.validate(fen);
    if (!result.valid) {
      throw new ValidationError(
        `Invalid FEN format:\n${result.errors.map((e) => ` - ${e}`).join('\n')}`,
        {
          fen,
          errors: result.errors,
        }
      );
    }
    return result.components!;
  }
}
```

#### 3.2.2 New Component: Path Sanitizer

**File:** `backend/src/validators/path-sanitizer.ts`

```typescript
import path from 'path';
import { SecurityError } from '../errors/chess-sensei-error';

export interface PathValidationOptions {
  allowedDirectory?: string;
  allowedExtensions?: string[];
  maxPathLength?: number;
}

export class PathSanitizer {
  private static readonly MAX_PATH_LENGTH = 4096;
  private static readonly TRAVERSAL_PATTERNS = [
    '../',
    '..\\',
    '%2e%2e/',
    '%2e%2e\\',
  ];

  /**
   * Sanitizes and validates a file path
   * @throws SecurityError if path is invalid or contains traversal
   */
  static sanitize(
    filePath: string,
    options: PathValidationOptions = {}
  ): string {
    const {
      allowedDirectory,
      allowedExtensions,
      maxPathLength = this.MAX_PATH_LENGTH,
    } = options;

    // Check for null/empty
    if (!filePath || typeof filePath !== 'string') {
      throw new SecurityError(
        'INVALID_PATH',
        'File path must be a non-empty string',
        { path: filePath }
      );
    }

    // Trim whitespace
    const trimmedPath = filePath.trim();

    // Check path length
    if (trimmedPath.length > maxPathLength) {
      throw new SecurityError(
        'PATH_TOO_LONG',
        `File path exceeds maximum length of ${maxPathLength} characters`,
        { path: trimmedPath, length: trimmedPath.length }
      );
    }

    // Check for path traversal patterns (before normalization)
    const lowerPath = trimmedPath.toLowerCase();
    for (const pattern of this.TRAVERSAL_PATTERNS) {
      if (lowerPath.includes(pattern)) {
        throw new SecurityError(
          'PATH_TRAVERSAL',
          'Path traversal detected: Attempt to access parent directories',
          { path: trimmedPath, pattern }
        );
      }
    }

    // Normalize path (resolve relative paths, remove redundant separators)
    let normalizedPath: string;
    try {
      normalizedPath = path.resolve(trimmedPath);
    } catch (error) {
      throw new SecurityError('INVALID_PATH', 'Failed to normalize file path', {
        path: trimmedPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // If allowed directory specified, ensure path is within it
    if (allowedDirectory) {
      const normalizedAllowed = path.resolve(allowedDirectory);
      if (!normalizedPath.startsWith(normalizedAllowed)) {
        throw new SecurityError(
          'PATH_OUTSIDE_ALLOWED_DIRECTORY',
          'File path is outside allowed directory',
          {
            path: normalizedPath,
            allowedDirectory: normalizedAllowed,
          }
        );
      }
    }

    // Validate file extension if specified
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = path.extname(normalizedPath).toLowerCase();
      const normalizedExtensions = allowedExtensions.map((e) =>
        e.toLowerCase().startsWith('.')
          ? e.toLowerCase()
          : `.${e.toLowerCase()}`
      );

      if (!normalizedExtensions.includes(ext)) {
        throw new SecurityError(
          'INVALID_FILE_EXTENSION',
          `File extension '${ext}' not allowed`,
          {
            path: normalizedPath,
            extension: ext,
            allowedExtensions: normalizedExtensions,
          }
        );
      }
    }

    return normalizedPath;
  }

  /**
   * Validates that a path exists within a base directory
   */
  static isWithinDirectory(filePath: string, baseDirectory: string): boolean {
    try {
      const normalizedFile = path.resolve(filePath);
      const normalizedBase = path.resolve(baseDirectory);
      return normalizedFile.startsWith(normalizedBase);
    } catch {
      return false;
    }
  }

  /**
   * Gets safe filename from path (removes directory traversal)
   */
  static getSafeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new SecurityError(
        'INVALID_FILENAME',
        'Filename must be a non-empty string'
      );
    }

    // Extract just the filename, remove any path separators
    const basename = path.basename(filename);

    // Remove any remaining dangerous characters
    const safeFilename = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (safeFilename.length === 0) {
      throw new SecurityError(
        'INVALID_FILENAME',
        'Filename contains only invalid characters',
        { originalFilename: filename }
      );
    }

    return safeFilename;
  }
}
```

#### 3.2.3 New Component: Rate Limiter

**File:** `backend/src/validators/rate-limiter.ts`

```typescript
import { RateLimitError } from '../errors/chess-sensei-error';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RequestRecord {
  timestamps: number[];
  lastCleanup: number;
}

export class RateLimiter {
  private requests = new Map<string, RequestRecord>();
  private configs = new Map<string, RateLimitConfig>();

  // Default configurations for different operations
  private static readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    'engine.analyze': {
      maxRequests: 1,
      windowMs: 1000,
      message:
        'Analysis rate limit reached. Please wait before requesting another analysis.',
    },
    'engine.getBestMoves': {
      maxRequests: 10,
      windowMs: 1000,
      message: 'Best moves request rate limit reached. Please wait.',
    },
    'bot.makeMove': {
      maxRequests: 1,
      windowMs: 1000,
      message:
        'Bot move rate limit reached. Please wait before requesting another move.',
    },
    'guidance.request': {
      maxRequests: 10,
      windowMs: 1000,
      message: 'Guidance request rate limit reached. Please wait.',
    },
    'storage.export': {
      maxRequests: 5,
      windowMs: 60000, // 5 per minute
      message: 'Export rate limit reached. Please wait before exporting again.',
    },
    'storage.import': {
      maxRequests: 5,
      windowMs: 60000, // 5 per minute
      message: 'Import rate limit reached. Please wait before importing again.',
    },
  };

  constructor() {
    // Initialize with default configs
    for (const [operation, config] of Object.entries(
      RateLimiter.DEFAULT_CONFIGS
    )) {
      this.configs.set(operation, config);
    }

    // Cleanup old records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Sets custom rate limit configuration for an operation
   */
  setConfig(operation: string, config: RateLimitConfig): void {
    this.configs.set(operation, config);
  }

  /**
   * Checks if a request is allowed under rate limit
   * @throws RateLimitError if rate limit exceeded
   */
  checkLimit(operation: string, identifier: string = 'default'): void {
    const config = this.configs.get(operation);
    if (!config) {
      // No rate limit configured for this operation
      return;
    }

    const key = `${operation}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create request record
    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [], lastCleanup: now };
      this.requests.set(key, record);
    }

    // Remove timestamps outside the window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    record.lastCleanup = now;

    // Check if limit exceeded
    if (record.timestamps.length >= config.maxRequests) {
      const oldestTimestamp = record.timestamps[0];
      const resetInMs = oldestTimestamp + config.windowMs - now;
      const resetInSeconds = Math.ceil(resetInMs / 1000);

      throw new RateLimitError(
        config.message || `Rate limit exceeded for operation: ${operation}`,
        {
          operation,
          limit: config.maxRequests,
          windowMs: config.windowMs,
          resetInSeconds,
          current: record.timestamps.length,
        }
      );
    }

    // Record this request
    record.timestamps.push(now);
  }

  /**
   * Cleanup old records to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, record] of this.requests.entries()) {
      if (now - record.lastCleanup > maxAge) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Resets rate limit for a specific operation and identifier
   */
  reset(operation: string, identifier: string = 'default'): void {
    const key = `${operation}:${identifier}`;
    this.requests.delete(key);
  }

  /**
   * Gets current usage for an operation
   */
  getUsage(
    operation: string,
    identifier: string = 'default'
  ): {
    current: number;
    limit: number;
    resetInMs: number;
  } | null {
    const config = this.configs.get(operation);
    if (!config) return null;

    const key = `${operation}:${identifier}`;
    const record = this.requests.get(key);

    if (!record || record.timestamps.length === 0) {
      return {
        current: 0,
        limit: config.maxRequests,
        resetInMs: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);
    const oldestTimestamp = validTimestamps[0];
    const resetInMs = oldestTimestamp
      ? oldestTimestamp + config.windowMs - now
      : 0;

    return {
      current: validTimestamps.length,
      limit: config.maxRequests,
      resetInMs: Math.max(0, resetInMs),
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
```

#### 3.2.4 Enhanced Error Classes

**File:** `backend/src/errors/chess-sensei-error.ts` (additions)

```typescript
// Add to existing error hierarchy from tech spec 008

export class SecurityError extends ChessSenseiError {
  constructor(code: string, message: string, details?: Record<string, any>) {
    super(`SECURITY_${code}`, message, details);
  }
}

export class RateLimitError extends ChessSenseiError {
  constructor(message: string, details?: Record<string, any>) {
    super('RATE_LIMIT_EXCEEDED', message, details);
  }
}
```

#### 3.2.5 Updated IPC Handler with Validation

##### Example: Engine Analysis Handler

**File:** `backend/src/ipc/engine-handlers.ts`

```typescript
import { z } from 'zod';
import { FENValidator } from '../validators/fen-validator';
import { rateLimiter } from '../validators/rate-limiter';
import { ValidationError, RateLimitError } from '../errors/chess-sensei-error';
import { logger } from '../logging/logger';

// Zod schema with custom FEN validation
const RequestAnalysisSchema = z.object({
  fen: z
    .string()
    .min(15)
    .max(100)
    .refine(
      (fen) => FENValidator.validate(fen).valid,
      (fen) => {
        const result = FENValidator.validate(fen);
        return { message: `Invalid FEN: ${result.errors.join(', ')}` };
      }
    ),
  depth: z.number().int().min(1).max(30),
});

export type RequestAnalysisParams = z.infer<typeof RequestAnalysisSchema>;

/**
 * Handles analysis requests with full validation and rate limiting
 */
export async function handleRequestAnalysis(params: unknown) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. Rate limit check
    rateLimiter.checkLimit('engine.analyze');

    // 2. Schema validation (includes FEN validation)
    const validated = RequestAnalysisSchema.parse(params);

    // 3. Log request
    logger.info('Analysis requested', {
      requestId,
      fen: validated.fen,
      depth: validated.depth,
    });

    // 4. Execute analysis
    const analysis = await engine.analyzePosition(
      validated.fen,
      validated.depth
    );

    // 5. Log success
    logger.info('Analysis completed', {
      requestId,
      durationMs: Date.now() - startTime,
    });

    return { result: analysis };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      logger.warn('Analysis request validation failed', {
        requestId,
        issues: error.issues,
      });
      throw new ValidationError('Invalid analysis request parameters', {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      logger.warn('Analysis rate limit exceeded', {
        requestId,
        details: error.details,
      });
      throw error; // Re-throw with original details
    }

    // Handle other errors
    logger.error('Analysis request failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

#### 3.2.6 Updated Storage Handlers with Path Sanitization

**File:** `backend/src/ipc/storage-handlers.ts`

```typescript
import { z } from 'zod';
import { PathSanitizer } from '../validators/path-sanitizer';
import { rateLimiter } from '../validators/rate-limiter';
import { ValidationError } from '../errors/chess-sensei-error';
import { logger } from '../logging/logger';
import path from 'path';

// Assume USER_DATA_DIR is defined in config
const USER_DATA_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.chess-sensei'
);

const ExportGameSchema = z.object({
  gameId: z.string().uuid(),
  filePath: z.string().min(1).max(500),
  format: z.enum(['pgn', 'json']),
});

export type ExportGameParams = z.infer<typeof ExportGameSchema>;

/**
 * Handles game export with path sanitization
 */
export async function handleExportGame(params: unknown) {
  const requestId = crypto.randomUUID();

  try {
    // 1. Rate limit check
    rateLimiter.checkLimit('storage.export');

    // 2. Schema validation
    const validated = ExportGameSchema.parse(params);

    // 3. Sanitize file path
    const allowedExtensions = validated.format === 'pgn' ? ['.pgn'] : ['.json'];
    const safePath = PathSanitizer.sanitize(validated.filePath, {
      allowedDirectory: USER_DATA_DIR,
      allowedExtensions,
    });

    // 4. Log request
    logger.info('Game export requested', {
      requestId,
      gameId: validated.gameId,
      format: validated.format,
      sanitizedPath: safePath,
    });

    // 5. Load game data
    const game = await storage.getGame(validated.gameId);
    if (!game) {
      throw new ValidationError('Game not found', { gameId: validated.gameId });
    }

    // 6. Export to file
    if (validated.format === 'pgn') {
      await exportToPGN(game, safePath);
    } else {
      await exportToJSON(game, safePath);
    }

    // 7. Log success
    logger.info('Game exported successfully', {
      requestId,
      path: safePath,
    });

    return { result: { path: safePath } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Export validation failed', {
        requestId,
        issues: error.issues,
      });
      throw new ValidationError('Invalid export parameters', {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    logger.error('Export failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

#### 3.2.7 Input Length Limits

**File:** `backend/src/validators/input-validator.ts`

```typescript
import { ValidationError } from '../errors/chess-sensei-error';

export interface InputLimits {
  maxStringLength?: number;
  maxArrayLength?: number;
  maxFileSize?: number; // in bytes
}

export class InputValidator {
  private static readonly DEFAULT_LIMITS: Required<InputLimits> = {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  };

  /**
   * Validates string length
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    maxLength?: number
  ): void {
    const limit = maxLength ?? this.DEFAULT_LIMITS.maxStringLength;
    if (value.length > limit) {
      throw new ValidationError(
        `${fieldName} exceeds maximum length of ${limit} characters`,
        {
          fieldName,
          length: value.length,
          maxLength: limit,
        }
      );
    }
  }

  /**
   * Validates array length
   */
  static validateArrayLength<T>(
    value: T[],
    fieldName: string,
    maxLength?: number
  ): void {
    const limit = maxLength ?? this.DEFAULT_LIMITS.maxArrayLength;
    if (value.length > limit) {
      throw new ValidationError(
        `${fieldName} exceeds maximum length of ${limit} items`,
        {
          fieldName,
          length: value.length,
          maxLength: limit,
        }
      );
    }
  }

  /**
   * Validates file size
   */
  static async validateFileSize(
    filePath: string,
    maxSize?: number
  ): Promise<void> {
    const limit = maxSize ?? this.DEFAULT_LIMITS.maxFileSize;
    const file = Bun.file(filePath);
    const size = file.size;

    if (size > limit) {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      const limitMB = (limit / (1024 * 1024)).toFixed(2);
      throw new ValidationError(
        `File size (${sizeMB}MB) exceeds maximum allowed size (${limitMB}MB)`,
        {
          filePath,
          size,
          maxSize: limit,
        }
      );
    }
  }
}
```

### 3.3 Testing Strategy

#### 3.3.1 FEN Validation Tests

**File:** `tests/unit/validators/fen-validator.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { FENValidator } from '../../../backend/src/validators/fen-validator';
import { ValidationError } from '../../../backend/src/errors/chess-sensei-error';

describe('FENValidator', () => {
  describe('validate', () => {
    test('accepts valid starting position', () => {
      const result = FENValidator.validate(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects FEN with wrong component count', () => {
      const result = FENValidator.validate(
        'rnbqkbnr/pppppppp w KQkq - 0 1 extra'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'FEN must have exactly 6 space-separated components'
      );
    });

    test('rejects FEN with missing king', () => {
      const result = FENValidator.validate(
        'rnbq1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Must have exactly 1 black king'))
      ).toBe(true);
    });

    test('rejects FEN with pawns on first rank', () => {
      const result = FENValidator.validate(
        'rnbqkbnP/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes('Pawns cannot be on the first rank')
        )
      ).toBe(true);
    });

    test('rejects invalid turn', () => {
      const result = FENValidator.validate(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1'
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("Turn must be 'w' (white) or 'b' (black)")
        )
      ).toBe(true);
    });

    test('rejects invalid castling rights', () => {
      const result = FENValidator.validate(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkqX - 0 1'
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Invalid castling character'))
      ).toBe(true);
    });

    test('rejects invalid en passant square', () => {
      const result = FENValidator.validate(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e4 0 1'
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes('En passant square must be on rank 3')
        )
      ).toBe(true);
    });

    test('provides detailed error messages', () => {
      const result = FENValidator.validate('invalid');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('FEN must have exactly 6');
    });
  });

  describe('validateOrThrow', () => {
    test('returns components for valid FEN', () => {
      const components = FENValidator.validateOrThrow(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      );
      expect(components.turn).toBe('w');
      expect(components.castling).toBe('KQkq');
      expect(components.halfmove).toBe(0);
      expect(components.fullmove).toBe(1);
    });

    test('throws ValidationError for invalid FEN', () => {
      expect(() => FENValidator.validateOrThrow('invalid')).toThrow(
        ValidationError
      );
    });
  });
});
```

#### 3.3.2 Path Sanitizer Tests

**File:** `tests/unit/validators/path-sanitizer.test.ts`

```typescript
import { describe, test, expect } from 'bun:test';
import { PathSanitizer } from '../../../backend/src/validators/path-sanitizer';
import { SecurityError } from '../../../backend/src/errors/chess-sensei-error';
import path from 'path';

describe('PathSanitizer', () => {
  describe('sanitize', () => {
    test('accepts valid absolute path', () => {
      const safePath = PathSanitizer.sanitize('/home/user/data.json');
      expect(safePath).toBeTruthy();
    });

    test('rejects path with traversal (.../)', () => {
      expect(() => PathSanitizer.sanitize('../../../etc/passwd')).toThrow(
        SecurityError
      );
    });

    test('rejects path with traversal (..\\)', () => {
      expect(() =>
        PathSanitizer.sanitize('..\\..\\..\\windows\\system32')
      ).toThrow(SecurityError);
    });

    test('rejects path with URL-encoded traversal', () => {
      expect(() => PathSanitizer.sanitize('%2e%2e/etc/passwd')).toThrow(
        SecurityError
      );
    });

    test('rejects empty path', () => {
      expect(() => PathSanitizer.sanitize('')).toThrow(SecurityError);
    });

    test('rejects path exceeding max length', () => {
      const longPath = 'a'.repeat(5000);
      expect(() =>
        PathSanitizer.sanitize(longPath, { maxPathLength: 100 })
      ).toThrow(SecurityError);
    });

    test('enforces allowed directory restriction', () => {
      const allowedDir = '/home/user/data';
      const outsidePath = '/home/other/file.txt';

      expect(() =>
        PathSanitizer.sanitize(outsidePath, { allowedDirectory: allowedDir })
      ).toThrow(SecurityError);
    });

    test('allows path within allowed directory', () => {
      const allowedDir = '/home/user/data';
      const insidePath = '/home/user/data/games/game1.json';

      const safePath = PathSanitizer.sanitize(insidePath, {
        allowedDirectory: allowedDir,
      });
      expect(safePath).toContain('data');
    });

    test('enforces file extension restriction', () => {
      expect(() =>
        PathSanitizer.sanitize('/home/user/file.exe', {
          allowedExtensions: ['.json', '.pgn'],
        })
      ).toThrow(SecurityError);
    });

    test('allows valid file extension', () => {
      const safePath = PathSanitizer.sanitize('/home/user/file.json', {
        allowedExtensions: ['.json', '.pgn'],
      });
      expect(safePath).toContain('.json');
    });
  });

  describe('getSafeFilename', () => {
    test('extracts filename from path', () => {
      const filename = PathSanitizer.getSafeFilename(
        '/home/user/data/file.txt'
      );
      expect(filename).toBe('file.txt');
    });

    test('removes dangerous characters', () => {
      const filename = PathSanitizer.getSafeFilename('my file<>:"|?.txt');
      expect(filename).toBe('my_file_______.txt');
    });

    test('rejects filename with only invalid characters', () => {
      expect(() => PathSanitizer.getSafeFilename('<>:"|?')).toThrow(
        SecurityError
      );
    });
  });
});
```

#### 3.3.3 Rate Limiter Tests

**File:** `tests/unit/validators/rate-limiter.test.ts`

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { RateLimiter } from '../../../backend/src/validators/rate-limiter';
import { RateLimitError } from '../../../backend/src/errors/chess-sensei-error';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe('checkLimit', () => {
    test('allows requests within limit', () => {
      limiter.setConfig('test.operation', { maxRequests: 5, windowMs: 1000 });

      expect(() => limiter.checkLimit('test.operation')).not.toThrow();
      expect(() => limiter.checkLimit('test.operation')).not.toThrow();
      expect(() => limiter.checkLimit('test.operation')).not.toThrow();
    });

    test('blocks requests exceeding limit', () => {
      limiter.setConfig('test.operation', { maxRequests: 2, windowMs: 1000 });

      limiter.checkLimit('test.operation');
      limiter.checkLimit('test.operation');

      expect(() => limiter.checkLimit('test.operation')).toThrow(
        RateLimitError
      );
    });

    test('resets after window expires', async () => {
      limiter.setConfig('test.operation', { maxRequests: 2, windowMs: 100 });

      limiter.checkLimit('test.operation');
      limiter.checkLimit('test.operation');

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow new requests
      expect(() => limiter.checkLimit('test.operation')).not.toThrow();
    });

    test('uses separate counters for different identifiers', () => {
      limiter.setConfig('test.operation', { maxRequests: 1, windowMs: 1000 });

      limiter.checkLimit('test.operation', 'user1');
      limiter.checkLimit('test.operation', 'user2');

      expect(() => limiter.checkLimit('test.operation', 'user1')).toThrow(
        RateLimitError
      );
      expect(() => limiter.checkLimit('test.operation', 'user2')).toThrow(
        RateLimitError
      );
    });

    test('includes reset time in error details', () => {
      limiter.setConfig('test.operation', { maxRequests: 1, windowMs: 1000 });

      limiter.checkLimit('test.operation');

      try {
        limiter.checkLimit('test.operation');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect(
          (error as RateLimitError).details?.resetInSeconds
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('getUsage', () => {
    test('returns current usage', () => {
      limiter.setConfig('test.operation', { maxRequests: 5, windowMs: 1000 });

      limiter.checkLimit('test.operation');
      limiter.checkLimit('test.operation');

      const usage = limiter.getUsage('test.operation');
      expect(usage?.current).toBe(2);
      expect(usage?.limit).toBe(5);
    });
  });

  describe('reset', () => {
    test('clears rate limit for operation', () => {
      limiter.setConfig('test.operation', { maxRequests: 1, windowMs: 1000 });

      limiter.checkLimit('test.operation');
      expect(() => limiter.checkLimit('test.operation')).toThrow(
        RateLimitError
      );

      limiter.reset('test.operation');
      expect(() => limiter.checkLimit('test.operation')).not.toThrow();
    });
  });
});
```

---

## 4. Implementation Plan

### 4.1 Phase Breakdown

#### Phase 6A: Input Validation (Week 13)

**Duration:** 10 hours

**Tasks:**

1. Create FEN validator with comprehensive error messages (3h)
2. Create input validator for length/size limits (1h)
3. Add validation tests (100+ test cases) (3h)
4. Update IPC handlers with FEN validation (2h)
5. Document validation rules (1h)

**Deliverables:**

- `backend/src/validators/fen-validator.ts`
- `backend/src/validators/input-validator.ts`
- `tests/unit/validators/fen-validator.test.ts`
- Test coverage >95%

#### Phase 6B: File Path Security (Week 13)

**Duration:** 8 hours

**Tasks:**

1. Create path sanitizer utility (2h)
2. Audit all file operations (storage, export, import) (2h)
3. Add path validation to file I/O functions (2h)
4. Add security tests (path traversal, injection) (1h)
5. Test on Windows, macOS, Linux (1h)

**Deliverables:**

- `backend/src/validators/path-sanitizer.ts`
- Updated `backend/src/data-storage.ts`
- Updated `backend/src/export-import.ts`
- `tests/unit/validators/path-sanitizer.test.ts`

#### Phase 6C: Rate Limiting (Week 14)

**Duration:** 10 hours

**Tasks:**

1. Create RateLimiter class with sliding window (3h)
2. Identify expensive operations to rate limit (1h)
3. Add rate limiting to IPC handlers (3h)
4. Add rate limit error handling in frontend (1h)
5. Add rate limiter tests (2h)

**Deliverables:**

- `backend/src/validators/rate-limiter.ts`
- Updated IPC handlers with rate limiting
- Frontend error display for rate limits
- `tests/unit/validators/rate-limiter.test.ts`

#### Phase 6D: Testing & Security Audit (Week 14)

**Duration:** 12 hours

**Tasks:**

1. Comprehensive edge case testing (3h)
2. Security audit of all inputs (3h)
3. Fuzz testing with invalid inputs (2h)
4. Performance benchmarking (validation overhead) (2h)
5. Document security measures in troubleshooting.md (2h)

**Deliverables:**

- Security audit report
- Performance benchmark results
- Updated `documents/troubleshooting.md`
- Integration tests for security features

### 4.2 File Changes Summary

| File                                           | Type   | Changes                           | Lines            |
| ---------------------------------------------- | ------ | --------------------------------- | ---------------- |
| `backend/src/validators/fen-validator.ts`      | New    | FEN validation library            | ~350             |
| `backend/src/validators/path-sanitizer.ts`     | New    | Path sanitization                 | ~180             |
| `backend/src/validators/rate-limiter.ts`       | New    | Rate limiting                     | ~200             |
| `backend/src/validators/input-validator.ts`    | New    | Input length validation           | ~80              |
| `backend/src/errors/chess-sensei-error.ts`     | Modify | Add SecurityError, RateLimitError | +20              |
| `backend/src/ipc/engine-handlers.ts`           | Modify | Add validation & rate limiting    | +40              |
| `backend/src/ipc/guidance-handlers.ts`         | Modify | Add validation & rate limiting    | +30              |
| `backend/src/ipc/bot-handlers.ts`              | Modify | Add validation & rate limiting    | +30              |
| `backend/src/ipc/storage-handlers.ts`          | Modify | Add path sanitization             | +50              |
| `backend/src/data-storage.ts`                  | Modify | Add path validation               | +30              |
| `backend/src/export-import.ts`                 | Modify | Add path validation & size limits | +40              |
| `tests/unit/validators/fen-validator.test.ts`  | New    | FEN validation tests              | ~400             |
| `tests/unit/validators/path-sanitizer.test.ts` | New    | Path sanitization tests           | ~200             |
| `tests/unit/validators/rate-limiter.test.ts`   | New    | Rate limiter tests                | ~150             |
| `tests/integration/security.test.ts`           | New    | End-to-end security tests         | ~200             |
| `documents/troubleshooting.md`                 | Modify | Document security features        | +50              |
| **Total**                                      |        | **16 files**                      | **~2,030 lines** |

---

## 5. Security Considerations

### 5.1 Threat Model

**Threats Mitigated:**

1. **Malformed Input Crashes**: Comprehensive FEN validation prevents engine
   crashes
2. **Path Traversal**: Sanitization prevents access to system files
3. **Resource Exhaustion**: Rate limiting prevents DoS via rapid requests
4. **Data Corruption**: File size limits prevent memory exhaustion
5. **Information Disclosure**: Sanitized error messages prevent leaking
   sensitive details

**Out of Scope:**

- Network attacks (app is offline)
- Code injection (WASM sandbox)
- Memory corruption (TypeScript/WASM memory safety)

### 5.2 Security Best Practices

1. **Defense in Depth**: Multiple validation layers (Zod + custom validators)
2. **Fail-Safe Defaults**: Deny by default, allow explicitly
3. **Input Validation**: Validate all external inputs at system boundaries
4. **Output Sanitization**: Error messages safe for user display
5. **Least Privilege**: File operations restricted to user data directory

### 5.3 Security Testing

**Test Categories:**

1. **Fuzzing**: Random invalid inputs to find edge cases
2. **Boundary Testing**: Min/max values, empty inputs, huge inputs
3. **Injection Testing**: Path traversal, special characters
4. **Error Handling**: Verify no sensitive data in error messages
5. **Performance Testing**: Validation overhead under load

---

## 6. Performance Considerations

### 6.1 Validation Overhead

**Target:** <5ms per request

**Optimizations:**

- Compiled regex patterns (cached)
- Early exit on first error (fail-fast)
- Lazy validation (only validate when needed)
- Efficient data structures (Map for rate limiter)

### 6.2 Memory Usage

**Rate Limiter Memory:**

- ~100 bytes per operation per user
- Automatic cleanup every 5 minutes
- Max 1000 requests tracked per operation

**Validation Memory:**

- Zero allocations for valid inputs (regex test)
- Minimal allocations for error messages

### 6.3 Benchmarks

```typescript
// Expected performance (to be verified in Phase 6D)
FENValidator.validate():           ~0.5ms per call
PathSanitizer.sanitize():          ~0.2ms per call
RateLimiter.checkLimit():          ~0.05ms per call
Total validation overhead:         ~0.75ms per request
```

---

## 7. Alternatives Considered

### 7.1 Third-Party Validation Libraries

**Option:** Use chess.js for FEN validation

**Pros:**

- Battle-tested, widely used
- Handles edge cases

**Cons:**

- Adds dependency
- Generic error messages (not user-friendly)
- Performance overhead (full board representation)

**Decision:** Implement custom validator for detailed error messages and
performance

### 7.2 Token Bucket vs Sliding Window

**Token Bucket:**

- Allows bursts of traffic
- More complex implementation

**Sliding Window:**

- More predictable behavior
- Simpler implementation
- Better for user experience

**Decision:** Use sliding window for predictability and simplicity

### 7.3 Client-Side vs Server-Side Validation

**Client-Side Only:**

- Pros: Immediate feedback, no IPC call
- Cons: Can be bypassed, inconsistent with backend

**Server-Side Only:**

- Pros: Single source of truth, secure
- Cons: Slower feedback, IPC overhead

**Decision:** Both - client-side for UX, server-side for security (defense in
depth)

---

## 8. Dependencies

### 8.1 Internal Dependencies

- **Code Quality PRD (008)**: Zod schemas, ChessSenseiError hierarchy
- **Observability PRD (009)**: Logger for security events
- **Testing PRD (007)**: Test helpers and fixtures

### 8.2 External Dependencies

- **Zod**: Already included (from PRD 008)
- **Node.js path module**: Built-in (Bun compatible)
- **No new external dependencies**

---

## 9. Open Questions

1. **Should rate limits be user-configurable?**
   - **Proposal**: No, hardcode reasonable limits initially
   - **Rationale**: Simpler implementation, can add later if needed

2. **Should we log security violations?**
   - **Proposal**: Yes, log at WARN level with requestId
   - **Rationale**: Helps identify patterns, debugging

3. **Should path validation be platform-specific?**
   - **Proposal**: Use Node.js path.resolve() for cross-platform safety
   - **Rationale**: Works on Windows, macOS, Linux

4. **Should we add CAPTCHA-like protection?**
   - **Proposal**: No, unnecessary for offline single-user app
   - **Rationale**: Over-engineering for threat model

---

## 10. Risks and Mitigations

| Risk                                       | Likelihood | Impact | Mitigation                                                      |
| ------------------------------------------ | ---------- | ------ | --------------------------------------------------------------- |
| Validation too strict, rejects valid input | Medium     | Medium | Comprehensive testing with real-world FENs, chess.js comparison |
| Rate limiting impacts legitimate use       | Low        | Medium | Conservative limits, tune based on testing                      |
| Path sanitization breaks valid paths       | Low        | High   | Test on all platforms, use standard path.resolve()              |
| Validation overhead impacts performance    | Low        | Low    | Benchmark in Phase 6D, optimize if needed                       |
| False positives in security tests          | Medium     | Low    | Review all security test failures manually                      |

---

## 11. Success Criteria

**Completion Criteria:**

- [ ] All IPC handlers have input validation
- [ ] All file operations have path sanitization
- [ ] Rate limiting on expensive operations (analyze, guidance, bot move)
- [ ] Zero crashes from invalid inputs
- [ ] Test coverage >95% for validators
- [ ] Validation overhead <5ms per request
- [ ] Security audit passes with no high-severity issues

**Quality Metrics:**

- No path traversal vulnerabilities
- Clear, actionable error messages
- No performance degradation in normal usage
- All edge cases handled gracefully

---

## 12. Documentation

### 12.1 User-Facing Documentation

Update `documents/troubleshooting.md` with:

- Common validation errors and fixes
- Rate limit explanations
- File path requirements

### 12.2 Developer Documentation

Add to codebase:

- JSDoc comments for all validators
- Security best practices guide
- Testing guide for security features

---

## 13. Timeline

| Week      | Phase | Tasks                    | Hours        |
| --------- | ----- | ------------------------ | ------------ |
| 13        | 6A    | Input validation library | 10           |
| 13        | 6B    | File path security       | 8            |
| 14        | 6C    | Rate limiting            | 10           |
| 14        | 6D    | Testing & audit          | 12           |
| **Total** |       |                          | **40 hours** |

---

## Approval

| Role            | Name | Date | Status  |
| --------------- | ---- | ---- | ------- |
| Product Owner   |      |      | Pending |
| Tech Lead       |      |      | Pending |
| Security Review |      |      | Pending |

---

## Revision History

| Version | Date       | Author | Changes       |
| ------- | ---------- | ------ | ------------- |
| 0.1     | 2026-01-08 | Claude | Initial draft |
