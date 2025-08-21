// Try to use real MSW directly first, fall back to shim if needed
import { mockTracks, mockPlaylists, mockUserProfile } from './fixtures';

let msw: any;
try {
  // Try importing real MSW v2 directly
  msw = require('msw');
  console.error('[handlers] Using real MSW directly');
  console.error('[handlers] MSW object keys:', Object.keys(msw || {}));
  console.error('[handlers] MSW.http available:', !!msw.http);
  console.error('[handlers] MSW.rest available:', !!msw.rest);
} catch (e) {
  console.error('[handlers] Failed to import real MSW, using shim:', e.message);
  // Fall back to shim
  msw = require('msw');
}

// Minimal typed shape for MSW resolver `info` param used in handlers.
// We intentionally keep this small to avoid coupling to MSW internal types
// while eliminating implicit `any` usage.
type MSWInfo = {
  request: Request & { json(): Promise<any> };
  requestId?: string;
  params: Record<string, string>;
  cookies: Record<string, string>;
};

// Helper: normalize different request shapes that may appear depending on
// which MSW bundle (core/node) or interceptors version is loaded. Some
// runtimes put the fetch-like Request at `info.request`, others nest it at
// `info.request.request`. This helper returns a small, safe request-like
// object with `url`, `headers.get()` and `json()` so handlers can call
// these APIs without guarding for many shapes everywhere.
const unwrapRequest = (maybeReq: any) => {
  if (!maybeReq || typeof maybeReq !== 'object') return maybeReq;
  if (maybeReq.url || typeof maybeReq.json === 'function') return maybeReq;
  if (
    maybeReq.request &&
    (maybeReq.request.url || typeof maybeReq.request.json === 'function')
  )
    return maybeReq.request;
  // fallback: return as-is
  return maybeReq;
};

const normalizeRequest = (maybeReq: any) => {
  const raw = unwrapRequest(maybeReq) || {};

  // Normalize URL: accept URL instances, objects with .url, or strings
  let urlStr = '';
  try {
    if (raw instanceof URL) urlStr = raw.toString();
    else if (raw.url && typeof raw.url === 'string') urlStr = raw.url;
    else if (raw.url && typeof raw.url.toString === 'function')
      urlStr = raw.url.toString();
    else if (typeof raw === 'string') urlStr = raw;
  } catch (e) {
    urlStr = '';
  }

  // Normalize headers: provide a Headers-like { get(name) } API
  const headersSrc = raw.headers || {};
  const headers = {
    get: (name: string) => {
      try {
        if (!headersSrc) return undefined;
        if (typeof headersSrc.get === 'function') return headersSrc.get(name);
        // plain object mapping
        const key = Object.keys(headersSrc).find(
          k => k.toLowerCase() === name.toLowerCase()
        );
        if (key) return (headersSrc as any)[key];
        return undefined;
      } catch (e) {
        return undefined;
      }
    },
  };

  // Normalize json() to always exist and be async
  const json = async () => {
    try {
      if (typeof raw.json === 'function') return await raw.json();
      if (raw.body !== undefined) return raw.body;
      return {};
    } catch (e) {
      return {};
    }
  };

  return {
    url: urlStr,
    headers,
    json,
    // keep reference to original so callers can inspect if needed
    _raw: raw,
  };
};

// Helper: allow tests to trigger special responses by setting the Authorization
// header to a sentinel value. This keeps the SpotifyService API surface
// unchanged while allowing MSW to simulate 429 / 401 flows deterministically.
const tokenScenario = (req: any) => {
  try {
    const r = normalizeRequest(req);
    const auth =
      r && r.headers && typeof r.headers.get === 'function'
        ? r.headers.get('authorization') || ''
        : '';
    return String(auth).replace(/^Bearer\s+/i, '');
  } catch (e) {
    return '';
  }
};

