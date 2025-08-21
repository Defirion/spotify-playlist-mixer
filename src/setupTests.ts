// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// NOTE: MSW has been removed from the repository. Tests should use local
// mocks (files under `src/test-utils/mocks` or `src/__tests__/mocks`) or
// stub `global.fetch` directly when network behavior needs to be simulated.

// Provide a test helper that captures console output and only replays it when
// a test fails. Tests can call `await silenceIfPass(() => { ... })` or rely on
// the global `silenceIfPass` made available here.
import { silenceIfPass as _silenceIfPass } from './test-utils/silenceIfPass';

// Enable verbose test logging for handlers that conditionally emit errors.
// Some code paths only call `console.error` when TEST_VERBOSE is truthy. Set it
// here so tests that assert on specific console calls behave consistently.
if (typeof process !== 'undefined' && process.env) {
  // Default TEST_VERBOSE to 'false' so test suites opt-in when they need
  // verbose logging. Some edge-case tests expect no logging in the 'test'
  // environment unless explicitly enabled.
  process.env.TEST_VERBOSE = String(process.env.TEST_VERBOSE || 'false');
}

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
// integration test files. Tests should rely on local mocks under
// `src/test-utils/mocks` or stub `global.fetch` when simulating network
// behavior.
// Provide default mock implementations for the mixing hooks. Each factory
// uses `require` inside the module factory so Jest does not capture out-of-
// scope variables (which is disallowed for mock factories).
jest.mock('./hooks/useMixPreview', () =>
  require('./test-utils/mocks/mixHooks').makeUseMixPreviewModule()
);

jest.mock('./hooks/useMixGeneration', () =>
  require('./test-utils/mocks/mixHooks').makeUseMixGenerationModule()
);
