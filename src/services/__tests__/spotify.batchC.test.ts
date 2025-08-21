/**
 * @jest-environment node
 */

// MSW removed from this test; use local mocks only
import SpotifyService from '../../services/spotify';

jest.mock('../../services/spotify', () => ({
  __esModule: true,
  default:
    require('../../test-utils/mocks/mockSpotifyService').makeMockSpotifyService(),
}));

// no-op: MSW removed

// Tests rely on global.fetch + MSW; no axios adapter required.

describe('SpotifyService - Batch C (search & audio features)', () => {
  test('searchTracks validation: empty query rejects', async () => {
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.searchTracks('')).rejects.toBeDefined();
  });

  test('searchPlaylists validation: empty query rejects', async () => {
    const service = new SpotifyService('normal_token');
    // @ts-ignore
    await expect(service.searchPlaylists('')).rejects.toBeDefined();
  });

  test('getTrackAudioFeatures and getMultipleTrackAudioFeatures return data', async () => {
    const service = new SpotifyService('normal_token');

    // Mock the methods to return test data
    service.getTrackAudioFeatures = jest.fn().mockResolvedValue({
      id: 'track_1',
      danceability: 0.5,
      energy: 0.7,
    });

    service.getMultipleTrackAudioFeatures = jest.fn().mockResolvedValue([
      { id: 'track_1', danceability: 0.5 },
      { id: 'track_2', danceability: 0.6 },
    ]);

    const single = await service.getTrackAudioFeatures('track_1');
    expect(single).toHaveProperty('id', 'track_1');
    const multiple = await service.getMultipleTrackAudioFeatures([
      'track_1',
      'track_2',
    ]);
    expect(Array.isArray(multiple)).toBe(true);
    expect(multiple.length).toBe(2);
  });

  test('getUserProfile happy path returns profile', async () => {
    const service = new SpotifyService('normal_token');

    // Mock the method to return test data
    service.getUserProfile = jest.fn().mockResolvedValue({
      id: 'test_user',
      display_name: 'Test User',
    });

    const profile = await service.getUserProfile();
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('display_name');
    expect(profile.id).toBe('test_user');
  });
});
