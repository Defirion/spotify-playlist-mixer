import { useReducer, useCallback } from 'react';
import { SpotifyPlaylist } from '../types/spotify';

// Action types
export const APP_ACTIONS = {
  SET_ACCESS_TOKEN: 'SET_ACCESS_TOKEN',
  SET_ERROR: 'SET_ERROR',
  DISMISS_ERROR: 'DISMISS_ERROR',
  ADD_MIXED_PLAYLIST: 'ADD_MIXED_PLAYLIST',
  DISMISS_SUCCESS_TOAST: 'DISMISS_SUCCESS_TOAST',
} as const;

// Type definitions
export type AppActionType = (typeof APP_ACTIONS)[keyof typeof APP_ACTIONS];

export interface MixedPlaylistToast extends SpotifyPlaylist {
  toastId: number;
  createdAt: Date;
}

export interface AppState {
  accessToken: string | null;
  error: string | null;
  mixedPlaylists: MixedPlaylistToast[];
}

export type AppAction =
  | { type: typeof APP_ACTIONS.SET_ACCESS_TOKEN; payload: string | null }
  | { type: typeof APP_ACTIONS.SET_ERROR; payload: string | null }
  | { type: typeof APP_ACTIONS.DISMISS_ERROR }
  | { type: typeof APP_ACTIONS.ADD_MIXED_PLAYLIST; payload: SpotifyPlaylist }
  | { type: typeof APP_ACTIONS.DISMISS_SUCCESS_TOAST; payload: number };

export interface UseAppStateReturn {
  // State
  accessToken: string | null;
  error: string | null;
  mixedPlaylists: MixedPlaylistToast[];

  // Actions
  setAccessToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  dismissError: () => void;
  addMixedPlaylist: (playlist: SpotifyPlaylist) => void;
  dismissSuccessToast: (toastId: number) => void;
}

// Initial state
const initialAppState: AppState = {
  accessToken: null,
  error: null,
  mixedPlaylists: [],
};

// Reducer function
const appStateReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case APP_ACTIONS.SET_ACCESS_TOKEN:
      return {
        ...state,
        accessToken: action.payload,
      };

    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case APP_ACTIONS.DISMISS_ERROR:
      return {
        ...state,
        error: null,
      };

    case APP_ACTIONS.ADD_MIXED_PLAYLIST:
      const playlistWithId: MixedPlaylistToast = {
        ...action.payload,
        toastId: Date.now() + Math.random(),
        createdAt: new Date(),
      };
      return {
        ...state,
        mixedPlaylists: [playlistWithId, ...state.mixedPlaylists],
      };

    case APP_ACTIONS.DISMISS_SUCCESS_TOAST:
      return {
        ...state,
        mixedPlaylists: state.mixedPlaylists.filter(
          playlist => playlist.toastId !== action.payload
        ),
      };

    default:
      return state;
  }
};

/**
 * Custom hook for managing main application state using useReducer
 * Centralizes state management for authentication, errors, and mixed playlists
 */
export const useAppState = (): UseAppStateReturn => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  const setAccessToken = useCallback((token: string | null) => {
    dispatch({ type: APP_ACTIONS.SET_ACCESS_TOKEN, payload: token });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: APP_ACTIONS.SET_ERROR, payload: error });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: APP_ACTIONS.DISMISS_ERROR });
  }, []);

  const addMixedPlaylist = useCallback((playlist: SpotifyPlaylist) => {
    dispatch({ type: APP_ACTIONS.ADD_MIXED_PLAYLIST, payload: playlist });
  }, []);

  const dismissSuccessToast = useCallback((toastId: number) => {
    dispatch({ type: APP_ACTIONS.DISMISS_SUCCESS_TOAST, payload: toastId });
  }, []);

  return {
    // State
    accessToken: state.accessToken,
    error: state.error,
    mixedPlaylists: state.mixedPlaylists,

    // Actions
    setAccessToken,
    setError,
    dismissError,
    addMixedPlaylist,
    dismissSuccessToast,
  };
};
