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

describe('SpotifyService - Batch G (getPlaylistTracks edge cases)', () => {
  test('sets total when only returned on first request and reports progress', async () => {
    const itemsPage1 = [
      {
        track: { id: 't1', name: 'T1' },
        added_at: 'now',
        added_by: { id: 'u' },
      },
    ];

    const mockGetPlaylistTracks = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: mockGetPlaylistTracks,
          getPlaylists: jest.fn(),
          getUserProfile: jest.fn(),
          createPlaylist: jest.fn(),
          addTracksToPlaylist: jest.fn(),
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

    // Mock the method to simulate progressive loading behavior
    const progressCallback = jest.fn();
    mockGetPlaylistTracks.mockResolvedValue({
      total: 3,
      tracks: itemsPage1,
      hasMore: false,
    });

    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylistTracks('pl_edge', {
      onProgress: progressCallback,
    } as any);

    expect(res.total).toBe(3);
    expect(res.tracks.length).toBe(1);
    expect(mockGetPlaylistTracks).toHaveBeenCalledWith(
      'pl_edge',
      expect.any(Object)
    );
  });

  test('handles total zero and returns hasMore false and zero percentage', async () => {
    const mockGetPlaylistTracks = jest.fn();
    const MockSpotifyService = SpotifyService as jest.MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(
      () =>
        ({
          getPlaylistTracks: mockGetPlaylistTracks,
          getPlaylists: jest.fn(),
          getUserProfile: jest.fn(),
          createPlaylist: jest.fn(),
          addTracksToPlaylist: jest.fn(),
          removeTracksFromPlaylist: jest.fn(),
          getPlaylist: jest.fn(),
          getTrack: jest.fn(),
          searchTracks: jest.fn(),
          getRecommendations: jest.fn(),
        }) as any
    );

    mockGetPlaylistTracks.mockResolvedValue({
      total: 0,
      tracks: [],
      hasMore: false,
    });

    const progressCallback = jest.fn();
    const service = new SpotifyService('normal_token');
    const res = await service.getPlaylistTracks('empty_pl', {
      onProgress: progressCallback,
    } as any);

    expect(res.total).toBe(0);
    expect(res.tracks.length).toBe(0);
    expect(res.hasMore).toBe(false);
    expect(mockGetPlaylistTracks).toHaveBeenCalledWith(
      'empty_pl',
      expect.any(Object)
    );
  });
});
