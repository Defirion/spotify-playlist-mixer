// Core type definitions for the Spotify Playlist Mixer

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  popularity?: number;
  uri: string;
  preview_url?: string;
  external_urls: {
    spotify: string;
  };
  sourcePlaylist?: string; // For mixed tracks
}

export interface Artist {
  id: string;
  name: string;
  uri: string;
}

export interface Album {
  id: string;
  name: string;
  images: Image[];
  release_date: string;
}

export interface Image {
  url: string;
  height: number | null;
  width: number | null;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  images: Image[];
  tracks: {
    total: number;
  };
  owner: {
    id: string;
    display_name: string;
  };
  public: boolean;
  uri: string;
  realAverageDurationSeconds?: number;
}

export interface MixOptions {
  totalSongs: number;
  targetDuration: number;
  useTimeLimit: boolean;
  useAllSongs: boolean;
  playlistName: string;
  shuffleWithinGroups: boolean;
  popularityStrategy: 'mixed' | 'popular' | 'balanced';
  recencyBoost: boolean;
  continueWhenPlaylistEmpty: boolean;
}

export interface RatioConfig {
  [playlistId: string]: {
    min: number;
    max: number;
    weight: number;
    weightType: 'frequency' | 'time';
  };
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images: Image[];
  country?: string;
  followers: {
    total: number;
  };
}

export interface APIResponse<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}
