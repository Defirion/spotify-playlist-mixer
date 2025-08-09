import React, { useCallback, useEffect, useRef } from 'react';
import { useMixGeneration } from '../hooks/useMixGeneration';
import { useMixPreview } from '../hooks/useMixPreview';
import { useMixWarnings } from '../hooks/useMixWarnings';
import PlaylistForm from './features/mixer/PlaylistForm';
import MixPreview from './features/mixer/MixPreview';
import MixControls from './features/mixer/MixControls';
import {
  SpotifyPlaylist,
  MixOptions,
  RatioConfig,
  PlaylistMixResult,
  MixedTrack,
} from '../types';
import styles from './PlaylistMixer.module.css';

interface PlaylistMixerProps {
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;
  mixOptions: MixOptions;
  updateMixOptions: (updates: Partial<MixOptions>) => void;
  onMixedPlaylist?: (result: SpotifyPlaylist) => void;
  onError?: (error: string) => void;
}

const PlaylistMixer: React.FC<PlaylistMixerProps> = ({
  accessToken,
  selectedPlaylists,
  ratioConfig,
  mixOptions,
  updateMixOptions,
  onMixedPlaylist,
  onError,
}) => {
  // Custom hooks
  const mixGeneration = useMixGeneration(accessToken, {
    onError,
  });

  const mixPreview = useMixPreview(accessToken, {
    onError,
  });

  // Calculate warnings using the dedicated hook
  const { exceedsLimit, ratioImbalance } = useMixWarnings(
    selectedPlaylists,
    ratioConfig,
    mixOptions
  );

  // Clear preview when mix options change (but avoid infinite loops)
  const prevMixOptionsRef = useRef(mixOptions);
  useEffect(() => {
    const prev = prevMixOptionsRef.current;
    const current = mixOptions;

    // Only clear if meaningful options that affect mixing have changed
    const shouldClearPreview =
      prev.totalSongs !== current.totalSongs ||
      prev.targetDuration !== current.targetDuration ||
      prev.useTimeLimit !== current.useTimeLimit ||
      prev.useAllSongs !== current.useAllSongs ||
      prev.shuffleWithinGroups !== current.shuffleWithinGroups ||
      prev.popularityStrategy !== current.popularityStrategy ||
      prev.recencyBoost !== current.recencyBoost ||
      prev.continueWhenPlaylistEmpty !== current.continueWhenPlaylistEmpty;

    if (shouldClearPreview) {
      mixPreview.clearPreview();
      prevMixOptionsRef.current = current;
    }
  }, [mixOptions, mixPreview]);

  // Generate preview
  const handleGeneratePreview = useCallback(async () => {
    await mixPreview.generatePreview(
      selectedPlaylists,
      ratioConfig,
      mixOptions
    );
  }, [selectedPlaylists, ratioConfig, mixOptions, mixPreview]);

  // Handle track order changes in preview
  const handlePreviewOrderChange = useCallback(
    (reorderedTracks: MixedTrack[]) => {
      mixPreview.updateTrackOrder(reorderedTracks);
    },
    [mixPreview]
  );

  // Create final playlist
  const handleCreatePlaylist = useCallback(async () => {
    try {
      // Priority 1: Use preview tracks if available (includes any user reordering)
      const previewTracks = mixPreview.getPreviewTracks();

      let finalTracks: MixedTrack[];
      if (previewTracks.length > 0) {
        // User has generated a preview (possibly with custom ordering)
        // Use these tracks as the definitive final list
        finalTracks = previewTracks;
      } else {
        // No preview available - generate fresh mix with current settings
        // This handles the case where user clicks "Create" without previewing
        finalTracks = await mixGeneration.generateMix(
          selectedPlaylists,
          ratioConfig,
          mixOptions
        );
      }

      // Create the Spotify playlist with the final track list
      const result = await mixGeneration.createPlaylist(
        mixOptions.playlistName,
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
    mixOptions,
    mixGeneration,
    mixPreview,
    onMixedPlaylist,
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>🎵 Create Your Mix</h2>
        <p className={styles.subtitle}>
          Blend your playlists into the perfect mix
        </p>
      </div>

      <PlaylistForm
        mixOptions={mixOptions}
        onMixOptionsChange={updateMixOptions}
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
          accessToken={accessToken}
          selectedPlaylists={selectedPlaylists}
        />
      )}

      <MixControls
        selectedPlaylists={selectedPlaylists}
        mixOptions={mixOptions}
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
