import { useState, useCallback } from 'react';
import { SpotifyTrack } from '../types';
import { getTrackDragId } from '../utils/trackUtils';

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

  const handleTrackSelect = useCallback((track: SpotifyTrack) => {
    const id = getTrackDragId(track);
    setSelectedTracksToAdd(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    const tracksToAdd = availableTracks.filter(track =>
      selectedTracksToAdd.has(getTrackDragId(track))
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
