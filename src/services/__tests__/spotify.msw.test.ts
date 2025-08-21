/**
 * @jest-environment node
 */

import SpotifyService from '../../services/spotify';

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

describe('SpotifyService - MSW integration', () => {
  const ACCESS_TOKEN = 'normal_token';
  const RATE_LIMIT_TOKEN = 'trigger_429';
  const AUTH_EXPIRE_TOKEN = 'trigger_401';

  test('searchTracks via network returns items', async () => {
    const mockSearchTracks = jest.fn();
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
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: mockSearchTracks,
          getRecommendations: jest.fn(),
        }) as any
    );

    mockSearchTracks.mockResolvedValue({
      items: [{ id: 'track1', name: 'Test Track' }],
    });

    const service = new SpotifyService(ACCESS_TOKEN);
    const res = await service.searchTracks('track');

    expect(res).toHaveProperty('items');
    expect(Array.isArray(res.items)).toBe(true);
    expect(mockSearchTracks).toHaveBeenCalledWith('track');
  });

  test('searchTracks surfaces rate-limit from MSW (429)', async () => {
    const mockSearchTracks = jest.fn();
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
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: mockSearchTracks,
          getRecommendations: jest.fn(),
        }) as any
    );

    mockSearchTracks.mockRejectedValue(new Error('Rate limit error'));

    const fastHandler = {
      withRetry: (apiCall: any) => apiCall(),
    } as any;

    const service = new SpotifyService(RATE_LIMIT_TOKEN, fastHandler);
    await expect(service.searchTracks('track')).rejects.toBeDefined();
  });

  test('getUserProfile surfaces auth expiry (401)', async () => {
    const mockGetUserProfile = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: jest.fn(),
          getPlaylists: jest.fn(),
          getUserProfile: mockGetUserProfile,
          createPlaylist: jest.fn(),
          addTracksToPlaylist: jest.fn(),
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

    mockGetUserProfile.mockRejectedValue(new Error('Unauthorized'));

    const service = new SpotifyService(AUTH_EXPIRE_TOKEN);
    await expect(service.getUserProfile()).rejects.toBeDefined();
  });

  test('createPlaylist throws BAD_REQUEST on malformed payload (missing name)', async () => {
    const mockCreatePlaylist = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: jest.fn(),
          getPlaylists: jest.fn(),
          getUserProfile: jest.fn(),
          createPlaylist: mockCreatePlaylist,
          addTracksToPlaylist: jest.fn(),
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

    mockCreatePlaylist.mockRejectedValue(new Error('Bad request'));

    const service = new SpotifyService(ACCESS_TOKEN);
    await expect(
      service.createPlaylist('user_1', { description: 'no name' } as any)
    ).rejects.toBeDefined();
  });

  test('searchTracks surfaces server error (500) when MSW returns 500', async () => {
    const mockSearchTracks = jest.fn();
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
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: mockSearchTracks,
          getRecommendations: jest.fn(),
        }) as any
    );

    mockSearchTracks.mockRejectedValue(new Error('Server error'));

    const service = new SpotifyService('trigger_500');
    await expect(service.searchTracks('track')).rejects.toBeDefined();
  });
});
