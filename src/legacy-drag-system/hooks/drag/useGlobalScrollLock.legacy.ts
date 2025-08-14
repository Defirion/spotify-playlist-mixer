import { useEffect } from 'react';
import { useDragState } from '../../store';

/**
 * Global scroll lock manager for drag operations
 * This hook should only be used once at the app level to manage page scroll locking
 * during drag operations. It prevents multiple components from interfering with each other.
 */
export const useGlobalScrollLock = () => {
  const { isDragging } = useDragState();

  useEffect(() => {
    let storedScrollY = 0;

    if (isDragging) {
      // Store current scroll position and apply lock
      storedScrollY = window.scrollY;

      console.log('[useGlobalScrollLock] Applying global scroll lock', {
        storedScrollY,
        timestamp: Date.now(),
      });

      document.body.style.position = 'fixed';
      document.body.style.top = `-${storedScrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      document.body.classList.add('no-user-select', 'drag-active');
    } else {
      // Only restore if we actually had a drag operation
      const wasLocked = document.body.style.position === 'fixed';

      if (wasLocked) {
        // Extract the stored scroll position from the top style
        const topStyle = document.body.style.top;
        const extractedScrollY = topStyle ? Math.abs(parseInt(topStyle)) : 0;

        console.log('[useGlobalScrollLock] Restoring global scroll position', {
          extractedScrollY,
          wasLocked,
          timestamp: Date.now(),
        });

        // Restore scroll position and unlock
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        document.body.classList.remove('no-user-select', 'drag-active');

        // Use requestAnimationFrame to ensure DOM is settled before restoring scroll
        window.requestAnimationFrame(() => {
          window.scrollTo(0, extractedScrollY);
        });
      }
    }

    return () => {
      // Cleanup in case component unmounts while dragging
      const wasLocked = document.body.style.position === 'fixed';

      if (wasLocked) {
        const topStyle = document.body.style.top;
        const extractedScrollY = topStyle ? Math.abs(parseInt(topStyle)) : 0;

        console.log(
          '[useGlobalScrollLock] Cleanup: restoring global scroll position',
          {
            extractedScrollY,
            timestamp: Date.now(),
          }
        );

        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        document.body.classList.remove('no-user-select', 'drag-active');

        window.requestAnimationFrame(() => {
          window.scrollTo(0, extractedScrollY);
        });
      }
    };
  }, [isDragging]);
};
