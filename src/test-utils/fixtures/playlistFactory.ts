import { makePlaylist, makeTrack } from '../mocks/spotify';
import type {
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyPlaylistTrackItem,
  SpotifyPlaylistTracks,
} from '../../types/spotify';

export const makeTracks = (count: number): SpotifyTrack[] => {
  const tracks: SpotifyTrack[] = [];
  for (let i = 1; i <= count; i++) {
    tracks.push(
      makeTrack({
        id: `track_${i}`,
        name: `Generated Track ${i}`,
        uri: `spotify:track:track_${i}`,
      })
    );
  }
  return tracks;
};

export const makePlaylistWithTracks = (
  overrides?: Partial<SpotifyPlaylist>,
  trackCount = 5
): SpotifyPlaylist & { _resolvedTracks: SpotifyTrack[] } => {
  const trackObjects = makeTracks(trackCount);

  const playlistTracks: SpotifyPlaylistTracks & {
    items: SpotifyPlaylistTrackItem[];
  } = {
    total: trackCount,
    href: '',
    items: trackObjects.map<SpotifyPlaylistTrackItem>(t => ({
      track: t,
      added_at: new Date().toISOString(),
      added_by: {
        id: 'test_user',
        display_name: 'Test User',
        external_urls: { spotify: '' },
      },
      is_local: false,
    })),
  };

  const playlist = makePlaylist({
    id: overrides?.id || `playlist_${Math.random().toString(36).slice(2, 8)}`,
    name: overrides?.name || 'Generated Playlist',
    tracks: playlistTracks,
    ...overrides,
  }) as SpotifyPlaylist & { _resolvedTracks: SpotifyTrack[] };

  // Expose resolved tracks for direct use in low-level utilities/tests
  playlist._resolvedTracks = trackObjects;
  return playlist;
};
