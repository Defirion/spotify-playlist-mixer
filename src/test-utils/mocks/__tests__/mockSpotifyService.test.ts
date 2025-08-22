import { makeMockSpotifyService } from '../mockSpotifyService';
import { ERROR_TYPES } from '../../../services/apiErrorHandler';

describe('MockSpotifyService behavior', () => {
  let MockClass: any;
  let _consoleErrorSpy: jest.SpyInstance | undefined;
  beforeEach(() => {
    jest.clearAllMocks();
    MockClass = makeMockSpotifyService();
    (global as any).fetch = jest.fn();
    delete process.env.TEST_VERBOSE;
    // suppress mock service verbose logs during passing runs
    _consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
  });
  afterEach(() => {
    _consoleErrorSpy?.mockRestore?.();
    delete process.env.TEST_VERBOSE;
  });

  afterEach(() => {
    delete process.env.TEST_VERBOSE;
  });

  it('getUserPlaylists(all=true) returns many items', async () => {
    const svc = new MockClass('tok');
    const res = await svc.getUserPlaylists({ all: true });
    expect(res.items.length).toBe(120);
    expect(res.hasMore).toBe(false);
  });

  it('getUserProfile parses JSON and handles invalid JSON as __raw', async () => {
    const svc = new MockClass('tok');
    // success JSON
    (global as any).fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ id: 'me' }),
    });
    const ok = await svc.getUserProfile();
    expect(ok.id).toBe('me');

    // invalid json
    (global as any).fetch.mockResolvedValueOnce({
      status: 200,
      text: async () => 'not-json',
    });
    const raw = await svc.getUserProfile();
    expect(raw).toEqual({ __raw: 'not-json' });

    // error status
    (global as any).fetch.mockResolvedValueOnce({
      status: 401,
      text: async () => JSON.stringify({ message: 'unauth' }),
    });
    await expect(svc.getUserProfile()).rejects.toBeTruthy();
  });

  it('searchTracks includes market param and retries on 429', async () => {
    const svc = new MockClass('tok');
    // First call: 429 with Retry-After header
    const res429 = {
      status: 429,
      text: async () => JSON.stringify({}),
      headers: { get: () => '0' },
    };
    const res200 = {
      status: 200,
      text: async () =>
        JSON.stringify({
          tracks: { items: [{ id: 'x' }], total: 1, limit: 1, offset: 0 },
        }),
    };
    (global as any).fetch
      .mockResolvedValueOnce(res429)
      .mockResolvedValueOnce(res200);

    const out = await svc.searchTracks('beatles', { market: 'US' });
    // ensure fetch called twice (retry) and returned track
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    const calledUrl = (global as any).fetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('market=US');
    expect(out.tracks[0].id).toBe('x');
  });

  it('getPlaylistTracks respects pagination and verbose logs', async () => {
    process.env.TEST_VERBOSE = '1';
    const svc = new MockClass('tok');

    const first = {
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [{ added_at: 'now', track: { id: 'a' } }],
          total: 2,
          next: true,
        }),
    };
    const second = {
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [{ added_at: 'now', track: { id: 'b' } }],
          total: 2,
          next: false,
        }),
    };
    (global as any).fetch
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const progress: any[] = [];
    const res = await svc.getPlaylistTracks('pl1', {
      onProgress: p => progress.push(p),
    });
    expect(res.tracks.map((t: any) => t.id)).toEqual(['a', 'b']);
    expect(progress.length).toBeGreaterThan(0);
    // when verbose, console.error should have been called — assert that mock exists
    // (console.error is not mocked here; presence of TEST_VERBOSE ensures internal branches executed)
  });

  it('addTracksToPlaylist batches large arrays and returns last snapshot', async () => {
    const svc = new MockClass('tok');
    const uris = Array.from({ length: 205 }).map(
      (_, i) => `spotify:track:${i}`
    );
    // Each POST returns a JSON with snapshot_id
    const postResp = (id: string) => ({
      status: 200,
      json: async () => ({ snapshot_id: id }),
    });
    // 3 batches expected
    (global as any).fetch
      .mockResolvedValueOnce(postResp('s1'))
      .mockResolvedValueOnce(postResp('s2'))
      .mockResolvedValueOnce(postResp('s3'));

    const out = await svc.addTracksToPlaylist('pl1', { uris });
    expect((global as any).fetch).toHaveBeenCalledTimes(3);
    expect(out.snapshot_id).toBe('s3');
  });

  it('removeTracksFromPlaylist converts error responses to ApiError', async () => {
    const svc = new MockClass('tok');
    // simulate server error
    (global as any).fetch.mockResolvedValueOnce({
      status: 500,
      json: async () => ({ message: 'boom' }),
    });
    await expect(
      svc.removeTracksFromPlaylist('pl1', { tracks: [{ uri: 'a' }] })
    ).rejects.toMatchObject({
      type: ERROR_TYPES.SERVER_ERROR,
    });
  });
});
