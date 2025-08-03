/**
 * Migration utilities for transitioning from custom hooks to Zustand store
 * This file provides backward compatibility and migration helpers
 */

import { useAppStore } from './index';
import { shallow } from 'zustand/shallow';
import { RatioConfig } from '../types/mixer';

/**
 * @deprecated Use useAuth from store instead
 * Legacy hook wrapper for backward compatibility
 */
export const useLegacyAppState = () => {
  console.warn(
    'useLegacyAppState is deprecated. Use useAuth and useUI from store instead.'
  );

  return useAppStore(
    state => ({
      accessToken: state.accessToken,
      error: state.error,
      mixedPlaylists: state.mixedPlaylists,
      setAccessToken: state.setAccessToken,
      setError: state.setError,
      dismissError: state.dismissError,
      addMixedPlaylist: state.addMixedPlaylist,
      dismissSuccessToast: state.dismissSuccessToast,
    }),
    shallow
  );
};

/**
 * @deprecated Use useMixOptions from store instead
 * Legacy hook wrapper for backward compatibility
 */
export const useLegacyMixOptions = () => {
  console.warn(
    'useLegacyMixOptions is deprecated. Use useMixOptions from store instead.'
  );

  return useAppStore(
    state => ({
      mixOptions: state.mixOptions,
      updateMixOptions: state.updateMixOptions,
      resetMixOptions: state.resetMixOptions,
      applyPresetOptions: state.applyPresetOptions,
    }),
    shallow
  );
};

/**
 * @deprecated Use usePlaylistSelection from store instead
 * Legacy hook wrapper for backward compatibility
 */
export const useLegacyPlaylistSelection = () => {
  console.warn(
    'useLegacyPlaylistSelection is deprecated. Use usePlaylistSelection from store instead.'
  );

  return useAppStore(
    state => ({
      selectedPlaylists: state.selectedPlaylists,
      selectPlaylist: state.selectPlaylist,
      deselectPlaylist: state.deselectPlaylist,
      togglePlaylistSelection: state.togglePlaylistSelection,
      clearAllPlaylists: state.clearAllPlaylists,
      isPlaylistSelected: state.isPlaylistSelected,
    }),
    shallow
  );
};

/**
 * @deprecated Use useRatioConfig from store instead
 * Legacy hook wrapper for backward compatibility
 */
export const useLegacyRatioConfig = () => {
  console.warn(
    'useLegacyRatioConfig is deprecated. Use useRatioConfig from store instead.'
  );

  return useAppStore(
    state => ({
      ratioConfig: state.ratioConfig,
      updateRatioConfig: state.updateRatioConfig,
      removeRatioConfig: state.removeRatioConfig,
      addPlaylistToRatioConfig: state.addPlaylistToRatioConfig,
      setRatioConfigBulk: state.setRatioConfigBulk,
      clearRatioConfig: state.clearRatioConfig,
      getRatioConfig: state.getRatioConfig,
    }),
    shallow
  );
};

/**
 * Migration helper to validate store state consistency
 */
export const validateStoreState = () => {
  const state = useAppStore.getState();

  const issues: string[] = [];

  // Check for orphaned ratio configs
  const selectedPlaylistIds = new Set(state.selectedPlaylists.map(p => p.id));
  const ratioConfigIds = new Set(Object.keys(state.ratioConfig));

  for (const ratioId of ratioConfigIds) {
    if (!selectedPlaylistIds.has(ratioId)) {
      issues.push(`Orphaned ratio config for playlist: ${ratioId}`);
    }
  }

  // Check for missing ratio configs
  for (const playlistId of selectedPlaylistIds) {
    if (!ratioConfigIds.has(playlistId)) {
      issues.push(`Missing ratio config for selected playlist: ${playlistId}`);
    }
  }

  if (issues.length > 0) {
    console.warn('Store state validation issues:', issues);
  }

  return issues;
};

/**
 * Helper to clean up inconsistent state
 */
export const cleanupStoreState = () => {
  const state = useAppStore.getState();
  const selectedPlaylistIds = new Set(state.selectedPlaylists.map(p => p.id));

  // Remove orphaned ratio configs
  const cleanedRatioConfig: RatioConfig = {};
  for (const [playlistId, config] of Object.entries(state.ratioConfig)) {
    if (selectedPlaylistIds.has(playlistId)) {
      cleanedRatioConfig[playlistId] = config;
    }
  }

  // Add missing ratio configs
  for (const playlist of state.selectedPlaylists) {
    if (!cleanedRatioConfig[playlist.id]) {
      cleanedRatioConfig[playlist.id] = {
        min: 1,
        max: 2,
        weight: 2,
        weightType: 'frequency' as const,
      };
    }
  }

  state.setRatioConfigBulk(cleanedRatioConfig);
};
