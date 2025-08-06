import { useState, useCallback } from 'react';
import { SpotifyTrack } from '../types';

interface UseTrackSelectionOptions {
  availableTracks: SpotifyTrack[];
  onAddTracks: (tracks: SpotifyTrack[]) => void;
}

/**
 * Hook for managing track selection state in modal components.
 * Provides unified track selection logic with add functionality.
 */
export const useTrackSelection = ({
  availableTracks,
  onAddTracks,
}: UseTrackSelectionOptions) => {
  const [selectedTracksToAdd, setSelectedTracksToAdd] = useState<Set<string>>(
    new Set()
  );

  const handleTrackSelect = useCallback(
    (track: SpotifyTrack) => {
      const newSelected = new Set(selectedTracksToAdd);
      if (newSelected.has(track.id)) {
        newSelected.delete(track.id);
      } else {
        newSelected.add(track.id);
      }
      setSelectedTracksToAdd(newSelected);
    },
    [selectedTracksToAdd]
  );

  const handleAddSelected = useCallback(() => {
    const tracksToAdd = availableTracks.filter(track =>
      selectedTracksToAdd.has(track.id)
    );
    onAddTracks(tracksToAdd);

    // Clear selected tracks but keep modal open for continued browsing
    setSelectedTracksToAdd(new Set());
  }, [availableTracks, selectedTracksToAdd, onAddTracks]);

  const clearSelection = useCallback(() => {
    setSelectedTracksToAdd(new Set());
  }, []);

  return {
    selectedTracksToAdd,
    handleTrackSelect,
    handleAddSelected,
    clearSelection,
  };
};
