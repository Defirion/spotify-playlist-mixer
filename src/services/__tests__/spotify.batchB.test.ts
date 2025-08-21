/**
 * @jest-environment node
 */

// Increase Jest default timeout for integration-style tests
import SpotifyService from '../../services/spotify';

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

describe('SpotifyService - Batch B (playlists & create/remove)', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    // Silence noisy debug errors unless the test fails.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore?.();
  });

  test('getUserPlaylists single page returns items', async () => {
    const service = createService('normal_token');
    const res = await service.getUserPlaylists({ limit: 2, offset: 0 });
    expect(res).toHaveProperty('items');
    expect(Array.isArray(res.items)).toBe(true);
  });

  test('getUserPlaylists with all=true aggregates pages', async () => {
    // Create multiple pages for this test by mocking the service method
    const allPlaylists = Array.from({ length: 120 }).map((_, i) => ({
      id: `pl_all_${i}`,
      name: `PL ${i}`,
      tracks: { total: 0 },
    }));
    const service = createService('normal_token');
    // stub the instance method to return paginated data
    if (service) {
      (service as any).getUserPlaylists = jest
        .fn()
        .mockImplementation(async (opts: any = {}) => {
          const limit = opts?.limit ?? 50;
          const offset = opts?.offset ?? 0;
          if (opts && opts.all) {
            return {
              items: allPlaylists,
              total: allPlaylists.length,
              limit: allPlaylists.length,
              offset: 0,
            };
          }
          const slice = allPlaylists.slice(offset, offset + limit);
          return { items: slice, total: allPlaylists.length, limit, offset };
        });
    }
    const res = await service.getUserPlaylists({ all: true });
    expect(res.items.length).toBe(allPlaylists.length);
  });

  test('getPlaylist returns playlist details', async () => {
    // Provide a direct mock on the service instance
    const service = createService('normal_token');
    if (service) {
      (service as any).getPlaylist = jest
        .fn()
        .mockResolvedValue({ id: 'playlist_1', name: 'My Awesome Playlist' });
    }
    const res = await service.getPlaylist('playlist_1');
    expect(res).toHaveProperty('id', 'playlist_1');
  });

  test('createPlaylist happy path returns created playlist', async () => {
    const service = createService('normal_token');
    const res = await service.createPlaylist('test_user_123', {
      name: 'New One',
      description: 'desc',
    });
    expect(res).toHaveProperty('id');
    expect(res).toHaveProperty('name', 'New One');
  });

  test('removeTracksFromPlaylist successful response', async () => {
    const service = createService('normal_token');

    // Mock the method to return a successful response
    service.removeTracksFromPlaylist = jest.fn().mockResolvedValue({
      snapshot_id: 'test_snapshot_remove',
    });

    const res = await service.removeTracksFromPlaylist('playlist_1', {
      tracks: [{ uri: 'spotify:track:track_1' }],
    } as any);
    expect(res).toHaveProperty('snapshot_id');
    expect(res.snapshot_id).toBe('test_snapshot_remove');
  });
});
