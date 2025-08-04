import { useState, useRef, useCallback } from 'react';
import { DraggedItem, DragSourceType } from '../../types/dragAndDrop';

interface TouchState {
  isActive: boolean;
  startY: number;
  currentY: number;
  startX: number;
  currentX: number;
  longPressTimer: NodeJS.Timeout | null;
  isLongPress: boolean;
  element: HTMLElement | null;
}

interface UseTouchDragOptions<T extends DragSourceType> {
  disabled?: boolean;
  longPressDelay?: number;
  movementThreshold?: number;
  createDragItem: () => DraggedItem<T>;
  onDragStart?: (item: DraggedItem<T>) => void;
  onDragEnd?: (item: DraggedItem<T> | null, success: boolean) => void;
  onDragMove?: (clientX: number, clientY: number) => void;
  checkAutoScroll?: (clientY: number) => void;
  scrollContainer?: HTMLElement | null;
  data?: any;
  type?: T;
}

/**
 * Hook for handling touch-based drag operations with long-press detection
 * Extracted from useDraggable.ts to provide modular touch functionality
 */
export const useTouchDrag = <T extends DragSourceType>({
  disabled = false,
  longPressDelay = 250,
  movementThreshold = 15,
  createDragItem,
  onDragStart,
  onDragEnd,
  onDragMove,
  checkAutoScroll,
  scrollContainer,
  data,
  type,
}: UseTouchDragOptions<T>) => {
  const [touchState, setTouchState] = useState<TouchState>({
    isActive: false,
    startY: 0,
    currentY: 0,
    startX: 0,
    currentX: 0,
    longPressTimer: null,
    isLongPress: false,
    element: null,
  });

  const dragItemRef = useRef<DraggedItem<T> | null>(null);

  // Provide haptic feedback for touch interactions
  const provideHapticFeedback = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled) return;

      const touch = e.touches[0];
      const element = e.currentTarget as HTMLElement;

      // Clear any existing timer to prevent memory leaks
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Set up long press detection
      const longPressTimer = setTimeout(() => {
        setTouchState(prev => {
          // Check if touch is still active and hasn't moved too much
          const deltaY = Math.abs(prev.currentY - prev.startY);
          const deltaX = Math.abs(prev.currentX - prev.startX);

          if (
            prev.isActive &&
            deltaY < movementThreshold &&
            deltaX < movementThreshold
          ) {
            // Create and store drag item
            const dragItem = createDragItem();
            dragItemRef.current = dragItem;

            // Call callbacks immediately
            onDragStart?.(dragItem);
            provideHapticFeedback(100);

            return {
              ...prev,
              isLongPress: true,
            };
          }

          return prev;
        });
      }, longPressDelay);

      setTouchState({
        isActive: true,
        startY: touch.clientY,
        currentY: touch.clientY,
        startX: touch.clientX,
        currentX: touch.clientX,
        longPressTimer,
        isLongPress: false,
        element,
      });
    },
    [
      disabled,
      touchState.longPressTimer,
      longPressDelay,
      movementThreshold,
      createDragItem,
      onDragStart,
      provideHapticFeedback,
    ]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || !touchState.isActive) return;

      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - touchState.startY);
      const deltaX = Math.abs(touch.clientX - touchState.startX);

      // Update current position
      setTouchState(prev => ({
        ...prev,
        currentY: touch.clientY,
        currentX: touch.clientX,
      }));

      // Cancel long press if user moves too much before it triggers
      if (
        !touchState.isLongPress &&
        (deltaY > movementThreshold || deltaX > movementThreshold)
      ) {
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer);
          setTouchState(prev => ({
            ...prev,
            longPressTimer: null,
          }));
        }
        return;
      }

      // Handle dragging if long press is active
      if (touchState.isLongPress) {
        // Prevent scrolling during drag
        if (e.cancelable) {
          e.preventDefault();
        }

        // Check auto-scroll if function is provided
        checkAutoScroll?.(touch.clientY);

        // Notify about drag movement
        onDragMove?.(touch.clientX, touch.clientY);

        // Dispatch custom drag over event for external listeners (preserving existing behavior)
        if (scrollContainer && data && type) {
          const customEvent = new CustomEvent('externalDragOver', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
              draggedItem: { data, type },
            },
          });
          scrollContainer.dispatchEvent(customEvent);
        }
      }
    },
    [
      disabled,
      touchState.isActive,
      touchState.startY,
      touchState.startX,
      touchState.isLongPress,
      touchState.longPressTimer,
      movementThreshold,
      checkAutoScroll,
      onDragMove,
      scrollContainer,
      data,
      type,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled || !touchState.isActive) return;

      // Clear long press timer to prevent memory leaks
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Handle drop if long press was active
      if (touchState.isLongPress) {
        const touch = e.changedTouches[0];

        // Capture drag item before any state changes
        const currentDragItem = dragItemRef.current;

        // Dispatch custom drop event (preserving existing behavior)
        if (scrollContainer && data && type) {
          const customEvent = new CustomEvent('externalDrop', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
              draggedItem: { data, type },
            },
          });
          scrollContainer.dispatchEvent(customEvent);
        }

        // Provide success haptic feedback
        provideHapticFeedback([30, 50, 30]);

        // Notify drag end with success
        setTimeout(() => {
          onDragEnd?.(currentDragItem, true);
        }, 0);
      }

      // Reset touch state and clear drag item ref
      setTouchState({
        isActive: false,
        startY: 0,
        currentY: 0,
        startX: 0,
        currentX: 0,
        longPressTimer: null,
        isLongPress: false,
        element: null,
      });

      // Clear drag item ref after a delay to ensure callbacks have executed
      setTimeout(() => {
        dragItemRef.current = null;
      }, 10);
    },
    [
      disabled,
      touchState.isActive,
      touchState.longPressTimer,
      touchState.isLongPress,
      scrollContainer,
      data,
      type,
      provideHapticFeedback,
      onDragEnd,
    ]
  );

  // Cleanup function for component unmount
  const cleanup = useCallback(() => {
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
    }

    // Reset state
    setTouchState({
      isActive: false,
      startY: 0,
      currentY: 0,
      startX: 0,
      currentX: 0,
      longPressTimer: null,
      isLongPress: false,
      element: null,
    });

    dragItemRef.current = null;
  }, [touchState.longPressTimer]);

  return {
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cleanup,
    provideHapticFeedback,
  };
};
