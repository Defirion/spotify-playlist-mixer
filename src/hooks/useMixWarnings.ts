import { useMemo } from 'react';
import { SpotifyPlaylist, MixOptions, RatioConfig } from '../types';

interface ExceedsLimitWarning {
  type: 'time' | 'songs';
  requested: number;
  available: number;
  availableFormatted: string;
  requestedFormatted: string;
}

interface RatioImbalanceWarning {
  limitingPlaylistName: string;
  mixWillBecomeImbalancedAt: string | number;
  unit: string;
  willStopEarly: boolean;
  isUseAllSongs?: boolean;
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
      (sum, playlist) => sum + playlist.tracks.total,
      0
    );

    let totalDurationMinutes = 0;
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes =
          (playlist.tracks.total * playlist.realAverageDurationSeconds) / 60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        totalDurationMinutes += playlist.tracks.total * 3.5;
      }
    }
    totalDurationMinutes = Math.round(totalDurationMinutes);

    if (mixOptions.useTimeLimit) {
      if (
        totalDurationMinutes !== null &&
        mixOptions.targetDuration > totalDurationMinutes * 60
      ) {
        return {
          type: 'time' as const,
          requested: mixOptions.targetDuration,
          available: totalDurationMinutes,
          availableFormatted: `${Math.round(totalDurationMinutes / 60)}h`,
          requestedFormatted: `${Math.round(mixOptions.targetDuration / 3600)}h`,
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

  const ratioImbalance = useMemo(() => {
    if (selectedPlaylists.length < 2 || !ratioConfig) {
      return null;
    }

    const {
      totalSongs,
      useTimeLimit,
      targetDuration,
      continueWhenPlaylistEmpty,
      useAllSongs,
    } = mixOptions;

    const playlistIdsWithWeights = Object.keys(ratioConfig).filter(
      id => ratioConfig[id] && ratioConfig[id].weight > 0
    );

    if (playlistIdsWithWeights.length < 2) {
      return null;
    }

    const totalWeight = playlistIdsWithWeights.reduce(
      (sum, id) => sum + ratioConfig[id].weight,
      0
    );

    if (totalWeight === 0) {
      return null;
    }

    let minExhaustionPoint = Infinity;
    let limitingPlaylistName = '';

    for (const playlistId of playlistIdsWithWeights) {
      const playlist = selectedPlaylists.find(p => p.id === playlistId);
      if (!playlist) continue;

      const config = ratioConfig[playlistId];
      const weight = config.weight || 1;
      let exhaustionPoint = Infinity;

      const availableCount = playlist.tracks.total;
      const avgSongDurationSeconds = playlist.realAverageDurationSeconds || 210;

      if (availableCount === 0) {
        exhaustionPoint = 0;
      } else {
        const targetRatio = weight / totalWeight;

        if (config.weightType === 'time') {
          const availableDurationSeconds =
            availableCount * avgSongDurationSeconds;
          const totalMixDurationWhenExhausted =
            availableDurationSeconds / targetRatio;

          if (useTimeLimit || useAllSongs) {
            exhaustionPoint = totalMixDurationWhenExhausted * 1000;
          } else {
            exhaustionPoint = Math.floor(
              totalMixDurationWhenExhausted / avgSongDurationSeconds
            );
          }
        } else {
          const totalSongsWhenExhausted =
            availableCount * (totalWeight / weight);

          if (useTimeLimit || useAllSongs) {
            exhaustionPoint =
              totalSongsWhenExhausted * avgSongDurationSeconds * 1000;
          } else {
            exhaustionPoint = Math.floor(totalSongsWhenExhausted);
          }
        }
      }

      if (exhaustionPoint < minExhaustionPoint) {
        minExhaustionPoint = exhaustionPoint;
        limitingPlaylistName = playlist.name;
      }
    }

    // Format display value
    let displayValue: string | number = minExhaustionPoint;
    let unit = '';

    if (useTimeLimit || useAllSongs) {
      const totalMinutes = Math.floor(minExhaustionPoint / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      displayValue = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      unit = '';
    } else {
      displayValue = Math.round(minExhaustionPoint);
      unit = 'songs';
    }

    if (useAllSongs) {
      return {
        limitingPlaylistName,
        mixWillBecomeImbalancedAt:
          minExhaustionPoint === Infinity ? 'never' : displayValue,
        unit,
        willStopEarly: !continueWhenPlaylistEmpty,
        isUseAllSongs: true,
      };
    }

    const targetLength = useTimeLimit ? targetDuration * 60 * 1000 : totalSongs;

    if (
      targetLength > minExhaustionPoint &&
      minExhaustionPoint < targetLength * 0.9
    ) {
      return {
        limitingPlaylistName,
        mixWillBecomeImbalancedAt: displayValue,
        unit,
        willStopEarly: !continueWhenPlaylistEmpty,
      };
    }

    return null;
  }, [selectedPlaylists, ratioConfig, mixOptions]);

  return {
    exceedsLimit,
    ratioImbalance,
  };
};
