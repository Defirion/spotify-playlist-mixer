// Application constants and configuration values

// API Configuration
export const API_CONFIG = {
  SPOTIFY_BASE_URL: 'https://api.spotify.com/v1',
  SPOTIFY_ACCOUNTS_URL: 'https://accounts.spotify.com',
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 50,
  RATE_LIMIT_DELAY: 1000,
  REQUEST_TIMEOUT: 10000,
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: 'spotify_access_token',
  USER_STORAGE_KEY: 'spotify_user',
  REFRESH_TOKEN_KEY: 'spotify_refresh_token',
  TOKEN_EXPIRY_KEY: 'spotify_token_expiry',
  SCOPES: [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
  ],
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  USER_PLAYLISTS_TTL: 10 * 60 * 1000, // 10 minutes
  TRACK_DATA_TTL: 30 * 60 * 1000, // 30 minutes
  USER_PROFILE_TTL: 60 * 60 * 1000, // 1 hour
  MAX_CACHE_SIZE: 100,
} as const;

// UI Configuration
export const UI_CONFIG = {
  NOTIFICATION_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  MODAL_ANIMATION_DURATION: 150,
  TOAST_AUTO_DISMISS: 5000,
} as const;

// Mixer Configuration
export const MIXER_CONFIG = {
  MIN_TRACKS_PER_PLAYLIST: 1,
  MAX_TRACKS_PER_PLAYLIST: 10000,
  DEFAULT_MIX_SIZE: 100,
  MAX_MIX_SIZE: 10000,
  MIN_RATIO: 0.01,
  MAX_RATIO: 1.0,
  DEFAULT_STRATEGY: 'balanced' as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try logging in again.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Invalid authentication token.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  PLAYLIST_NOT_FOUND: 'Playlist not found.',
  TRACK_NOT_FOUND: 'Track not found.',
  INVALID_MIX_CONFIG: 'Invalid mix configuration.',
  MIX_GENERATION_FAILED: 'Failed to generate mix. Please try again.',
  SAVE_PLAYLIST_FAILED: 'Failed to save playlist. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PLAYLIST_SAVED: 'Playlist saved successfully!',
  MIX_GENERATED: 'Mix generated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// Loading Messages
export const LOADING_MESSAGES = {
  AUTHENTICATING: 'Authenticating...',
  LOADING_PLAYLISTS: 'Loading playlists...',
  LOADING_TRACKS: 'Loading tracks...',
  GENERATING_MIX: 'Generating mix...',
  SAVING_PLAYLIST: 'Saving playlist...',
  PROCESSING: 'Processing...',
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PLAYLIST_NAME_MIN_LENGTH: 1,
  PLAYLIST_NAME_MAX_LENGTH: 100,
  PLAYLIST_DESCRIPTION_MAX_LENGTH: 300,
  MIN_SELECTED_PLAYLISTS: 2,
  MAX_SELECTED_PLAYLISTS: 10,
  MIN_TOTAL_RATIO: 0.99,
  MAX_TOTAL_RATIO: 1.01,
} as const;

// Feature Flags (for future use)
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: false,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ADVANCED_MIXING: true,
  ENABLE_PLAYLIST_PREVIEW: true,
  ENABLE_DRAG_AND_DROP: true,
  ENABLE_KEYBOARD_SHORTCUTS: true,
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  DEFAULT_THEME: 'light' as const,
  STORAGE_KEY: 'app_theme',
  THEMES: ['light', 'dark'] as const,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: AUTH_CONFIG.TOKEN_STORAGE_KEY,
  USER_DATA: AUTH_CONFIG.USER_STORAGE_KEY,
  REFRESH_TOKEN: AUTH_CONFIG.REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY: AUTH_CONFIG.TOKEN_EXPIRY_KEY,
  THEME: THEME_CONFIG.STORAGE_KEY,
  USER_PREFERENCES: 'user_preferences',
  MIX_HISTORY: 'mix_history',
  SELECTED_PLAYLISTS: 'selected_playlists',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Event Names for Analytics
export const ANALYTICS_EVENTS = {
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PLAYLIST_SELECTED: 'playlist_selected',
  PLAYLIST_DESELECTED: 'playlist_deselected',
  MIX_GENERATED: 'mix_generated',
  MIX_SAVED: 'mix_saved',
  ERROR_OCCURRED: 'error_occurred',
  PAGE_VIEW: 'page_view',
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  GENERATE_MIX: 'ctrl+enter',
  SAVE_PLAYLIST: 'ctrl+s',
  CLEAR_SELECTION: 'ctrl+shift+c',
  TOGGLE_THEME: 'ctrl+shift+t',
  OPEN_SEARCH: 'ctrl+k',
  CLOSE_MODAL: 'escape',
} as const;

// Regular Expressions
export const REGEX_PATTERNS = {
  SPOTIFY_TRACK_URI: /^spotify:track:[a-zA-Z0-9]{22}$/,
  SPOTIFY_PLAYLIST_URI: /^spotify:playlist:[a-zA-Z0-9]{22}$/,
  SPOTIFY_USER_URI: /^spotify:user:[a-zA-Z0-9_.-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
} as const;

// File Size Limits
export const FILE_LIMITS = {
  MAX_CACHE_SIZE_MB: 50,
  MAX_LOG_FILE_SIZE_MB: 10,
  MAX_EXPORT_SIZE_MB: 100,
} as const;