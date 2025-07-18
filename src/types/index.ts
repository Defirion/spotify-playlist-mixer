// Core domain types and interfaces for the Spotify Playlist Mixer application

// Re-export all types from other type files
export * from './errors';
export * from './utils';
export * from './services';
export * from './actions';
export * from './constants';

// User and Authentication Types
export interface User {
  id: string;
  displayName: string;
  email?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface AuthResult {
  token: string;
  user: User;
  expiresIn: number;
}

// Playlist Domain Types
export interface PlaylistImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface Artist {
  id: string;
  name: string;
  uri: string;
}

export interface Album {
  id: string;
  name: string;
  artists: Artist[];
  images: PlaylistImage[];
  release_date: string;
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  popularity: number;
  uri: string;
  preview_url?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  owner: User;
  images: PlaylistImage[];
  tracks?: Track[];
}

// Mixer Domain Types
export interface PlaylistRatioConfig {
  ratio: number;
  isEnabled: boolean;
}

export interface RatioConfig {
  [playlistId: string]: PlaylistRatioConfig;
}

export interface MixOptions {
  shuffleWithinRatio: boolean;
  avoidConsecutiveSamePlaylist: boolean;
  strategy: MixStrategy;
  totalSongs?: number;
  targetDuration?: number;
  useTimeLimit?: boolean;
}

export type MixStrategy = 'balanced' | 'front-loaded' | 'crescendo' | 'random';

export interface SelectedPlaylist {
  playlist: Playlist;
  tracks: Track[];
  config: PlaylistRatioConfig;
}

export interface MixConfig {
  playlists: SelectedPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
}

export interface MixStatistics {
  totalTracks: number;
  playlistDistribution: { [playlistId: string]: number };
  ratioCompliance: number;
  averagePopularity: number;
  totalDuration: number;
}

export interface MixMetadata {
  generatedAt: Date;
  strategy: MixStrategy;
  sourcePlaylistCount: number;
  configHash: string;
}

export interface MixResult {
  tracks: Track[];
  metadata: MixMetadata;
  statistics: MixStatistics;
}

export interface MixPreview {
  tracks: Track[];
  statistics: MixStatistics;
  isPreview: true;
}

// State Management Types
export interface PlaylistState {
  userPlaylists: Playlist[];
  selectedPlaylists: SelectedPlaylist[];
  isLoading: boolean;
  error: string | null;
}

export interface MixerState {
  currentMix: MixResult | null;
  previewMix: MixPreview | null;
  isGenerating: boolean;
  mixHistory: MixResult[];
  error: string | null;
}

export interface UIState {
  isModalOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
  theme: 'light' | 'dark';
}

export interface AppState {
  auth: AuthState;
  playlists: PlaylistState;
  mixer: MixerState;
  ui: UIState;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: Date;
}