// Polyfill and safe setup for MSW in node/jest environments. Moved out of
// `__tests__` to avoid accidental test discovery.
// Polyfill TextEncoder/TextDecoder for older Node/Jest envs
if (typeof (global as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

// Ensure Web Streams globals exist (TransformStream, ReadableStream, WritableStream)
if (typeof (global as any).TransformStream === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ponyfill = require('web-streams-polyfill/ponyfill');
    (global as any).TransformStream = ponyfill.TransformStream;
    (global as any).ReadableStream = ponyfill.ReadableStream;
    (global as any).WritableStream = ponyfill.WritableStream;
  } catch (e) {
    // If ponyfill isn't installed, we'll let MSW setup fail gracefully and
    // show the prior console.warn. Installing 'web-streams-polyfill' is the
    // recommended fix for running MSW in some Node/Jest environments.
  }
}

export const setupMSW = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServer } = require('msw/node');
    const handlers = require('./mswHandlers').handlers || [];
    if (!handlers || handlers.length === 0) return;
    const server = setupServer(...handlers);
    // Allow tests or CI to opt into hermetic mode where any unhandled
    // request causes an immediate error. This helps CI surface network
    // leaks early. Default to 'warn' for local developer runs.
    const hermetic =
      process.env.MSW_HERMETIC === '1' || process.env.MSW_HERMETIC === 'true';
    server.listen({ onUnhandledRequest: hermetic ? 'error' : 'warn' });
    // Attach to global so tests can modify handlers if needed
    // @ts-ignore
    global.__msw_server = server;
  } catch (err) {
    // Avoid noisy warnings in test output when MSW can't be required
    // (ESM/CJS transform issues or missing ponyfills). Provide an opt-in
    // verbose mode via MSW_VERBOSE=1 for debugging.
    const e: any = err;
    if (process.env.MSW_VERBOSE) {
      // eslint-disable-next-line no-console
      console.warn('MSW setup skipped: ', e && e.message ? e.message : e);
    }
    return;
  }
};

export default setupMSW;
