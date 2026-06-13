// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// The /vitest entry extends Vitest's expect and registers the matcher types.
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// NOTE: MSW has been removed from the repository. Tests should use local
// mocks (files under `src/test-utils/mocks` or `src/__tests__/mocks`) or
// stub `global.fetch` directly when network behavior needs to be simulated.

// @testing-library/dom only detects fake timers (waitFor polling) when a
// global `jest` object exists. vi is API-compatible for the methods it uses
// (advanceTimersByTime, isMockFunction, ...).
(globalThis as any).jest = vi;

// Enable verbose test logging for handlers that conditionally emit errors.
// Some code paths only call `console.error` when TEST_VERBOSE is truthy. Set it
// here so tests that assert on specific console calls behave consistently.
if (typeof process !== 'undefined' && process.env) {
  // Default TEST_VERBOSE to 'false' so test suites opt-in when they need
  // verbose logging. Some edge-case tests expect no logging in the 'test'
  // environment unless explicitly enabled.
  process.env.TEST_VERBOSE = String(process.env.TEST_VERBOSE || 'false');
}

// Global quiet-mode for console.error: by default tests stay quiet unless
// TEST_VERBOSE is explicitly enabled. Individual test suites can still
// spyOn(console, 'error') to assert calls — vi.spyOn will replace this
// wrapper during the test and capture calls as expected.
(() => {
  const orig = console.error.bind(console);
  // install wrapper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (console as any).error = (...args: any[]) => {
    const v = String(process.env.TEST_VERBOSE || '').toLowerCase();
    if (v === '1' || v === 'true') {
      orig(...args);
    }
    // otherwise noop to keep CI output clean
  };
})();

// --- Integration test global setup: register centralized hook mocks ---
// This keeps mock registration consistent and avoids duplication across
// integration test files. Tests should rely on local mocks under
// `src/test-utils/mocks` or stub `global.fetch` when simulating network
// behavior. Provide default mock implementations for the mixing hooks.
vi.mock('./hooks/useMixPreview', async () => {
  const { makeUseMixPreviewModule } =
    await import('./test-utils/mocks/mixHooks');
  return makeUseMixPreviewModule();
});

vi.mock('./hooks/useMixGeneration', async () => {
  const { makeUseMixGenerationModule } =
    await import('./test-utils/mocks/mixHooks');
  return makeUseMixGenerationModule();
});
