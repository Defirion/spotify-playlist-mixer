// MSW test setup utility (TypeScript)
// Import this in tests that need API mocking

// Import Jest polyfills first (required for MSW)
import '../jest.polyfills';
// Ensure axios http adapter is set for Node so MSW can intercept before tests run
// (Removed centralized axios http adapter override to allow axios to use fetch adapter in Node >=18)

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
      try {
        const axiosMod = require('axios');
        const realAxios = axiosMod.default || axiosMod; // support ESM/CJS shapes
        const httpAdapterMod = require('axios/lib/adapters/http');
        const httpAdapter = httpAdapterMod.default || httpAdapterMod;
        if (realAxios && realAxios.defaults && httpAdapter) {
          realAxios.defaults.adapter = httpAdapter;
          if (
            process.env.MSW_VERBOSE === '1' ||
            process.env.TEST_VERBOSE === '1'
          ) {
            // eslint-disable-next-line no-console
            console.error('[msw-setup] axios http adapter applied');
          }
        } else if (
          process.env.MSW_VERBOSE === '1' ||
          process.env.TEST_VERBOSE === '1'
        ) {
          // eslint-disable-next-line no-console
          console.error('[msw-setup] axios/http adapter shape unsupported', {
            hasDefaults: !!(realAxios && realAxios.defaults),
            hasAdapter: !!httpAdapter,
          });
        }
      } catch (e) {
        if (
          process.env.MSW_VERBOSE === '1' ||
          process.env.TEST_VERBOSE === '1'
        ) {
          // eslint-disable-next-line no-console
          console.error('[msw-setup] failed to apply axios adapter', e);
        }
      }
      // eslint-disable-next-line no-console
      if (process.env.MSW_VERBOSE === '1' || process.env.TEST_VERBOSE === '1')
        console.error('[msw-setup] starting MSW server');
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
    const e: any = err;
    const hermetic =
      process.env.MSW_HERMETIC === '1' || process.env.MSW_HERMETIC === 'true';

    const _mswVerbose = String(
      process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
    ).toLowerCase();
    if (hermetic) {
      if (_mswVerbose === '1' || _mswVerbose === 'true') {
        // eslint-disable-next-line no-console
        console.error(
          'MSW setup failed in hermetic mode; aborting tests. Error:',
          e && e.message ? e.message : e
        );
      }
      throw e;
    }

    // Non-hermetic fallback: warn only when verbose debugging is enabled
    if (_mswVerbose === '1' || _mswVerbose === 'true') {
      // eslint-disable-next-line no-console
      console.warn(
        'MSW setup skipped: could not require MSW server, falling back to hook-level mocks.'
      );
    }
    return undefined;
  }
};

export default setupMSW;
