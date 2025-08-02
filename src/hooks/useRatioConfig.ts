import { useState, useCallback } from 'react';
import { RatioConfig, RatioConfigItem } from '../types/mixer';

const DEFAULT_RATIO_CONFIG: RatioConfigItem = {
  min: 1,
  max: 2,
  weight: 2,
  weightType: 'frequency',
};

export interface UseRatioConfigReturn {
  ratioConfig: RatioConfig;
  updateRatioConfig: (
    playlistId: string,
    config: Partial<RatioConfigItem>
  ) => void;
  removeRatioConfig: (playlistId: string) => void;
  addPlaylistToRatioConfig: (
    playlistId: string,
    config?: Partial<RatioConfigItem>
  ) => void;
  setRatioConfigBulk: (newConfig: RatioConfig) => void;
  clearRatioConfig: () => void;
  getRatioConfig: (playlistId: string) => RatioConfigItem;
}

/**
 * Custom hook for managing ratio configuration state
 * Handles ratio settings for individual playlists
 */
export const useRatioConfig = (
  initialConfig: RatioConfig = {}
): UseRatioConfigReturn => {
  const [ratioConfig, setRatioConfig] = useState<RatioConfig>(initialConfig);

  const updateRatioConfig = useCallback(
    (playlistId: string, config: Partial<RatioConfigItem>) => {
      setRatioConfig(prev => ({
        ...prev,
        [playlistId]: {
          ...DEFAULT_RATIO_CONFIG,
          ...prev[playlistId],
          ...config,
        },
      }));
    },
    []
  );

  const removeRatioConfig = useCallback((playlistId: string) => {
    setRatioConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[playlistId];
      return newConfig;
    });
  }, []);

  const addPlaylistToRatioConfig = useCallback(
    (playlistId: string, config: Partial<RatioConfigItem> = {}) => {
      setRatioConfig(prev => ({
        ...prev,
        [playlistId]: {
          ...DEFAULT_RATIO_CONFIG,
          ...config,
        },
      }));
    },
    []
  );

  const setRatioConfigBulk = useCallback((newConfig: RatioConfig) => {
    setRatioConfig(newConfig);
  }, []);

  const clearRatioConfig = useCallback(() => {
    setRatioConfig({});
  }, []);

  const getRatioConfig = useCallback(
    (playlistId: string): RatioConfigItem => {
      return ratioConfig[playlistId] || DEFAULT_RATIO_CONFIG;
    },
    [ratioConfig]
  );

  return {
    ratioConfig,
    updateRatioConfig,
    removeRatioConfig,
    addPlaylistToRatioConfig,
    setRatioConfigBulk,
    clearRatioConfig,
    getRatioConfig,
  };
};
