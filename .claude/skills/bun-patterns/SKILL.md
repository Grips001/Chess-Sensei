---
name: bun-patterns
description:
  Verify Bun-specific patterns in backend code. Use when reviewing or writing
  backend TypeScript files to ensure Bun APIs are used instead of Node.js
  patterns.
allowed-tools: Read, Grep, Glob
---

# Bun Patterns Verification

Automatically check that backend code uses Bun-specific APIs instead of Node.js
patterns.

## When to Apply

- Reviewing files in `src/backend/`
- Writing new backend code
- Checking file I/O operations

## Patterns to Enforce

### File Operations

**Correct (Bun):**

```typescript
// Reading files
const content = await Bun.file(path).text();
const json = await Bun.file(path).json();

// Writing files
await Bun.write(path, content);

// Checking existence
const exists = await Bun.file(path).exists();
```

**Incorrect (Node.js):**

```typescript
// These should NOT be used in backend
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
fs.readFileSync(path);
```

### Process and Environment

**Correct (Bun):**

```typescript
const port = Bun.env.PORT || 9339;
```

**Incorrect:**

```typescript
const port = process.env.PORT; // Less preferred in Bun
```

### HTTP Server

**Correct (Bun):**

```typescript
Bun.serve({
  port: 9339,
  fetch(req) {
    return new Response('OK');
  },
});
```

## Verification Steps

1. Search for Node.js imports: `import fs from`, `require('fs')`
2. Check file operations use `Bun.file()` or `Bun.write()`
3. Verify WebSocket server uses Bun patterns
4. Confirm no `fs.readFile` or `fs.writeFile` calls

## Reference

- [Bun File I/O](https://bun.sh/docs/api/file-io)
- [Bun HTTP Server](https://bun.sh/docs/api/http)
- Project Rule 2 in CLAUDE.md
