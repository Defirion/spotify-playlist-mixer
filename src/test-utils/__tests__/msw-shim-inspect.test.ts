/**
 * @jest-environment node
 */

test('inspect msw shim', () => {
  // Ensure polyfills run before MSW/interceptors are required
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../jest.polyfills');
  } catch (e) {}
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const msw = require('msw');
  // eslint-disable-next-line no-console
  console.error('msw keys:', Object.keys(msw));
  // eslint-disable-next-line no-console
  console.error('msw.rest type:', typeof (msw && msw.rest));
  if (msw && msw.rest) {
    // eslint-disable-next-line no-console
    console.error('msw.rest keys:', Object.keys(msw.rest));
  }
  expect(msw).toBeDefined();
});
