// Component-specific type definitions

import React from 'react';
import { SpotifyTrack, SpotifyPlaylist } from './spotify';

import { TrackSelectHandler, TrackRemoveHandler } from './mixer';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
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
  dragging?: boolean;
}

// TrackItem component types
export interface TrackItemProps extends BaseComponentProps {
  track: SpotifyTrack;
  onSelect?: TrackSelectHandler;
  onRemove?: TrackRemoveHandler;
  selected?: boolean;
  actions?: React.ReactNode;
  showDuration?: boolean;
  showAlbum?: boolean;
  showArtist?: boolean;
  showIndex?: boolean;
  index?: number;
  compact?: boolean;
  showCheckbox?: boolean;
  showAlbumArt?: boolean;
  showSourcePlaylist?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>, track: SpotifyTrack) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
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

// SuccessToast specific types
export interface MixedPlaylistToast {
  toastId: string;
  name: string;
  items?: {
    total?: number;
    length?: number;
  };
  /** @deprecated Spotify renamed this field to `items`. */
  tracks?: {
    total?: number;
    length?: number;
  };
  duration?: number;
  createdAt: Date;
  external_urls?: {
    spotify?: string;
  };
}

export interface SuccessToastProps extends BaseComponentProps {
  mixedPlaylists: MixedPlaylistToast[] | null;
  onDismiss: (toastId: string) => void;
}

export interface PresetTemplatesProps extends BaseComponentProps {
  selectedPlaylists: SpotifyPlaylist[];
  onApplyPreset: (data: import('./mixer').PresetApplyData) => void;
  mixOptions?: import('./mixer').MixOptions;
  ratioConfig?: import('./mixer').RatioConfig;
}

// Authentication component types
export interface SpotifyAuthProps extends BaseComponentProps {
  onAuth?: (accessToken: string) => void;
  onError?: (error: Error) => void;
  redirectUri?: string;
  scopes?: string[];
  clientId?: string;
}
