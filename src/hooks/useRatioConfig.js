import { useState, useCallback } from 'react';

const DEFAULT_RATIO_CONFIG = {
  min: 1,
  max: 2,
  weight: 2,
  weightType: 'frequency',
};

/**
 * Custom hook for managing ratio configuration state
 * Handles ratio settings for individual playlists
 */
export const useRatioConfig = (initialConfig = {}) => {
  const [ratioConfig, setRatioConfig] = useState(initialConfig);

  const updateRatioConfig = useCallback((playlistId, config) => {
    setRatioConfig(prev => ({
      ...prev,
      [playlistId]: {
        ...DEFAULT_RATIO_CONFIG,
        ...config,
      },
    }));
  }, []);

  const removeRatioConfig = useCallback(playlistId => {
    setRatioConfig(prev => {
      const newConfig = { ...prev };
      delete newConfig[playlistId];
      return newConfig;
    });
  }, []);

  const addPlaylistToRatioConfig = useCallback((playlistId, config = {}) => {
    setRatioConfig(prev => ({
      ...prev,
      [playlistId]: {
        ...DEFAULT_RATIO_CONFIG,
        ...config,
      },
    }));
  }, []);

  const setRatioConfigBulk = useCallback(newConfig => {
    setRatioConfig(newConfig);
  }, []);

  const clearRatioConfig = useCallback(() => {
    setRatioConfig({});
  }, []);

  const getRatioConfig = useCallback(
    playlistId => {
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
