import { useCallback, useRef, useEffect } from 'react';
import { DragSourceType, DragOptions } from '../types/dragAndDrop';
import { UseDraggableReturn } from '../types/hooks';
import { useDragState } from './drag/useDragState';
import { useDragHandlers } from './drag/useDragHandlers';
import { useTouchDrag } from './drag/useTouchDrag';
import { useKeyboardDrag } from './drag/useKeyboardDrag';
import { useAutoScroll } from './drag/useAutoScroll';
import { useDragVisualFeedback } from './drag/useDragVisualFeedback';

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
  // Get drag state from centralized store
  const { isDragging, draggedItem, startDrag, endDrag, isCurrentlyDragged } =
    useDragState();

  const isThisItemDragged = isCurrentlyDragged(
    (data as any)?.id || (data as any)?.track?.id || ''
  );

  // Initialize modular hooks
  const { createDragItem, handleHTML5DragStart, handleHTML5DragEnd, canDrag } =
    useDragHandlers({
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

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    touchState,
    cleanup: touchCleanup,
  } = useTouchDrag({
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

  const { handleKeyDown, keyboardState } = useKeyboardDrag({
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

  const { checkAutoScroll, stopAutoScroll } = useAutoScroll({
    scrollContainer,
    scrollThreshold,
  });

  const { dragClasses, dragStyles } = useDragVisualFeedback({
    isDragging,
    isCurrentlyDragged: isThisItemDragged,
    draggedItem,
  });

  // Update touch drag hook with auto-scroll function
  // Note: This is a bit of a hack to pass the checkAutoScroll function to useTouchDrag
  // In a future refactor, we could improve this by making useTouchDrag accept the function directly
  const touchDragRef = useRef({ checkAutoScroll });
  touchDragRef.current.checkAutoScroll = checkAutoScroll;

  // HTML5 drag event handlers with store integration
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      const dragItem = handleHTML5DragStart(e);
      // Store integration is handled in useDragHandlers
    },
    [handleHTML5DragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      handleHTML5DragEnd(e, draggedItem as any);
      // Store integration is handled in useDragHandlers
    },
    [handleHTML5DragEnd, draggedItem]
  );

  // Drop zone handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (disabled || !isDragging) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      checkAutoScroll(e.clientY);
    },
    [disabled, isDragging, checkAutoScroll]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      if (disabled) return;

      e.preventDefault();
      stopAutoScroll();

      // Drop handling is delegated to the component
      // The component should handle the drop logic based on draggedItem from store
    },
    [disabled, stopAutoScroll]
  );

  const handleDragLeave = useCallback(() => {
    // Visual feedback cleanup can be handled here if needed
  }, []);

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
      touchCleanup();
    };
  }, [stopAutoScroll, touchCleanup]);

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
    className: Object.keys(dragClasses)
      .filter(key => dragClasses[key as keyof typeof dragClasses])
      .join(' '),
    style: dragStyles,
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
