import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect, useRef } from 'react';
import { PlaylistState, Playlist, Track, SelectedPlaylist, PlaylistRatioConfig } from '../types';
import { ISpotifyService } from '../types/services';

// Playlist Actions
export type PlaylistAction =
  | { type: 'FETCH_PLAYLISTS_START' }
  | { type: 'FETCH_PLAYLISTS_SUCCESS'; payload: { playlists: Playlist[] } }
  | { type: 'FETCH_PLAYLISTS_FAILURE'; payload: { error: string } }
  | { type: 'FETCH_TRACKS_START'; payload: { playlistId: string } }
  | { type: 'FETCH_TRACKS_SUCCESS'; payload: { playlistId: string; tracks: Track[] } }
  | { type: 'FETCH_TRACKS_FAILURE'; payload: { playlistId: string; error: string } }
  | { type: 'SELECT_PLAYLIST'; payload: { playlist: Playlist; tracks: Track[]; config: PlaylistRatioConfig } }
  | { type: 'DESELECT_PLAYLIST'; payload: { playlistId: string } }
  | { type: 'UPDATE_PLAYLIST_CONFIG'; payload: { playlistId: string; config: PlaylistRatioConfig } }
  | { type: 'CLEAR_SELECTED_PLAYLISTS' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Playlist Context Interface
interface PlaylistContextType {
  state: PlaylistState;
  fetchUserPlaylists: () => Promise<void>;
  fetchPlaylistTracks: (playlistId: string) => Promise<Track[]>;
  selectPlaylist: (playlist: Playlist, config?: PlaylistRatioConfig) => Promise<void>;
  deselectPlaylist: (playlistId: string) => void;
  updatePlaylistConfig: (playlistId: string, config: PlaylistRatioConfig) => void;
  clearSelectedPlaylists: () => void;
  clearError: () => void;
  resetState: () => void;
  isPlaylistSelected: (playlistId: string) => boolean;
  getSelectedPlaylist: (playlistId: string) => SelectedPlaylist | undefined;
}

// Initial state
const initialState: PlaylistState = {
  userPlaylists: [],
  selectedPlaylists: [],
  isLoading: false,
  error: null,
};

// Playlist reducer
function playlistReducer(state: PlaylistState, action: PlaylistAction): PlaylistState {
  switch (action.type) {
    case 'FETCH_PLAYLISTS_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    
    case 'FETCH_PLAYLISTS_SUCCESS':
      return {
        ...state,
        userPlaylists: action.payload.playlists,
        isLoading: false,
        error: null,
      };
    
    case 'FETCH_PLAYLISTS_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };
    
    case 'FETCH_TRACKS_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    
    case 'FETCH_TRACKS_SUCCESS':
      // Update the playlist in userPlaylists with tracks
      return {
        ...state,
        userPlaylists: state.userPlaylists.map(playlist =>
          playlist.id === action.payload.playlistId
            ? { ...playlist, tracks: action.payload.tracks }
            : playlist
        ),
        isLoading: false,
        error: null,
      };
    
    case 'FETCH_TRACKS_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };
    
    case 'SELECT_PLAYLIST':
      // Check if playlist is already selected
      const existingIndex = state.selectedPlaylists.findIndex(
        sp => sp.playlist.id === action.payload.playlist.id
      );
      
      if (existingIndex >= 0) {
        // Update existing selection
        return {
          ...state,
          selectedPlaylists: state.selectedPlaylists.map((sp, index) =>
            index === existingIndex
              ? {
                  playlist: action.payload.playlist,
                  tracks: action.payload.tracks,
                  config: action.payload.config
                }
              : sp
          ),
        };
      } else {
        // Add new selection
        return {
          ...state,
          selectedPlaylists: [
            ...state.selectedPlaylists,
            {
              playlist: action.payload.playlist,
              tracks: action.payload.tracks,
              config: action.payload.config
            }
          ],
        };
      }
    
    case 'DESELECT_PLAYLIST':
      return {
        ...state,
        selectedPlaylists: state.selectedPlaylists.filter(
          sp => sp.playlist.id !== action.payload.playlistId
        ),
      };
    
    case 'UPDATE_PLAYLIST_CONFIG':
      return {
        ...state,
        selectedPlaylists: state.selectedPlaylists.map(sp =>
          sp.playlist.id === action.payload.playlistId
            ? { ...sp, config: action.payload.config }
            : sp
        ),
      };
    
    case 'CLEAR_SELECTED_PLAYLISTS':
      return {
        ...state,
        selectedPlaylists: [],
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

// Playlist Provider Props
interface PlaylistProviderProps {
  children: ReactNode;
  spotifyService: ISpotifyService;
}

// Playlist Provider Component
export function PlaylistProvider({ children, spotifyService }: PlaylistProviderProps) {
  const [state, dispatch] = useReducer(playlistReducer, initialState);
  const prefetchQueueRef = useRef<Set<string>>(new Set());
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserPlaylists = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'FETCH_PLAYLISTS_START' });
      
      // Fetch all playlists with pagination
      const allPlaylists: Playlist[] = [];
      let offset = 0;
      const limit = 50;
      
      while (true) {
        const playlists = await spotifyService.getUserPlaylists(limit, offset);
        allPlaylists.push(...playlists);
        
        if (playlists.length < limit) {
          break;
        }
        
        offset += limit;
      }
      
      dispatch({
        type: 'FETCH_PLAYLISTS_SUCCESS',
        payload: { playlists: allPlaylists }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch playlists';
      dispatch({
        type: 'FETCH_PLAYLISTS_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [spotifyService]);

  const fetchPlaylistTracks = useCallback(async (playlistId: string): Promise<Track[]> => {
    try {
      dispatch({ type: 'FETCH_TRACKS_START', payload: { playlistId } });
      
      const tracks = await spotifyService.getPlaylistTracks(playlistId);
      
      dispatch({
        type: 'FETCH_TRACKS_SUCCESS',
        payload: { playlistId, tracks }
      });
      
      return tracks;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch playlist tracks';
      dispatch({
        type: 'FETCH_TRACKS_FAILURE',
        payload: { playlistId, error: errorMessage }
      });
      throw error;
    }
  }, [spotifyService]);

  const selectPlaylist = useCallback(async (
    playlist: Playlist, 
    config: PlaylistRatioConfig = { ratio: 1, isEnabled: true }
  ): Promise<void> => {
    try {
      // Fetch tracks if not already loaded
      let tracks = playlist.tracks;
      if (!tracks || tracks.length === 0) {
        tracks = await fetchPlaylistTracks(playlist.id);
      }
      
      dispatch({
        type: 'SELECT_PLAYLIST',
        payload: {
          playlist: { ...playlist, tracks },
          tracks,
          config
        }
      });
    } catch (error) {
      // Error is already handled by fetchPlaylistTracks
      throw error;
    }
  }, [fetchPlaylistTracks]);

  const deselectPlaylist = useCallback((playlistId: string): void => {
    dispatch({
      type: 'DESELECT_PLAYLIST',
      payload: { playlistId }
    });
  }, []);

  const updatePlaylistConfig = useCallback((
    playlistId: string, 
    config: PlaylistRatioConfig
  ): void => {
    dispatch({
      type: 'UPDATE_PLAYLIST_CONFIG',
      payload: { playlistId, config }
    });
  }, []);

  const clearSelectedPlaylists = useCallback((): void => {
    dispatch({ type: 'CLEAR_SELECTED_PLAYLISTS' });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetState = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const isPlaylistSelected = useCallback((playlistId: string): boolean => {
    return state.selectedPlaylists.some(sp => sp.playlist.id === playlistId);
  }, [state.selectedPlaylists]);

  const getSelectedPlaylist = useCallback((playlistId: string): SelectedPlaylist | undefined => {
    return state.selectedPlaylists.find(sp => sp.playlist.id === playlistId);
  }, [state.selectedPlaylists]);

  // Background prefetching for playlist tracks
  const prefetchPlaylistTracks = useCallback((playlistId: string): void => {
    if (prefetchQueueRef.current.has(playlistId)) {
      return; // Already queued for prefetch
    }

    prefetchQueueRef.current.add(playlistId);

    // Clear existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Debounce prefetch requests
    prefetchTimeoutRef.current = setTimeout(async () => {
      const playlistsToFetch = Array.from(prefetchQueueRef.current);
      prefetchQueueRef.current.clear();

      // Prefetch tracks for queued playlists (without updating UI state)
      for (const id of playlistsToFetch) {
        try {
          await spotifyService.getPlaylistTracks(id);
        } catch (error) {
          // Silently fail for prefetch operations
          console.debug(`Failed to prefetch tracks for playlist ${id}:`, error);
        }
      }
    }, 500); // 500ms debounce
  }, [spotifyService]);

  // Auto-prefetch tracks for user playlists when they're loaded
  useEffect(() => {
    if (state.userPlaylists.length > 0) {
      // Prefetch tracks for the first few playlists (most likely to be used)
      const playlistsToPrefetch = state.userPlaylists
        .slice(0, 5) // Prefetch first 5 playlists
        .filter(playlist => !playlist.tracks || playlist.tracks.length === 0)
        .map(playlist => playlist.id);

      playlistsToPrefetch.forEach(playlistId => {
        prefetchPlaylistTracks(playlistId);
      });
    }
  }, [state.userPlaylists, prefetchPlaylistTracks]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: PlaylistContextType = {
    state,
    fetchUserPlaylists,
    fetchPlaylistTracks,
    selectPlaylist,
    deselectPlaylist,
    updatePlaylistConfig,
    clearSelectedPlaylists,
    clearError,
    resetState,
    isPlaylistSelected,
    getSelectedPlaylist,
  };

  return (
    <PlaylistContext.Provider value={contextValue}>
      {children}
    </PlaylistContext.Provider>
  );
}

// Custom hook to use playlist context
export function usePlaylist(): PlaylistContextType {
  const context = useContext(PlaylistContext);
  
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  
  return context;
}

export default PlaylistContext;