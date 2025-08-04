import { StateCreator } from 'zustand';
import {
  DragSlice,
  DraggedItem,
  DragSourceType,
} from '../../types/dragAndDrop';

export const createDragSlice: StateCreator<
  DragSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  DragSlice
> = (set, get) => ({
  // Drag state
  isDragging: false,
  draggedItem: null,
  dragStartTime: null,

  // Scroll position state
  scrollTop: null,

  // Drag actions
  startDrag: <T extends DragSourceType>(item: DraggedItem<T>) => {
    const currentState = get();

    // Prevent concurrent drags
    if (currentState.isDragging) {
      console.warn(
        '[DragSlice] Attempted to start drag while already dragging',
        {
          currentItem: currentState.draggedItem,
          newItem: item,
          timestamp: Date.now(),
        }
      );
      return;
    }

    // Validate drag item structure
    if (!item || !item.id || !item.type || !item.payload) {
      console.error('[DragSlice] Invalid drag item provided', {
        item,
        timestamp: Date.now(),
      });
      return;
    }

    console.log(`[DragSlice] Starting drag operation`, {
      type: item.type,
      id: item.id,
      payload: item.payload,
      timestamp: item.timestamp,
    });

    set(
      {
        isDragging: true,
        draggedItem: item,
        dragStartTime: Date.now(),
      },
      false,
      'drag/startDrag'
    );
  },

  endDrag: () => {
    const currentState = get();

    if (!currentState.isDragging) {
      console.warn('[DragSlice] Attempted to end drag when not dragging', {
        timestamp: Date.now(),
      });
      return;
    }

    const dragDuration = currentState.dragStartTime
      ? Date.now() - currentState.dragStartTime
      : 0;

    console.log('[DragSlice] Ending drag operation successfully', {
      draggedItem: currentState.draggedItem,
      duration: dragDuration,
      timestamp: Date.now(),
    });

    set(
      {
        isDragging: false,
        draggedItem: null,
        dragStartTime: null,
      },
      false,
      'drag/endDrag'
    );
  },

  cancelDrag: () => {
    const currentState = get();

    if (!currentState.isDragging) {
      console.warn('[DragSlice] Attempted to cancel drag when not dragging', {
        timestamp: Date.now(),
      });
      return;
    }

    const dragDuration = currentState.dragStartTime
      ? Date.now() - currentState.dragStartTime
      : 0;

    console.log('[DragSlice] Canceling drag operation', {
      draggedItem: currentState.draggedItem,
      duration: dragDuration,
      reason: 'user_cancelled',
      timestamp: Date.now(),
    });

    set(
      {
        isDragging: false,
        draggedItem: null,
        dragStartTime: null,
      },
      false,
      'drag/cancelDrag'
    );
  },

  // Scroll position management
  captureScrollPosition: (container: HTMLElement) => {
    if (!container) {
      console.error(
        '[DragSlice] Cannot capture scroll position: container is null',
        {
          timestamp: Date.now(),
        }
      );
      return;
    }

    try {
      const scrollTop = container.scrollTop;

      console.log(`[DragSlice] Capturing scroll position`, {
        scrollTop,
        containerHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        timestamp: Date.now(),
      });

      set({ scrollTop }, false, 'drag/captureScrollPosition');
    } catch (error) {
      console.error('[DragSlice] Error capturing scroll position', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
    }
  },

  restoreScrollPosition: (container: HTMLElement) => {
    const currentState = get();

    if (!container) {
      console.error(
        '[DragSlice] Cannot restore scroll position: container is null',
        {
          timestamp: Date.now(),
        }
      );
      return;
    }

    if (currentState.scrollTop === null) {
      console.debug('[DragSlice] No scroll position to restore', {
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const targetScrollTop = currentState.scrollTop;
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const clampedScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, maxScrollTop)
      );

      console.log(`[DragSlice] Restoring scroll position`, {
        targetScrollTop,
        clampedScrollTop,
        maxScrollTop,
        containerHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
        timestamp: Date.now(),
      });

      container.scrollTop = clampedScrollTop;

      // Clear scroll position after successful restoration
      set({ scrollTop: null }, false, 'drag/clearScrollPosition');
    } catch (error) {
      console.error('[DragSlice] Error restoring scroll position', {
        error: error instanceof Error ? error.message : 'Unknown error',
        targetScrollTop: currentState.scrollTop,
        timestamp: Date.now(),
      });

      // Clear scroll position even on error to prevent stuck state
      set({ scrollTop: null }, false, 'drag/clearScrollPosition');
    }
  },

  clearScrollPosition: () => {
    const currentState = get();

    if (currentState.scrollTop !== null) {
      console.log('[DragSlice] Clearing captured scroll position', {
        clearedScrollTop: currentState.scrollTop,
        timestamp: Date.now(),
      });
    }

    set({ scrollTop: null }, false, 'drag/clearScrollPosition');
  },
});
