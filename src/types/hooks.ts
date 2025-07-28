// Hook-specific type definitions

import { SpotifyTrack, SpotifyPlaylist, SpotifyUserProfile } from './spotify';

import {
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
  DragItem,
  DropResult,
  VirtualItem,
  VirtualRange,
  VirtualizationOptions,
  SearchOptions,
  SearchResult,
  SearchState,
  PlaylistSelectionItem,
} from './mixer';

import {
  ApiError,
  GetPlaylistTracksOptions,
  GetUserPlaylistsOptions,
  SearchTracksOptions,
} from './api';

// Base hook return types
export interface AsyncHookState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncHookActions {
  retry: () => Promise<void>;
  reset: () => void;
}

export interface AsyncHookReturn<T>
  extends AsyncHookState<T>,
    AsyncHookActions {}

// Authentication hooks
export interface UseAuthReturn {
  accessToken: string | null;
  user: SpotifyUserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// API hooks
export interface UseSpotifySearchOptions extends SearchTracksOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  enabled?: boolean;
}

export interface UseSpotifySearchReturn extends SearchState<SpotifyTrack> {
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clear: () => void;
  retry: () => Promise<void>;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
}

export interface UsePlaylistTracksOptions extends GetPlaylistTracksOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export interface UsePlaylistTracksReturn {
  tracks: SpotifyTrack[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export interface UseUserPlaylistsOptions extends GetUserPlaylistsOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export interface UseUserPlaylistsReturn {
  playlists: SpotifyPlaylist[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

// State management hooks
export interface UseMixOptionsReturn {
  mixOptions: MixOptions;
  setMixOptions: (options: Partial<MixOptions>) => void;
  resetMixOptions: () => void;
  isValid: boolean;
  validationErrors: string[];
}

export interface UseRatioConfigReturn {
  ratioConfig: RatioConfig;
  setRatioConfig: (config: RatioConfig) => void;
  updatePlaylistRatio: (
    playlistId: string,
    ratio: Partial<RatioConfig[string]>
  ) => void;
  removePlaylistRatio: (playlistId: string) => void;
  resetRatioConfig: () => void;
  getTotalWeight: () => number;
  isValid: boolean;
  validationErrors: string[];
}

export interface UsePlaylistSelectionReturn {
  selectedPlaylists: PlaylistSelectionItem[];
  selectPlaylist: (playlist: SpotifyPlaylist) => void;
  deselectPlaylist: (playlistId: string) => void;
  togglePlaylist: (playlist: SpotifyPlaylist) => void;
  clearSelection: () => void;
  isSelected: (playlistId: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
}

export interface UseAppStateReturn {
  state: {
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
    mixer: {
      mixOptions: MixOptions;
      ratioConfig: RatioConfig;
      mixResult: PlaylistMixResult | null;
      isLoading: boolean;
      error: string | null;
    };
    ui: {
      activeModal: string | null;
      sidebarOpen: boolean;
      theme: 'light' | 'dark';
      isMobile: boolean;
    };
  };
  actions: {
    setAccessToken: (token: string | null) => void;
    setUser: (user: SpotifyUserProfile | null) => void;
    setUserPlaylists: (playlists: SpotifyPlaylist[]) => void;
    setSelectedPlaylists: (playlists: PlaylistSelectionItem[]) => void;
    setMixOptions: (options: Partial<MixOptions>) => void;
    setRatioConfig: (config: RatioConfig) => void;
    setMixResult: (result: PlaylistMixResult | null) => void;
    setActiveModal: (modal: string | null) => void;
    toggleSidebar: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setIsMobile: (isMobile: boolean) => void;
  };
}

// UI hooks
export interface UseDraggableOptions {
  type: string;
  data: any;
  onDragStart?: (item: DragItem) => void;
  onDragEnd?: (item: DragItem, result: DropResult | null) => void;
  disabled?: boolean;
  preview?: HTMLElement | null;
}

export interface UseDraggableReturn {
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (event: React.DragEvent) => void;
    onDragEnd: (event: React.DragEvent) => void;
  };
  isDragging: boolean;
  draggedItem: DragItem | null;
  previewElement: HTMLElement | null;
}

export interface UseDroppableOptions {
  acceptTypes: string[];
  onDrop?: (item: DragItem, result: DropResult) => void;
  onDragOver?: (item: DragItem) => void;
  onDragEnter?: (item: DragItem) => void;
  onDragLeave?: (item: DragItem) => void;
  disabled?: boolean;
}

export interface UseDroppableReturn {
  dropZoneProps: {
    onDragOver: (event: React.DragEvent) => void;
    onDragEnter: (event: React.DragEvent) => void;
    onDragLeave: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  isOver: boolean;
  canDrop: boolean;
  draggedItem: DragItem | null;
}

export interface UseVirtualizationReturn {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (
    index: number,
    alignment?: 'start' | 'center' | 'end' | 'auto'
  ) => void;
  scrollToOffset: (offset: number) => void;
  measureItem: (index: number, size: number) => void;
}

export interface UseKeyboardNavigationOptions {
  items: any[];
  onSelect?: (item: any, index: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
  orientation?: 'horizontal' | 'vertical';
  wrap?: boolean;
  disabled?: boolean;
}

export interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  keyboardProps: {
    onKeyDown: (event: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-activedescendant'?: string;
  };
  getItemProps: (index: number) => {
    id: string;
    role: string;
    'aria-selected': boolean;
    tabIndex: number;
  };
}

// Utility hooks
export interface UseDebounceOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface UseDebounceReturn<T extends (...args: any[]) => any> {
  debouncedCallback: T;
  cancel: () => void;
  flush: () => void;
  pending: boolean;
}

export interface UseThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface UseThrottleReturn<T extends (...args: any[]) => any> {
  throttledCallback: T;
  cancel: () => void;
  flush: () => void;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export interface UseSessionStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export interface UseMediaQueryReturn {
  matches: boolean;
}

export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export interface UseClickOutsideReturn {
  ref: React.RefObject<Element>;
}

export interface UseFocusTrapReturn {
  ref: React.RefObject<Element>;
  activate: () => void;
  deactivate: () => void;
  active: boolean;
}

export interface UseErrorHandlerOptions {
  onError?: (error: Error, errorInfo?: any) => void;
  fallback?: any;
  resetOnPropsChange?: boolean;
  resetKeys?: any[];
}

export interface UseErrorHandlerReturn {
  error: Error | null;
  hasError: boolean;
  resetError: () => void;
  captureError: (error: Error, errorInfo?: any) => void;
}

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  deps?: React.DependencyList;
}

export interface UseAsyncReturn<T, P extends any[] = []> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: P) => Promise<T>;
  reset: () => void;
}

export interface UsePreviousReturn<T> {
  previous: T | undefined;
}

export interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
}

export interface UseCounterReturn {
  count: number;
  increment: (step?: number) => void;
  decrement: (step?: number) => void;
  reset: (value?: number) => void;
  set: (value: number) => void;
}

export interface UseArrayReturn<T> {
  array: T[];
  set: (array: T[]) => void;
  push: (item: T) => void;
  pop: () => T | undefined;
  shift: () => T | undefined;
  unshift: (item: T) => void;
  insert: (index: number, item: T) => void;
  remove: (index: number) => void;
  clear: () => void;
  move: (fromIndex: number, toIndex: number) => void;
  filter: (predicate: (item: T, index: number) => boolean) => void;
  sort: (compareFn?: (a: T, b: T) => number) => void;
}

// Performance hooks
export interface UseVirtualScrollOptions {
  itemCount: number;
  itemSize: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollingDelay?: number;
  getScrollElement?: () => Element | null;
}

export interface UseVirtualScrollReturn {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
    end: number;
  }>;
  totalSize: number;
  isScrolling: boolean;
  scrollToItem: (
    index: number,
    align?: 'start' | 'center' | 'end' | 'auto'
  ) => void;
  scrollToOffset: (offset: number) => void;
  measureItem: (index: number, size: number) => void;
}

export interface UseMemoizedCallbackReturn<T extends (...args: any[]) => any> {
  callback: T;
  memoizedCallback: T;
}

export interface UseRenderCountReturn {
  renderCount: number;
  reset: () => void;
}
