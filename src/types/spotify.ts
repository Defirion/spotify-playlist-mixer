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
  popularity: number;
  preview_url: string | null;
  track_number: number;
  uri: string;
  external_urls: SpotifyExternalUrls;
  href?: string;
  type?: 'track';
  disc_number?: number;
  is_local?: boolean;
  is_playable?: boolean;
  available_markets?: string[];
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
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  tracks: SpotifyPlaylistTracks;
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
}

export interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack;
  added_at: string;
  added_by: SpotifyPlaylistOwner;
  is_local: boolean;
}

export interface SpotifyUserProfile {
  id: string;
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

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
  uri: string;
  track_href: string;
  analysis_url: string;
  type: 'audio_features';
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

export interface SpotifyPlaylistTracksResponse
  extends SpotifyPaginatedResponse<SpotifyPlaylistTrackItem> {}

export interface SpotifyUserPlaylistsResponse
  extends SpotifyPaginatedResponse<SpotifyPlaylist> {}

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
  tracks: Array<{
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
