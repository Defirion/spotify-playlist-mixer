Contributing — tests

Authoring MSW-enabled tests

This project uses centralized hook mocks for fast, deterministic integration tests by default (see `src/setupTests.ts`). If you need to write a test that uses network-style behavior, follow these steps:

1) Import and call `setupMSW()` at the top of your test file:

```ts
import { setupMSW } from './__tests__/mocks/mswSetup';

// Start the MSW handlers for this suite
setupMSW();
```

2) Optionally require handlers directly if you need custom overrides inside the test:

```ts
import handlers from './__tests__/mocks/mswHandlers';
// inside a test, you can do:
// server.use(...handlersOverrides)
```

3) Use the centralized hook mock helpers for fine-grained control if you prefer not to use network-style handlers:

```ts
jest.mock('../../hooks/useMixPreview', () =>
  require('../mocks/mixHooks').makeUseMixPreviewModule(async (cfg: any) => {
    // return preview tracks derived from `cfg`
    return { tracks: [] };
  })
);
```

Notes
- `setupMSW()` safely attempts to require MSW; in environments where MSW's ESM deps cannot be transformed by Jest, it will log a warning and fall back to hook-level mocks. This is intentional to keep tests stable without tooling changes.
- If you need consistent MSW behavior on every developer machine and CI, open a tech-debt ticket to update the Jest transform so MSW's ESM deps are transformed (or migrate CI/test runner to an ESM-friendly setup).
