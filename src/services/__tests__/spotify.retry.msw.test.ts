/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import SpotifyService from '../../services/spotify';
jest.unmock('axios');

const server = setupMSW();

try {
  // Ensure axios uses node http adapter for msw/node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore adapter patch failures
}

describe('SpotifyService - Retry/Retry-After regression (MSW)', () => {
  test('retries when server returns 429 with Retry-After and eventually succeeds', async () => {
    if (!server) return;

    let call = 0;
    // Override /search handler to return 429 first with Retry-After: 0 then succeed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { rest } = require('msw');
    server.use(
      rest.get(
        'https://api.spotify.com/v1/search',
        (req: any, res: any, ctx: any) => {
          call++;
          if (call === 1) {
            return res(
              ctx.status(429),
              ctx.set('Retry-After', '0'),
              ctx.json({ error: 'rate_limited' })
            );
          }

          // Successful payload on retry
          return res(
            ctx.json({
              tracks: {
                items: [
                  { id: 't1', name: 'Track 1', artists: [{ name: 'A' }] },
                ],
                total: 1,
                limit: 1,
                offset: 0,
              },
            })
          );
        }
      )
    );

    const service = new SpotifyService('retry_token');

    const result = await service.searchTracks('track', { limit: 1 });
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });
});

export {};
