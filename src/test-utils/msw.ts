/**
 * Simple MSW setup for Jest tests
 * Ensure our jest polyfills run before MSW is required to avoid missing globals
 */

// Ensure polyfills are installed immediately using CommonJS require so they
// execute before MSW/node (which imports TextEncoder/Response early).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../jest.polyfills');
} catch (e) {
  // ignore; the file may have been loaded by Jest setupFiles already
}

// Use the MSW package entry for node so Jest's moduleNameMapper and our CJS
// shims control which implementation is loaded. This keeps imports consistent
// across test helpers and handlers.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupServer } = require('msw/node');
// Handlers import the msw CJS shim internally to ensure consistent CJS runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { handlers } = require('../mocks/handlers');

// Create server instance
export const server = setupServer(...handlers);

// Make server.listen idempotent so multiple calls (global setup + test-level)
// don't attach duplicate interceptors and cause handlers to run twice.
{
  const origListen = server.listen.bind(server);
  const origClose = server.close.bind(server);
  // @ts-ignore
  server.listen = (opts?: any) => {
    // @ts-ignore
    if ((server as any).__msw_listening) return;
    // @ts-ignore
    origListen(opts);
    // @ts-ignore
    (server as any).__msw_listening = true;
  };

  // ensure close clears the flag so re-listen can work in new runtimes
  // @ts-ignore
  server.close = () => {
    try {
      // @ts-ignore
      origClose();
    } finally {
      // @ts-ignore
      (server as any).__msw_listening = false;
    }
  };
}

// Simple setup function for tests that need MSW
export function setupMSW() {
  // If a global MSW server was already started by test setup, avoid
  // registering lifecycle hooks again. This prevents duplicate
  // interception and handlers running twice.
  // The global setup marks (global as any).__msw_server_started = true when it calls server.listen().
  if ((global as any).__msw_server_started) {
    return server;
  }

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
    (global as any).__msw_server_started = true;
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    try {
      server.close();
    } finally {
      (global as any).__msw_server_started = false;
    }
  });

  return server;
}

// Default export for compatibility
export default setupMSW;
