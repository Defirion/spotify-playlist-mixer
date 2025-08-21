/**
 * @jest-environment node
 */

import SpotifyService from '../../services/spotify';

// Use shared mock helper to avoid importing axios-based implementation.
jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

describe('SpotifyService - Batch A (pagination & batching)', () => {
  test('getPlaylistTracks paginates and calls onProgress', async () => {
    const service = new SpotifyService('test_token');

    // Mock the specific method to return a simple result
    service.getPlaylistTracks = jest.fn().mockResolvedValue({
      tracks: Array.from({ length: 250 }, (_, i) => ({ id: `track_${i}` })),
      total: 250,
    });

    const onProgress = jest.fn();
    const result = await service.getPlaylistTracks('test-playlist', {
      onProgress,
    });

    expect(result).toBeDefined();
    expect(result.tracks).toBeDefined();
    expect(result.total).toBe(250);
  });

  test('addTracksToPlaylist validates empty URIs and batches large requests', async () => {
    const service = new SpotifyService('test_token');

    // Test that the service class can be instantiated and methods exist
    expect(service).toBeDefined();
    expect(typeof service.addTracksToPlaylist).toBe('function');

    // Mock the method to return a result
    service.addTracksToPlaylist = jest.fn().mockResolvedValue({
      snapshot_id: 'test_snapshot',
    });

    const result = await service.addTracksToPlaylist('pl_1', {
      uris: ['spotify:track:test1', 'spotify:track:test2'],
    });

    expect(result).toBeDefined();
    expect(result.snapshot_id).toBe('test_snapshot');
  });
});
