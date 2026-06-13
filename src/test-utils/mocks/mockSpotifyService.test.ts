import { makeMockSpotifyService } from './mockSpotifyService';

// Invoke an async block and await it (call sites kept from the old silenceIfPass helper).
const run = <T>(fn: () => Promise<T>) => fn();

describe('MockSpotifyService (unit)', () => {
  const originalFetch = (global as any).fetch;

  // Keep passing test output quiet; tests can still assert explicit logs.
  let consoleErrorSpy: import('vitest').MockInstance | undefined;
  let consoleLogSpy: import('vitest').MockInstance | undefined;
  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterAll(() => {
    consoleErrorSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('getUserPlaylists returns all when options.all is true', async () => {
    await run(async () => {
      const Mock = makeMockSpotifyService();
      const svc = new Mock('token');
      const res = await svc.getUserPlaylists({ all: true });
      expect(res.total).toBeGreaterThan(100);
      expect(Array.isArray(res.playlists)).toBe(true);
    });
  });

  it('getUserProfile parses json and returns data; handles non-json body', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    // success JSON + non-json handled quietly for passing tests
    await run(async () => {
      // success JSON
      (global as any).fetch = vi.fn().mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify({ id: 'me', display_name: 'Me' }),
      });
      const profile = await svc.getUserProfile();
      expect(profile.id).toBe('me');

      // non-json body
      (global as any).fetch = vi.fn().mockResolvedValueOnce({
        status: 200,
        text: async () => 'not-json',
      });
      const profile2 = await svc.getUserProfile();
      expect(profile2.__raw).toBe('not-json');
    });

    // error status remains unwrapped so the expectation behaves the same
    (global as any).fetch = vi.fn().mockResolvedValueOnce({
      status: 500,
      text: async () => JSON.stringify({ error: 'boom' }),
    });

    await expect(svc.getUserProfile()).rejects.toThrow('HTTP 500');
  });

  it('searchTracks throws on empty query and handles retry on 429', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    await expect(svc.searchTracks('')).rejects.toThrow(
      'Search query cannot be empty'
    );

    // simulate one 429 then a successful response - keep the successful
    // portion quiet for passing tests
    await run(async () => {
      const okPayload = {
        tracks: { items: [{ id: 't1' }], total: 1, limit: 20, offset: 0 },
      };

      const first = {
        status: 429,
        text: async () => JSON.stringify({}),
        headers: {
          get: (h: string) => (h.toLowerCase() === 'retry-after' ? '0' : null),
        },
      };
      const second = {
        status: 200,
        text: async () => JSON.stringify(okPayload),
      };

      (global as any).fetch = vi
        .fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);

      const res = await svc.searchTracks('beatles');
      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
    });
  });

  it('createPlaylist validates inputs', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    await expect(svc.createPlaylist('', { name: 'x' })).rejects.toThrow(
      'User ID is required'
    );
    await expect(svc.createPlaylist('u1', {})).rejects.toThrow(
      'Playlist name is required'
    );
    await run(async () => {
      const ok = await svc.createPlaylist('u1', { name: 'my' });
      expect(ok.name).toBe('my');
    });
  });

  it('addTracksToPlaylist rejects invalid uris and surfaces ApiError on HTTP error', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    await expect(svc.addTracksToPlaylist('p1', { uris: [] })).rejects.toThrow(
      'uris required'
    );

    // mock a 400 response
    const bad = { status: 400, json: async () => ({ error: 'bad' }) };
    (global as any).fetch = vi.fn().mockResolvedValueOnce(bad);

    await expect(
      svc.addTracksToPlaylist('p1', { uris: ['u1'] })
    ).rejects.toHaveProperty('type');
  });

  it('searchTracks throws on HTTP error and handles non-json body', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');

    // HTTP 500
    (global as any).fetch = vi.fn().mockResolvedValueOnce({
      status: 500,
      text: async () => JSON.stringify({ error: 'boom' }),
      headers: {},
    });

    await expect(svc.searchTracks('x')).rejects.toThrow('HTTP 500');

    // non-json success body
    (global as any).fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      text: async () => 'not-json',
    });
    await run(async () => {
      const res = await svc.searchTracks('y');
      expect(res.items).toEqual([]);
    });
  });

  it('searchPlaylists validates and returns playlists (market param)', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    await expect(svc.searchPlaylists('')).rejects.toThrow(
      'Search query cannot be empty'
    );

    const payload = {
      playlists: { items: [{ id: 'pl1' }], total: 1, limit: 20, offset: 0 },
    };
    (global as any).fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify(payload),
    });
    await run(async () => {
      const out = await svc.searchPlaylists('p', { market: 'US' });
      expect(out.playlists.length).toBe(1);
    });
  });

  it('removeTracksFromPlaylist retries on 429 then succeeds and throws ApiError on server error', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');

    // simulate 429 then 200
    const first: any = { status: 429, json: async () => ({}) };
    const second: any = {
      status: 200,
      json: async () => ({ snapshot_id: 's1' }),
    };
    (global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    await run(async () => {
      const res = await svc.removeTracksFromPlaylist('pl', { tracks: [] });
      expect(res.snapshot_id).toBe('s1');
    });

    // simulate server error
    (global as any).fetch = vi.fn().mockResolvedValueOnce({
      status: 500,
      json: async () => ({ error: 'x' }),
    });
    await expect(
      svc.removeTracksFromPlaylist('pl', { tracks: [] })
    ).rejects.toHaveProperty('type');
  });

  it('getPlaylistTracks paginates and calls onProgress and tolerates onProgress errors', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');

    const page1 = {
      items: [{ track: { id: 't1' } }, { track: { id: 't2' } }],
      total: 3,
      next: true,
    };
    const page2 = { items: [{ track: { id: 't3' } }], total: 3, next: false };

    (global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify(page1),
      })
      .mockResolvedValueOnce({
        status: 200,
        text: async () => JSON.stringify(page2),
      });

    const progressCalls: any[] = [];
    const onProgress = vi.fn((p: any) => {
      progressCalls.push(p);
      if (progressCalls.length === 1) throw new Error('boom'); // ensure handler exceptions are caught
    });

    await run(async () => {
      const out = await svc.getPlaylistTracks('pl', { onProgress });
      expect(out.tracks.length).toBe(3);
      expect(onProgress).toHaveBeenCalled();
    });
  });

  it('addTracksToPlaylist handles batching for >100 uris', async () => {
    const Mock = makeMockSpotifyService();
    const svc = new Mock('token');
    const uris = Array.from({ length: 150 }).map(
      (_, i) => `spotify:track:${i}`
    );

    // two POST responses
    (global as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ snapshot_id: 'a' }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ snapshot_id: 'b' }),
      });

    await run(async () => {
      const res = await svc.addTracksToPlaylist('pl', { uris });
      expect(res.snapshot_id).toBe('b');
    });
  });
});
