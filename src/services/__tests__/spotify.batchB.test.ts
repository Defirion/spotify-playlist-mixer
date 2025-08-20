/**
 * @jest-environment node
 */

// Increase Jest default timeout for these integration-style tests
import setupMSW from '../../test-utils/msw';
import * as msw from 'msw';

import SpotifyService from '../../services/spotify';

type MSWInfo = {
  request: Request & { json(): Promise<any> };
  params: Record<string, string>;
  cookies: Record<string, string>;
};

jest.setTimeout(30000);

// Use shared mock factory for SpotifyService to ensure consistent behavior
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

// Robust instantiation helper: some tests mock the module as a jest.fn factory
// (callable) while others mock the class constructor. Try `new` first and
// fall back to calling the function directly when needed.
const createService = (token: string) => {
  // Try calling as a factory first (jest.fn mock implementations often expect this)
  try {
    // If the imported value is a jest mock with an implementation, invoke it
    // via getMockImplementation() to get the concrete instance.
    // @ts-ignore
    if (typeof (SpotifyService as any).getMockImplementation === 'function') {
      // @ts-ignore
      const impl = (SpotifyService as any).getMockImplementation();
      if (typeof impl === 'function') {
        const called = impl(token);
        if (called && typeof called === 'object') return called;
      }
    }

    // Otherwise try calling the exported value directly
    // @ts-ignore
    const called = (SpotifyService as any)(token);
    if (called && typeof called === 'object') return called;
  } catch (e) {
    // ignore
  }

  // Fallback to `new` in case the real export is a class constructor
  try {
    // @ts-ignore
    const inst = new (SpotifyService as any)(token);
    if (inst && typeof inst === 'object') return inst;
  } catch (e) {
    // ignore
  }
  return null;
};

const server = setupMSW();

describe('SpotifyService - Batch B (playlists & create/remove)', () => {
  test('getUserPlaylists single page returns items', async () => {
    if (!server) return;
    const service = createService('normal_token');
    // debug: inspect mocked service instance
    // eslint-disable-next-line no-console
    // eslint-disable-next-line no-console
    try {
      // Inspect the imported constructor/value too
      // eslint-disable-next-line no-console
      console.error(
        '[DEBUG spotify.batchB] imported SpotifyService:',
        typeof SpotifyService,
        Object.keys(SpotifyService || {})
      );
    } catch (e) {}
    console.error(
      '[DEBUG spotify.batchB] service shape:',
      service && typeof service,
      Object.keys(service || {})
    );
    try {
      // show non-enumerable own property names
      // eslint-disable-next-line no-console
      console.error(
        '[DEBUG spotify.batchB] own props:',
        Object.getOwnPropertyNames(service || {})
      );
      // eslint-disable-next-line no-console
      console.error(
        '[DEBUG spotify.batchB] proto keys:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(service || {}))
      );
      // eslint-disable-next-line no-console
      console.error(
        '[DEBUG spotify.batchB] typeof.getUserPlaylists:',
        service && typeof (service as any).getUserPlaylists
      );
    } catch (e) {}
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
      msw.http.get('https://api.spotify.com/v1/me/playlists', (info: any) => {
        const url = new URL(info.request.url.toString());
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const slice = allPlaylists.slice(offset, offset + limit);
        return msw.HttpResponse.json({
          items: slice,
          total: allPlaylists.length,
          limit,
          offset,
        });
      })
    );

    const service = createService('normal_token');
    const res = await service.getUserPlaylists({ all: true });
    expect(res.items.length).toBe(allPlaylists.length);
  });

  test('getPlaylist returns playlist details', async () => {
    if (!server) return;
    // Provide a handler for this test to avoid unhandled request
    server.use(
      msw.http.get(
        'https://api.spotify.com/v1/playlists/:playlistId',
        (info: any) => {
          return msw.HttpResponse.json({
            id: info.params.playlistId,
            name: 'My Awesome Playlist',
          });
        }
      )
    );

    const service = createService('normal_token');
    const res = await service.getPlaylist('playlist_1');
    expect(res).toHaveProperty('id', 'playlist_1');
  });

  test('createPlaylist happy path returns created playlist', async () => {
    if (!server) return;
    const service = createService('normal_token');
    const res = await service.createPlaylist('test_user_123', {
      name: 'New One',
      description: 'desc',
    });
    expect(res).toHaveProperty('id');
    expect(res).toHaveProperty('name', 'New One');
  });

  test('removeTracksFromPlaylist successful response', async () => {
    if (!server) return;
    const service = createService('normal_token');
    const res = await service.removeTracksFromPlaylist('playlist_1', {
      tracks: [{ uri: 'spotify:track:track_1' }],
    } as any);
    expect(res).toHaveProperty('snapshot_id');
  });
});
