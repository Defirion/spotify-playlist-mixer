import { SpotifyClient } from './spotifyClient';

describe('SpotifyClient', () => {
  test('injects Authorization header from tokenProvider', async () => {
    const fakeAxios = {
      get: jest.fn().mockResolvedValue({ data: { ok: true } }),
    } as any;
    const client = new SpotifyClient({
      axiosInstance: fakeAxios,
      tokenProvider: () => 'tok',
    });
    const res = await client.get('/me');
    expect(fakeAxios.get).toHaveBeenCalledTimes(1);
    const callArgs = fakeAxios.get.mock.calls[0];
    const config = callArgs[1];
    expect(config.headers.Authorization).toBe('Bearer tok');
    expect(res).toEqual({ ok: true });
  });

  test('post sends data', async () => {
    const fakeAxios = {
      post: jest.fn().mockResolvedValue({ data: { id: 1 } }),
    } as any;
    const client = new SpotifyClient({
      axiosInstance: fakeAxios,
      tokenProvider: () => 't',
    });
    const res = await client.post('/pl', { uris: ['a'] });
    expect(fakeAxios.post).toHaveBeenCalledWith(
      '/pl',
      { uris: ['a'] },
      expect.any(Object)
    );
    expect(res).toEqual({ id: 1 });
  });
});
