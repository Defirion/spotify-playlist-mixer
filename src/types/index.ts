// Main types export file

// Spotify API types
export * from './spotify';

// Mixer and application types
export * from './mixer';

// API service types
export * from './api';

// Component types
export * from './components';

// Hook types
export * from './hooks';

// Utility types
export * from './utils';

// Drag and drop types removed - will be replaced with dnd-kit types

// Re-export commonly used types for convenience
export type {
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyUserProfile,
  SpotifyImage,
  SpotifyArtist,
  SpotifyAlbum,
} from './spotify';

export type {
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
  TrackSelectHandler,
  TrackRemoveHandler,
  PlaylistSelectHandler,
  // Drag-related types removed - will be replaced with dnd-kit types
} from './mixer';

export type {
  TrackItemProps,
  TrackListProps,
  ModalProps,
  ButtonProps,
} from './components';

export type {
  UseSpotifySearchReturn,
  UsePlaylistTracksReturn,
  UseUserPlaylistsReturn,
  // UseDraggableReturn removed
  UseVirtualizationReturn,
} from './hooks';

// Drag-related type exports removed - will be replaced with dnd-kit types

export type { ISpotifyService, ApiError, ApiErrorType } from './api';
