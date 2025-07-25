import { useState, useCallback } from 'react';

const DEFAULT_MIX_OPTIONS = {
  totalSongs: 100,
  targetDuration: 240,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'My Mixed Playlist',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: true,
  continueWhenPlaylistEmpty: false,
};

/**
 * Custom hook for managing mix configuration state
 * Provides centralized state management for playlist mixing options
 */
export const useMixOptions = (initialOptions = {}) => {
  const [mixOptions, setMixOptions] = useState({
    ...DEFAULT_MIX_OPTIONS,
    ...initialOptions,
  });

  const updateMixOptions = useCallback(updates => {
    setMixOptions(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const resetMixOptions = useCallback(() => {
    setMixOptions(DEFAULT_MIX_OPTIONS);
  }, []);

  const applyPresetOptions = useCallback(
    ({ strategy, settings, presetName }) => {
      setMixOptions(prev => ({
        ...prev,
        popularityStrategy: strategy,
        recencyBoost: settings.recencyBoost,
        shuffleWithinGroups: settings.shuffleWithinGroups,
        useTimeLimit: settings.useTimeLimit || false,
        useAllSongs:
          settings.useAllSongs !== undefined
            ? settings.useAllSongs
            : prev.useAllSongs,
        targetDuration: settings.targetDuration || prev.targetDuration,
        playlistName: `${presetName} Mix`,
        continueWhenPlaylistEmpty:
          settings.continueWhenPlaylistEmpty !== undefined
            ? settings.continueWhenPlaylistEmpty
            : prev.continueWhenPlaylistEmpty,
      }));
    },
    []
  );

  return {
    mixOptions,
    updateMixOptions,
    resetMixOptions,
    applyPresetOptions,
  };
};
