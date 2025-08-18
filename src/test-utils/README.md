visualViewport mock helper

This folder provides small helpers used by tests. The visualViewport mock helps
simulate mobile on-screen keyboard behavior by mocking `window.visualViewport`.

Usage example (TypeScript):

import { createVisualViewportMock } from './mocks/visualViewportMock';

const { vv, setHeight, setOffsetTop } = createVisualViewportMock(800, 0);
// attach to the window so code under test can subscribe to events
(window as any).visualViewport = vv;

// later: simulate keyboard opening
setHeight(350);

// later: restore
delete (window as any).visualViewport;

Notes:

- The helper dispatches `resize` when height changes and `scroll` when offsetTop changes.
- It returns a typed API (`VisualViewportMockAPI`) for convenience in tests.
