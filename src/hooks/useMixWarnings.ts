import { useMemo } from 'react';
import { SpotifyPlaylist, MixOptions, RatioConfig } from '../types';
import { getPlaylistItemCount } from '../utils/spotify';
import {
  predictExhaustion,
  RatioImbalanceWarning,
} from '../utils/exhaustionPrediction';

interface ExceedsLimitWarning {
  type: 'time' | 'songs';
  requested: number;
  available: number;
  availableFormatted: string;
  requestedFormatted: string;
}

interface UseMixWarningsReturn {
  exceedsLimit: ExceedsLimitWarning | null;
  ratioImbalance: RatioImbalanceWarning | null;
}

/**
 * Custom hook for calculating mix warnings based on playlist selection and configuration
 */
export const useMixWarnings = (
  selectedPlaylists: SpotifyPlaylist[],
  ratioConfig: RatioConfig,
  mixOptions: MixOptions
): UseMixWarningsReturn => {
  const exceedsLimit = useMemo(() => {
    if (selectedPlaylists.length === 0) return null;

    const totalSongs = selectedPlaylists.reduce(
      (sum, playlist) => sum + getPlaylistItemCount(playlist),
      0
    );

    let totalDurationMinutes = 0;
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes =
          (getPlaylistItemCount(playlist) *
            playlist.realAverageDurationSeconds) /
          60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        totalDurationMinutes += getPlaylistItemCount(playlist) * 3.5;
      }
    }
    totalDurationMinutes = Math.round(totalDurationMinutes);

    if (!mixOptions.useAllSongs && mixOptions.useTimeLimit) {
      if (
        totalDurationMinutes !== null &&
        mixOptions.targetDurationSeconds > totalDurationMinutes * 60
      ) {
        return {
          type: 'time' as const,
          requested: mixOptions.targetDurationSeconds,
          available: totalDurationMinutes,
          availableFormatted: `${Math.round(totalDurationMinutes / 60)}h`,
          requestedFormatted: `${Math.round(mixOptions.targetDurationSeconds / 3600)}h`,
        };
      }
    } else if (!mixOptions.useAllSongs) {
      if (mixOptions.totalSongs > totalSongs) {
        return {
          type: 'songs' as const,
          requested: mixOptions.totalSongs,
          available: totalSongs,
          availableFormatted: `${totalSongs} songs`,
          requestedFormatted: `${mixOptions.totalSongs} songs`,
        };
      }
    }

    return null;
  }, [selectedPlaylists, mixOptions]);

  const ratioImbalance = useMemo(
    () => predictExhaustion(selectedPlaylists, ratioConfig, mixOptions),
    [selectedPlaylists, ratioConfig, mixOptions]
  );

  return {
    exceedsLimit,
    ratioImbalance,
  };
};
