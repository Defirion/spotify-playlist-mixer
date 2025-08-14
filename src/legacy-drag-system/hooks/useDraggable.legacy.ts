import { useCallback, useRef, useEffect } from 'react';
import { DragSourceType, DragOptions } from '../types/dragAndDrop';
import { UseDraggableReturn } from '../types/hooks';
import { useDragState } from './drag/useDragState';
import { useDragHandlers } from './drag/useDragHandlers';
import { useTouchDrag } from './drag/useTouchDrag';
import { useKeyboardDrag } from './drag/useKeyboardDrag';
import { useAutoScroll } from './drag/useAutoScroll';
import { useDragVisualFeedback } from './drag/useDragVisualFeedback';
import { useDragCleanup } from './drag/useDragCleanup';

/**
 * Creates a fallback return object when the hook fails to initialize properly
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createFallbackReturn = (): UseDraggableReturn => ({
  dragHandleProps: {
    draggable: false,
    onDragStart: () => {},
    onDragEnd: () => {},
    onTouchStart: () => {},
    onTouchMove: () => {},
    onTouchEnd: () => {},
    onKeyDown: () => {},
    tabIndex: -1,
    role: 'button',
    'aria-grabbed': false,
  },
  dropZoneProps: {
    onDragOver: () => {},
    onDrop: () => {},
    onDragLeave: () => {},
  },
  isDragging: false,
  draggedItem: null,
  dropPosition: null,
  touchState: {
    isActive: false,
    startY: 0,
    currentY: 0,
    startX: 0,
    currentX: 0,
    longPressTimer: null,
    isLongPress: false,
    element: null,
  },
  keyboardState: {
    isActive: false,
    selectedIndex: -1,
    isDragging: false,
  },
  startDrag: () => {},
  endDrag: () => {},
  checkAutoScroll: () => {},
  stopAutoScroll: () => {},
  provideHapticFeedback: () => {},
});

/**
 * Main orchestrator hook for drag-and-drop operations
 *
 * This hook integrates all modular drag hooks to provide a unified interface
 * for drag-and-drop functionality. It maintains backward compatibility with
 * existing component interfaces while using the new centralized architecture.
 *
 * Features:
 * - Centralized state management via Zustand store
 * - Modular hook architecture for maintainability
 * - Cross-platform support (mouse, touch, keyboard)
 * - Auto-scroll functionality
 * - Visual feedback and accessibility
 * - Comprehensive cleanup and memory management
 */
