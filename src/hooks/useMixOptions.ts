import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MixOptions } from '../types';

const DEFAULT_MIX_OPTIONS: MixOptions = {
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

interface UseMixOptionsReturn {
  mixOptions: MixOptions;
  updateMixOptions: (updates: Partial<MixOptions>) => void;
  resetMixOptions: () => void;
  applyPresetOptions: (preset: {
    strategy: string;
    settings: Partial<MixOptions>;
    presetName: string;
  }) => void;
}

interface UseMixOptionsConfig {
  onOptionsChange?: () => void; // Callback for when options change (e.g., to clear preview)
}

/**
 * Custom hook for managing mix configuration state
 * Provides centralized state management for playlist mixing options
 * Can optionally sync with external options (for preset applications)
 */
export const useMixOptions = (
  initialOptions: Partial<MixOptions> = {},
  enableSync = false,
  config: UseMixOptionsConfig = {}
): UseMixOptionsReturn => {
  const [mixOptions, setMixOptions] = useState({
    ...DEFAULT_MIX_OPTIONS,
    ...initialOptions,
  });

  // Refs for tracking sync state
  const userHasInteracted = useRef(false);
  const lastInitialOptions = useRef(initialOptions);

  // Sync with external options when enableSync is true
  useEffect(() => {
    if (!enableSync) return;

    // Check if initialOptions has actually changed (deep comparison of values)
    const hasChanged = Object.keys(initialOptions).some(
      key =>
        (initialOptions as any)[key] !==
        (lastInitialOptions.current as any)[key]
    );

    if (hasChanged) {
      // Only sync if user hasn't interacted
      if (!userHasInteracted.current) {
        setMixOptions(prev => ({
          ...prev,
          ...initialOptions,
          useAllSongs:
            initialOptions.useAllSongs !== undefined
              ? initialOptions.useAllSongs
              : prev.useAllSongs,
        }));
      }

      lastInitialOptions.current = initialOptions;
    }
  }, [initialOptions, enableSync]);

  const updateMixOptions = useCallback(
    (updates: Partial<MixOptions>) => {
      userHasInteracted.current = true;
      setMixOptions(prev => ({
        ...prev,
        ...updates,
      }));
      // Notify that options have changed (e.g., to clear preview)
      config.onOptionsChange?.();
    },
    [config]
  );

  const resetMixOptions = useCallback(() => {
    userHasInteracted.current = false;
    setMixOptions(DEFAULT_MIX_OPTIONS);
    // Notify that options have changed (e.g., to clear preview)
    config.onOptionsChange?.();
  }, [config]);

  const applyPresetOptions = useCallback(
    ({
      strategy,
      settings,
      presetName,
    }: {
      strategy: string;
      settings: Partial<MixOptions>;
      presetName: string;
    }) => {
      userHasInteracted.current = false;
      setMixOptions(prev => ({
        ...prev,
        popularityStrategy: strategy as any, // Cast to handle string to PopularityStrategy
        recencyBoost: settings.recencyBoost ?? prev.recencyBoost,
        shuffleWithinGroups:
          settings.shuffleWithinGroups ?? prev.shuffleWithinGroups,
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
      // Notify that options have changed (e.g., to clear preview)
      config.onOptionsChange?.();
    },
    [config]
  );

  // Memoize mixOptions to prevent unnecessary re-renders
  const memoizedMixOptions = useMemo(() => mixOptions, [mixOptions]);

  return {
    mixOptions: memoizedMixOptions,
    updateMixOptions,
    resetMixOptions,
    applyPresetOptions,
  };
};