export const handlers = [
  // Simplest possible working handler - test if basic pattern works
  (() => {
    console.error('[handlers] Creating simple test handler...');

    // Try using the setupServer-compatible handler format
    const simpleHandler = {
      predicate: (request: any) => {
        const url = request.url?.toString() || request.url;
        const matches = url.includes('api.spotify.com');
        console.error(
          '[SIMPLE-HANDLER] Testing predicate for:',
          url,
          'matches:',
          matches
        );
        return matches;
      },

      resolver: (request: any) => {
        console.error(
          '[SIMPLE-HANDLER] Resolver invoked for:',
          request.url?.toString() || request.url
        );
        return new Response(
          JSON.stringify({ intercepted: true, simple: true }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
    };

    console.error('[handlers] Simple handler created:', simpleHandler);
    return simpleHandler;
  })(),

  // Debug handler for the exact URL causing problems
  msw.rest.get(
    'https://api.spotify.com/v1/playlists/playlist_big/tracks',
    (req: any, res: any, ctx: any) => {
      const url = req.url?.toString() || req.url;
      console.error('[EXACT HANDLER] Matched exact URL:', url);

      // Parse query parameters from the URL
      const urlObj = new URL(url);
      const limit = parseInt(urlObj.searchParams.get('limit') || '100', 10);
      const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

      console.error(
        `[EXACT HANDLER] playlist_big: limit=${limit}, offset=${offset}`
      );

      const total = 250;
      const extendedSlice = Array.from(
        { length: Math.min(limit, total - offset) },
        (_, i) => ({
          id: `track_big_${offset + i}`,
          name: `Big Track ${offset + i}`,
          uri: `spotify:track:track_big_${offset + i}`,
          artists: [{ id: 'artist_1', name: 'Mock Artist' }],
          album: { id: 'album_1', name: 'Mock Album' },
          duration_ms: 200000,
        })
      );

      return res(
        ctx.json({
          items: extendedSlice.map(track => ({
            track,
            added_at: new Date().toISOString(),
            added_by: { id: 'u' },
          })),
          total,
          limit,
          offset,
          next:
            offset + limit < total
              ? `?limit=${limit}&offset=${offset + limit}`
              : null,
        })
      );
    }
  ),

  // Wildcard handler to catch and debug ALL requests
  msw.rest.all('*', (req: any, res: any, ctx: any) => {
    const url = req.url?.toString() || req.url;
    const method = req.method;
    console.error(`[WILDCARD] ${method} ${url}`);

    // If this is a tracks request, handle it
    if (
      url.includes('/playlists/') &&
      url.includes('/tracks') &&
      method === 'GET'
    ) {
      console.error('[WILDCARD] Handling tracks request');

      // Extract playlist ID from URL path
      const match = url.match(/\/playlists\/([^\/]+)\/tracks/);
      const playlistId = match ? match[1] : null;

      if (!playlistId) {
        console.error('[WILDCARD] No playlist ID found in URL:', url);
        return res(ctx.status(400), ctx.json({ error: 'No playlist ID' }));
      }

      // Parse query parameters
      const urlObj = new URL(url);
      const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
      const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

      console.error(
        `[WILDCARD] Tracks request: playlist=${playlistId}, limit=${limit}, offset=${offset}`
      );

      // Generate mock data based on playlist ID
      if (playlistId === 'playlist_big') {
        const total = 250;
        const slice = mockTracks.slice(offset, offset + limit);
        const extendedSlice = Array.from(
          { length: Math.min(limit, total - offset) },
          (_, i) => ({
            ...mockTracks[i % mockTracks.length],
            id: `track_big_${offset + i}`,
            name: `Big Track ${offset + i}`,
            uri: `spotify:track:track_big_${offset + i}`,
          })
        );

        return res(
          ctx.json({
            items: extendedSlice.map(track => ({
              track,
              added_at: new Date().toISOString(),
              added_by: { id: 'u' },
            })),
            total,
            limit,
            offset,
            next:
              offset + limit < total
                ? `?limit=${limit}&offset=${offset + limit}`
                : null,
          })
        );
      }

      // Default response for other playlists
      return res(
        ctx.json({
          items: mockTracks.map(track => ({
            track,
            added_at: new Date().toISOString(),
            added_by: { id: 'u' },
          })),
          total: mockTracks.length,
          limit,
          offset,
          next: null,
        })
      );
    }

    // If this is an add tracks request, handle it
    if (
      url.includes('/playlists/') &&
      url.includes('/tracks') &&
      method === 'POST'
    ) {
      console.error('[WILDCARD] Handling add tracks request');
      return res(ctx.json({ snapshot_id: 'mock_snapshot' }));
    }

    // For any other request, return a generic 404
    console.error('[WILDCARD] Unhandled request, returning 404');
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),

  // Also for the POST request
  msw.rest.post(
    'https://api.spotify.com/v1/playlists/pl_1/tracks',
    async (req: any, res: any, ctx: any) => {
      console.error('[handler] POST exact match!');

      if (typeof res === 'function' && ctx) {
        return res(ctx.json({ snapshot_id: `snapshot_${Date.now()}` }));
      }
      return msw.HttpResponse.json(
        { snapshot_id: `snapshot_${Date.now()}` },
        { status: 201 }
      );
    }
  ),

  // Get user profile
  msw.rest.get(
    'https://api.spotify.com/v1/me',
    (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }
      if (typeof res === 'function' && ctx)
        return res(ctx.json(mockUserProfile));
      return msw.HttpResponse.json(mockUserProfile);
    }
  ),

  // Get user playlists
  msw.rest.get(
    'https://api.spotify.com/v1/me/playlists',
    (req: any, res: any, ctx: any) => {
      const _v = String(
        process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
      ).toLowerCase();
      if (_v === '1' || _v === 'true') {
        // eslint-disable-next-line no-console
        console.error('[msw handler] /me/playlists invoked');
      }
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      const url = new URL(
        request && request.url
          ? request.url.toString()
          : String((request && request.url) || '')
      );
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const items = mockPlaylists.slice(offset, offset + limit);

      if (typeof res === 'function' && ctx)
        return res(
          ctx.json({
            items,
            total: mockPlaylists.length,
            limit,
            offset,
            next:
              offset + limit < mockPlaylists.length
                ? `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset + limit}`
                : null,
            previous:
              offset > 0
                ? `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${Math.max(0, offset - limit)}`
                : null,
          })
        );
      return msw.HttpResponse.json({
        items,
        total: mockPlaylists.length,
        limit,
        offset,
        next:
          offset + limit < mockPlaylists.length
            ? `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
      });
    }
  ),

  // Get playlist tracks
  msw.rest.get(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    (req: any, res: any, ctx: any) => {
      // This handler should not be reached due to wildcard handler above
      console.error('[handler] PARAMETERIZED tracks handler reached');
      return new msw.HttpResponse(null, { status: 404 });
    }
  ),

  // Get playlist details (fallback handler for tests)
  msw.rest.get(
    'https://api.spotify.com/v1/playlists/:playlistId',
    (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      const playlist = {
        id: req.params.playlistId,
        name: `Playlist ${req.params.playlistId}`,
        owner: { id: 'user_1', display_name: mockUserProfile.display_name },
        tracks: {
          total: mockTracks.length,
          href: `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks`,
        },
        images: [],
        external_urls: {
          spotify: `https://open.spotify.com/playlist/${req.params.playlistId}`,
        },
      };

      if (typeof res === 'function' && ctx) return res(ctx.json(playlist));
      return msw.HttpResponse.json(playlist);
    }
  ),

  // Search tracks
  msw.rest.get(
    'https://api.spotify.com/v1/search',
    (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const rawAuth =
        request && request.headers && typeof request.headers.get === 'function'
          ? request.headers.get('authorization')
          : '';
      const token = tokenScenario(request);
      const _mswVerbose = String(
        process.env.MSW_VERBOSE || process.env.TEST_VERBOSE || ''
      ).toLowerCase();
      if (_mswVerbose === '1' || _mswVerbose === 'true') {
        // eslint-disable-next-line no-console
        console.error('MSW handler - /search raw Authorization:', rawAuth);
        // eslint-disable-next-line no-console
        console.error('MSW handler - /search computed token:', token);
      }
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      const url = new URL(
        request && request.url
          ? request.url.toString()
          : String((request && request.url) || '')
      );
      const query = url.searchParams.get('q') || '';
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (type === 'track') {
        const filteredTracks = mockTracks
          .filter(
            (track: any) =>
              track.name.toLowerCase().includes(query.toLowerCase()) ||
              track.artists[0].name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, limit);

        const response = {
          tracks: {
            items: filteredTracks,
            total: filteredTracks.length,
            limit,
            offset: 0,
          },
        };

        if (typeof res === 'function' && ctx) return res(ctx.json(response));
        return msw.HttpResponse.json(response);
      }

      if (type === 'playlist') {
        const filteredPlaylists = mockPlaylists
          .filter((pl: any) => {
            const q = query.toLowerCase();
            const nameMatch = pl.name && pl.name.toLowerCase().includes(q);
            const ownerMatch =
              pl.owner &&
              pl.owner.display_name &&
              pl.owner.display_name.toLowerCase().includes(q);
            const descriptionMatch =
              pl.description && pl.description.toLowerCase().includes(q);
            return nameMatch || ownerMatch || descriptionMatch;
          })
          .slice(0, limit);

        if (_mswVerbose === '1' || _mswVerbose === 'true') {
          // eslint-disable-next-line no-console
          console.error(
            'MSW handler - /search filtered playlists:',
            filteredPlaylists.map((p: any) => p.name)
          );
        }

        const response = {
          playlists: {
            items: filteredPlaylists,
            total: filteredPlaylists.length,
            limit,
            offset: 0,
          },
        };

        if (typeof res === 'function' && ctx) return res(ctx.json(response));
        return msw.HttpResponse.json(response);
      }

      const defaultResponse = {
        tracks: { items: [], total: 0, limit, offset: 0 },
      };
      if (typeof res === 'function' && ctx)
        return res(ctx.json(defaultResponse));
      return msw.HttpResponse.json(defaultResponse);
    }
  ),

  // Create playlist
  msw.rest.post(
    'https://api.spotify.com/v1/users/:userId/playlists',
    async (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        return new msw.HttpResponse(null, { status: 401 });
      }

      const _body: any = await (typeof request.json === 'function'
        ? request.json()
        : Promise.resolve({}));
      const newPlaylist = {
        id: `playlist_${Date.now()}`,
        name: _body.name,
        description: _body.description || '',
        public: _body.public || false,
        collaborative: false,
        owner: {
          id: req.params.userId,
          display_name: mockUserProfile.display_name,
        },
        tracks: {
          total: 0,
          href: `https://api.spotify.com/v1/playlists/playlist_${Date.now()}/tracks`,
        },
        images: [],
        external_urls: {
          spotify: `https://open.spotify.com/playlist/playlist_${Date.now()}`,
        },
      };

      if (typeof res === 'function' && ctx) {
        return res(ctx.status(201), ctx.json(newPlaylist));
      }
      return msw.HttpResponse.json(newPlaylist, { status: 201 });
    }
  ),

  // Add tracks to playlist
  msw.rest.post(
    'https://api.spotify.com/v1/playlists/*/tracks',
    async (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      console.error(
        '[handler] POST tracks handler matched! req.url:',
        request?.url
      );

      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      if (typeof res === 'function' && ctx) {
        return res(
          ctx.status(201),
          ctx.json({ snapshot_id: `snapshot_${Date.now()}` })
        );
      }
      return msw.HttpResponse.json(
        { snapshot_id: `snapshot_${Date.now()}` },
        { status: 201 }
      );
    }
  ),

  // Remove tracks from playlist
  msw.rest.delete(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    async (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      if (typeof res === 'function' && ctx) {
        return res(ctx.json({ snapshot_id: `snapshot_${Date.now()}` }));
      }
      return msw.HttpResponse.json({ snapshot_id: `snapshot_${Date.now()}` });
    }
  ),

  // Get track audio features
  msw.rest.get(
    'https://api.spotify.com/v1/audio-features/:trackId',
    (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      const features = {
        id: req.params.trackId,
        danceability: Math.random(),
        energy: Math.random(),
        key: Math.floor(Math.random() * 12),
        loudness: -60 + Math.random() * 60,
        mode: Math.round(Math.random()),
        speechiness: Math.random(),
        acousticness: Math.random(),
        instrumentalness: Math.random(),
        liveness: Math.random(),
        valence: Math.random(),
        tempo: 60 + Math.random() * 140,
        duration_ms: 180000 + Math.random() * 120000,
        time_signature: 4,
      };

      if (typeof res === 'function' && ctx) return res(ctx.json(features));
      return msw.HttpResponse.json(features);
    }
  ),

  // Get multiple track audio features
  msw.rest.get(
    'https://api.spotify.com/v1/audio-features',
    (req: any, res: any, ctx: any) => {
      const request = normalizeRequest(req);
      const token = tokenScenario(request);
      if (token === 'trigger_429') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(429), ctx.set('Retry-After', '1'));
        return new msw.HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      }

      if (token === 'trigger_500') {
        if (typeof res === 'function' && ctx)
          return res(ctx.status(500), ctx.json({ error: 'server_error' }));
        return msw.HttpResponse.json(
          { error: 'server_error' },
          { status: 500 }
        );
      }

      if (token === 'trigger_401') {
        if (typeof res === 'function' && ctx) return res(ctx.status(401));
        return new msw.HttpResponse(null, { status: 401 });
      }

      const url = new URL(
        request && request.url
          ? request.url.toString()
          : String((request && request.url) || '')
      );
      const ids = (url.searchParams.get('ids') || '')
        .split(',')
        .filter(Boolean);

      const features = ids.map((id: string) => ({
        id,
        danceability: Math.random(),
        energy: Math.random(),
        key: Math.floor(Math.random() * 12),
        loudness: -60 + Math.random() * 60,
        mode: Math.round(Math.random()),
        speechiness: Math.random(),
        acousticness: Math.random(),
        instrumentalness: Math.random(),
        liveness: Math.random(),
        valence: Math.random(),
        tempo: 60 + Math.random() * 140,
        duration_ms: 180000 + Math.random() * 120000,
        time_signature: 4,
      }));

      const response = { audio_features: features };
      if (typeof res === 'function' && ctx) return res(ctx.json(response));
      return msw.HttpResponse.json(response);
    }
  ),
];

console.error('[handlers] Created', handlers.length, 'handlers');
console.error(
  '[handlers] First handler:',
  handlers[0] ? 'defined' : 'undefined'
);
console.error(
  '[handlers] Handler types:',
  handlers.map((h: any, i: number) => `${i}: ${typeof h}`).slice(0, 5)
);