const useDraggable = <T extends DragSourceType>({
  type = 'internal-track' as T,
  data,
  disabled = false,
  longPressDelay = 300,
  scrollThreshold = 80,
  scrollContainer,
  onDragStart,
  onDragEnd,
  onMove,
}: Partial<DragOptions<T>> = {}): UseDraggableReturn => {
  // Initialize cleanup system for this component
  const cleanup = useDragCleanup(`useDraggable-${type}`);

  // Get drag state from centralized store
  const dragStateResult = useDragState();

  const { isDragging, draggedItem, startDrag, endDrag, isCurrentlyDragged } =
    dragStateResult || {
      isDragging: false,
      draggedItem: null,
      startDrag: () => {},
      endDrag: () => {},
      isCurrentlyDragged: () => false,
    };

  const isThisItemDragged = isCurrentlyDragged
    ? isCurrentlyDragged((data as any)?.id || (data as any)?.track?.id || '')
    : false;

  // Ref for the draggable element to attach native event listeners
  const elementRef = useRef<HTMLElement | null>(null);

  // Initialize modular hooks - must be called unconditionally
  const dragHandlersResult = useDragHandlers({
    type,
    data,
    disabled,
    onDragStart: item => {
      // Defer the state update to avoid render phase updates
      setTimeout(() => {
        startDrag(item);
        onDragStart?.(item);
      }, 0);
    },
    onDragEnd: (item, success) => {
      // Defer the state update to avoid render phase updates
      setTimeout(() => {
        endDrag();
        onDragEnd?.(item, success);
      }, 0);
    },
  });

  const { createDragItem, handleHTML5DragStart, handleHTML5DragEnd, canDrag } =
    dragHandlersResult || {
      createDragItem: () => ({
        id: '',
        type,
        payload: {} as any,
        timestamp: Date.now(),
      }),
      handleHTML5DragStart: () => null,
      handleHTML5DragEnd: () => {},
      canDrag: () => false,
    };

  const touchDragResult = useTouchDrag({
    disabled,
    longPressDelay,
    createDragItem,
    onDragStart: item => {
      // Check if already dragging the same item (coordination scenario)
      const itemId = (data as any)?.id || (data as any)?.track?.id || '';
      const isSameItem = isDragging && draggedItem?.id === itemId;

      if (isDragging && !isSameItem) {
        console.warn(
          '[useDraggable] Attempted to start touch drag while already dragging different item',
          {
            currentItem: draggedItem,
            newItem: item,
            timestamp: Date.now(),
          }
        );
        return;
      }

      // Defer the state update to avoid render phase updates
      setTimeout(() => {
        startDrag(item);
        onDragStart?.(item);
      }, 0);
    },
    onDragEnd: (item, success) => {
      // Only end drag if we're actually dragging
      if (isDragging) {
        endDrag();
      }
      onDragEnd?.(item, success);
    },
    checkAutoScroll: undefined, // Will be set below
    scrollContainer,
    data,
    type,
  });

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    touchState,
    cleanup: touchCleanup,
  } = touchDragResult || {
    handleTouchStart: () => {},
    handleTouchMove: () => {},
    handleTouchEnd: () => {},
    touchState: { isActive: false },
    cleanup: () => {},
  };

  const keyboardDragResult = useKeyboardDrag({
    disabled,
    createDragItem,
    isCurrentlyDragged: isThisItemDragged,
    onDragStart: item => {
      // Check if already dragging to prevent double starts
      if (isDragging) {
        console.warn(
          '[useDraggable] Attempted to start keyboard drag while already dragging',
          {
            currentItem: draggedItem,
            newItem: item,
            timestamp: Date.now(),
          }
        );
        return;
      }

      // Defer the state update to avoid render phase updates
      setTimeout(() => {
        startDrag(item);
        onDragStart?.(item);
      }, 0);
    },
    onDragEnd: (item, success) => {
      // Only end drag if we're actually dragging
      if (isDragging) {
        endDrag();
      }
      onDragEnd?.(item, success);
    },
    onMove,
  });

  const { handleKeyDown, keyboardState } = keyboardDragResult || {
    handleKeyDown: () => {},
    keyboardState: { isActive: false },
  };

  const autoScrollResult = useAutoScroll({
    scrollContainer,
    scrollThreshold,
  });

  const { checkAutoScroll, stopAutoScroll } = autoScrollResult || {
    checkAutoScroll: () => {},
    stopAutoScroll: () => {},
  };

  const visualFeedbackResult = useDragVisualFeedback({
    isDragging,
    isCurrentlyDragged: isThisItemDragged,
    draggedItem,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dragClasses, dragStyles } = visualFeedbackResult || {
    dragClasses: {},
    dragStyles: {},
  };

  // Update touch drag hook with auto-scroll function
  // Note: This is a bit of a hack to pass the checkAutoScroll function to useTouchDrag
  // In a future refactor, we could improve this by making useTouchDrag accept the function directly
  const touchDragRef = useRef({ checkAutoScroll });
  touchDragRef.current.checkAutoScroll = checkAutoScroll;

  // HTML5 drag event handlers with store integration
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      try {
        // Check if touch drag is already active for this item
        const itemId = (data as any)?.id || (data as any)?.track?.id || '';
        const isTouchDragActive = isDragging && draggedItem?.id === itemId;

        if (isTouchDragActive) {
          console.log(
            '[useDraggable] HTML5 drag starting for item already in touch drag - coordinating',
            {
              itemId,
              touchDragItem: draggedItem,
              timestamp: Date.now(),
            }
          );
          // Allow HTML5 drag to proceed for animation, but don't create new drag item
          // The touch drag has already initiated the drag state
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify(draggedItem)
          );
          return;
        }

        // Normal HTML5 drag start
        const dragItem = handleHTML5DragStart(e);
        // Store integration is handled in useDragHandlers
      } catch (error) {
        console.error('[useDraggable] Error in handleDragStart:', error);
      }
    },
    [handleHTML5DragStart, isDragging, draggedItem, data]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      try {
        handleHTML5DragEnd(e, draggedItem as any);
        // Store integration is handled in useDragHandlers
      } catch (error) {
        console.error('[useDraggable] Error in handleDragEnd:', error);
      }
    },
    [handleHTML5DragEnd, draggedItem]
  );

  // Drop zone handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      try {
        if (disabled || !isDragging) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        checkAutoScroll(e.clientY);
      } catch (error) {
        console.error('[useDraggable] Error in handleDragOver:', error);
      }
    },
    [disabled, isDragging, checkAutoScroll]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      try {
        if (disabled) return;

        e.preventDefault();
        stopAutoScroll();

        // Drop handling is delegated to the component
        // The component should handle the drop logic based on draggedItem from store
      } catch (error) {
        console.error('[useDraggable] Error in handleDrop:', error);
      }
    },
    [disabled, stopAutoScroll]
  );

  const handleDragLeave = useCallback(() => {
    try {
      // Visual feedback cleanup can be handled here if needed
    } catch (error) {
      console.error('[useDraggable] Error in handleDragLeave:', error);
    }
  }, []);

  // Set up native touch event listeners with non-passive options
  // Use refs to avoid recreating handlers and prevent constant re-adding of listeners
  const touchHandlersRef = useRef({
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  });

  // Update handler refs when dependencies change
  useEffect(() => {
    touchHandlersRef.current = {
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Set up event listeners only once when element changes or disabled state changes
  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Stable event handlers that use refs to get current handlers
    const nativeTouchStart = (e: TouchEvent) => {
      const syntheticEvent = {
        ...e,
        currentTarget: e.currentTarget,
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        cancelable: e.cancelable,
      } as any;
      touchHandlersRef.current.handleTouchStart(syntheticEvent);
    };

    const nativeTouchMove = (e: TouchEvent) => {
      const syntheticEvent = {
        ...e,
        currentTarget: e.currentTarget,
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        cancelable: e.cancelable,
      } as any;
      touchHandlersRef.current.handleTouchMove(syntheticEvent);
    };

    const nativeTouchEnd = (e: TouchEvent) => {
      const syntheticEvent = {
        ...e,
        currentTarget: e.currentTarget,
        touches: Array.from(e.touches),
        changedTouches: Array.from(e.changedTouches),
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        cancelable: e.cancelable,
      } as any;
      touchHandlersRef.current.handleTouchEnd(syntheticEvent);
    };

    // Add non-passive event listeners (only log once to reduce spam)
    console.log('[useDraggable] Setting up native touch event listeners');

    element.addEventListener('touchstart', nativeTouchStart, {
      passive: false,
    });
    element.addEventListener('touchmove', nativeTouchMove, {
      passive: false,
    });
    element.addEventListener('touchend', nativeTouchEnd, {
      passive: false,
    });

    return () => {
      element.removeEventListener('touchstart', nativeTouchStart);
      element.removeEventListener('touchmove', nativeTouchMove);
      element.removeEventListener('touchend', nativeTouchEnd);
    };
  }, [disabled]); // Only depend on disabled state, not the handler functions

  // Register cleanup callbacks for drag-specific resources
  useEffect(() => {
    const unregisterCleanup = cleanup.addCleanupCallback(() => {
      try {
        stopAutoScroll();
        touchCleanup();

        // Cancel any active drag operation
        if (isDragging) {
          endDrag();
        }
      } catch (error) {
        console.error('[useDraggable] Error in drag cleanup:', error);
      }
    });

    return unregisterCleanup;
  }, [cleanup, stopAutoScroll, touchCleanup, isDragging, endDrag]);

  // Create unified event handler props with proper prop spreading
  const dragHandleProps = {
    ref: (el: HTMLElement | null) => {
      elementRef.current = el;
    },
    draggable: !disabled && canDrag(),
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    // Remove React synthetic touch events since we use native ones
    // onTouchStart: handleTouchStart,
    // onTouchMove: handleTouchMove,
    // onTouchEnd: handleTouchEnd,
    onKeyDown: handleKeyDown,
    tabIndex: disabled ? -1 : 0,
    role: 'button',
    'aria-grabbed': isThisItemDragged,
  };

  const dropZoneProps = {
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragLeave: handleDragLeave,
  };

  return {
    // Props to spread on draggable elements
    dragHandleProps,

    // Props to spread on drop zones
    dropZoneProps,

    // State from centralized store
    isDragging,
    draggedItem: draggedItem as any, // Cast to match old DragItem type
    dropPosition: null, // Not used in new architecture but kept for compatibility

    // Internal state for testing and debugging (backward compatibility)
    touchState: touchState as any,
    keyboardState: keyboardState as any,

    // Functions for backward compatibility
    startDrag: () => {}, // Not exposed in new architecture
    endDrag: () => {}, // Not exposed in new architecture
    checkAutoScroll: checkAutoScroll,
    stopAutoScroll: stopAutoScroll,
    provideHapticFeedback: () => {}, // Not exposed in new architecture
  };
};

export default useDraggable;

/**
 * Type-safe wrapper for useDraggable hook with specific drag source types
 */
export const useInternalTrackDraggable = (
  options: Omit<DragOptions<'internal-track'>, 'type'>
) => useDraggable({ ...options, type: 'internal-track' });

export const useModalTrackDraggable = (
  options: Omit<DragOptions<'modal-track'>, 'type'>
) => useDraggable({ ...options, type: 'modal-track' });

export const useSearchTrackDraggable = (
  options: Omit<DragOptions<'search-track'>, 'type'>
) => useDraggable({ ...options, type: 'search-track' });
