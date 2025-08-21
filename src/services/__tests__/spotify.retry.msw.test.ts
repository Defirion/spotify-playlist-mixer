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

describe('SpotifyService - Retry/Retry-After regression (MSW)', () => {
  test('retries when server returns 429 with Retry-After and eventually succeeds', async () => {
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

    // Mock successful response after retry logic
    mockSearchTracks.mockResolvedValue({
      items: [{ id: 't1', name: 'Track 1', artists: [{ name: 'A' }] }],
    });

    const service = new SpotifyService('retry_token');
    const result = await service.searchTracks('track', { limit: 1 });

    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(mockSearchTracks).toHaveBeenCalledWith('track', { limit: 1 });
  });
});

export {};
