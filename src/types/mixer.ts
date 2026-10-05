// Playlist mixer type definitions

import { SpotifyTrack, SpotifyPlaylist } from './spotify';

export type WeightType = 'frequency' | 'time';

export interface MixOptions {
  totalSongs: number;
  targetDurationSeconds: number; // in seconds
  useTimeLimit: boolean;
  useAllSongs: boolean;
  playlistName: string;
  shuffleTracks: boolean;
  continueWhenPlaylistEmpty: boolean;
}

export interface RatioConfigItem {
  min: number;
  max: number;
  weight: number;
  weightType: WeightType;
}

export interface RatioConfig {
  [playlistId: string]: RatioConfigItem;
}

export interface MixedTrack extends SpotifyTrack {
  sourcePlaylist: string;
  originalIndex?: number;
  // Unique instance ID for drag/drop operations (allows duplicate songs)
  instanceId?: string;
}

// Search types
export interface SearchOptions {
  limit?: number;
  offset?: number;
  market?: string;
  type?: 'track' | 'artist' | 'album' | 'playlist';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchState<T> {
  query: string;
  results: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  isEmpty: boolean;
}

// Preset template types
export interface PresetSettings {
  shuffleTracks: boolean;
  useTimeLimit: boolean;
  targetDurationSeconds: number; // in seconds
  useAllSongs: boolean;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  ratios: (playlists: SpotifyPlaylist[]) => RatioConfigItem[];
  settings: PresetSettings;
}

export interface PresetApplyData {
  ratioConfig: RatioConfig;
  settings: PresetSettings;
  presetName: string;
}

// Event handler types
export type TrackSelectHandler = (track: SpotifyTrack) => void;
export type TrackRemoveHandler = (track: SpotifyTrack) => void;
