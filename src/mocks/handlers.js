import { http, HttpResponse } from 'msw';
import { mockTracks, mockPlaylists, mockUserProfile } from './fixtures';

export const handlers = [
  // Get user profile
  http.get('https://api.spotify.com/v1/me', () => {
    return HttpResponse.json(mockUserProfile);
  }),

  // Get user playlists
  http.get('https://api.spotify.com/v1/me/playlists', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = parseInt(url.searchParams.get('offset')) || 0;

    const items = mockPlaylists.slice(offset, offset + limit);

    return HttpResponse.json({
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
  }),

  // Get playlist tracks
  http.get(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    ({ params, request }) => {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit')) || 100;
      const offset = parseInt(url.searchParams.get('offset')) || 0;

      const playlistTracks = mockTracks.slice(offset, offset + limit);

      return HttpResponse.json({
        items: playlistTracks.map(track => ({ track })),
        total: mockTracks.length,
        limit,
        offset,
        next:
          offset + limit < mockTracks.length
            ? `https://api.spotify.com/v1/playlists/${params.playlistId}/tracks?limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `https://api.spotify.com/v1/playlists/${params.playlistId}/tracks?limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
      });
    }
  ),

  // Search tracks
  http.get('https://api.spotify.com/v1/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    if (type === 'track') {
      const filteredTracks = mockTracks
        .filter(
          track =>
            track.name.toLowerCase().includes(query.toLowerCase()) ||
            track.artists[0].name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit);

      return HttpResponse.json({
        tracks: {
          items: filteredTracks,
          total: filteredTracks.length,
          limit,
          offset: 0,
        },
      });
    }

    return HttpResponse.json({
      tracks: { items: [], total: 0, limit, offset: 0 },
    });
  }),

  // Create playlist
  http.post(
    'https://api.spotify.com/v1/users/:userId/playlists',
    async ({ request, params }) => {
      const body = await request.json();
      const newPlaylist = {
        id: `playlist_${Date.now()}`,
        name: body.name,
        description: body.description || '',
        public: body.public || false,
        collaborative: false,
        owner: {
          id: params.userId,
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

      return HttpResponse.json(newPlaylist, { status: 201 });
    }
  ),

  // Add tracks to playlist
  http.post(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    async ({ request, params }) => {
      const body = await request.json();

      return HttpResponse.json(
        {
          snapshot_id: `snapshot_${Date.now()}`,
        },
        { status: 201 }
      );
    }
  ),

  // Remove tracks from playlist
  http.delete(
    'https://api.spotify.com/v1/playlists/:playlistId/tracks',
    async ({ request, params }) => {
      const body = await request.json();

      return HttpResponse.json({
        snapshot_id: `snapshot_${Date.now()}`,
      });
    }
  ),

  // Get track audio features
  http.get(
    'https://api.spotify.com/v1/audio-features/:trackId',
    ({ params }) => {
      return HttpResponse.json({
        id: params.trackId,
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
      });
    }
  ),
];
