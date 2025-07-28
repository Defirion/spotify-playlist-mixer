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
  DragItem,
  DropResult,
  TrackSelectHandler,
  TrackRemoveHandler,
  PlaylistSelectHandler,
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
  UseDraggableReturn,
  UseVirtualizationReturn,
} from './hooks';

export type { ISpotifyService, ApiError, ApiErrorType } from './api';
