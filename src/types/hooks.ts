// Hook-specific type definitions

import { SpotifyTrack, SpotifyPlaylist, SpotifyUserProfile } from './spotify';

import {
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
  DragItem,
  DropResult,
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
  search: (query?: string) => Promise<void>;
  loadMore: () => void;
  clear: () => void;
  retry: () => void;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
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
  type?: string;
  data?: any;
  onDragStart?: (item: DragItem) => void;
  onDragEnd?: (item: DragItem, result: DropResult | null) => void;
  onDrop?: (item: DragItem, result: DropResult) => void;
  onDragOver?: (item: DragItem, position: any) => void;
  disabled?: boolean;
  longPressDelay?: number;
  scrollThreshold?: number;
  scrollContainer?: HTMLElement | null;
  preview?: HTMLElement | null;
}

export interface UseDraggableReturn {
  dragHandleProps: {
    draggable: boolean;
    onDragStart: (event: React.DragEvent<HTMLElement>) => void;
    onDragEnd: (event: React.DragEvent<HTMLElement>) => void;
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => void;
    onTouchMove: (event: React.TouchEvent<HTMLElement>) => void;
    onTouchEnd: (event: React.TouchEvent<HTMLElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    tabIndex: number;
    role: string;
    'aria-grabbed': boolean;
  };
  dropZoneProps: {
    onDragOver: (event: React.DragEvent<HTMLElement>) => void;
    onDrop: (event: React.DragEvent<HTMLElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
  };
  isDragging: boolean;
  draggedItem: DragItem | null;
  dropPosition: any;
  touchState: {
    isActive: boolean;
    startY: number;
    currentY: number;
    startX: number;
    currentX: number;
    longPressTimer: NodeJS.Timeout | null;
    isLongPress: boolean;
    element: HTMLElement | null;
  };
  keyboardState: {
    isActive: boolean;
    selectedIndex: number;
    isDragging: boolean;
  };
  startDrag: (item: any, dragType?: string) => void;
  endDrag: (reason?: 'success' | 'cancel') => void;
  checkAutoScroll: (clientY: number) => void;
  stopAutoScroll: () => void;
  provideHapticFeedback: (pattern: number | number[]) => void;
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
  visibleItems: any[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  offsetY: number;
  visibleCount: number;
  scrollTop: number;
  isScrolling: boolean;
  scrollToItem: (
    index: number,
    align?: 'start' | 'center' | 'end' | 'auto'
  ) => void;
  getItemPosition: (index: number) => { top: number; height: number };
  getItemProps: (index: number) => {
    style: {
      position: 'absolute';
      top: number;
      left: number;
      right: number;
      height: number;
    };
    'data-index': number;
  };
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
    onScroll: (event: React.UIEvent<HTMLElement>) => void;
    style: {
      height: number;
      overflowY: 'auto';
      overflowX: 'hidden';
      position: 'relative';
    };
  };
  spacerProps: {
    style: {
      height: number;
      position: 'relative';
    };
  };
}

// Keyboard navigation types
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';
export type NavigationOrientation = 'vertical' | 'horizontal';
export type AnnouncementPriority = 'polite' | 'assertive';

export interface UseKeyboardNavigationOptions<T = any> {
  items?: T[];
  onSelect?: (item: T, index: number) => void;
  onMove?: (item: T, fromIndex: number, toIndex: number) => void;
  onDrop?: (draggedItem: T, fromIndex: number, toIndex: number) => void;
  orientation?: NavigationOrientation;
  loop?: boolean;
  getItemId?: (item: T, index: number) => string;
  announceToScreenReader?: (
    message: string,
    priority?: AnnouncementPriority
  ) => void;
}

export interface UseKeyboardNavigationReturn<T = any> {
  // State
  focusedIndex: number;
  selectedIndex: number;
  isDragging: boolean;
  draggedItem: T | null;

  // Event handlers
  handleKeyDown: (event: React.KeyboardEvent) => void;

  // Navigation functions
  moveFocus: (newIndex: number, reason?: string) => void;
  handleSelect: (index?: number) => void;
  handleMove: (direction: NavigationDirection) => void;
  cancelDrag: () => void;

  // ARIA helpers
  getItemAriaProps: (index: number) => {
    'aria-selected': boolean;
    'aria-grabbed': boolean;
    'aria-describedby': string | undefined;
    tabIndex: number;
    role: string;
  };
  getContainerAriaProps: () => {
    role: string;
    'aria-multiselectable': boolean;
    'aria-activedescendant': string | undefined;
  };

  // Utility functions
  announce: (message: string, priority?: AnnouncementPriority) => void;
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

// API Error Handler hooks
export interface UseApiErrorHandlerOptions {
  onError?: (error: ApiError) => void;
  enableLogging?: boolean;
}

export interface ErrorInfo {
  title: string;
  message: string;
  suggestions: string[];
  retryable: boolean;
  type: string;
  timestamp: string;
}

export interface UseApiErrorHandlerReturn {
  // State
  error: ApiError | null;
  isRetrying: boolean;
  hasError: boolean;

  // Error information
  getErrorInfo: () => ErrorInfo | null;
  canRetry: () => boolean;
  getRetryDelay: (attemptNumber?: number) => number;

  // Actions
  clearError: () => void;
  handleError: (error: Error, context?: Record<string, any>) => ApiError;
  retry: <T>(retryFn?: () => Promise<T>) => Promise<T | void>;

  // API call wrappers
  wrapApiCall: <T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    context?: Record<string, any>
  ) => T;
  wrapApiCallWithRetry: <T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    context?: Record<string, any>
  ) => T;
  withRetry: <T>(
    apiCall: () => Promise<T>,
    context?: Record<string, any>
  ) => Promise<T>;

  // Direct access to error handler (for advanced use cases)
  errorHandler: any; // ApiErrorHandler type would need to be imported
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

// Mix generation hooks
export interface UseMixGenerationOptions {
  onError?: (error: string) => void;
  onSuccess?: (tracks: any[]) => void;
}

export interface UseMixGenerationState {
  loading: boolean;
  error: string | null;
  mixedTracks: any[];
  exhaustedPlaylists: string[];
  stoppedEarly: boolean;
}

export interface UseMixGenerationReturn {
  state: UseMixGenerationState;
  generateMix: (
    selectedPlaylists: SpotifyPlaylist[],
    ratioConfig: RatioConfig,
    mixOptions: MixOptions
  ) => Promise<any[]>;
  createPlaylist: (playlistName: string, tracks: any[]) => Promise<any>;
  reset: () => void;
}

// Mix preview hooks
export interface UseMixPreviewOptions {
  onError?: (error: string) => void;
}

export interface UseMixPreviewState {
  preview: any | null;
  loading: boolean;
  error: string | null;
  customTrackOrder: any[] | null;
}

export interface UseMixPreviewReturn {
  state: UseMixPreviewState;
  generatePreview: (
    selectedPlaylists: SpotifyPlaylist[],
    ratioConfig: RatioConfig,
    mixOptions: MixOptions
  ) => Promise<void>;
  updateTrackOrder: (reorderedTracks: any[]) => void;
  clearPreview: () => void;
  getPreviewTracks: () => any[];
}
