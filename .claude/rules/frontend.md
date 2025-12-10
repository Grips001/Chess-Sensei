---
paths: src/frontend/**/*.ts
---

# Frontend Rules

## Neutralino.js Patterns

- **USE** Neutralino APIs for native operations
- **DO NOT** assume Node.js or Electron APIs work
- **CHECK** [Neutralino docs](https://neutralino.js.org/docs/) before using any
  API

## WebSocket IPC Client

All backend communication goes through WebSocket on port 9339:

```typescript
import { ipcClient } from './websocket-ipc-client';

// RPC call pattern
const result = await ipcClient.call('METHOD_NAME', params);

// Subscription pattern
ipcClient.subscribe('channel', (data) => { ... });
```

## DOM Manipulation

- **USE** `getElementById`, `querySelector` with null checks
- **ALWAYS** check `getAttribute()` returns (can be null)
- **PREFER** event delegation for dynamic elements

```typescript
// Good: Null-safe getAttribute
const value = element.getAttribute('data-id');
if (value) {
  processValue(value);
}

// Good: Type-safe event handling
card.addEventListener('click', (e) => {
  const target = e.currentTarget as HTMLElement;
  const id = target.getAttribute('data-id');
  if (id) handleClick(id);
});
```

## CSS Classes

- **USE** CSS custom properties from `src/frontend/styles/index.css`
- **FOLLOW** BEM-like naming: `component__element--modifier`
- **PREFER** existing design tokens over hardcoded values
