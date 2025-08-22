import SpotifyClient from '../spotifyClient';
import createFetchClient from '../fetchClient';

jest.mock('../fetchClient');

describe('SpotifyClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('injects synchronous token into headers and returns data', async () => {
    const mockClient = {
      get: jest.fn().mockResolvedValue({ data: { ok: true } }),
    } as any;
    (createFetchClient as jest.Mock).mockReturnValue(mockClient);

    const client = new SpotifyClient({ tokenProvider: () => 'abc' });
    const res = await client.get('/me');

    expect(mockClient.get).toHaveBeenCalledWith(
      '/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc' }),
      })
    );
    expect(res).toEqual({ ok: true });
  });

  test('injects async token provider and sends it', async () => {
    const mockClient = {
      post: jest.fn().mockResolvedValue({ data: { created: true } }),
    } as any;
    (createFetchClient as jest.Mock).mockReturnValue(mockClient);

    const client = new SpotifyClient({
      tokenProvider: async () => 'tok-async',
    });
    const res = await client.post('/create', { foo: 'bar' });

    expect(mockClient.post).toHaveBeenCalledWith(
      '/create',
      { foo: 'bar' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-async' }),
      })
    );
    expect(res).toEqual({ created: true });
  });

  test('delete delegates to underlying client and returns data', async () => {
    const mockClient = {
      delete: jest.fn().mockResolvedValue({ data: { deleted: true } }),
    } as any;
    (createFetchClient as jest.Mock).mockReturnValue(mockClient);

    const client = new SpotifyClient();
    const res = await client.delete('/thing');

    expect(mockClient.delete).toHaveBeenCalledWith(
      '/thing',
      expect.any(Object)
    );
    expect(res).toEqual({ deleted: true });
  });
});
