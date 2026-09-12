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

export interface SpotifyUserProfile {
  id: string;
  /** Stable pseudoanonymous account identifier added by Spotify in May 2026. */
  account_id?: string;
  display_name: string;
  email?: string;
  country?: string;
  product?: 'free' | 'premium';
  images: SpotifyImage[];
  followers: {
    total: number;
  };
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'user';
  uri?: string;
}

// API Response types
export interface SpotifyPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
  href: string;
}

export interface SpotifySearchResponse {
  tracks: SpotifyPaginatedResponse<SpotifyTrack>;
  artists?: SpotifyPaginatedResponse<SpotifyArtist>;
  albums?: SpotifyPaginatedResponse<SpotifyAlbum>;
  playlists?: SpotifyPaginatedResponse<SpotifyPlaylist>;
}

export interface SpotifyPlaylistTracksResponse extends SpotifyPaginatedResponse<SpotifyPlaylistTrackItem> {}

export interface SpotifyUserPlaylistsResponse extends SpotifyPaginatedResponse<SpotifyPlaylist> {}

export interface SpotifyCreatePlaylistRequest {
  name: string;
  description?: string;
  public?: boolean;
  collaborative?: boolean;
}

// Alias for compatibility
export type CreatePlaylistRequest = SpotifyCreatePlaylistRequest;

export interface SpotifyCreatePlaylistResponse extends SpotifyPlaylist {}

export interface SpotifyAddTracksRequest {
  uris: string[];
  position?: number;
}

// Alias for compatibility
export type AddTracksRequest = SpotifyAddTracksRequest;

export interface SpotifyAddTracksResponse {
  snapshot_id: string;
}

export interface SpotifyRemoveTracksRequest {
  /** Current Spotify API field for DELETE /playlists/{id}/items. */
  items: Array<{
    uri: string;
    positions?: number[];
  }>;
  snapshot_id?: string;
}

// Alias for compatibility
export type RemoveTracksRequest = SpotifyRemoveTracksRequest;

export interface SpotifyRemoveTracksResponse {
  snapshot_id: string;
}

// Authentication types
export interface SpotifyAuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// Error types
export interface SpotifyApiError {
  error: {
    status: number;
    message: string;
  };
}

export interface SpotifyRateLimitError extends SpotifyApiError {
  error: {
    status: 429;
    message: string;
    retry_after?: number;
  };
}
