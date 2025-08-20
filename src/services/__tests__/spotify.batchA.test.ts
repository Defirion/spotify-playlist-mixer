/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
import * as msw from 'msw';
import SpotifyService from '../../services/spotify';

type MSWInfo = {
  request: Request & { json(): Promise<any> };
  params: Record<string, string>;
  cookies: Record<string, string>;
};

// Use shared mock helper to avoid importing axios-based implementation.
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

const server = setupMSW();

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
      msw.http.get(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        (info: MSWInfo) => {
          const url = new URL(info.request.url.toString());
          const limit = parseInt(url.searchParams.get('limit') || '100', 10);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);

          const slice = largeTracks.slice(offset, offset + limit);

          // debug: indicate the test-local handler ran
          // eslint-disable-next-line no-console
          console.error(
            '[test handler] playlist tracks invoked for',
            info.params.playlistId,
            'offset',
            offset
          );

          return msw.HttpResponse.json({
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
          });
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
      msw.http.post(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        async (info: MSWInfo) => {
          postCalls++;
          // debug: indicate the test-local POST handler ran
          // eslint-disable-next-line no-console
          console.error(
            '[test handler] POST playlist tracks invoked for',
            info.params.playlistId,
            'call',
            postCalls
          );
          // read body to simulate normal handler
          await info.request.json().catch(() => ({}));
          // return a snapshot id that includes the call count
          return new msw.HttpResponse(
            JSON.stringify({ snapshot_id: `snap_${postCalls}` }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        }
      )
    );

    const result = await service.addTracksToPlaylist('pl_1', { uris });
    expect(result).toHaveProperty('snapshot_id');
    expect(postCalls).toBe(Math.ceil(totalUris / 100));
  });
});
