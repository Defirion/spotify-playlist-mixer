// Playlist mixer type definitions

import { SpotifyTrack, SpotifyPlaylist, SpotifyUserProfile } from './spotify';

export type PopularityStrategy = 'mixed' | 'popular' | 'balanced';
export type WeightType = 'frequency' | 'time';

export interface MixOptions {
  totalSongs: number;
  targetDuration: number; // in seconds
  useTimeLimit: boolean;
  useAllSongs: boolean;
  playlistName: string;
  shuffleWithinGroups: boolean;
  popularityStrategy: PopularityStrategy;
  recencyBoost: boolean;
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
  popularityScore?: number;
  recencyScore?: number;
  finalScore?: number;
}

export interface PlaylistMixResult {
  tracks: MixedTrack[];
  totalDuration: number; // in seconds
  playlistBreakdown: {
    [playlistId: string]: {
      count: number;
      duration: number;
      percentage: number;
    };
  };
  metadata: {
    createdAt: string;
    mixOptions: MixOptions;
    ratioConfig: RatioConfig;
    sourcePlaylistsCount: number;
    totalSourceTracks: number;
  };
}

export interface PlaylistSelectionItem {
  playlist: SpotifyPlaylist;
  selected: boolean;
  tracks?: SpotifyTrack[];
  loading?: boolean;
  error?: string;
}

export interface PlaylistMixerState {
  selectedPlaylists: PlaylistSelectionItem[];
  mixOptions: MixOptions;
  ratioConfig: RatioConfig;
  mixResult: PlaylistMixResult | null;
  isLoading: boolean;
  error: string | null;
}

// Drag and drop types
export interface DragItem {
  id?: string;
  type: string;
  data: any;
  sourceIndex?: number;
  sourceContainer?: string;
}

export interface DropResult {
  targetIndex?: number;
  targetContainer?: string;
  dropEffect?: 'move' | 'copy';
  success?: boolean;
  reason?: string;
  position?: any;
}

export interface DragState {
  isDragging: boolean;
  draggedItem: DragItem | null;
  dragPreview: HTMLElement | null;
  dropTargets: string[];
}

// Virtualization types
export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualRange {
  start: number;
  end: number;
  overscan: number;
}

export interface VirtualizationOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollOffset?: number;
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

// Component prop types
export interface TrackItemProps {
  track: SpotifyTrack;
  onSelect?: (track: SpotifyTrack) => void;
  onRemove?: (track: SpotifyTrack) => void;
  draggable?: boolean;
  selected?: boolean;
  actions?: React.ReactNode;
  className?: string;
  showPopularity?: boolean;
  showDuration?: boolean;
  showAlbum?: boolean;
  showArtist?: boolean;
}

export interface TrackListProps {
  tracks: SpotifyTrack[];
  onTrackSelect?: (track: SpotifyTrack) => void;
  onTrackRemove?: (track: SpotifyTrack) => void;
  virtualized?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  renderTrackActions?: (track: SpotifyTrack) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

// Hook return types
export interface UseSpotifySearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SpotifyTrack[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  isEmpty: boolean;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clear: () => void;
  retry: () => Promise<void>;
}

export interface UsePlaylistTracksReturn {
  tracks: SpotifyTrack[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseUserPlaylistsReturn {
  playlists: SpotifyPlaylist[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseDraggableReturn {
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (event: React.DragEvent) => void;
    onDragEnd: (event: React.DragEvent) => void;
  };
  dropZoneProps: {
    onDragOver: (event: React.DragEvent) => void;
    onDragEnter: (event: React.DragEvent) => void;
    onDragLeave: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  isDragging: boolean;
  draggedItem: DragItem | null;
  previewElement: HTMLElement | null;
}

export interface UseVirtualizationReturn {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (index: number) => void;
  scrollToOffset: (offset: number) => void;
}

// State management types
export interface AppState {
  auth: {
    accessToken: string | null;
    user: SpotifyUserProfile | null;
    isAuthenticated: boolean;
  };
  playlists: {
    userPlaylists: SpotifyPlaylist[];
    selectedPlaylists: PlaylistSelectionItem[];
    loading: boolean;
    error: string | null;
  };
  mixer: PlaylistMixerState;
  ui: {
    activeModal: string | null;
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    isMobile: boolean;
  };
}

export type AppAction =
  | { type: 'SET_ACCESS_TOKEN'; payload: string | null }
  | { type: 'SET_USER'; payload: SpotifyUserProfile | null }
  | { type: 'SET_USER_PLAYLISTS'; payload: SpotifyPlaylist[] }
  | { type: 'SET_SELECTED_PLAYLISTS'; payload: PlaylistSelectionItem[] }
  | { type: 'SET_MIX_OPTIONS'; payload: Partial<MixOptions> }
  | { type: 'SET_RATIO_CONFIG'; payload: RatioConfig }
  | { type: 'SET_MIX_RESULT'; payload: PlaylistMixResult | null }
  | {
      type: 'SET_LOADING';
      payload: { section: keyof AppState; loading: boolean };
    }
  | {
      type: 'SET_ERROR';
      payload: { section: keyof AppState; error: string | null };
    }
  | { type: 'SET_ACTIVE_MODAL'; payload: string | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_IS_MOBILE'; payload: boolean };

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Event handler types
export type TrackSelectHandler = (track: SpotifyTrack) => void;
export type TrackRemoveHandler = (track: SpotifyTrack) => void;
export type PlaylistSelectHandler = (playlist: SpotifyPlaylist) => void;
export type DragStartHandler = (item: DragItem) => void;
export type DragEndHandler = (
  item: DragItem,
  result: DropResult | null
) => void;
export type DropHandler = (item: DragItem, result: DropResult) => void;
