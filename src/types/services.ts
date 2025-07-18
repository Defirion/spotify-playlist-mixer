// Service interface definitions for dependency injection and testing

import {
  User,
  AuthResult,
  Playlist,
  Track,
  MixConfig,
  MixResult,
  MixPreview,
  MixStrategy,
  AppError,
  AsyncResult,
} from './index';

// Authentication Service Interface
export interface IAuthService {
  login(): Promise<AuthResult>;
  logout(): Promise<void>;
  getToken(): string | null;
  isAuthenticated(): boolean;
  getCurrentUser(): User | null;
  refreshToken(): Promise<string>;
  onTokenExpired(callback: () => void): void;
  clearTokenExpiredCallbacks(): void;
}

// Spotify API Service Interface
export interface ISpotifyService {
  authenticate(): Promise<AuthResult>;
  getUserProfile(): Promise<User>;
  getUserPlaylists(limit?: number, offset?: number): Promise<Playlist[]>;
  getPlaylistTracks(playlistId: string): Promise<Track[]>;
  createPlaylist(name: string, description?: string): Promise<Playlist>;
  addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void>;
  searchTracks(query: string, limit?: number): Promise<Track[]>;
  getTrack(trackId: string): Promise<Track>;
  getMultipleTracks(trackIds: string[]): Promise<Track[]>;
}

// Playlist Mixer Service Interface
export interface IPlaylistMixerService {
  mixPlaylists(config: MixConfig): Promise<MixResult>;
  previewMix(config: MixConfig): Promise<MixPreview>;
  applyStrategy(tracks: Track[], strategy: MixStrategy): Track[];
  validateMixConfig(config: MixConfig): Promise<{ isValid: boolean; errors: string[] }>;
  calculateMixStatistics(tracks: Track[], config: MixConfig): Promise<any>;
}

// Error Service Interface
export interface IErrorService {
  logError(error: AppError): void;
  handleError(error: unknown): AppError;
  createError(type: AppError['type'], message: string, details?: any): AppError;
  isRetryableError(error: AppError): boolean;
  getErrorMessage(error: AppError): string;
}

// Storage Service Interface
export interface IStorageService {
  setItem(key: string, value: any): void;
  getItem<T>(key: string): T | null;
  removeItem(key: string): void;
  clear(): void;
  hasItem(key: string): boolean;
}

// Cache Service Interface
export interface ICacheService<T = any> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}

// Configuration Service Interface
export interface IConfigService {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  getEnvironment(): 'development' | 'production' | 'test';
  isProduction(): boolean;
  isDevelopment(): boolean;
}

// Analytics Service Interface (for future use)
export interface IAnalyticsService {
  track(event: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Record<string, any>): void;
  page(name: string, properties?: Record<string, any>): void;
}

// Service factory type for dependency injection
export interface ServiceContainer {
  authService: IAuthService;
  spotifyService: ISpotifyService;
  playlistMixerService: IPlaylistMixerService;
  errorService: IErrorService;
  storageService: IStorageService;
  cacheService: ICacheService;
  configService: IConfigService;
  analyticsService?: IAnalyticsService;
}

// Service initialization options
export interface ServiceOptions {
  apiBaseUrl?: string;
  clientId?: string;
  redirectUri?: string;
  scopes?: string[];
  enableAnalytics?: boolean;
  cacheSize?: number;
  cacheTtl?: number;
}