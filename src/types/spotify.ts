// Spotify API type definitions

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'artist';
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  release_date_precision?: 'year' | 'month' | 'day';
  total_tracks?: number;
  uri: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'album';
  album_type?: 'album' | 'single' | 'compilation';
  artists?: SpotifyArtist[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  track_number: number;
  uri: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'track';
  disc_number?: number;
  is_local?: boolean;
  is_playable?: boolean;
  external_ids?: { isrc?: string };
  // Custom properties for our app
  sourcePlaylist?: string;
  sourcePlaylistName?: string;
  addedAt?: string;
}

export interface SpotifyPlaylistOwner {
  id: string;
  display_name: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'user';
  uri?: string;
}

export interface SpotifyPlaylistTracks {
  total: number;
  href: string;
  // Optional full items when available (paginated response shape)
  items?: SpotifyPlaylistTrackItem[];
}

/** The current Spotify playlist summary/content collection. */
export interface SpotifyPlaylistItems {
  total: number;
  href: string;
  items?: SpotifyPlaylistItem[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  /** Current Spotify API field. Contents are fetched from `/items`. */
  items?: SpotifyPlaylistItems;
  /** @deprecated Spotify renamed this field to `items` in February 2026. */
  tracks?: SpotifyPlaylistTracks;
  owner: SpotifyPlaylistOwner;
  public: boolean;
  collaborative: boolean;
  uri: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'playlist';
  snapshot_id?: string;
  followers?: {
    total: number;
  };
  // Custom properties for our app
  realAverageDurationSeconds?: number;
  tracksWithDuration?: number;
}

export interface SpotifyPlaylistTrackItem {
  /** Current Spotify API field. May be null for an unavailable item. */
  item?: SpotifyTrack | null;
  /** @deprecated Spotify renamed this field to `item`. */
  track?: SpotifyTrack | null;
  added_at: string | null;
  added_by: SpotifyPlaylistOwner | null;
  is_local: boolean;
}

/** A playlist item that this application can mix (tracks only). */
export type SpotifyPlaylistItem = SpotifyPlaylistTrackItem;

export interface SpotifyCreatePlaylistRequest {
  name: string;
  description?: string;
  public?: boolean;
  collaborative?: boolean;
}

export interface SpotifyCreatePlaylistResponse extends SpotifyPlaylist {}

export interface SpotifyAddTracksRequest {
  uris: string[];
  position?: number;
}

export interface SpotifyAddTracksResponse {
  snapshot_id: string;
}
