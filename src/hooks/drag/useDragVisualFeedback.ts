import { useEffect } from 'react';

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
  // Body scroll locking effect
  useEffect(() => {
    let scrollY = 0;

    if (isDragging) {
      // Store current scroll position and apply lock
      scrollY = window.scrollY;

      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      document.body.classList.add('no-user-select', 'drag-active');
    } else {
      // Restore scroll position and unlock
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';

      document.body.classList.remove('no-user-select', 'drag-active');

      // Use requestAnimationFrame to ensure DOM is settled before restoring scroll
      window.requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }

    return () => {
      // Cleanup in case component unmounts while dragging
      if (isDragging) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        document.body.classList.remove('no-user-select', 'drag-active');

        window.requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    };
  }, [isDragging]);

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
