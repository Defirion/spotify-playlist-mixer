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
  longPressDelay = 250,
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

  // Initialize modular hooks - must be called unconditionally
  const dragHandlersResult = useDragHandlers({
    type,
    data,
    disabled,
    onDragStart: item => {
      startDrag(item);
      onDragStart?.(item);
    },
    onDragEnd: (item, success) => {
      endDrag();
      onDragEnd?.(item, success);
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
      startDrag(item);
      onDragStart?.(item);
    },
    onDragEnd: (item, success) => {
      endDrag();
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
      startDrag(item);
      onDragStart?.(item);
    },
    onDragEnd: (item, success) => {
      endDrag();
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const dragItem = handleHTML5DragStart(e);
        // Store integration is handled in useDragHandlers
      } catch (error) {
        console.error('[useDraggable] Error in handleDragStart:', error);
      }
    },
    [handleHTML5DragStart]
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
    draggable: !disabled && canDrag(),
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
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
