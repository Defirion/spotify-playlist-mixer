// MSW test setup utility (TypeScript)
// Import this in tests that need API mocking

// Import Jest polyfills first (required for MSW)
import '../jest.polyfills';

/**
 * Lazy MSW setup. Some Jest environments (CRA default) can fail when importing
 * ESM-only msw artifacts at module load time. We require the server lazily and
 * fall back to a no-op if importing MSW fails.
 *
 * Usage: const server = setupMSW(); // returns server instance or undefined
 */
export const setupMSW = (): any | undefined => {
  try {
    // Require lazily so Jest doesn't attempt to transform msw/node during bootstrap
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { server } = require('../mocks/server');

    // No global axios adapter override here — let axios use its default node
    // adapters so MSW/node can intercept requests via its standard hooks.

    beforeAll(() => {
      server.listen({ onUnhandledRequest: 'warn' });
    });

    afterEach(() => {
      server.resetHandlers();
    });

    afterAll(() => {
      server.close();
    });

    return server;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      'MSW setup skipped: could not require MSW server, falling back to hook-level mocks.'
    );
    return undefined;
  }
};

export default setupMSW;
