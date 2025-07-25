import { useReducer, useCallback } from 'react';

// Action types
const APP_ACTIONS = {
  SET_ACCESS_TOKEN: 'SET_ACCESS_TOKEN',
  SET_ERROR: 'SET_ERROR',
  DISMISS_ERROR: 'DISMISS_ERROR',
  ADD_MIXED_PLAYLIST: 'ADD_MIXED_PLAYLIST',
  DISMISS_SUCCESS_TOAST: 'DISMISS_SUCCESS_TOAST',
};

// Initial state
const initialAppState = {
  accessToken: null,
  error: null,
  mixedPlaylists: [],
};

// Reducer function
const appStateReducer = (state, action) => {
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
      const playlistWithId = {
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
export const useAppState = () => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  const setAccessToken = useCallback(token => {
    dispatch({ type: APP_ACTIONS.SET_ACCESS_TOKEN, payload: token });
  }, []);

  const setError = useCallback(error => {
    dispatch({ type: APP_ACTIONS.SET_ERROR, payload: error });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: APP_ACTIONS.DISMISS_ERROR });
  }, []);

  const addMixedPlaylist = useCallback(playlist => {
    dispatch({ type: APP_ACTIONS.ADD_MIXED_PLAYLIST, payload: playlist });
  }, []);

  const dismissSuccessToast = useCallback(toastId => {
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

export { APP_ACTIONS };
