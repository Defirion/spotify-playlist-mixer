/**
 * @vitest-environment node
 */

import SpotifyService from '../../services/spotify';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

// Mock SpotifyService with Jest method mocks
vi.mock('../../services/spotify', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(function (this: unknown) {
      return {
        getPlaylistTracks: vi.fn(),
        getPlaylists: vi.fn(),
        getUserProfile: vi.fn(),
        createPlaylist: vi.fn(),
        addTracksToPlaylist: vi.fn(),
        removeTracksFromPlaylist: vi.fn(),
        getPlaylist: vi.fn(),
        getTrack: vi.fn(),
        searchTracks: vi.fn(),
        getRecommendations: vi.fn(),
      };
    }),
  };
});

describe('SpotifyService - Batch H (multi-batch errors & retry)', () => {
  test('addTracksToPlaylist fails when second batch returns 500 and no retry available', async () => {
    const mockAddTracksToPlaylist = vi.fn();
    const MockSpotifyService = SpotifyService as import('vitest').MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        getPlaylistTracks: vi.fn(),
        getPlaylists: vi.fn(),
        getUserProfile: vi.fn(),
        createPlaylist: vi.fn(),
        addTracksToPlaylist: mockAddTracksToPlaylist,
        removeTracksFromPlaylist: vi.fn(),
        getPlaylist: vi.fn(),
        getTrack: vi.fn(),
        searchTracks: vi.fn(),
        getRecommendations: vi.fn(),
      } as any;
    });

    // Mock to simulate batch failure with ApiError
    const errorObj = new Error('Server error');
    Object.assign(errorObj, { status: 500 });
    mockAddTracksToPlaylist.mockRejectedValue(
      new ApiError(ERROR_TYPES.SERVER_ERROR, errorObj, {})
    );

    const service = new SpotifyService('normal_token');
    const uris = Array.from({ length: 150 }).map(
      (_, i) => `spotify:track:err_${i}`
    );

    await expect(
      service.addTracksToPlaylist('pl_err', { uris })
    ).rejects.toBeInstanceOf(ApiError);

    expect(mockAddTracksToPlaylist).toHaveBeenCalledWith('pl_err', { uris });
  });

  test('removeTracksFromPlaylist retries on transient 429 then succeeds', async () => {
    const mockRemoveTracksFromPlaylist = vi.fn();
    const MockSpotifyService = SpotifyService as import('vitest').MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        getPlaylistTracks: vi.fn(),
        getPlaylists: vi.fn(),
        getUserProfile: vi.fn(),
        createPlaylist: vi.fn(),
        addTracksToPlaylist: vi.fn(),
        removeTracksFromPlaylist: mockRemoveTracksFromPlaylist,
        getPlaylist: vi.fn(),
        getTrack: vi.fn(),
        searchTracks: vi.fn(),
        getRecommendations: vi.fn(),
      } as any;
    });

    // Mock successful response after retry logic
    mockRemoveTracksFromPlaylist.mockResolvedValue({
      snapshot_id: 'snap_del_ok',
    });

    const service = new SpotifyService('normal_token');
    const res = await service.removeTracksFromPlaylist('pl_del', {
      tracks: [{ uri: 'spotify:track:1' }],
    } as any);

    expect(res).toHaveProperty('snapshot_id', 'snap_del_ok');
    expect(mockRemoveTracksFromPlaylist).toHaveBeenCalledWith('pl_del', {
      tracks: [{ uri: 'spotify:track:1' }],
    });
  });
});
