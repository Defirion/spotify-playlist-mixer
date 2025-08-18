import { rest } from 'msw';
import { mockTracks, mockPlaylists, mockUserProfile } from './fixtures';

// Helper: allow tests to trigger special responses by setting the Authorization
// header to a sentinel value. This keeps the SpotifyService API surface
// unchanged while allowing MSW to simulate 429 / 401 flows deterministically.
const tokenScenario = (req: any) => {
  const auth = req.headers.get('authorization') || '';
  return auth.replace(/^Bearer\s+/i, '');
};

export const handlers = [
  // Get user profile
  rest.get('https://api.spotify.com/v1/me', (req, res, ctx) => {
    const token = tokenScenario(req);
    if (token === 'trigger_429') {
      return res(
        ctx.status(429),
        ctx.set('Retry-After', '1'),
        ctx.json({ error: 'rate_limited' })
      );
    }

    if (token === 'trigger_500') {
      return res(ctx.status(500), ctx.json({ error: 'server_error' }));
    }

    if (token === 'trigger_401') {
      return res(ctx.status(401));
    }
    return res(ctx.json(mockUserProfile));
  }),

  // Get user playlists
  rest.get('https://api.spotify.com/v1/me/playlists', (req, res, ctx) => {
    const token = tokenScenario(req);
    if (token === 'trigger_429') {
      return res(
        ctx.status(429),
        ctx.set('Retry-After', '1'),
        ctx.json({ error: 'rate_limited' })
      );
    }

    if (token === 'trigger_500') {
      return res(ctx.status(500), ctx.json({ error: 'server_error' }));
    }

    if (token === 'trigger_401') {
      return res(ctx.status(401));
    }

    const url = new URL(req.url.toString());
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const items = mockPlaylists.slice(offset, offset + limit);

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
  }),

  // Get playlist tracks
  rest.get(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    (req, res, ctx) => {
      const token = tokenScenario(req);
      if (token === 'trigger_429') {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '1'),
          ctx.json({ error: 'rate_limited' })
        );
      }

      if (token === 'trigger_500') {
        return res(ctx.status(500), ctx.json({ error: 'server_error' }));
      }

      if (token === 'trigger_401') {
        return res(ctx.status(401));
      }

      const url = new URL(req.url.toString());
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const playlistTracks = mockTracks.slice(offset, offset + limit);

      return res(
        ctx.json({
          items: playlistTracks.map(track => ({ track })),
          total: mockTracks.length,
          limit,
          offset,
          next:
            offset + limit < mockTracks.length
              ? `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks?limit=${limit}&offset=${offset + limit}`
              : null,
          previous:
            offset > 0
              ? `https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks?limit=${limit}&offset=${Math.max(0, offset - limit)}`
              : null,
        })
      );
    }
  ),

  // Search tracks
  rest.get('https://api.spotify.com/v1/search', (req, res, ctx) => {
    // Debug: log incoming Authorization header and computed token to diagnose test token handling
    // eslint-disable-next-line no-console
    const rawAuth = req.headers.get('authorization');
    // eslint-disable-next-line no-console
    console.error('MSW handler - /search raw Authorization:', rawAuth);
    const token = tokenScenario(req);
    // eslint-disable-next-line no-console
    console.error('MSW handler - /search computed token:', token);
    if (token === 'trigger_429') {
      return res(
        ctx.status(429),
        ctx.set('Retry-After', '1'),
        ctx.json({ error: 'rate_limited' })
      );
    }

    if (token === 'trigger_500') {
      return res(ctx.status(500), ctx.json({ error: 'server_error' }));
    }

    if (token === 'trigger_401') {
      return res(ctx.status(401));
    }

    const url = new URL(req.url.toString());
    const query = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (type === 'track') {
      const filteredTracks = mockTracks
        .filter(
          track =>
            track.name.toLowerCase().includes(query.toLowerCase()) ||
            track.artists[0].name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);

      return res(
        ctx.json({
          tracks: {
            items: filteredTracks,
            total: filteredTracks.length,
            limit,
            offset: 0,
          },
        })
      );
    }

    return res(ctx.json({ tracks: { items: [], total: 0, limit, offset: 0 } }));
  }),

  // Create playlist
  rest.post(
    'https://api.spotify.com/v1/users/:userId/playlists',
    async (req, res, ctx) => {
      const token = tokenScenario(req);
      if (token === 'trigger_429') {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '1'),
          ctx.json({ error: 'rate_limited' })
        );
      }

      if (token === 'trigger_500') {
        return res(ctx.status(500), ctx.json({ error: 'server_error' }));
      }

      if (token === 'trigger_401') {
        return res(ctx.status(401));
      }

      const _body: any = await req.json();
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

      return res(ctx.status(201), ctx.json(newPlaylist));
    }
  ),

  // Add tracks to playlist
  rest.post(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    async (req, res, ctx) => {
      const token = tokenScenario(req);
      if (token === 'trigger_429') {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '1'),
          ctx.json({ error: 'rate_limited' })
        );
      }

      if (token === 'trigger_500') {
        return res(ctx.status(500), ctx.json({ error: 'server_error' }));
      }

      if (token === 'trigger_401') {
        return res(ctx.status(401));
      }

      return res(
        ctx.status(201),
        ctx.json({ snapshot_id: `snapshot_${Date.now()}` })
      );
    }
  ),

  // Remove tracks from playlist
  rest.delete(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    async (req, res, ctx) => {
      const token = tokenScenario(req);
      if (token === 'trigger_429') {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '1'),
          ctx.json({ error: 'rate_limited' })
        );
      }

      if (token === 'trigger_500') {
        return res(ctx.status(500), ctx.json({ error: 'server_error' }));
      }

      if (token === 'trigger_401') {
        return res(ctx.status(401));
      }

      return res(ctx.json({ snapshot_id: `snapshot_${Date.now()}` }));
    }
  ),

  // Get track audio features
  rest.get(
    'https://api.spotify.com/v1/audio-features/:trackId',
    (req, res, ctx) => {
      const token = tokenScenario(req);
      if (token === 'trigger_429') {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '1'),
          ctx.json({ error: 'rate_limited' })
        );
      }

      if (token === 'trigger_500') {
        return res(ctx.status(500), ctx.json({ error: 'server_error' }));
      }

      if (token === 'trigger_401') {
        return res(ctx.status(401));
      }

      return res(
        ctx.json({
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
        })
      );
    }
  ),
];
