/**
 * @vitest-environment node
 */

import SpotifyService from '../../services/spotify';

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

describe('SpotifyService - Batch G (getPlaylistTracks edge cases)', () => {
  test('sets total when only returned on first request and reports progress', async () => {
    const itemsPage1 = [
      {
        track: { id: 't1', name: 'T1' },
        added_at: 'now',
        added_by: { id: 'u' },
      },
    ];

    const mockGetPlaylistTracks = vi.fn();
    const MockSpotifyService = SpotifyService as import('vitest').MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        getPlaylistTracks: mockGetPlaylistTracks,
        getPlaylists: vi.fn(),
        getUserProfile: vi.fn(),
        createPlaylist: vi.fn(),
        addTracksToPlaylist: vi.fn(),
        removeTracksFromPlaylist: vi.fn(),
        getPlaylist: vi.fn(),
        getTrack: vi.fn(),
        searchTracks: vi.fn(),
        getRecommendations: vi.fn(),
      } as any;
    });

    // Mock the method to simulate progressive loading behavior
    const progressCallback = vi.fn();
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
    const mockGetPlaylistTracks = vi.fn();
    const MockSpotifyService = SpotifyService as import('vitest').MockedClass<
      typeof SpotifyService
    >;
    MockSpotifyService.mockImplementation(function (this: unknown) {
      return {
        getPlaylistTracks: mockGetPlaylistTracks,
        getPlaylists: vi.fn(),
        getUserProfile: vi.fn(),
        createPlaylist: vi.fn(),
        addTracksToPlaylist: vi.fn(),
        removeTracksFromPlaylist: vi.fn(),
        getPlaylist: vi.fn(),
        getTrack: vi.fn(),
        searchTracks: vi.fn(),
        getRecommendations: vi.fn(),
      } as any;
    });

    mockGetPlaylistTracks.mockResolvedValue({
      total: 0,
      tracks: [],
      hasMore: false,
    });

    const progressCallback = vi.fn();
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
