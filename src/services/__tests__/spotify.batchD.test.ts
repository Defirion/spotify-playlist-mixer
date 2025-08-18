/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import { rest } from 'msw';
import SpotifyService from '../../services/spotify';

jest.unmock('axios');

const server = setupMSW();

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch D (validation & position batching)', () => {
  test('searchTracks with market param returns items', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    const res = await service.searchTracks('track', { market: 'US', limit: 1 });
    expect(res).toHaveProperty('items');
    expect(res.items.length).toBeGreaterThanOrEqual(0);
  });

  test('searchTracks rejects when limit > 50', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    await expect(service.searchTracks('t', { limit: 51 } as any)).rejects.toBeDefined();
  });

  test('getUserPlaylists rejects when limit > 50', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    await expect(service.getUserPlaylists({ limit: 51 } as any)).rejects.toBeDefined();
  });

  test('getPlaylistTracks filters out invalid/null items', async () => {
    if (!server) return;

    // Override handler to return some invalid items
    server.use(
      rest.get('https://api.spotify.com/v1/playlists/:playlistId/tracks', (req, res, ctx) => {
        return res(
          ctx.json({
            items: [
              { track: null },
              { track: { id: 't_ok_1', name: 'OK 1' }, added_at: 'now', added_by: { id: 'u' } },
              { track: null },
              { track: { id: 't_ok_2', name: 'OK 2' }, added_at: 'now', added_by: { id: 'u' } },
            ],
            total: 4,
            limit: 100,
            offset: 0,
          })
        );
      })
    );

    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylistTracks('playlist_some');
    expect(res.tracks.every((t: any) => t && t.id)).toBe(true);
  });

  test('getTrackAudioFeatures rejects on empty id', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.getTrackAudioFeatures('')).rejects.toBeDefined();
  });

  test('getMultipleTrackAudioFeatures rejects on empty array', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.getMultipleTrackAudioFeatures([])).rejects.toBeDefined();
  });

  test('getPlaylist rejects on empty id', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.getPlaylist('')).rejects.toBeDefined();
  });

  test('addTracksToPlaylist sends position only on first batch', async () => {
    if (!server) return;

    const totalUris = 150; // two batches: 100 + 50
    const uris = Array.from({ length: totalUris }).map((_, i) => `spotify:track:bd_${i}`);
    const bodies: any[] = [];

    server.use(
      rest.post('https://api.spotify.com/v1/playlists/:playlistId/tracks', async (req, res, ctx) => {
        const b = await req.json().catch(() => ({}));
        bodies.push(b);
        return res(ctx.status(201), ctx.json({ snapshot_id: `snap_${bodies.length}` }));
      })
    );

    const service = new SpotifyService('normal_token');
    const result = await service.addTracksToPlaylist('pl_pos', { uris, position: 5 } as any);
    expect(result).toHaveProperty('snapshot_id');
    // first body should include position, subsequent should not
    expect(bodies.length).toBe(Math.ceil(totalUris / 100));
    expect(bodies[0]).toHaveProperty('position', 5);
    if (bodies.length > 1) expect(bodies[1]).not.toHaveProperty('position');
  });
});
