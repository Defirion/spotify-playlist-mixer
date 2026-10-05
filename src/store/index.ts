import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// Import store slices
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createPlaylistSlice, PlaylistSlice } from './slices/playlistSlice';
import { createMixingSlice, MixingSlice } from './slices/mixingSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

// Migration helper: set UI error from any unknown/error shape by normalizing
// to the DisplayError structure. This lets older call sites pass strings or
// Error objects and still populate the store with a consistent type.
import { toDisplayError } from '../utils/migrateError';

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
