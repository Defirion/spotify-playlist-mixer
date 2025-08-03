import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// Import store slices
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createPlaylistSlice, PlaylistSlice } from './slices/playlistSlice';
import { createMixingSlice, MixingSlice } from './slices/mixingSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

// Combined store type
export type AppStore = AuthSlice & PlaylistSlice & MixingSlice & UISlice;

// Create the main store with all slices
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((...args) => ({
      ...createAuthSlice(...args),
      ...createPlaylistSlice(...args),
      ...createMixingSlice(...args),
      ...createUISlice(...args),
    })),
    {
      name: 'spotify-playlist-mixer-store',
    }
  )
);

// Selector hooks for better performance and cleaner component code
export const useAuth = () =>
  useAppStore(state => ({
    accessToken: state.accessToken,
    isAuthenticated: state.isAuthenticated,
    setAccessToken: state.setAccessToken,
    clearAuth: state.clearAuth,
  }));

export const usePlaylistSelection = () =>
  useAppStore(state => ({
    selectedPlaylists: state.selectedPlaylists,
    selectPlaylist: state.selectPlaylist,
    deselectPlaylist: state.deselectPlaylist,
    togglePlaylistSelection: state.togglePlaylistSelection,
    clearAllPlaylists: state.clearAllPlaylists,
    isPlaylistSelected: state.isPlaylistSelected,
  }));

export const useRatioConfig = () =>
  useAppStore(state => ({
    ratioConfig: state.ratioConfig,
    updateRatioConfig: state.updateRatioConfig,
    removeRatioConfig: state.removeRatioConfig,
    addPlaylistToRatioConfig: state.addPlaylistToRatioConfig,
    setRatioConfigBulk: state.setRatioConfigBulk,
    clearRatioConfig: state.clearRatioConfig,
    getRatioConfig: state.getRatioConfig,
  }));

export const useMixOptions = () =>
  useAppStore(state => ({
    mixOptions: state.mixOptions,
    updateMixOptions: state.updateMixOptions,
    resetMixOptions: state.resetMixOptions,
    applyPresetOptions: state.applyPresetOptions,
  }));

export const useUI = () =>
  useAppStore(state => ({
    error: state.error,
    mixedPlaylists: state.mixedPlaylists,
    setError: state.setError,
    dismissError: state.dismissError,
    addMixedPlaylist: state.addMixedPlaylist,
    dismissSuccessToast: state.dismissSuccessToast,
  }));

// Combined selectors for complex operations
export const usePlaylistOperations = () =>
  useAppStore(state => ({
    selectedPlaylists: state.selectedPlaylists,
    ratioConfig: state.ratioConfig,
    togglePlaylistSelection: state.togglePlaylistSelection,
    removeRatioConfig: state.removeRatioConfig,
    addPlaylistToRatioConfig: state.addPlaylistToRatioConfig,
    setRatioConfigBulk: state.setRatioConfigBulk,
    clearAllPlaylists: state.clearAllPlaylists,
  }));

export const useMixingState = () =>
  useAppStore(state => ({
    selectedPlaylists: state.selectedPlaylists,
    ratioConfig: state.ratioConfig,
    mixOptions: state.mixOptions,
    accessToken: state.accessToken,
    addMixedPlaylist: state.addMixedPlaylist,
    setError: state.setError,
  }));
