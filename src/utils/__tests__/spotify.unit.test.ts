// Tests for src/utils/spotify.ts
export {};

describe('getSpotifyApi', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    // Silence debug logs for the suite to avoid noisy test output; individual
    // tests can still spy/restore console.debug if they assert on it.
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  test('normalizes Bearer token and calls createFetchClient with Authorization header', async () => {
    const createFetchClient = vi.fn().mockReturnValue({ mocked: true });
    vi.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: createFetchClient,
      createFetchClient,
    }));

    // Import after mocking
    const { getSpotifyApi } = await import('../../utils/spotify');

    const inst = getSpotifyApi('Bearer TOKEN12345');

    expect(createFetchClient).toHaveBeenCalled();
    const opts = createFetchClient.mock.calls[0][0];
    expect(opts).toBeDefined();
    expect(opts.baseURL).toBe('https://api.spotify.com/v1');
    expect(opts.headers).toBeDefined();
    expect(opts.headers.Authorization).toBe('Bearer TOKEN12345');
    expect(inst).toEqual({ mocked: true });
  });

  test('adds Bearer prefix when missing', async () => {
    const createFetchClient = vi.fn().mockReturnValue({ ok: true });
    vi.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: createFetchClient,
      createFetchClient,
    }));

    const { getSpotifyApi } = await import('../../utils/spotify');

    const inst = getSpotifyApi('TOKEN_NO_PREFIX');
    expect(createFetchClient).toHaveBeenCalled();
    const opts = createFetchClient.mock.calls[0][0];
    expect(opts.headers.Authorization).toBe('Bearer TOKEN_NO_PREFIX');
    expect(inst).toEqual({ ok: true });
  });

  test('does not throw when console.debug fails inside try/catch', async () => {
    const mockCreate = vi.fn().mockReturnValue({ x: 1 });
    vi.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: vi.fn(() => mockCreate()),
      createFetchClient: mockCreate,
    }));

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('debug failed');
    });

    const { getSpotifyApi } = await import('../../utils/spotify');
    const inst = getSpotifyApi('');
    expect(inst).toEqual({ x: 1 });
    spy.mockRestore();
  });
});
