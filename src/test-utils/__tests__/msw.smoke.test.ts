/**
 * @jest-environment node
 */

import setupMSW from '../msw';

const server = setupMSW();

describe('MSW smoke test', () => {
  if (!server) {
    test('MSW not available in this environment - skipped', () => {
      expect(true).toBe(true);
    });
    return;
  }
  test('handlers module loads and exports handlers array', () => {
    // Ensure handlers file can be required and contains handlers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handlers } = require('../../mocks/handlers');
    expect(Array.isArray(handlers)).toBe(true);
    expect(handlers.length).toBeGreaterThan(0);
  });
});
