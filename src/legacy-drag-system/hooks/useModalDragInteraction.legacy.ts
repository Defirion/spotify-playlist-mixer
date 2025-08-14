import { useMemo } from 'react';
import { useDragState } from './drag/useDragState';

/**
 * Hook for managing modal drag interaction coordination.
 * Handles visual muting and pointer events during drag operations.
 *
 * According to Requirement 8.3: ALL modals should become muted during ANY drag operation
 * so the drag can be completed on the preview panel behind the modal.
 */
export const useModalDragInteraction = () => {
  const { isDragging, draggedItem } = useDragState();

  // Determine if this modal should be muted during drag operations
  const shouldMuteModal = useMemo(() => {
    return isDragging && !!draggedItem;
  }, [isDragging, draggedItem]);

  // Calculate modal styles based on drag state
  const modalStyles = useMemo(
    () => ({
      opacity: shouldMuteModal ? 0 : 1,
      pointerEvents: shouldMuteModal ? ('none' as const) : ('auto' as const),
      zIndex: shouldMuteModal ? -1 : 1000, // Move modal behind everything during drag
      transition: 'opacity 0.2s ease-in-out',
    }),
    [shouldMuteModal]
  );

  const backdropStyles = useMemo(
    () => ({
      pointerEvents: shouldMuteModal ? ('none' as const) : ('auto' as const),
      opacity: shouldMuteModal ? 0 : 1,
      transition: 'opacity 0.2s ease-in-out',
    }),
    [shouldMuteModal]
  );

  return {
    shouldMuteModal,
    modalStyles,
    backdropStyles,
    isDragging,
  };
};
