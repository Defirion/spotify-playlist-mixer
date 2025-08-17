// Polyfill and safe setup for MSW in node/jest environments. Moved out of
// `__tests__` to avoid accidental test discovery.
// Polyfill TextEncoder/TextDecoder for older Node/Jest envs
if (typeof (global as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

export const setupMSW = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupServer } = require('msw/node');
    const handlers = require('./mswHandlers').handlers || [];
    if (!handlers || handlers.length === 0) return;
    const server = setupServer(...handlers);
    server.listen({ onUnhandledRequest: 'warn' });
    // Attach to global so tests can modify handlers if needed
    // @ts-ignore
    global.__msw_server = server;
  } catch (err) {
    // eslint-disable-next-line no-console
    const e: any = err;
    // Not fatal in environments where MSW import fails (ESM/CJS mismatch)
    console.warn('MSW setup skipped: ', e && e.message ? e.message : e);
    return;
  }
};

export default setupMSW;
