// API service type definitions

import {
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyUserProfile,
  SpotifySearchResponse,
  SpotifyPlaylistTracksResponse,
  SpotifyUserPlaylistsResponse,
  SpotifyCreatePlaylistRequest,
  SpotifyCreatePlaylistResponse,
  SpotifyAddTracksRequest,
  SpotifyAddTracksResponse,
  SpotifyRemoveTracksRequest,
  SpotifyRemoveTracksResponse,
  SpotifyAudioFeatures,
  SpotifyApiError,
} from './spotify';

import { SearchOptions, SearchResult } from './mixer';

// Service method options
export interface GetPlaylistTracksOptions {
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

export interface GetUserPlaylistsOptions {
  limit?: number;
  offset?: number;
  all?: boolean;
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

export interface SpotifyServiceUserPlaylistsResult {
  playlists: SpotifyPlaylist[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// API Error handling types
export type ApiErrorType =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  retryAfter?: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export interface ApiErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryOn?: ApiErrorType[];
  onRetry?: (error: ApiError, attempt: number) => void;
  onMaxRetriesReached?: (error: ApiError) => void;
}

// Service interface
export interface ISpotifyService {
  // Authentication
  setAccessToken(token: string): void;
  getAccessToken(): string | null;

  // User methods
  getUserProfile(): Promise<SpotifyUserProfile>;
  getUserPlaylists(
    options?: GetUserPlaylistsOptions
  ): Promise<SpotifyServiceUserPlaylistsResult>;

  // Playlist methods
  getPlaylistTracks(
    playlistId: string,
    options?: GetPlaylistTracksOptions
  ): Promise<SpotifyServicePlaylistTracksResult>;
  createPlaylist(
    userId: string,
    playlistData: SpotifyCreatePlaylistRequest
  ): Promise<SpotifyCreatePlaylistResponse>;
  addTracksToPlaylist(
    playlistId: string,
    request: SpotifyAddTracksRequest
  ): Promise<SpotifyAddTracksResponse>;
  removeTracksFromPlaylist(
    playlistId: string,
    request: SpotifyRemoveTracksRequest
  ): Promise<SpotifyRemoveTracksResponse>;

  // Search methods
  searchTracks(
    query: string,
    options?: SearchTracksOptions
  ): Promise<SpotifyServiceSearchResult>;

  // Track methods
  getTrackAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures>;
  getMultipleTrackAudioFeatures(
    trackIds: string[]
  ): Promise<SpotifyAudioFeatures[]>;
}

// HTTP client types
export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryCondition?: (error: any) => boolean;
  };
}

export interface HttpClientRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
}

export interface HttpClientResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface IHttpClient {
  request<T = any>(config: HttpClientRequest): Promise<HttpClientResponse<T>>;
  get<T = any>(
    url: string,
    params?: Record<string, any>
  ): Promise<HttpClientResponse<T>>;
  post<T = any>(url: string, data?: any): Promise<HttpClientResponse<T>>;
  put<T = any>(url: string, data?: any): Promise<HttpClientResponse<T>>;
  delete<T = any>(url: string): Promise<HttpClientResponse<T>>;
  patch<T = any>(url: string, data?: any): Promise<HttpClientResponse<T>>;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
  onEvict?: (key: string, value: any) => void;
}

export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}

// Request queue types for rate limiting
export interface QueuedRequest {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority?: number;
  timestamp: number;
}

export interface RequestQueueOptions {
  maxConcurrent?: number;
  requestsPerSecond?: number;
  priorityLevels?: number;
}

export interface IRequestQueue {
  add<T>(request: () => Promise<T>, priority?: number): Promise<T>;
  pause(): void;
  resume(): void;
  clear(): void;
  size(): number;
  isPaused(): boolean;
}

// Batch processing types
export interface BatchRequest<T, R> {
  items: T[];
  processor: (items: T[]) => Promise<R[]>;
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  onBatchComplete?: (batch: T[], results: R[]) => void;
}

export interface BatchResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalProcessed: number;
  totalErrors: number;
}

// Pagination helpers
export interface PaginationState {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedRequest<T> {
  fetcher: (
    offset: number,
    limit: number
  ) => Promise<{ items: T[]; total: number }>;
  initialLimit?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationState;
  loadMore: () => Promise<void>;
  reset: () => void;
  isLoading: boolean;
  error: Error | null;
}
