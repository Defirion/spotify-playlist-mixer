/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import { rest } from 'msw';
import SpotifyService from '../../services/spotify';

jest.unmock('axios');

const server = setupMSW();

// Ensure axios uses node http adapter for msw + axios consistency
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const httpAdapter = require('axios/lib/adapters/http');
  axios.defaults.adapter = (httpAdapter && httpAdapter.default) || httpAdapter;
} catch (e) {
  // ignore
}

describe('SpotifyService - Batch A (pagination & batching)', () => {
  test('getPlaylistTracks paginates and calls onProgress', async () => {
    if (!server) return;

    // Build a large set of mock tracks to force multiple pages (service page size = 100)
    const total = 250;
    const largeTracks = Array.from({ length: total }).map((_, i) => ({
      id: `track_big_${i}`,
      name: `Big Track ${i}`,
      artists: [
        { id: `artist_${i}`, name: `Artist ${i}`, uri: `spotify:artist:${i}` },
      ],
      album: {
        id: `album_${i}`,
        name: `Album ${i}`,
        uri: `spotify:album:${i}`,
      },
      uri: `spotify:track:track_big_${i}`,
    }));

    // Override the playlist tracks handler to return our largeTracks with pagination
    server.use(
      rest.get(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        (req, res, ctx) => {
          const url = new URL(req.url.toString());
          const limit = parseInt(url.searchParams.get('limit') || '100', 10);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);

          const slice = largeTracks.slice(offset, offset + limit);

          return res(
            ctx.json({
              items: slice.map(t => ({
                track: t,
                added_at: new Date().toISOString(),
                added_by: { id: 'u' },
              })),
              total: largeTracks.length,
              limit,
              offset,
              next:
                offset + limit < largeTracks.length
                  ? `?limit=${limit}&offset=${offset + limit}`
                  : null,
            })
          );
        }
      )
    );

    const service = new SpotifyService('normal_token');

    interface Progress {
      loaded: number;
      total: number;
      percentage: number;
    }
    const progress: Progress[] = [];
    const res = await service.getPlaylistTracks('playlist_big', {
      onProgress: (p: Progress) => progress.push(p),
    } as any);

    expect(res.tracks.length).toBe(total);
    expect(res.total).toBe(total);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1].loaded).toBe(total);
  });

  test('addTracksToPlaylist validates empty URIs and batches large requests', async () => {
    if (!server) return;

    const service = new SpotifyService('normal_token');

    // Validation: empty uris should reject
    // @ts-ignore
    await expect(
      service.addTracksToPlaylist('pl_1', { uris: [] })
    ).rejects.toBeDefined();

    // Batching: create 250 URIs -> should produce 3 POST calls (100,100,50)
    const totalUris = 250;
    const uris = Array.from({ length: totalUris }).map(
      (_, i) => `spotify:track:batch_${i}`
    );

    let postCalls = 0;

    server.use(
      rest.post(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        async (req, res, ctx) => {
          postCalls++;
          // read body to simulate normal handler
          await req.json().catch(() => ({}));
          // return a snapshot id that includes the call count
          return res(
            ctx.status(201),
            ctx.json({ snapshot_id: `snap_${postCalls}` })
          );
        }
      )
    );

    const result = await service.addTracksToPlaylist('pl_1', { uris });
    expect(result).toHaveProperty('snapshot_id');
    expect(postCalls).toBe(Math.ceil(totalUris / 100));
  });
});
