import SpotifyService from '../spotify';
import { ApiError, ERROR_TYPES } from '../apiErrorHandler';
import { FetchInstance } from '../fetchClient';
import { getSpotifyApi } from '../../utils/spotify';

// We stub the underlying API layer so tests focus on service behavior.
vi.mock('../../utils/spotify');
const mockGetSpotifyApi = getSpotifyApi as import('vitest').MockedFunction<
  typeof getSpotifyApi
>;

// Helper to build a fake API client shape the service expects
function makeApi(overrides: Partial<Record<string, any>> = {}): any {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe('SpotifyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw BAD_REQUEST error when access token missing', () => {
      const captureError = () => {
        try {
          new (SpotifyService as any)('');
        } catch (e: any) {
          return e;
        }
        return null;
      };
      const err = captureError();
      expect(err).toBeInstanceOf(ApiError);
      expect((err as any).type).toBe(ERROR_TYPES.BAD_REQUEST);
    });

    it('should create instance when token provided', () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('token123');
      expect(svc).toBeInstanceOf(SpotifyService);
      expect(mockGetSpotifyApi).toHaveBeenCalledWith('token123');
    });

    it('should accept a DI client and infer token from Authorization header', () => {
      const api = makeApi({
        defaults: { headers: { Authorization: 'Bearer abc' } },
      });
      // When passing a client directly, getSpotifyApi should not be used
      const svc = new (SpotifyService as any)(api as any);
      expect(svc).toBeInstanceOf(SpotifyService);
      expect(mockGetSpotifyApi).not.toHaveBeenCalled();
    });

    it('should infer token from lowercase authorization header when present', () => {
      const api = makeApi({
        defaults: { headers: { authorization: 'Bearer lower' } },
      });
      const svc = new (SpotifyService as any)(api as any);
      expect(svc).toBeInstanceOf(SpotifyService);
      expect(mockGetSpotifyApi).not.toHaveBeenCalled();
    });

    it('should throw ApiError when constructed with null token', () => {
      // @ts-ignore - testing runtime behavior
      expect(() => new SpotifyService(null)).toThrow(ApiError);
    });
  });

  describe('dependency injection with a real FetchInstance', () => {
    class MockFetch extends FetchInstance {
      get = vi.fn();
      post = vi.fn();
      delete = vi.fn();
    }

    it('uses the injected client for requests', async () => {
      const mock = new MockFetch({
        baseURL: 'https://api.spotify.com/v1',
        headers: { Authorization: 'Bearer injected_token' },
      });
      (mock.get as import('vitest').Mock).mockResolvedValue({
        data: { tracks: { items: [], total: 0, limit: 5, offset: 0 } },
      });

      const service = new SpotifyService(mock as any);

      await service.searchTracks('test');
      expect(mock.get).toHaveBeenCalledTimes(1);
      const calledPath = (mock.get as import('vitest').Mock).mock.calls[0][0];
      const url = new URL(calledPath, 'https://api.spotify.com/v1');
      expect(url.pathname.endsWith('/search')).toBe(true);
      expect(url.searchParams.get('q')).toBe('test');
      expect(url.searchParams.get('limit')).toBe('5');
      expect(url.searchParams.get('offset')).toBe('0');
    });
  });

  describe('searchTracks', () => {
    it('should throw BAD_REQUEST when query empty', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.searchTracks('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
        context: expect.objectContaining({ operation: 'searchTracks' }),
      });
    });

    it('should perform request and map response when successful', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');

      api.get.mockResolvedValue({
        data: {
          tracks: {
            items: [
              { id: 'track1', name: 'T1' },
              { id: 'track2', name: 'T2' },
              { id: null, name: 'invalid' }, // filtered out
            ],
            total: 2,
            limit: 2,
            offset: 0,
          },
        },
      });

      const result = await svc.searchTracks('hello', { limit: 2 });
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/search?'));
      expect(result.items.map((t: any) => t.id)).toEqual(['track1', 'track2']);
      expect(result.hasMore).toBe(false);
    });

    it('should set hasMore true when more results available', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: {
          tracks: {
            items: [{ id: 't1' }],
            total: 10,
            limit: 1,
            offset: 0,
          },
        },
      });
      const res = await svc.searchTracks('hello', { limit: 1 });
      expect(res.hasMore).toBe(true);
    });

    it('should throw BAD_REQUEST when limit exceeds 10', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.searchTracks('q', { limit: 11 })).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
    });

    it('should include market param when provided', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: {
          tracks: { items: [{ id: 't1' }], total: 1, limit: 1, offset: 0 },
        },
      });
      await svc.searchTracks('hello', { limit: 1, market: 'US' });
      const calledUrl = api.get.mock.calls[0][0];
      expect(calledUrl).toContain('market=US');
    });
  });

  describe('getPlaylistTracks', () => {
    it('should throw BAD_REQUEST when playlistId missing', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.getPlaylistTracks('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
    });

    it('should paginate and invoke progress callback', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');

      // Simulate two pages via successive resolves
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              added_at: 'now',
              added_by: {},
              item: { id: 'a', uri: 'spotify:track:a', name: 'A' },
            },
            {
              added_at: 'now',
              added_by: {},
              item: { id: 'b', uri: 'spotify:track:b', name: 'B' },
            },
          ],
          total: 3,
          limit: 2,
          offset: 0,
        },
      });
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              added_at: 'now',
              added_by: {},
              item: { id: 'c', uri: 'spotify:track:c', name: 'C' },
            },
          ],
          total: 3,
          limit: 2,
          offset: 2,
        },
      });

      const progressCalls: any[] = [];
      const res = await svc.getPlaylistTracks('pl1', {
        onProgress: (p: any) => progressCalls.push(p),
      });
      expect(res.tracks.map((t: any) => t.id)).toEqual(['a', 'b', 'c']);
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1].percentage).toBe(100);
    });

    it('should invoke progress callback at least once for empty playlist', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: { items: [], total: 0, limit: 50, offset: 0 },
      });
      const progressCalls: any[] = [];
      const res = await svc.getPlaylistTracks('plEmpty', {
        onProgress: (p: any) => progressCalls.push(p),
      });
      expect(res.tracks).toEqual([]);
      expect(progressCalls.length).toBe(1); // final enforced progress call
      expect(progressCalls[0].percentage).toBe(100);
    });
  });

  describe('createPlaylist', () => {
    it('should validate required fields', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.createPlaylist({ name: '' })).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
      await expect(
        svc.createPlaylist({ name: '' } as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
    });

    it('should post playlist data and return response', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.post.mockResolvedValue({ data: { id: 'newPL', name: 'New' } });
      const pl = await svc.createPlaylist({ name: 'New' });
      expect(api.post).toHaveBeenCalledWith(
        '/me/playlists',
        expect.objectContaining({ name: 'New' })
      );
      expect(pl.id).toBe('newPL');
    });
  });

  describe('addTracksToPlaylist', () => {
    it('should validate playlistId and trackUris array', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(
        svc.addTracksToPlaylist('', { uris: ['x'] } as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
      await expect(
        svc.addTracksToPlaylist('pl1', { uris: [] } as any)
      ).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
        context: expect.objectContaining({ operation: 'addTracksToPlaylist' }),
      });
    });

    it('should batch >100 URIs and return last snapshot id', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      const uris = Array.from({ length: 205 }).map(
        (_, i) => `spotify:track:${i}`
      );
      api.post.mockResolvedValue({ data: { snapshot_id: 's1' } });
      const res = await svc.addTracksToPlaylist('pl1', { uris });
      expect(api.post).toHaveBeenCalledTimes(3); // 205 -> 3 batches (100,100,5)
      expect(res.snapshot_id).toBe('s1');
    });

    it('should include position only on first batch when provided', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      const uris = Array.from({ length: 105 }).map(
        (_, i) => `spotify:track:${i}`
      );
      api.post.mockResolvedValue({ data: { snapshot_id: 'snap' } });
      await svc.addTracksToPlaylist('pl1', { uris, position: 3 });
      const firstCallBody = api.post.mock.calls[0][1];
      const secondCallBody = api.post.mock.calls[1][1];
      expect(firstCallBody.position).toBe(3);
      expect(secondCallBody.position).toBeUndefined();
    });

    it('should throw RATE_LIMIT ApiError when batch repeatedly 429s', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      const uris = ['spotify:track:1'];
      api.post.mockImplementation(async () => {
        const err: any = new Error('Too many');
        err.response = { status: 429, headers: { 'retry-after': '0' } };
        throw err;
      });
      await expect(
        svc.addTracksToPlaylist('pl1', { uris })
      ).rejects.toMatchObject({ type: ERROR_TYPES.RATE_LIMIT });
    });

    it('should throw SERVER_ERROR ApiError when batch fails with 500', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      const uris = ['spotify:track:1'];
      api.post.mockImplementation(async () => {
        const err: any = new Error('Server boom');
        err.response = { status: 500 };
        throw err;
      });
      await expect(
        svc.addTracksToPlaylist('pl1', { uris })
      ).rejects.toMatchObject({ type: ERROR_TYPES.SERVER_ERROR });
    });
  });
});
