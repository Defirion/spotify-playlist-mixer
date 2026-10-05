import { Playlist, Track } from '../types/domain';
import { SpotifyPlaylist, SpotifyTrack } from '../types/spotify';

/** Spotify durations stay milliseconds; absent optional fields stay absent. */
export function normalizeSpotifyTrack(dto: SpotifyTrack): Track {
  return {
    id: `spotify:${dto.id}`,
    title: dto.name,
    artists: (dto.artists || []).map(artist => artist.name),
    durationMs:
      Number.isFinite(dto.duration_ms) && dto.duration_ms >= 0
        ? dto.duration_ms
        : 0,
    sourceRefs: [{ provider: 'spotify', id: dto.id, uri: dto.uri }],
    ...(dto.album?.name ? { album: dto.album.name } : {}),
    ...(dto.album?.release_date ? { releaseDate: dto.album.release_date } : {}),
    ...(dto.album?.images?.[0]?.url
      ? { artworkUrl: dto.album.images[0].url }
      : {}),
    ...(dto.external_ids?.isrc ? { isrc: dto.external_ids.isrc } : {}),
  };
}

export function normalizeSpotifyPlaylist(dto: SpotifyPlaylist): Playlist {
  return {
    id: dto.id,
    name: dto.name,
    tracks: [],
    source: { provider: 'spotify', id: dto.id, uri: dto.uri },
    sourceTotal: dto.items?.total ?? dto.tracks?.total,
  };
}

export function spotifyTrackUri(track: Track): string | undefined {
  return track.sourceRefs.find(ref => ref.provider === 'spotify' && ref.uri)
    ?.uri;
}
