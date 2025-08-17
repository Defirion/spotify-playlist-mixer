// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// MSW setup is available but not automatically enabled
// Individual tests can import and use the server as needed
// Example:
// import { server } from './mocks/server';
// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// Provide a test helper that captures console output and only replays it when
// a test fails. Tests can call `await silenceIfPass(() => { ... })` or rely on
// the global `silenceIfPass` made available here.
import { silenceIfPass as _silenceIfPass } from './test-utils/silenceIfPass';

// Extend Jest matchers with custom DOM matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveFocus(): R;
      toHaveValue(value: string | number): R;
      toBeChecked(): R;
      toBeEmptyDOMElement(): R;
      toContainElement(element: HTMLElement | null): R;
    }
  }
}

declare global {
  // Allow tests to call the helper without importing it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function silenceIfPass<T>(fn: () => T | Promise<T>): Promise<T>;
}

// Attach to global so tests can use it directly.
// Note: keep the global assignment non-enumerable and stable.
Object.defineProperty(globalThis, 'silenceIfPass', {
  value: _silenceIfPass,
  writable: false,
  configurable: false,
});

// Minimal shim: some test utils (user-event) expect navigator/clipboard on global
// Ensure minimal navigator exists so user-event clipboard helpers don't throw
if (typeof (globalThis as any).navigator === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).navigator = { userAgent: 'node.js' };
}

// Note: we intentionally do NOT wrap global `test`/`it` anymore.
// The `silenceIfPass` helper is available for tests to use directly when
// they want captured console output to be replayed only on failure.

// --- Integration test global setup: register centralized hook mocks ---
// This keeps mock registration consistent and avoids duplication across
// integration test files. Individual tests may still opt into MSW by
// importing and calling `setupMSW()` from `src/test-utils/mocks/mswSetup`.
// Provide default mock implementations for the mixing hooks. Each factory
// uses `require` inside the module factory so Jest does not capture out-of-
// scope variables (which is disallowed for mock factories).
jest.mock('./hooks/useMixPreview', () =>
  require('./test-utils/mocks/mixHooks').makeUseMixPreviewModule()
);

jest.mock('./hooks/useMixGeneration', () =>
  require('./test-utils/mocks/mixHooks').makeUseMixGenerationModule()
);
