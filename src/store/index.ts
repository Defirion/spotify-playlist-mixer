import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// Import store slices
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createPlaylistSlice, PlaylistSlice } from './slices/playlistSlice';
import { createMixingSlice, MixingSlice } from './slices/mixingSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createDragSlice, DragSlice } from './slices/dragSlice';

// Combined store type
export type AppStore = AuthSlice &
  PlaylistSlice &
  MixingSlice &
  UISlice &
  DragSlice;

// Create the main store with all slices
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((...args) => ({
      ...createAuthSlice(...args),
      ...createPlaylistSlice(...args),
      ...createMixingSlice(...args),
      ...createUISlice(...args),
      ...createDragSlice(...args),
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
      isAuthenticated: state.isAuthenticated,
      setAccessToken: state.setAccessToken,
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
      setError: state.setError,
      dismissError: state.dismissError,
      addMixedPlaylist: state.addMixedPlaylist,
      dismissSuccessToast: state.dismissSuccessToast,
    }))
  );

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
      setError: state.setError,
    }))
  );

// Drag state selector hooks
export const useDragState = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      isDragging: state.isDragging,
      draggedItem: state.draggedItem,
      dragStartTime: state.dragStartTime,
      startDrag: state.startDrag,
      endDrag: state.endDrag,
      cancelDrag: state.cancelDrag,
    }))
  );

export const useScrollPosition = () =>
  useAppStore(
    useShallow((state: AppStore) => ({
      scrollTop: state.scrollTop,
      captureScrollPosition: state.captureScrollPosition,
      restoreScrollPosition: state.restoreScrollPosition,
      clearScrollPosition: state.clearScrollPosition,
    }))
  );
