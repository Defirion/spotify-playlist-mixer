import React, { useState, useCallback, useEffect } from 'react';
import { useMixGeneration } from '../hooks/useMixGeneration';
import { useMixPreview } from '../hooks/useMixPreview';
import { useMixOptions } from '../hooks/useMixOptions';
import PlaylistForm from './features/mixer/PlaylistForm';
import MixPreview from './features/mixer/MixPreview';
import MixControls from './features/mixer/MixControls';
import {
  SpotifyPlaylist,
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
} from '../types';
import styles from './PlaylistMixer.module.css';

interface PlaylistMixerProps {
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
  onMixedPlaylist?: (result: PlaylistMixResult) => void;
  onError?: (error: string) => void;
}

const PlaylistMixer: React.FC<PlaylistMixerProps> = ({
  accessToken,
  selectedPlaylists,
  ratioConfig,
  mixOptions: initialMixOptions,
  onMixedPlaylist,
  onError,
}) => {
  // Local state for mix options
  const [localMixOptions, setLocalMixOptions] = useState<MixOptions>({
    ...initialMixOptions,
    useAllSongs:
      initialMixOptions.useAllSongs !== undefined
        ? initialMixOptions.useAllSongs
        : true,
  });

  // Custom hooks
  const mixGeneration = useMixGeneration(accessToken, {
    onError,
  });

  const mixPreview = useMixPreview(accessToken, {
    onError,
  });

  // Sync local mix options with prop changes (from presets)
  useEffect(() => {
    setLocalMixOptions(prev => ({
      ...initialMixOptions,
      useAllSongs:
        initialMixOptions.useAllSongs !== undefined
          ? initialMixOptions.useAllSongs
          : prev.useAllSongs,
    }));
    // Clear preview when settings change
    mixPreview.clearPreview();
  }, [initialMixOptions, mixPreview]);

  // Clear preview when ratioConfig changes
  useEffect(() => {
    mixPreview.clearPreview();
  }, [ratioConfig, mixPreview]);

  // Update local mix options
  const handleMixOptionsChange = useCallback((updates: Partial<MixOptions>) => {
    setLocalMixOptions(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Generate preview
  const handleGeneratePreview = useCallback(async () => {
    await mixPreview.generatePreview(
      selectedPlaylists,
      ratioConfig,
      localMixOptions
    );
  }, [selectedPlaylists, ratioConfig, localMixOptions, mixPreview]);

  // Handle track order changes in preview
  const handlePreviewOrderChange = useCallback(
    (reorderedTracks: any[]) => {
      mixPreview.updateTrackOrder(reorderedTracks);
    },
    [mixPreview]
  );

  // Create final playlist
  const handleCreatePlaylist = useCallback(async () => {
    try {
      // Use custom track order if available, otherwise generate new mix
      const tracksToUse = mixPreview.getPreviewTracks();

      let finalTracks;
      if (tracksToUse.length > 0) {
        // Use preview tracks
        finalTracks = tracksToUse;
      } else {
        // Generate new mix
        finalTracks = await mixGeneration.generateMix(
          selectedPlaylists,
          ratioConfig,
          localMixOptions
        );
      }

      // Create the playlist
      const result = await mixGeneration.createPlaylist(
        localMixOptions.playlistName,
        finalTracks
      );

      if (onMixedPlaylist) {
        onMixedPlaylist(result);
      }
    } catch (err) {
      console.error('Playlist creation error:', err);
    }
  }, [
    selectedPlaylists,
    ratioConfig,
    localMixOptions,
    mixGeneration,
    mixPreview,
    onMixedPlaylist,
  ]);

  // Calculate warnings
  const getExceedsLimitWarning = useCallback(() => {
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

    if (localMixOptions.useTimeLimit) {
      if (
        totalDurationMinutes !== null &&
        localMixOptions.targetDuration > totalDurationMinutes * 60
      ) {
        return {
          type: 'time' as const,
          requested: localMixOptions.targetDuration,
          available: totalDurationMinutes,
          availableFormatted: `${Math.round(totalDurationMinutes / 60)}h`,
          requestedFormatted: `${Math.round(localMixOptions.targetDuration / 3600)}h`,
        };
      }
    } else if (!localMixOptions.useAllSongs) {
      if (localMixOptions.totalSongs > totalSongs) {
        return {
          type: 'songs' as const,
          requested: localMixOptions.totalSongs,
          available: totalSongs,
          availableFormatted: `${totalSongs} songs`,
          requestedFormatted: `${localMixOptions.totalSongs} songs`,
        };
      }
    }

    return null;
  }, [selectedPlaylists, localMixOptions]);

  const getRatioImbalanceWarning = useCallback(() => {
    if (selectedPlaylists.length < 2 || !ratioConfig) {
      return null;
    }

    const {
      totalSongs,
      useTimeLimit,
      targetDuration,
      continueWhenPlaylistEmpty,
      useAllSongs,
    } = localMixOptions;

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
  }, [selectedPlaylists, ratioConfig, localMixOptions]);

  const exceedsLimit = getExceedsLimitWarning();
  const ratioImbalance = getRatioImbalanceWarning();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>🎵 Create Your Mix</h2>
        <p className={styles.subtitle}>
          Blend your playlists into the perfect mix
        </p>
      </div>

      <PlaylistForm
        mixOptions={localMixOptions}
        onMixOptionsChange={handleMixOptionsChange}
        selectedPlaylists={selectedPlaylists}
        exceedsLimit={exceedsLimit}
        ratioImbalance={ratioImbalance}
      />

      {mixPreview.state.preview && (
        <MixPreview
          tracks={mixPreview.state.preview.tracks}
          stats={mixPreview.state.preview.stats}
          totalDuration={mixPreview.state.preview.totalDuration}
          loading={mixPreview.state.loading}
          onTrackOrderChange={handlePreviewOrderChange}
        />
      )}

      <MixControls
        selectedPlaylists={selectedPlaylists}
        mixOptions={localMixOptions}
        hasPreview={!!mixPreview.state.preview}
        loading={mixGeneration.state.loading}
        previewLoading={mixPreview.state.loading}
        onGeneratePreview={handleGeneratePreview}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <p className={styles.helpText}>
        Happy with your mix? Create the playlist or regenerate with your current
        settings
      </p>
    </div>
  );
};

export default PlaylistMixer;
