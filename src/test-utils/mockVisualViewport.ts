// Lightweight test helper to stub global.visualViewport in Jest/JSDOM
// Adapter that re-uses the richer mock implementation in
// src/test-utils/mocks/visualViewportMock.ts to avoid duplication.
import { createVisualViewportMock } from './mocks/visualViewportMock';

// Creates and installs the visualViewport mock on the global object.
// Returns the underlying API from createVisualViewportMock so callers can
// programmatically change height/offset and trigger events.
export function mockVisualViewport(initialHeight = 1024, offsetTop = 0) {
  const api = createVisualViewportMock(initialHeight, offsetTop);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.visualViewport = api.vv as any;
  return api;
}

export function restoreVisualViewport() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  try {
  // assign undefined to avoid TS 'delete' operand errors
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.visualViewport = undefined;
  } catch (e) {
    // ignore
  }
}
