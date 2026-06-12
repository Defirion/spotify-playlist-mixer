import SpotifyService from '../spotify';
import { FetchInstance } from '../fetchClient';
import { ApiError } from '../apiErrorHandler';

// Simple mock FetchInstance implementing just get/post needed for this test
class MockFetch extends FetchInstance {
  get = vi.fn();
  post = vi.fn();
  delete = vi.fn();
}

describe('SpotifyService Dependency Injection constructor', () => {
  it('creates service with injected client and uses it', async () => {
    const mock = new MockFetch({
      baseURL: 'https://api.spotify.com/v1',
      headers: { Authorization: 'Bearer injected_token' },
    });
    (mock.get as import('vitest').Mock).mockResolvedValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
    });

    const service = new SpotifyService(mock as any);

    expect(service.getAccessToken()).toBe('injected_token');

    await service.getUserPlaylists();
    expect(mock.get).toHaveBeenCalledWith('/me/playlists?limit=50&offset=0');
  });

  it('falls back to legacy constructor with token string', () => {
    const service = new SpotifyService('plain_token');
    expect(service.getAccessToken()).toBe('plain_token');
  });

  it('throws for missing token in legacy path', () => {
    // @ts-expect-error intentionally passing null to test validation
    expect(() => new SpotifyService(null)).toThrow(ApiError);
  });

  it('setAccessToken updates injected client headers when possible', () => {
    const mock = new MockFetch({
      baseURL: 'x',
      headers: { Authorization: 'Bearer old' },
    });
    const service = new SpotifyService(mock as any);
    service.setAccessToken('new_token');
    expect(service.getAccessToken()).toBe('new_token');
    expect(mock.defaults.headers.Authorization).toBe('Bearer new_token');
  });
});
