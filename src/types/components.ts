// Component-specific type definitions

import React from 'react';
import { SpotifyTrack, SpotifyPlaylist, SpotifyUserProfile } from './spotify';

import {
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
  DragItem,
  DropResult,
  VirtualizationOptions,
  TrackSelectHandler,
  TrackRemoveHandler,
  PlaylistSelectHandler,
  DragStartHandler,
  DragEndHandler,
  DropHandler,
} from './mixer';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// Button component types
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// Modal component types
export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  maxHeight?: string;
  style?: React.CSSProperties;
  backdropStyle?: React.CSSProperties;
}

// TrackItem component types
export interface TrackItemProps extends BaseComponentProps {
  track: SpotifyTrack;
  onSelect?: TrackSelectHandler;
  onRemove?: TrackRemoveHandler;
  draggable?: boolean;
  selected?: boolean;
  actions?: React.ReactNode;
  showPopularity?: boolean;
  showDuration?: boolean;
  showAlbum?: boolean;
  showArtist?: boolean;
  showIndex?: boolean;
  index?: number;
  compact?: boolean;
  showCheckbox?: boolean;
  showDragHandle?: boolean;
  showAlbumArt?: boolean;
  showSourcePlaylist?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>, track: SpotifyTrack) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
}

// TrackList component types
export interface TrackListProps extends BaseComponentProps {
  tracks: SpotifyTrack[];
  onTrackSelect?: TrackSelectHandler;
  onTrackRemove?: TrackRemoveHandler;
  onTrackReorder?: (fromIndex: number, toIndex: number) => void;
  virtualized?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  selectedTracks?: Set<string>;
  renderTrackActions?: (track: SpotifyTrack, index: number) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  showHeader?: boolean;
  sortable?: boolean;
  sortBy?: 'name' | 'artist' | 'album' | 'duration' | 'popularity';
  sortDirection?: 'asc' | 'desc';
  onSort?: (sortBy: string, direction: 'asc' | 'desc') => void;
  virtualizationOptions?: Partial<VirtualizationOptions>;
  style?: React.CSSProperties;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  showCheckbox?: boolean;
  showDragHandle?: boolean;
  showPopularity?: boolean;
  showDuration?: boolean;
  showAlbumArt?: boolean;
  showSourcePlaylist?: boolean;
  onTrackClick?: (
    e: React.MouseEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackMouseEnter?: (
    e: React.MouseEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackMouseLeave?: (
    e: React.MouseEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackMouseDown?: (
    e: React.MouseEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackMouseUp?: (
    e: React.MouseEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackDragStart?: (
    e: React.DragEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackDragEnd?: (
    e: React.DragEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackTouchStart?: (
    e: React.TouchEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackTouchMove?: (
    e: React.TouchEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
  onTrackTouchEnd?: (
    e: React.TouchEvent<HTMLDivElement>,
    track: SpotifyTrack,
    index: number
  ) => void;
}

// PlaylistItem component types
export interface PlaylistItemProps extends BaseComponentProps {
  playlist: SpotifyPlaylist;
  onSelect?: PlaylistSelectHandler;
  selected?: boolean;
  showTrackCount?: boolean;
  showOwner?: boolean;
  showDescription?: boolean;
  actions?: React.ReactNode;
  compact?: boolean;
}

// PlaylistList component types
export interface PlaylistListProps extends BaseComponentProps {
  playlists: SpotifyPlaylist[];
  onPlaylistSelect?: PlaylistSelectHandler;
  selectedPlaylists?: Set<string>;
  multiSelect?: boolean;
  renderPlaylistActions?: (playlist: SpotifyPlaylist) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  virtualized?: boolean;
}

// SearchInput component types
export interface SearchInputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  debounceMs?: number;
  clearable?: boolean;
  autoFocus?: boolean;
  icon?: React.ReactNode;
}

// ErrorHandler component types
export interface ErrorDetails {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
}

export interface ErrorHandlerProps extends BaseComponentProps {
  error: Error | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

// ErrorBoundary component types
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
  hasError: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Loading component types
export type LoadingSize = 'small' | 'medium' | 'large';
export type LoadingVariant = 'spinner' | 'dots' | 'bars' | 'pulse';

export interface LoadingProps extends BaseComponentProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  text?: string;
  overlay?: boolean;
  color?: string;
}

// Toast/Notification component types
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  }>;
}

export interface ToastContextValue {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Form component types
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
}

export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

export interface SelectProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
}

export interface CheckboxProps extends FormFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}

export interface RadioProps extends FormFieldProps {
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  name: string;
}

// Drag and Drop component types
export interface DraggableProps extends BaseComponentProps {
  dragId: string;
  dragType: string;
  dragData: any;
  onDragStart?: DragStartHandler;
  onDragEnd?: DragEndHandler;
  disabled?: boolean;
  preview?: React.ReactNode;
}

export interface DroppableProps extends BaseComponentProps {
  dropId: string;
  acceptTypes: string[];
  onDrop?: DropHandler;
  onDragOver?: (item: DragItem) => void;
  onDragEnter?: (item: DragItem) => void;
  onDragLeave?: (item: DragItem) => void;
  disabled?: boolean;
}

export interface DragPreviewProps {
  item: DragItem;
  style?: React.CSSProperties;
}

// Virtualization component types
export interface VirtualListProps<T> extends BaseComponentProps {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
}

// Layout component types
export interface HeaderProps extends BaseComponentProps {
  user?: SpotifyUserProfile | null;
  onLogin?: () => void;
  onLogout?: () => void;
  showUserMenu?: boolean;
}

export interface SidebarProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: SpotifyPlaylist[];
  selectedPlaylists: Set<string>;
  onPlaylistToggle: (playlistId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export interface MainLayoutProps extends BaseComponentProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

// Feature component types
export interface PlaylistMixerProps extends BaseComponentProps {
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
  onMixedPlaylist?: (result: PlaylistMixResult) => void;
  onError?: (error: Error) => void;
}

export interface MixOptionsFormProps extends BaseComponentProps {
  options: MixOptions;
  onChange: (options: Partial<MixOptions>) => void;
  disabled?: boolean;
}

export interface RatioConfigFormProps extends BaseComponentProps {
  playlists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  onChange: (config: RatioConfig) => void;
  disabled?: boolean;
}

export interface SpotifySearchModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSelect: TrackSelectHandler;
  accessToken: string;
  excludeTrackIds?: Set<string>;
  multiSelect?: boolean;
}

export interface AddUnselectedModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  unselectedTracks: SpotifyTrack[];
  onTracksAdd: (tracks: SpotifyTrack[]) => void;
  loading?: boolean;
}

export interface PresetTemplatesProps extends BaseComponentProps {
  selectedPlaylists: SpotifyPlaylist[];
  onApplyPreset: (data: import('./mixer').PresetApplyData) => void;
}

// Context types
export interface AuthContextValue {
  accessToken: string | null;
  user: SpotifyUserProfile | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export interface PlaylistContextValue {
  userPlaylists: SpotifyPlaylist[];
  selectedPlaylists: SpotifyPlaylist[];
  loading: boolean;
  error: string | null;
  loadUserPlaylists: () => Promise<void>;
  selectPlaylist: (playlist: SpotifyPlaylist) => void;
  deselectPlaylist: (playlistId: string) => void;
  clearSelection: () => void;
}

export interface DragContextValue {
  dragState: {
    isDragging: boolean;
    draggedItem: DragItem | null;
    dropTargets: string[];
  };
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  registerDropTarget: (id: string) => void;
  unregisterDropTarget: (id: string) => void;
}

// Event types
export interface TrackEvent {
  track: SpotifyTrack;
  index?: number;
  source?: string;
}

export interface PlaylistEvent {
  playlist: SpotifyPlaylist;
  source?: string;
}

export interface DragEvent {
  item: DragItem;
  result?: DropResult;
  source?: string;
  target?: string;
}

export interface SearchEvent {
  query: string;
  results: SpotifyTrack[];
  total: number;
  source?: string;
}

// Utility component types
export interface ConditionalWrapperProps {
  condition: boolean;
  wrapper: (children: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}

export interface PortalProps {
  children: React.ReactNode;
  container?: Element | null;
}

export interface FocusTrapProps extends BaseComponentProps {
  active: boolean;
  focusFirstOnMount?: boolean;
  returnFocusOnDeactivate?: boolean;
}

// Animation/Transition types
export type TransitionState = 'entering' | 'entered' | 'exiting' | 'exited';

export interface TransitionProps {
  in: boolean;
  timeout: number;
  onEnter?: () => void;
  onEntering?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExiting?: () => void;
  onExited?: () => void;
  children: (state: TransitionState) => React.ReactNode;
}
