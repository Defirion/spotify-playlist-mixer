import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// Import store slices
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createPlaylistSlice, PlaylistSlice } from './slices/playlistSlice';
import { createMixingSlice, MixingSlice } from './slices/mixingSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createTrackSlice, TrackSlice } from './slices/trackSlice';

// Migration helper: set UI error from any unknown/error shape by normalizing
// to the DisplayError structure. This lets older call sites pass strings or
// Error objects and still populate the store with a consistent type.
import { toDisplayError } from '../utils/migrateError';
// Drag slice removed - will be replaced with dnd-kit implementation

// Combined store type
export type AppStore = AuthSlice &
  PlaylistSlice &
  MixingSlice &
  UISlice &
  TrackSlice;

// Create the main store with all slices
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((...args) => ({
      ...createAuthSlice(...args),
      ...createPlaylistSlice(...args),
      ...createMixingSlice(...args),
      ...createUISlice(...args),
      ...createTrackSlice(...args),
    })),
    {
      name: 'spotify-playlist-mixer-store',
    }
  )
);

// Selector hooks for better performance and cleaner component code
export const useAuth = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      tokenExpiresAt: state.tokenExpiresAt,
      isAuthenticated: state.isAuthenticated,
      setAccessToken: state.setAccessToken,
      setTokens: state.setTokens,
      clearAuth: state.clearAuth,
    }))
  );

export const usePlaylistSelection = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      selectedPlaylists: state.selectedPlaylists,
      selectPlaylist: state.selectPlaylist,
      deselectPlaylist: state.deselectPlaylist,
      togglePlaylistSelection: state.togglePlaylistSelection,
      clearAllPlaylists: state.clearAllPlaylists,
      isPlaylistSelected: state.isPlaylistSelected,
    }))
  );

export const useRatioConfig = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      ratioConfig: state.ratioConfig,
      updateRatioConfig: state.updateRatioConfig,
      removeRatioConfig: state.removeRatioConfig,
      addPlaylistToRatioConfig: state.addPlaylistToRatioConfig,
      setRatioConfigBulk: state.setRatioConfigBulk,
      clearRatioConfig: state.clearRatioConfig,
      getRatioConfig: state.getRatioConfig,
    }))
  );

export const useMixOptions = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      mixOptions: state.mixOptions,
      updateMixOptions: state.updateMixOptions,
      resetMixOptions: state.resetMixOptions,
      applyPresetOptions: state.applyPresetOptions,
    }))
  );

export const useUI = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      error: state.error,
      mixedPlaylists: state.mixedPlaylists,
      // Expose only read/notification helpers here.
      // To set UI errors from arbitrary error shapes, use the setUIError(err) helper
      // which normalizes unknown errors to the DisplayError structure.
      dismissError: state.dismissError,
      addMixedPlaylist: state.addMixedPlaylist,
      dismissSuccessToast: state.dismissSuccessToast,
    }))
  );

export function setUIError(err: unknown) {
  useAppStore.getState().setError(toDisplayError(err));
}

// Combined selectors for complex operations
export const usePlaylistOperations = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      selectedPlaylists: state.selectedPlaylists,
      ratioConfig: state.ratioConfig,
      togglePlaylistSelection: state.togglePlaylistSelection,
      removeRatioConfig: state.removeRatioConfig,
      addPlaylistToRatioConfig: state.addPlaylistToRatioConfig,
      setRatioConfigBulk: state.setRatioConfigBulk,
      clearAllPlaylists: state.clearAllPlaylists,
    }))
  );

export const useMixingState = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      selectedPlaylists: state.selectedPlaylists,
      ratioConfig: state.ratioConfig,
      mixOptions: state.mixOptions,
      accessToken: state.accessToken,
      addMixedPlaylist: state.addMixedPlaylist,
      // Avoid exposing the raw setError setter here; use setUIError when needed.
    }))
  );

export const useTracks = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      tracks: state.tracks,
      setTracks: state.setTracks,
      reorderTracks: state.reorderTracks,
      clearTracks: state.clearTracks,
    }))
  );

// Drag state hooks removed - will be replaced with dnd-kit implementation
