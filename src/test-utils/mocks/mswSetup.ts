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
    const handlers = require('../../mocks/handlers').handlers || [];
    if (!handlers || handlers.length === 0) return;
    const server = setupServer(...handlers);
    // Ensure axios (if used) uses the Node http adapter so msw/node can
    // intercept requests. Some tests run in a jsdom-like environment where
    // axios defaults to XHR and msw/node won't intercept those requests.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require('axios');
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const httpAdapter = require('axios/lib/adapters/http');
        axios.defaults.adapter =
          (httpAdapter && httpAdapter.default) || httpAdapter;
      } catch (e) {
        // if adapter not present, ignore; tests that need it should set explicitly
      }
    } catch (e) {
      // axios not installed or not used in this environment; ignore
    }
    // Allow tests or CI to opt into hermetic mode where any unhandled
    // request causes an immediate error. This helps CI surface network
    // leaks early. Default to 'warn' for local developer runs.
    const hermetic =
      process.env.MSW_HERMETIC === '1' || process.env.MSW_HERMETIC === 'true';
    server.listen({ onUnhandledRequest: hermetic ? 'error' : 'warn' });

    const _mswVerbose = String(
      process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
    ).toLowerCase();
    if (hermetic && (_mswVerbose === '1' || _mswVerbose === 'true')) {
      // eslint-disable-next-line no-console
      console.info('MSW hermetic mode enabled: onUnhandledRequest=error');
    }

    // Attach to global so tests can modify handlers if needed
    // @ts-ignore
    global.__msw_server = server;

    // Ensure the server is closed when the process exits (cleanup for long-running runners)
    if (
      typeof process !== 'undefined' &&
      process &&
      typeof process.on === 'function'
    ) {
      try {
        process.on('exit', () => {
          try {
            server.close();
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    // If MSW can't be required this may be due to ESM/CJS transform issues
    // or missing polyfills. In local dev we keep this as a no-op so tests can
    // continue using hook-level mocks; in CI hermetic mode we must fail fast
    // because many integration tests rely on network handlers.
    const e: any = err;
    const hermetic =
      process.env.MSW_HERMETIC === '1' || process.env.MSW_HERMETIC === 'true';

    if (hermetic) {
      // Always fail fast in hermetic CI, but only log detailed error when requested
      const _mswVerbose = String(
        process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
      ).toLowerCase();
      if (_mswVerbose === '1' || _mswVerbose === 'true') {
        // eslint-disable-next-line no-console
        console.error(
          'MSW setup failed in hermetic mode; aborting tests. Error:',
          e && e.message ? e.message : e
        );
      }
      // Re-throw so Jest fails immediately and CI surfaces the configuration issue
      throw e;
    }

    // Non-hermetic fallback: log only when verbose debugging is requested.
    const _mswVerbose = String(
      process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
    ).toLowerCase();
    if (_mswVerbose === '1' || _mswVerbose === 'true') {
      // eslint-disable-next-line no-console
      console.warn('MSW setup skipped: ', e && e.message ? e.message : e);
    }
    return;
  }
};

export default setupMSW;
