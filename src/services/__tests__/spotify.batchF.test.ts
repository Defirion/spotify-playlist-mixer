/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import SpotifyService from '../../services/spotify';
import { ApiError } from '../../services/apiErrorHandler';
jest.unmock('axios');

const server = setupMSW();

try {
  // Ensure axios uses the http adapter in node tests for consistent headers
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch F (batching, params, search, audio features, retry)', () => {
  const ACCESS_TOKEN = 'normal_token';

  test('addTracksToPlaylist batches >100 tracks and only first batch contains position', async () => {
    const capturedBodies: any[] = [];

    // override handler to capture request bodies and return predictable snapshot ids
    server?.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.post(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        async (req: any, res: any, ctx: any) => {
          const body = await req.json();
          capturedBodies.push(body);
          const id = `snap_${capturedBodies.length}`;
          return res(ctx.status(201), ctx.json({ snapshot_id: id }));
        }
      )
    );

    const service = new SpotifyService(ACCESS_TOKEN);

    const total = 205;
    const uris = Array.from({ length: total }, (_, i) => `spotify:track:uri_${i}`);

    const result = await service.addTracksToPlaylist('pl_1', {
      uris,
      position: 5,
    });

    // Should have sent 3 batches (100,100,5)
    expect(capturedBodies.length).toBe(3);
    // First batch should include position
    expect(capturedBodies[0].position).toBe(5);
    // Subsequent batches should not include position
    expect(capturedBodies[1].position).toBeUndefined();
    expect(capturedBodies[2].position).toBeUndefined();
    // Service returns last snapshot id
    expect(result.snapshot_id).toBe('snap_3');
  });

  test('getPlaylist respects market and fields query params', async () => {
    let capturedUrl = '';
    server?.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.get(
        'https://api.spotify.com/v1/playlists/:playlistId',
        (req: any, res: any, ctx: any) => {
          capturedUrl = req.url.toString();
          const pl = { id: req.params.playlistId, name: 'PL Name', description: 'desc' };
          return res(ctx.json(pl));
        }
      )
    );

    const service = new SpotifyService(ACCESS_TOKEN);
    const res = await service.getPlaylist('playlist_1', { market: 'US', fields: 'id,name' });
    expect(res).toHaveProperty('id', 'playlist_1');
    expect(capturedUrl).toContain('market=US');
    expect(capturedUrl).toContain('fields=id%2Cname');
  });

  test('searchPlaylists throws on empty query and on limit>50; returns playlists on normal query', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    await expect(service.searchPlaylists('')).rejects.toBeInstanceOf(ApiError);
    await expect(service.searchPlaylists('ok', { limit: 60 })).rejects.toBeInstanceOf(ApiError);

    // override /search to return playlists
    server?.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.get('https://api.spotify.com/v1/search', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url.toString());
        const type = url.searchParams.get('type');
        if (type === 'playlist') {
          return res(ctx.json({ playlists: { items: [{ id: 'p1', name: 'p' }], total: 1, limit: 20, offset: 0 } }));
        }
        return res(ctx.json({ playlists: { items: [], total: 0, limit: 20, offset: 0 } }));
      })
    );

    const out = await service.searchPlaylists('Chill', { limit: 20 });
    expect(out.playlists.length).toBe(1);
  });

  test('getMultipleTrackAudioFeatures validates input and returns features array', async () => {
    const service = new SpotifyService(ACCESS_TOKEN);
    await expect(service.getMultipleTrackAudioFeatures([])).rejects.toBeInstanceOf(ApiError);

    // Add handler for /audio-features?ids=... to return matching audio_features
    server?.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.get('https://api.spotify.com/v1/audio-features', (req: any, res: any, ctx: any) => {
        const url = new URL(req.url.toString());
        const idsParam = url.searchParams.get('ids') || '';
        const ids = idsParam ? idsParam.split(',') : [];
        const features = ids.map((id: string) => ({ id, danceability: 0.5, energy: 0.5 }));
        return res(ctx.json({ audio_features: features }));
      })
    );

    const features = await service.getMultipleTrackAudioFeatures(['track_1', 'track_2']);
    expect(Array.isArray(features)).toBe(true);
    // Should return 2 items
    expect(features.length).toBe(2);
  });

  test('withRetry will retry on transient 429 then succeed', async () => {
    let calls = 0;
    server?.use(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('msw').rest.get('https://api.spotify.com/v1/me', (req: any, res: any, ctx: any) => {
        calls++;
        if (calls < 3) {
          return res(ctx.status(429), ctx.set('Retry-After', '0'), ctx.json({ error: 'rate_limited' }));
        }
        return res(ctx.json({ id: 'me_1' }));
      })
    );

    // shorten retry delays to zero for the test so it runs fast
    const originalGetRetryDelay = ApiError.prototype.getRetryDelay;
    // @ts-ignore
    ApiError.prototype.getRetryDelay = function () {
      return 0;
    };

    try {
      const service = new SpotifyService(ACCESS_TOKEN);
      const profile = await service.getUserProfile();
      expect(profile).toHaveProperty('id', 'me_1');
      expect(calls).toBeGreaterThanOrEqual(3);
    } finally {
      // @ts-ignore restore
      ApiError.prototype.getRetryDelay = originalGetRetryDelay;
    }
  });
});
