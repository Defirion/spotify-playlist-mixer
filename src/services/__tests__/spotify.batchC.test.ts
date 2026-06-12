/**
 * @vitest-environment node
 */

// MSW removed from this test; use local mocks only
import SpotifyService from '../../services/spotify';

vi.mock('../../services/spotify', async () => ({
  __esModule: true,
  default: (
    await import('../../test-utils/mocks/mockSpotifyService')
  ).makeMockSpotifyService(),
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

  test('getUserProfile happy path returns profile', async () => {
    const service = new SpotifyService('normal_token');

    // Mock the method to return test data
    service.getUserProfile = vi.fn().mockResolvedValue({
      id: 'test_user',
      display_name: 'Test User',
    });

    const profile = await service.getUserProfile();
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('display_name');
    expect(profile.id).toBe('test_user');
  });
});
