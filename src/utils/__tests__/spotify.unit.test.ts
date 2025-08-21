// Tests for src/utils/spotify.ts

describe('getSpotifyApi', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  test('normalizes Bearer token and calls createFetchClient with Authorization header', () => {
    const createFetchClient = jest.fn().mockReturnValue({ mocked: true });
    jest.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: createFetchClient,
      createFetchClient,
    }));

    // Import after mocking
    const { getSpotifyApi } = require('../../utils/spotify');

    const inst = getSpotifyApi('Bearer TOKEN12345');

    expect(createFetchClient).toHaveBeenCalled();
    const opts = createFetchClient.mock.calls[0][0];
    expect(opts).toBeDefined();
    expect(opts.baseURL).toBe('https://api.spotify.com/v1');
    expect(opts.headers).toBeDefined();
    expect(opts.headers.Authorization).toBe('Bearer TOKEN12345');
    expect(inst).toEqual({ mocked: true });
  });

  test('adds Bearer prefix when missing', () => {
    const createFetchClient = jest.fn().mockReturnValue({ ok: true });
    jest.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: createFetchClient,
      createFetchClient,
    }));

    const { getSpotifyApi } = require('../../utils/spotify');

    const inst = getSpotifyApi('TOKEN_NO_PREFIX');
    expect(createFetchClient).toHaveBeenCalled();
    const opts = createFetchClient.mock.calls[0][0];
    expect(opts.headers.Authorization).toBe('Bearer TOKEN_NO_PREFIX');
    expect(inst).toEqual({ ok: true });
  });

  test('does not throw when console.debug fails inside try/catch', () => {
    const mockCreate = jest.fn().mockReturnValue({ x: 1 });
    jest.doMock('../../services/fetchClient', () => ({
      __esModule: true,
      default: jest.fn(() => mockCreate()),
      createFetchClient: mockCreate,
    }));

    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('debug failed');
    });

    const { getSpotifyApi } = require('../../utils/spotify');
    const inst = getSpotifyApi('');
    expect(inst).toEqual({ x: 1 });
    spy.mockRestore();
  });
});
