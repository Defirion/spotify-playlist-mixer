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
