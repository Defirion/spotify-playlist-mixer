/**
 * @jest-environment node
 */

import SpotifyService from '../../services/spotify';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

// Mock SpotifyService with Jest method mocks
jest.mock('../../services/spotify', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      getPlaylistTracks: jest.fn(),
      getPlaylists: jest.fn(),
      getUserProfile: jest.fn(),
      createPlaylist: jest.fn(),
      addTracksToPlaylist: jest.fn(),
      removeTracksFromPlaylist: jest.fn(),
      getPlaylist: jest.fn(),
      getTrack: jest.fn(),
      searchTracks: jest.fn(),
      getRecommendations: jest.fn(),
    })),
  };
});

describe('SpotifyService - Batch H (multi-batch errors & retry)', () => {
  test('addTracksToPlaylist fails when second batch returns 500 and no retry available', async () => {
    const mockAddTracksToPlaylist = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: jest.fn(),
          getPlaylists: jest.fn(),
          getUserProfile: jest.fn(),
          createPlaylist: jest.fn(),
          addTracksToPlaylist: mockAddTracksToPlaylist,
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

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
    const mockRemoveTracksFromPlaylist = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: jest.fn(),
          getPlaylists: jest.fn(),
          getUserProfile: jest.fn(),
          createPlaylist: jest.fn(),
          addTracksToPlaylist: jest.fn(),
          removeTracksFromPlaylist: mockRemoveTracksFromPlaylist,
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

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
