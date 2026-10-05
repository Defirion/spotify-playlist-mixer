// API service type definitions

import {
  SpotifyTrack,
  SpotifyCreatePlaylistRequest,
  SpotifyCreatePlaylistResponse,
  SpotifyAddTracksRequest,
  SpotifyAddTracksResponse,
} from './spotify';

import { SearchOptions, SearchResult } from './mixer';

// Service method options
export interface GetPlaylistTracksOptions {
  signal?: AbortSignal;
  limit?: number;
  offset?: number;
  fields?: string;
  market?: string;
  onProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
}

export interface SearchTracksOptions extends SearchOptions {
  market?: string;
}

// Service method return types
export interface SpotifyServiceSearchResult extends SearchResult<SpotifyTrack> {
  tracks: SpotifyTrack[];
}

export interface SpotifyServicePlaylistTracksResult {
  tracks: SpotifyTrack[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Service interface
export interface ISpotifyService {
  // Playlist methods
  getPlaylistTracks(
    playlistId: string,
    options?: GetPlaylistTracksOptions
  ): Promise<SpotifyServicePlaylistTracksResult>;
  createPlaylist(
    playlistData: SpotifyCreatePlaylistRequest
  ): Promise<SpotifyCreatePlaylistResponse>;
  addTracksToPlaylist(
    playlistId: string,
    request: SpotifyAddTracksRequest
  ): Promise<SpotifyAddTracksResponse>;

  // Search methods
  searchTracks(
    query: string,
    options?: SearchTracksOptions
  ): Promise<SpotifyServiceSearchResult>;
}
