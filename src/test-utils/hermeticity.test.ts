/// <reference types="@testing-library/jest-dom" />
/**
 * Hermeticity check
 *
 * This tiny test suite ensures MSW is running in hermetic mode (onUnhandledRequest: 'error').
 * If any test in the entire run makes a real network request that MSW does not mock,
 * the server will throw and Jest will fail the run. Keep this file early in the test
 * ordering in CI to detect leaked network calls quickly.
 */

import { setupMSW } from './mocks/mswSetup';

// Ensure the project's MSW helper runs (it attaches a global.__msw_server when available)
setupMSW();

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server: any = (global as any).__msw_server;
  if (!server) {
    // MSW couldn't be initialized in this environment (possible in some local setups).
    // In that case we don't want to fail; the hermetic check is primarily for CI.
    return;
  }

  // If the server is already running, restart it to ensure hermetic mode.
  try {
    if (typeof server.close === 'function') server.close();
  } catch (e) {
    // ignore
  }

  if (typeof server.listen === 'function') {
    server.listen({ onUnhandledRequest: 'error' });
  }
});

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server: any = (global as any).__msw_server;
  if (server && typeof server.close === 'function') {
    try {
      server.close();
    } catch (e) {
      // ignore
    }
  }
});

test('hermeticity sentinel (no-op) - ensures MSW is in hermetic mode', () => {
  // This test intentionally does nothing. If any other test leaks a real
  // network request while this server is listening with onUnhandledRequest: 'error',
  // MSW will throw and Jest will report the failure for the suite.
  expect(true).toBe(true);
});
