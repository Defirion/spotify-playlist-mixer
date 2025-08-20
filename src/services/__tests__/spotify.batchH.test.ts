/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
import SpotifyService from '../../services/spotify';
import { ApiError } from '../../services/apiErrorHandler';
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

const server = setupMSW();

try {
  const axios = require('axios');
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch H (multi-batch errors & retry)', () => {
  test('addTracksToPlaylist fails when second batch returns 500 and no retry available', async () => {
    if (!server) return;

    // First batch succeeds, second batch returns 500
    let call = 0;
    server.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.post(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        async (req: any, res: any, ctx: any) => {
          call++;
          if (call === 1) {
            return res(ctx.status(201), ctx.json({ snapshot_id: 'snap_ok' }));
          }
          // Simulate server error on second batch
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        }
      )
    );

    const service = new SpotifyService('normal_token');

    const uris = Array.from({ length: 150 }).map(
      (_, i) => `spotify:track:err_${i}`
    );

    // Force ApiError retry delays to zero so test runs quickly and deterministic
    const originalGetRetryDelay = ApiError.prototype.getRetryDelay;
    // @ts-ignore
    ApiError.prototype.getRetryDelay = function () {
      return 0;
    };

    try {
      await expect(
        service.addTracksToPlaylist('pl_err', { uris })
      ).rejects.toBeInstanceOf(ApiError);
    } finally {
      // @ts-ignore
      ApiError.prototype.getRetryDelay = originalGetRetryDelay;
    }
  });

  test('removeTracksFromPlaylist retries on transient 429 then succeeds', async () => {
    if (!server) return;

    let calls = 0;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const msw = require('msw');

    const handlerFn = async (req: any, res: any, ctx: any) => {
      calls++;
      if (calls < 2) {
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

      const successResponse = { snapshot_id: 'snap_del_ok' };
      if (typeof res === 'function' && ctx) {
        return res(ctx.json(successResponse));
      }
      return msw.HttpResponse.json(successResponse);
    };

    // Use both rest and http APIs for compatibility
    const handlers = [];
    if (msw.rest && msw.rest.delete) {
      handlers.push(
        msw.rest.delete(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          handlerFn
        )
      );
    }
    if (msw.http && msw.http.delete) {
      handlers.push(
        msw.http.delete(
          'https://api.spotify.com/v1/playlists/:playlistId/tracks',
          (info: any) => {
            return handlerFn(info, null, null);
          }
        )
      );
    }

    server.use(...handlers);

    // shorten retry delays
    const originalGetRetryDelay = ApiError.prototype.getRetryDelay;
    // @ts-ignore
    ApiError.prototype.getRetryDelay = function () {
      return 0;
    };

    try {
      const service = new SpotifyService('normal_token');
      const res = await service.removeTracksFromPlaylist('pl_del', {
        tracks: [{ uri: 'spotify:track:1' }],
      } as any);
      expect(res).toHaveProperty('snapshot_id', 'snap_del_ok');
      expect(calls).toBeGreaterThanOrEqual(2);
    } finally {
      // @ts-ignore
      ApiError.prototype.getRetryDelay = originalGetRetryDelay;
    }
  });
});
