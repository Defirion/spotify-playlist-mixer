visualViewport mock helper

This folder provides small helpers used by tests. The visualViewport mock helps
simulate mobile on-screen keyboard behavior by mocking `window.visualViewport`.

Usage example (TypeScript):

// Prefer the adapter which installs the mock on `global.visualViewport`
import { mockVisualViewport, restoreVisualViewport } from './mockVisualViewport';

// Install and get the underlying API
const { vv, setHeight, setOffsetTop } = mockVisualViewport(800, 0);

// code under test can now read `window.visualViewport`

// later: simulate keyboard opening
setHeight(350);

// later: restore to original state
restoreVisualViewport();

Notes:

- The helper dispatches `resize` when height changes and `scroll` when offsetTop changes.
- It returns a typed API (`VisualViewportMockAPI`) for convenience in tests when callers need to programmatically change the mock.

Migration note — switching from `createVisualViewportMock`

If you previously imported the low-level factory directly, for example:

```ts
import { createVisualViewportMock } from './mocks/visualViewportMock';
const { vv, setHeight } = createVisualViewportMock(800, 0);
// ...manually install on global if you needed to:
// (tests should prefer the adapter instead)
```

Switch to the adapter which installs/restores the mock and keeps setup/teardown consistent:

```ts
import {
  mockVisualViewport,
  restoreVisualViewport,
} from './mockVisualViewport';
const { vv, setHeight } = mockVisualViewport(800, 0);
// use setHeight/setOffsetTop in your test
restoreVisualViewport();
```

The adapter is the recommended approach for tests because it avoids leaky globals and centralizes lifecycle management.
