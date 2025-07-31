import { useCallback, useState } from 'react';
import { MixedTrack } from '../types';

interface DropPosition {
  index: number;
  isTopHalf: boolean;
}

interface UseTrackReorderingOptions {
  tracks: MixedTrack[];
  onTrackOrderChange?: (tracks: MixedTrack[]) => void;
  onScrollPositionCapture?: () => void;
}

interface UseTrackReorderingReturn {
  dropPosition: DropPosition | null;
  setDropPosition: (position: DropPosition | null) => void;
  handleInternalReorder: (fromIndex: number, toIndex: number) => void;
  handleExternalAdd: (track: MixedTrack, insertIndex?: number) => void;
  handleTrackRemove: (index: number) => void;
  calculateDropPosition: (
    clientY: number,
    targetElement: HTMLElement,
    currentIndex: number
  ) => DropPosition;
}

/**
 * Custom hook for managing track reordering logic
 * Handles internal drag-and-drop reordering and external track additions
 */
export const useTrackReordering = ({
  tracks,
  onTrackOrderChange,
  onScrollPositionCapture,
}: UseTrackReorderingOptions): UseTrackReorderingReturn => {
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  const handleInternalReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !onTrackOrderChange) return;

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

      // Capture scroll position before updating
      if (onScrollPositionCapture) {
        onScrollPositionCapture();
      }

      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, onScrollPositionCapture]
  );

  const handleExternalAdd = useCallback(
    (track: MixedTrack, insertIndex?: number) => {
      if (!onTrackOrderChange) return;

      const newTracks = [...tracks];
      const finalInsertIndex = insertIndex ?? tracks.length;

      newTracks.splice(finalInsertIndex, 0, track);

      // Capture scroll position before updating
      if (onScrollPositionCapture) {
        onScrollPositionCapture();
      }

      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, onScrollPositionCapture]
  );

  const handleTrackRemove = useCallback(
    (index: number) => {
      if (!onTrackOrderChange) return;

      const newTracks = [...tracks];
      newTracks.splice(index, 1);

      // Capture scroll position before updating
      if (onScrollPositionCapture) {
        onScrollPositionCapture();
      }

      onTrackOrderChange(newTracks);
    },
    [tracks, onTrackOrderChange, onScrollPositionCapture]
  );

  const calculateDropPosition = useCallback(
    (
      clientY: number,
      targetElement: HTMLElement,
      currentIndex: number
    ): DropPosition => {
      const rect = targetElement.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const isTopHalf = clientY < midpoint;

      return {
        index: isTopHalf ? currentIndex : currentIndex + 1,
        isTopHalf,
      };
    },
    []
  );

  return {
    dropPosition,
    setDropPosition,
    handleInternalReorder,
    handleExternalAdd,
    handleTrackRemove,
    calculateDropPosition,
  };
};

export default useTrackReordering;
