/**
 * @jest-environment node
 */

// Increase Jest default timeout for these integration-style tests
import setupMSW from '../../test-utils/msw-setup';
import { rest } from 'msw';
import SpotifyService from '../../services/spotify';

jest.setTimeout(30000);

jest.unmock('axios');

const server = setupMSW();

describe('SpotifyService - Batch B (playlists & create/remove)', () => {
  test('getUserPlaylists single page returns items', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    const res = await service.getUserPlaylists({ limit: 2, offset: 0 });
    expect(res).toHaveProperty('items');
    expect(Array.isArray(res.items)).toBe(true);
  });

  test('getUserPlaylists with all=true aggregates pages', async () => {
    if (!server) return;

    // Create multiple pages in MSW for this test
    const allPlaylists = Array.from({ length: 120 }).map((_, i) => ({
      id: `pl_all_${i}`,
      name: `PL ${i}`,
      tracks: { total: 0 },
    }));

    server.use(
      rest.get('https://api.spotify.com/v1/me/playlists', (req, res, ctx) => {
        const url = new URL(req.url.toString());
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const slice = allPlaylists.slice(offset, offset + limit);
        return res(
          ctx.json({ items: slice, total: allPlaylists.length, limit, offset })
        );
      })
    );

    const service = new SpotifyService('normal_token');
    const res = await service.getUserPlaylists({ all: true });
    expect(res.items.length).toBe(allPlaylists.length);
  });

  test('getPlaylist returns playlist details', async () => {
    if (!server) return;
    // Provide a handler for this test to avoid unhandled request
    server.use(
      rest.get(
        'https://api.spotify.com/v1/playlists/:playlistId',
        (req, res, ctx) => {
          return res(
            ctx.json({ id: req.params.playlistId, name: 'My Awesome Playlist' })
          );
        }
      )
    );

    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylist('playlist_1');
    expect(res).toHaveProperty('id', 'playlist_1');
  });

  test('createPlaylist happy path returns created playlist', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    const res = await service.createPlaylist('test_user_123', {
      name: 'New One',
      description: 'desc',
    });
    expect(res).toHaveProperty('id');
    expect(res).toHaveProperty('name', 'New One');
  });

  test('removeTracksFromPlaylist successful response', async () => {
    if (!server) return;
    const service = new SpotifyService('normal_token');
    const res = await service.removeTracksFromPlaylist('playlist_1', {
      tracks: [{ uri: 'spotify:track:track_1' }],
    } as any);
    expect(res).toHaveProperty('snapshot_id');
  });
});
