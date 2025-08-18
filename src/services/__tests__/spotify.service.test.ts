import SpotifyService from '../../services/spotify';

// Minimal fixture data used by these tests
const mockTrack = { id: 't1', name: 'Track 1', artists: [{ name: 'Artist' }] };
const mockPlaylistTrack = {
  track: mockTrack,
  added_at: '2020-01-01T00:00:00Z',
  added_by: { id: 'u1' },
};
const mockUserProfile = { id: 'u1', display_name: 'Test User' };

describe('SpotifyService - service level behaviors', () => {
  const ACCESS_TOKEN = 'test_token';
  let service: SpotifyService;

  // No global MSW in this test; stub the internal axios-like api directly

  beforeEach(() => {
    service = new SpotifyService(ACCESS_TOKEN);
  });

  test('searchTracks returns filtered tracks for valid query', async () => {
    // stub api.get to return expected shape
    // @ts-ignore
    service['api'] = {
      get: jest.fn().mockResolvedValue({
        data: {
          tracks: { items: [mockTrack], total: 1, limit: 20, offset: 0 },
        },
      }),
    };

    const res = await service.searchTracks('track');
    expect(res).toHaveProperty('items');
    expect(Array.isArray(res.items)).toBe(true);
  });

  test('searchTracks throws on empty query', async () => {
    await expect(service.searchTracks('')).rejects.toThrow();
  });

  test('getPlaylistTracks paginates and returns tracks', async () => {
    // @ts-ignore
    service['api'] = {
      get: jest
        .fn()
        .mockResolvedValue({ data: { items: [mockPlaylistTrack], total: 1 } }),
    };

    const result = await service.getPlaylistTracks('playlist_1');
    expect(result).toHaveProperty('tracks');
    expect(Array.isArray(result.tracks)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(result.tracks.length);
  });

  test('handles 429 rate-limit by surfacing an error via withRetry', async () => {
    // @ts-ignore
    service['api'] = {
      get: jest.fn().mockRejectedValue({
        response: { status: 429, headers: { 'retry-after': '1' } },
      }),
    };

    await expect(service.searchTracks('track')).rejects.toBeDefined();
  });

  test('handles 401 auth expiry by surfacing an error', async () => {
    // @ts-ignore
    service['api'] = {
      get: jest.fn().mockRejectedValue({ response: { status: 401 } }),
    };

    await expect(service.getUserProfile()).rejects.toBeDefined();
  });
});
