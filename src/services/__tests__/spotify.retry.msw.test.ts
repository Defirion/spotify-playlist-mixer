/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
import SpotifyService from '../../services/spotify';
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

const server = setupMSW();

// No axios adapter required for fetch-based tests.

describe('SpotifyService - Retry/Retry-After regression (MSW)', () => {
  test('retries when server returns 429 with Retry-After and eventually succeeds', async () => {
    if (!server) return;

    let call = 0;
    // Override /search handler to return 429 first with Retry-After: 0 then succeed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const msw = require('msw');

    const handlerFn = (req: any, res: any, ctx: any) => {
      call++;
      if (call === 1) {
        // First call returns 429
        if (typeof res === 'function' && ctx) {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '0'),
            ctx.json({ error: 'rate_limited' })
          );
        }
        return new msw.HttpResponse(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { 'Retry-After': '0', 'Content-Type': 'application/json' },
        });
      }

      // Successful payload on retry
      const successResponse = {
        tracks: {
          items: [{ id: 't1', name: 'Track 1', artists: [{ name: 'A' }] }],
          total: 1,
          limit: 1,
          offset: 0,
        },
      };

      if (typeof res === 'function' && ctx) {
        return res(ctx.json(successResponse));
      }
      return msw.HttpResponse.json(successResponse);
    };

    // Use both rest and http APIs for compatibility
    const handlers = [];
    if (msw.rest && msw.rest.get) {
      handlers.push(
        msw.rest.get('https://api.spotify.com/v1/search', handlerFn)
      );
    }
    if (msw.http && msw.http.get) {
      handlers.push(
        msw.http.get('https://api.spotify.com/v1/search', (info: any) => {
          return handlerFn(info, null, null);
        })
      );
    }

    server.use(...handlers);

    const service = new SpotifyService('retry_token');

    const result = await service.searchTracks('track', { limit: 1 });
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });
});

export {};
