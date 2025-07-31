import { useMemo } from 'react';
import { SpotifyPlaylist } from '../types/spotify';
import { RatioConfig, WeightType } from '../types/mixer';

export interface ExampleMixData {
  exampleTitle: string;
  playlistExamples: Array<{
    id: string;
    name: string;
    displayText: string;
    groupText: string;
    weightTypeText: string;
  }>;
}

export interface UseRatioCalculationReturn {
  exampleMixData: ExampleMixData;
  getTotalWeight: () => number;
  getPlaylistPercentage: (playlistId: string) => number;
  formatDurationFromSeconds: (seconds: number) => string | null;
}

/**
 * Custom hook for ratio calculation logic
 * Handles example mix calculations and utility functions
 */
export const useRatioCalculation = (
  selectedPlaylists: SpotifyPlaylist[],
  ratioConfig: RatioConfig,
  globalBalanceMethod: WeightType
): UseRatioCalculationReturn => {
  const getTotalWeight = useMemo(() => {
    return () => {
      return selectedPlaylists.reduce((sum, p) => {
        const config = ratioConfig[p.id] || { weight: 1 };
        return sum + config.weight;
      }, 0);
    };
  }, [selectedPlaylists, ratioConfig]);

  const getPlaylistPercentage = useMemo(() => {
    return (playlistId: string) => {
      const totalWeight = getTotalWeight();
      const config = ratioConfig[playlistId] || { weight: 1 };
      return Math.round((config.weight / totalWeight) * 100);
    };
  }, [ratioConfig, getTotalWeight]);

  const formatDurationFromSeconds = useMemo(() => {
    return (seconds: number): string | null => {
      if (!seconds) return null;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
  }, []);

  const exampleMixData = useMemo((): ExampleMixData => {
    const totalWeight = getTotalWeight();
    const hasTimeBalanced = globalBalanceMethod === 'time';
    const exampleTitle = hasTimeBalanced
      ? 'Example Mix (per 60 minutes):'
      : 'Example Mix (per 100 songs):';
    const baseAmount = hasTimeBalanced ? 60 : 100;

    const playlistExamples = selectedPlaylists.map(playlist => {
      const config = ratioConfig[playlist.id] || {
        weight: 1,
        weightType: 'frequency',
      };
      const percentage = Math.round((config.weight / totalWeight) * 100);
      const weightTypeText =
        globalBalanceMethod === 'time' ? 'same play time' : 'same song count';

      let displayText: string;
      if (
        hasTimeBalanced &&
        globalBalanceMethod === 'time' &&
        playlist.realAverageDurationSeconds
      ) {
        const playlistAvgMinutes = playlist.realAverageDurationSeconds / 60;
        const playlistMinutes = (percentage / 100) * baseAmount;
        const exactSongs = playlistMinutes / playlistAvgMinutes;
        const minSongs = Math.floor(exactSongs);
        const maxSongs = Math.ceil(exactSongs);
        const formattedMinutes = playlistMinutes.toFixed(1);

        const songsText =
          minSongs === maxSongs ? `${minSongs}` : `${minSongs}-${maxSongs}`;
        displayText = `~${songsText} songs (${formattedMinutes} min, ${percentage}%)`;
      } else {
        const exactSongs = (percentage / 100) * baseAmount;
        const minSongs = Math.floor(exactSongs);
        const maxSongs = Math.ceil(exactSongs);
        const songsText =
          minSongs === maxSongs ? `${minSongs}` : `${minSongs}-${maxSongs}`;
        displayText = `~${songsText} songs (${percentage}%)`;
      }

      const groupText =
        config.min === config.max
          ? config.min === 1
            ? '1 at a time'
            : `${config.min} at a time`
          : `${config.min}-${config.max} at a time`;

      return {
        id: playlist.id,
        name: playlist.name,
        displayText,
        groupText,
        weightTypeText,
      };
    });

    return { exampleTitle, playlistExamples };
  }, [selectedPlaylists, ratioConfig, globalBalanceMethod, getTotalWeight]);

  return {
    exampleMixData,
    getTotalWeight,
    getPlaylistPercentage,
    formatDurationFromSeconds,
  };
};
