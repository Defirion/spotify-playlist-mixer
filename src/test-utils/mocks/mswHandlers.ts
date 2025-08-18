// Try to require msw safely. If it fails (ESM transform issue in some Jest
// environments), export an empty handlers array so importing this file won't
// crash the test run.
let rest: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  rest = require('msw').rest;
} catch (e) {
  // leave rest as null and fall back to empty handlers
}

// Minimal, realistic handlers for Spotify endpoints used in tests
export const handlers = rest
  ? [
      // Search playlists - return a small deterministic payload matching test fixtures
      rest.get(
        'https://api.spotify.com/v1/search',
        (_req: any, res: any, ctx: any) => {
          const items = [
            {
              id: 'aaaaaaaaaaaaaaaaaaaaaa',
              name: 'My Awesome Playlist',
              description: 'A collection of great songs',
              owner: { id: 'test_user_123', display_name: 'Test User' },
              tracks: {
                total: 25,
                href: 'https://api.spotify.com/v1/playlists/playlist_1/tracks',
              },
              images: [],
              external_urls: {
                spotify: 'https://open.spotify.com/playlist/playlist_1',
              },
            },
            {
              id: 'bbbbbbbbbbbbbbbbbbbbbb',
              name: 'Chill Vibes',
              description: 'Relaxing music for any time',
              owner: { id: 'test_user_123', display_name: 'Test User' },
              tracks: {
                total: 18,
                href: 'https://api.spotify.com/v1/playlists/playlist_2/tracks',
              },
              images: [],
              external_urls: {
                spotify: 'https://open.spotify.com/playlist/playlist_2',
              },
            },
          ];
          return res(
            ctx.status(200),
            ctx.json({ playlists: { items, total: items.length } })
          );
        }
      ),

      // Get playlist tracks
      rest.get(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        (req: any, res: any, ctx: any) => {
          const { playlistId } = req.params as any;
          const tracks = Array.from({ length: 5 }).map((_, i) => ({
            track: {
              id: `${playlistId}-t-${i}`,
              name: `Track ${i}`,
              uri: `spotify:track:${playlistId}-t-${i}`,
              duration_ms: 180000,
              artists: [],
              album: {
                id: `album-${i}`,
                name: `Album ${i}`,
                images: [],
                release_date: '2020-01-01',
                uri: '',
              },
            },
            added_at: new Date().toISOString(),
            added_by: {
              id: 'user',
              display_name: 'Test User',
              external_urls: { spotify: '' },
            },
            is_local: false,
          }));

          return res(ctx.status(200), ctx.json({ items: tracks, total: 5 }));
        }
      ),

      // Get playlist metadata
      rest.get(
        'https://api.spotify.com/v1/playlists/:playlistId',
        (req: any, res: any, ctx: any) => {
          const { playlistId } = req.params as any;
          // Return a minimal playlist object consistent with fixtures
          return res(
            ctx.status(200),
            ctx.json({
              id: playlistId,
              name:
                playlistId === 'aaaaaaaaaaaaaaaaaaaaaa'
                  ? 'My Awesome Playlist'
                  : playlistId === 'bbbbbbbbbbbbbbbbbbbbbb'
                    ? 'Chill Vibes'
                    : 'Unknown',
              description: 'Mocked playlist',
              owner: { id: 'test_user_123', display_name: 'Test User' },
              images: [],
              tracks: {
                total: 10,
                href: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
              },
              external_urls: {
                spotify: `https://open.spotify.com/playlist/${playlistId}`,
              },
            })
          );
        }
      ),

      // Get user profile
      rest.get(
        'https://api.spotify.com/v1/me',
        (req: any, res: any, ctx: any) => {
          return res(
            ctx.status(200),
            ctx.json({
              id: 'user_1',
              display_name: 'Test User',
              images: [],
              followers: { total: 0 },
              external_urls: { spotify: '' },
            })
          );
        }
      ),

      // Create playlist
      rest.post(
        'https://api.spotify.com/v1/users/:userId/playlists',
        (req: any, res: any, ctx: any) => {
          const { userId } = req.params as any;
          return res(
            ctx.status(201),
            ctx.json({
              id: `created_${userId}`,
              name: (req.body as any)?.name || 'Created',
            })
          );
        }
      ),

      // Add tracks to playlist
      rest.post(
        'https://api.spotify.com/v1/playlists/:playlistId/tracks',
        (req: any, res: any, ctx: any) => {
          return res(
            ctx.status(201),
            ctx.json({ snapshot_id: 'snapshot_abc' })
          );
        }
      ),
    ]
  : [];
export default handlers;
