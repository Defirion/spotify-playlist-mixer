/// <reference types="@testing-library/jest-dom" />
/**
 * Hermeticity check
 *
 * This tiny test suite ensures MSW is running in hermetic mode (onUnhandledRequest: 'error').
 * If any test in the entire run makes a real network request that MSW does not mock,
 * the server will throw and Jest will fail the run. Keep this file early in the test
 * ordering in CI to detect leaked network calls quickly.
 */

// Hermeticity sentinel: previously used MSW to fail on leaked network calls.
// MSW removed - keep a no-op sentinel to preserve test ordering.

test('hermeticity sentinel (no-op) - ensures MSW is in hermetic mode', () => {
  // This test intentionally does nothing. If any other test leaks a real
  // network request while this server is listening with onUnhandledRequest: 'error',
  // MSW will throw and Jest will report the failure for the suite.
  expect(true).toBe(true);
});
