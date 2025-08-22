import SpotifyService from '../../services/spotify';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';
import { getSpotifyApi } from '../../utils/spotify';

// We stub the underlying API layer so tests focus on service behavior.
jest.mock('../../utils/spotify');
const mockGetSpotifyApi = getSpotifyApi as jest.MockedFunction<
  typeof getSpotifyApi
>;

// Helper to build a fake API client shape the service expects
function makeApi(overrides: Partial<Record<string, any>> = {}): any {
  return {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('SpotifyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(svc.getAccessToken()).toBe('token123');
      expect(mockGetSpotifyApi).toHaveBeenCalledWith('token123');
    });

    it('should accept a DI client and infer token from Authorization header', () => {
      const api = makeApi({
        defaults: { headers: { Authorization: 'Bearer abc' } },
      });
      // When passing a client directly, getSpotifyApi should not be used
      const svc = new (SpotifyService as any)(api as any);
      expect(svc.getAccessToken()).toBe('abc');
      expect(mockGetSpotifyApi).not.toHaveBeenCalled();
    });

    it('should infer token from lowercase authorization header when present', () => {
      const api = makeApi({
        defaults: { headers: { authorization: 'Bearer lower' } },
      });
      const svc = new (SpotifyService as any)(api as any);
      expect(svc.getAccessToken()).toBe('lower');
      expect(mockGetSpotifyApi).not.toHaveBeenCalled();
    });
  });

  describe('setAccessToken / getAccessToken', () => {
    it('should update internal api client when setting new token', () => {
      const firstApi = makeApi();
      const secondApi = makeApi();
      mockGetSpotifyApi
        .mockReturnValueOnce(firstApi as any)
        .mockReturnValueOnce(secondApi as any);
      const svc = new (SpotifyService as any)('t1');
      svc.setAccessToken('t2');
      expect(svc.getAccessToken()).toBe('t2');
      expect(mockGetSpotifyApi).toHaveBeenLastCalledWith('t2');
    });

    it('should update DI client headers when constructed with a client', () => {
      const api = makeApi({ defaults: { headers: {} } });
      const svc = new (SpotifyService as any)(api as any);
      svc.setAccessToken('t3');
      expect(api.defaults.headers.Authorization).toBe('Bearer t3');
      // Should not rebuild via getSpotifyApi when headers exist
      expect(mockGetSpotifyApi).not.toHaveBeenCalled();
    });
  });

  describe('searchTracks', () => {
    it('should throw BAD_REQUEST when query empty', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.searchTracks('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
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
      expect(result.items.map(t => t.id)).toEqual(['track1', 'track2']);
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

    it('should throw BAD_REQUEST when limit exceeds 50', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.searchTracks('q', { limit: 51 })).rejects.toMatchObject({
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
            { added_at: 'now', added_by: {}, track: { id: 'a', name: 'A' } },
            { added_at: 'now', added_by: {}, track: { id: 'b', name: 'B' } },
          ],
          total: 3,
          limit: 2,
          offset: 0,
        },
      });
      api.get.mockResolvedValueOnce({
        data: {
          items: [
            { added_at: 'now', added_by: {}, track: { id: 'c', name: 'C' } },
          ],
          total: 3,
          limit: 2,
          offset: 2,
        },
      });

      const progressCalls: any[] = [];
      const res = await svc.getPlaylistTracks('pl1', {
        onProgress: p => progressCalls.push(p),
      });
      expect(res.tracks.map((t: any) => t.id)).toEqual(['a', 'b', 'c']);
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls.at(-1).percentage).toBe(100);
    });

    it('should invoke progress callback at least once for empty playlist', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: { items: [], total: 0, limit: 100, offset: 0 },
      });
      const progressCalls: any[] = [];
      const res = await svc.getPlaylistTracks('plEmpty', {
        onProgress: p => progressCalls.push(p),
      });
      expect(res.tracks).toEqual([]);
      expect(progressCalls.length).toBe(1); // final enforced progress call
      expect(progressCalls[0].percentage).toBe(0);
    });
  });

  describe('getUserPlaylists', () => {
    it('should fetch single page by default', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: { items: [{ id: 'pl1' }], total: 1, limit: 1, offset: 0 },
      });
      const res = await svc.getUserPlaylists({ limit: 1 });
      expect(res.items.length).toBe(1);
      expect(res.hasMore).toBe(false);
    });

    it('should fetch all pages when all=true', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');

      // first page
      api.get.mockResolvedValueOnce({
        data: { items: [{ id: 'pl1' }], total: 3, limit: 2, offset: 0 },
      });
      // second page
      api.get.mockResolvedValueOnce({
        data: {
          items: [{ id: 'pl2' }, { id: 'pl3' }],
          total: 3,
          limit: 2,
          offset: 2,
        },
      });

      const res = await svc.getUserPlaylists({ all: true });
      expect(res.items.map((p: any) => p.id)).toEqual(['pl1', 'pl2', 'pl3']);
      expect(res.hasMore).toBe(false);
    });

    it('should set hasMore true when more playlists exist', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: { items: [{ id: 'pl1' }], total: 5, limit: 1, offset: 0 },
      });
      const res = await svc.getUserPlaylists({ limit: 1 });
      expect(res.hasMore).toBe(true);
    });
  });

  describe('createPlaylist', () => {
    it('should validate required fields', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.createPlaylist('', { name: 'x' })).rejects.toMatchObject(
        { type: ERROR_TYPES.BAD_REQUEST }
      );
      await expect(
        svc.createPlaylist('u1', { name: '' } as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
    });

    it('should post playlist data and return response', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.post.mockResolvedValue({ data: { id: 'newPL', name: 'New' } });
      const pl = await svc.createPlaylist('user1', { name: 'New' });
      expect(api.post).toHaveBeenCalledWith(
        '/users/user1/playlists',
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
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
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

  describe('removeTracksFromPlaylist', () => {
    it('should validate inputs', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(
        svc.removeTracksFromPlaylist('', { tracks: [{ uri: 'x' }] } as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
      await expect(
        svc.removeTracksFromPlaylist('pl1', { tracks: [] } as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
    });

    it('should delete tracks and return snapshot', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.delete.mockResolvedValue({ data: { snapshot_id: 'snapX' } });
      const res = await svc.removeTracksFromPlaylist('pl1', {
        tracks: [{ uri: 'a' }],
      });
      expect(api.delete).toHaveBeenCalled();
      expect(res.snapshot_id).toBe('snapX');
    });
  });

  describe('getPlaylist', () => {
    it('should validate playlistId', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.getPlaylist('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
    });

    it('should build query parameters when provided', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({ data: { id: 'pl1' } });
      await svc.getPlaylist('pl1', { market: 'US', fields: 'id,name' });
      const calledUrl = api.get.mock.calls[0][0];
      expect(calledUrl).toContain('market=US');
      expect(calledUrl).toContain('fields=id%2Cname');
    });
  });

  describe('searchPlaylists', () => {
    it('should validate query', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.searchPlaylists('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
    });

    it('should map response', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: {
          playlists: { items: [{ id: 'p1' }], total: 1, limit: 1, offset: 0 },
        },
      });
      const res = await svc.searchPlaylists('mix');
      expect(res.playlists[0].id).toBe('p1');
      expect(res.hasMore).toBe(false);
    });

    it('should throw BAD_REQUEST when limit exceeds 50', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(
        svc.searchPlaylists('mix', { limit: 99 })
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
    });
  });

  describe('getTrackAudioFeatures', () => {
    it('should validate trackId', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(svc.getTrackAudioFeatures('')).rejects.toMatchObject({
        type: ERROR_TYPES.BAD_REQUEST,
      });
    });

    it('should return audio features', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({ data: { id: 't1', danceability: 0.5 } });
      const res = await svc.getTrackAudioFeatures('t1');
      expect(res.danceability).toBe(0.5);
    });
  });

  describe('getMultipleTrackAudioFeatures', () => {
    it('should validate trackIds array', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      await expect(
        svc.getMultipleTrackAudioFeatures([] as any)
      ).rejects.toMatchObject({ type: ERROR_TYPES.BAD_REQUEST });
    });

    it('should return features array', async () => {
      const api = makeApi();
      mockGetSpotifyApi.mockReturnValue(api as any);
      const svc = new (SpotifyService as any)('tok');
      api.get.mockResolvedValue({
        data: { audio_features: [{ id: 'a' }, { id: 'b' }] },
      });
      const res = await svc.getMultipleTrackAudioFeatures(['a', 'b']);
      expect(res.length).toBe(2);
    });
  });
});
