---
paths: src/backend/**/*.ts
---

# Backend Rules

## Bun Runtime Patterns

- **USE** Bun APIs, not Node.js patterns
- **USE** `Bun.file(path).text()` not `fs.readFile()`
- **USE** `Bun.write(path, content)` not `fs.writeFile()`
- **CHECK** [Bun docs](https://bun.sh/docs) before using any API

```typescript
// Good: Bun file API
const content = await Bun.file(path).text();
await Bun.write(path, JSON.stringify(data));

// Bad: Node.js pattern
const content = await fs.readFile(path, 'utf-8');
```

## WebSocket IPC Server

The backend exposes IPC methods via WebSocket on port 9339:

- **RPC methods** for request/response operations
- **Pub/sub channels** for real-time streaming
- **ALWAYS** validate incoming parameters
- **ALWAYS** return typed responses

## Error Handling

```typescript
// Use helper for consistent error responses
import { createErrorResponse } from './helpers/error-response';

try {
  // Operation
} catch (error) {
  return createErrorResponse('OPERATION_FAILED', error);
}
```

## Data Storage

- **USE** `src/backend/data-storage.ts` for persistence
- **USE** atomic writes for data integrity
- **STORE** data in platform-specific user data directory
- **NEVER** store in application directory
