// useEffect removed - scroll locking now handled by useGlobalScrollLock

interface UseDragVisualFeedbackOptions {
  isDragging: boolean;
  isCurrentlyDragged?: boolean;
  draggedItem?: any;
}

interface UseDragVisualFeedbackReturn {
  dragClasses: {
    'drag-active': boolean;
    'currently-dragged': boolean;
  };
  dragStyles: {
    opacity: number;
    transform: string;
  };
}

/**
 * Hook for managing visual feedback during drag operations
 * Handles body scroll locking, CSS class management, and visual styling
 */
export const useDragVisualFeedback = ({
  isDragging,
  isCurrentlyDragged = false,
  draggedItem,
}: UseDragVisualFeedbackOptions): UseDragVisualFeedbackReturn => {
  // Note: Global scroll locking is now handled by useGlobalScrollLock hook
  // This hook only manages component-level visual feedback

  return {
    dragClasses: {
      'drag-active': isDragging,
      'currently-dragged': isCurrentlyDragged,
    },
    dragStyles: {
      opacity: isCurrentlyDragged ? 0.5 : 1,
      transform: isCurrentlyDragged ? 'scale(1.02)' : 'scale(1)',
    },
  };
};
