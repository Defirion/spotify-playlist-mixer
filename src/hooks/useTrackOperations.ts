import { useCallback } from 'react';
import { useScrollPosition } from '../store';
import { MixedTrack, SpotifyTrack } from '../types';

interface UseTrackOperationsOptions {
  tracks: MixedTrack[];
  onTrackOrderChange?: (tracks: MixedTrack[]) => void;
  scrollContainerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook for managing track operations with centralized scroll position handling
 */
export const useTrackOperations = ({
  tracks,
  onTrackOrderChange,
  scrollContainerRef,
}: UseTrackOperationsOptions) => {
  const { captureScrollPosition } = useScrollPosition();

  // Centralized scroll position capture with error handling
  const handleScrollPositionCapture = useCallback(() => {
    if (scrollContainerRef.current) {
      const currentScrollTop = scrollContainerRef.current.scrollTop;
      console.log('[TrackOperations] Capturing scroll position', {
        currentScrollTop,
        containerHeight: scrollContainerRef.current.clientHeight,
        scrollHeight: scrollContainerRef.current.scrollHeight,
        timestamp: Date.now(),
      });
      try {
        captureScrollPosition(scrollContainerRef.current);
      } catch (error) {
        console.error(
          '[TrackOperations] Error capturing scroll position:',
          error
        );
      }
    } else {
      console.warn(
        '[TrackOperations] Cannot capture scroll position: scroll container ref is null'
      );
    }
  }, [captureScrollPosition, scrollContainerRef]);

  const handleInternalReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !onTrackOrderChange) return;

      // Capture scroll position before reordering
      handleScrollPositionCapture();

      const newTracks = [...tracks];
      const draggedTrack = newTracks[fromIndex];

      // Remove the dragged track from its original position
      newTracks.splice(fromIndex, 1);

      // Calculate the correct insertion index after removal
      let insertIndex = toIndex;
      if (fromIndex < toIndex) {
        insertIndex = toIndex - 1;
      }

      // Insert the track at the new position
      newTracks.splice(insertIndex, 0, draggedTrack);

      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleExternalAdd = useCallback(
    (track: MixedTrack, insertIndex?: number) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before adding external track
      handleScrollPositionCapture();

      const newTracks = [...tracks];
      const finalInsertIndex = insertIndex ?? tracks.length;

      newTracks.splice(finalInsertIndex, 0, track);
      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleTrackRemove = useCallback(
    (index: number) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before removing track
      handleScrollPositionCapture();

      const newTracks = [...tracks];
      newTracks.splice(index, 1);
      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleAddUnselectedTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before adding tracks
      handleScrollPositionCapture();

      // Convert SpotifyTrack to MixedTrack by ensuring sourcePlaylist is set
      const mixedTracks: MixedTrack[] = tracksToAdd.map(track => ({
        ...track,
        sourcePlaylist: track.sourcePlaylist || 'unknown',
      }));
      const newTracks = [...tracks, ...mixedTracks];
      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleAddSpotifyTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before adding tracks
      handleScrollPositionCapture();

      // Convert SpotifyTrack to MixedTrack by ensuring sourcePlaylist is set
      const mixedTracks: MixedTrack[] = tracksToAdd.map(track => ({
        ...track,
        sourcePlaylist: track.sourcePlaylist || 'search',
      }));
      const newTracks = [...tracks, ...mixedTracks];
      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  return {
    handleInternalReorder,
    handleExternalAdd,
    handleTrackRemove,
    handleAddUnselectedTracks,
    handleAddSpotifyTracks,
  };
};
