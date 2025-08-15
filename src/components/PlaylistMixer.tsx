import React, { useCallback, useEffect, useRef } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMixGeneration } from '../hooks/useMixGeneration';
import { useMixPreview } from '../hooks/useMixPreview';
import { useMixWarnings } from '../hooks/useMixWarnings';
import { useDragSensors } from '../hooks/useDragSensors';
import { getTrackDragId } from '../utils/trackUtils';
import PlaylistForm from './features/mixer/PlaylistForm';
import MixPreview from './features/mixer/MixPreview';
import MixControls from './features/mixer/MixControls';
import { SpotifyPlaylist, MixOptions, RatioConfig, MixedTrack } from '../types';
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
  const sensors = useDragSensors();

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

  // Simple drag start handler - only for visual feedback
  const handleDragStart = useCallback(() => {
    console.log('Drag started - adding dnd-dragging class');
    document.body.classList.add('dnd-dragging');
  }, []);

  const handleDragCancel = useCallback(() => {
    console.log('Drag cancelled - removing dnd-dragging class');
    document.body.classList.remove('dnd-dragging');
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log('Drag ended - removing dnd-dragging class');
      document.body.classList.remove('dnd-dragging');

      const { active, over } = event;

      console.log('Drag end event:', {
        activeId: active.id,
        overId: over?.id,
        activeContext: active.data.current?.context,
        hasTrackData: !!active.data.current?.track,
      });

      if (!over) return;

      const previewTracks = mixPreview.getPreviewTracks();

      // Check if this is an external drag (from modal)
      const isExternalDrag = active.data.current?.context === 'modal';

      if (isExternalDrag) {
        // Adding a new track from modal
        const trackData = active.data.current?.track;
        if (!trackData) return;

        // Create new track instance with unique ID using utility function
        const newTrack: MixedTrack = {
          ...trackData,
          sourcePlaylist: trackData.sourcePlaylist || 'unknown',
          instanceId: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        console.log('Created new track with instanceId:', newTrack.instanceId);

        // Find where to insert the track
        const targetIndex = previewTracks.findIndex(
          t => getTrackDragId(t) === over.id
        );

        if (targetIndex >= 0) {
          // Insert before the target track
          const updatedTracks = [...previewTracks];
          updatedTracks.splice(targetIndex, 0, newTrack);
          console.log('Inserting track at position:', targetIndex);
          mixPreview.updateTrackOrder(updatedTracks);
        } else {
          // Add to end if no target found or list is empty
          const updatedTracks = [...previewTracks, newTrack];
          console.log('Adding track to end');
          mixPreview.updateTrackOrder(updatedTracks);
        }
        return;
      }

      // Handle reordering within preview
      const activeInPreview = previewTracks.find(t => t.id === active.id);
      const overInPreview = previewTracks.find(t => t.id === over.id);

      console.log('Reorder debug:', {
        activeId: active.id,
        overId: over.id,
        activeInPreview: !!activeInPreview,
        overInPreview: !!overInPreview,
        previewTrackIds: previewTracks.map(t => t.id),
        activeContext: active.data.current?.context,
      });

      if (activeInPreview && overInPreview) {
        const oldIndex = previewTracks.findIndex(t => t.id === active.id);
        const newIndex = previewTracks.findIndex(t => t.id === over.id);

        if (oldIndex !== newIndex) {
          const reorderedTracks = arrayMove(previewTracks, oldIndex, newIndex);
          console.log('Reordering within preview:', oldIndex, '->', newIndex);
          mixPreview.updateTrackOrder(reorderedTracks);
        }
      } else {
        console.log('Reorder failed - tracks not found in preview');
      }
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
          Happy with your mix? Create the playlist or regenerate with your
          current settings
        </p>
      </div>
    </DndContext>
  );
};

export default PlaylistMixer;
