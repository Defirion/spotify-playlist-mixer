import React, { createContext, useContext, useReducer, useCallback, ReactNode, useMemo } from 'react';
import { MixerState, MixConfig, MixResult, MixPreview, MixOptions, MixStrategy } from '../types';
import { IPlaylistMixerService, ISpotifyService } from '../types/services';
import { CacheService } from '../services/CacheService';

// Mixer Actions
export type MixerAction =
  | { type: 'GENERATE_MIX_START' }
  | { type: 'GENERATE_MIX_SUCCESS'; payload: { mixResult: MixResult } }
  | { type: 'GENERATE_MIX_FAILURE'; payload: { error: string } }
  | { type: 'GENERATE_PREVIEW_START' }
  | { type: 'GENERATE_PREVIEW_SUCCESS'; payload: { previewResult: MixPreview } }
  | { type: 'GENERATE_PREVIEW_FAILURE'; payload: { error: string } }
  | { type: 'SAVE_MIX_START' }
  | { type: 'SAVE_MIX_SUCCESS'; payload: { playlistId: string; playlistName: string } }
  | { type: 'SAVE_MIX_FAILURE'; payload: { error: string } }
  | { type: 'CLEAR_CURRENT_MIX' }
  | { type: 'CLEAR_PREVIEW_MIX' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_TO_HISTORY'; payload: { mixResult: MixResult } }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET_STATE' };

// Mixer Context Interface
interface MixerContextType {
  state: MixerState;
  generateMix: (config: MixConfig) => Promise<MixResult>;
  generatePreview: (config: MixConfig) => Promise<MixPreview>;
  saveMix: (mixResult: MixResult, playlistName: string) => Promise<string>;
  clearCurrentMix: () => void;
  clearPreviewMix: () => void;
  clearError: () => void;
  clearHistory: () => void;
  resetState: () => void;
  validateMixConfig: (config: MixConfig) => Promise<{ isValid: boolean; errors: string[] }>;
}

// Initial state
const initialState: MixerState = {
  currentMix: null,
  previewMix: null,
  isGenerating: false,
  mixHistory: [],
  error: null,
};

