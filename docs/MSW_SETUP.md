# MSW Setup - Simplified

## The Rule

**Jest tests use `setupServer` from `msw/node`. Browser code uses `setupWorker` from `msw/browser`. Never mix them.**

## For Tests

```typescript
import { setupMSW } from '../test-utils/msw';

// In your test file:
setupMSW();

// That's it. The server starts before tests, resets between tests, and closes after.
```

## For Browser (Development)

```typescript
import { worker } from './mocks/browser';

// Only in browser environments:
worker.start();
```

## Why This Matters

- Jest runs in Node.js (even with jsdom)
- Node.js needs `setupServer` from `msw/node`
- Browsers need `setupWorker` from `msw/browser`
- Using the wrong one crashes Jest workers

## Files

- `src/test-utils/msw.ts` - Simple setup for all tests
- `src/mocks/server.ts` - Server instance (for Node/Jest)
- `src/mocks/browser.ts` - Worker instance (for browser)
- `src/mocks/handlers.ts` - Shared handlers

## Migration

Replace any existing MSW setup imports with:

```typescript
import { setupMSW } from '../test-utils/msw';
```