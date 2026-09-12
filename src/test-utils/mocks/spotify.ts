import {
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum,
  SpotifyExternalUrls,
  SpotifyPlaylist,
} from '../../types/spotify';

const defaultExternal = (id: string): SpotifyExternalUrls => ({
  spotify: `https://open.spotify.com/${id}`,
});

export function makeArtist(overrides?: Partial<SpotifyArtist>): SpotifyArtist {
  return {
    id: overrides?.id || 'artist1',
    name: overrides?.name || 'Artist 1',
    uri: overrides?.uri || 'spotify:artist:artist1',
    external_urls:
      overrides?.external_urls || defaultExternal('artist/artist1'),
    ...overrides,
  } as SpotifyArtist;
}

export function makeAlbum(overrides?: Partial<SpotifyAlbum>): SpotifyAlbum {
  return {
    id: overrides?.id || 'album1',
    name: overrides?.name || 'Album 1',
    images: overrides?.images || [],
    release_date: overrides?.release_date || '2020-01-01',
    uri: overrides?.uri || 'spotify:album:album1',
    external_urls: overrides?.external_urls || defaultExternal('album/album1'),
    ...overrides,
  } as SpotifyAlbum;
}

export function makeTrack(overrides?: Partial<SpotifyTrack>): SpotifyTrack {
  const artist = makeArtist();
  const album = makeAlbum();
  return {
    id: overrides?.id || 'track1',
    name: overrides?.name || 'Track 1',
    artists: overrides?.artists || [artist],
    album: overrides?.album || album,
    duration_ms: overrides?.duration_ms ?? 180000,
    explicit: overrides?.explicit ?? false,
    preview_url: overrides?.preview_url ?? null,
    track_number: overrides?.track_number ?? 1,
    uri: overrides?.uri || 'spotify:track:track1',
    external_urls: overrides?.external_urls || defaultExternal('track/track1'),
    is_playable: overrides?.is_playable ?? true,
    ...overrides,
  } as SpotifyTrack;
}

export function makePlaylist(
  overrides?: Partial<SpotifyPlaylist>
): SpotifyPlaylist {
  return {
    id: overrides?.id || 'playlist1',
    name: overrides?.name || 'Playlist 1',
    description: overrides?.description ?? null,
    images: overrides?.images || [],
    items: overrides?.items || {
      total: overrides?.items?.total ?? overrides?.tracks?.total ?? 0,
      href:
        overrides?.items?.href ||
        'https://api.spotify.com/playlists/playlist1/items',
    },
    owner: overrides?.owner || {
      id: 'user1',
      display_name: 'User 1',
      external_urls: defaultExternal('user/user1'),
    },
    public: overrides?.public ?? true,
    collaborative: overrides?.collaborative ?? false,
    uri: overrides?.uri || 'spotify:playlist:playlist1',
    external_urls:
      overrides?.external_urls || defaultExternal('playlist/playlist1'),
    ...overrides,
  } as SpotifyPlaylist;
}