// Mixer reducer
function mixerReducer(state: MixerState, action: MixerAction): MixerState {
  switch (action.type) {
    case 'GENERATE_MIX_START':
      return {
        ...state,
        isGenerating: true,
        error: null,
      };
    
    case 'GENERATE_MIX_SUCCESS':
      return {
        ...state,
        currentMix: action.payload.mixResult,
        isGenerating: false,
        error: null,
        mixHistory: [action.payload.mixResult, ...state.mixHistory.slice(0, 9)], // Keep last 10
      };
    
    case 'GENERATE_MIX_FAILURE':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };
    
    case 'GENERATE_PREVIEW_START':
      return {
        ...state,
        isGenerating: true,
        error: null,
      };
    
    case 'GENERATE_PREVIEW_SUCCESS':
      return {
        ...state,
        previewMix: action.payload.previewResult,
        isGenerating: false,
        error: null,
      };
    
    case 'GENERATE_PREVIEW_FAILURE':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };
    
    case 'SAVE_MIX_START':
      return {
        ...state,
        isGenerating: true,
        error: null,
      };
    
    case 'SAVE_MIX_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        error: null,
      };
    
    case 'SAVE_MIX_FAILURE':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };
    
    case 'CLEAR_CURRENT_MIX':
      return {
        ...state,
        currentMix: null,
      };
    
    case 'CLEAR_PREVIEW_MIX':
      return {
        ...state,
        previewMix: null,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        mixHistory: [action.payload.mixResult, ...state.mixHistory.slice(0, 9)], // Keep last 10
      };
    
    case 'CLEAR_HISTORY':
      return {
        ...state,
        mixHistory: [],
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const MixerContext = createContext<MixerContextType | undefined>(undefined);

// Mixer Provider Props
interface MixerProviderProps {
  children: ReactNode;
  playlistMixerService: IPlaylistMixerService;
  spotifyService: ISpotifyService;
}

// Mixer Provider Component
export function MixerProvider({ children, playlistMixerService, spotifyService }: MixerProviderProps) {
  const [state, dispatch] = useReducer(mixerReducer, initialState);
  
  // Create cache instance for mix results
  const mixCache = useMemo(() => new CacheService({
    ttl: 10 * 60 * 1000, // 10 minutes for mix results
    maxSize: 50 // Store up to 50 mix results
  }), []);

  const generateMix = useCallback(async (config: MixConfig): Promise<MixResult> => {
    try {
      dispatch({ type: 'GENERATE_MIX_START' });
      
      // Generate cache key based on config
      const configHash = JSON.stringify({
        playlists: config.playlists.map(p => p.playlist.id),
        ratios: config.ratioConfig,
        options: config.mixOptions
      });
      const cacheKey = `mix:${btoa(configHash).slice(0, 32)}`;
      
      // Check cache first
      const cachedResult = mixCache.get<MixResult>(cacheKey);
      if (cachedResult) {
        dispatch({
          type: 'GENERATE_MIX_SUCCESS',
          payload: { mixResult: cachedResult }
        });
        return cachedResult;
      }
      
      // Validate config first
      const validation = await playlistMixerService.validateMixConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid mix configuration: ${validation.errors.join(', ')}`);
      }
      
      const mixResult = await playlistMixerService.mixPlaylists(config);
      
      // Cache the result
      mixCache.set(cacheKey, mixResult);
      
      dispatch({
        type: 'GENERATE_MIX_SUCCESS',
        payload: { mixResult }
      });
      
      return mixResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate mix';
      dispatch({
        type: 'GENERATE_MIX_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [playlistMixerService, mixCache]);

  const generatePreview = useCallback(async (config: MixConfig): Promise<MixPreview> => {
    try {
      dispatch({ type: 'GENERATE_PREVIEW_START' });
      
      // Validate config first
      const validation = await playlistMixerService.validateMixConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid mix configuration: ${validation.errors.join(', ')}`);
      }
      
      const previewResult = await playlistMixerService.previewMix(config);
      
      dispatch({
        type: 'GENERATE_PREVIEW_SUCCESS',
        payload: { previewResult }
      });
      
      return previewResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview';
      dispatch({
        type: 'GENERATE_PREVIEW_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [playlistMixerService]);

  const saveMix = useCallback(async (mixResult: MixResult, playlistName: string): Promise<string> => {
    try {
      dispatch({ type: 'SAVE_MIX_START' });
      
      // Create playlist
      const playlist = await spotifyService.createPlaylist(
        playlistName,
        `Mixed playlist created on ${new Date().toLocaleDateString()}`
      );
      
      // Add tracks to playlist
      const trackUris = mixResult.tracks.map(track => track.uri);
      await spotifyService.addTracksToPlaylist(playlist.id, trackUris);
      
      dispatch({
        type: 'SAVE_MIX_SUCCESS',
        payload: { playlistId: playlist.id, playlistName: playlist.name }
      });
      
      return playlist.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save mix';
      dispatch({
        type: 'SAVE_MIX_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  }, [spotifyService]);

  const clearCurrentMix = useCallback((): void => {
    dispatch({ type: 'CLEAR_CURRENT_MIX' });
  }, []);

  const clearPreviewMix = useCallback((): void => {
    dispatch({ type: 'CLEAR_PREVIEW_MIX' });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const clearHistory = useCallback((): void => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const resetState = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  const validateMixConfig = useCallback(async (config: MixConfig): Promise<{ isValid: boolean; errors: string[] }> => {
    return await playlistMixerService.validateMixConfig(config);
  }, [playlistMixerService]);

  const contextValue: MixerContextType = {
    state,
    generateMix,
    generatePreview,
    saveMix,
    clearCurrentMix,
    clearPreviewMix,
    clearError,
    clearHistory,
    resetState,
    validateMixConfig,
  };

  return (
    <MixerContext.Provider value={contextValue}>
      {children}
    </MixerContext.Provider>
  );
}

// Custom hook to use mixer context
export function useMixer(): MixerContextType {
  const context = useContext(MixerContext);
  
  if (context === undefined) {
    throw new Error('useMixer must be used within a MixerProvider');
  }
  
  return context;
}

export default MixerContext;