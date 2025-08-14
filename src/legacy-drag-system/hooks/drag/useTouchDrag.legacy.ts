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
  longPressDelay = 300, // Optimized for mobile responsiveness while avoiding accidental drags
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
  const dragStartedRef = useRef<boolean>(false); // Track if drag has been initiated to prevent double starts
  const touchStartTimeRef = useRef<number>(0); // Track touch start time for debugging
  const lastTouchStartRef = useRef<number>(0); // Debounce rapid touch starts

  // Provide haptic feedback for touch interactions
  const provideHapticFeedback = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (disabled) return;

      const startTime = Date.now();

      // Debounce rapid touch starts (prevent double taps within 100ms)
      if (startTime - lastTouchStartRef.current < 100) {
        console.debug('[useTouchDrag] Ignoring rapid touch start', {
          timeSinceLastTouch: startTime - lastTouchStartRef.current,
          timestamp: startTime,
        });
        return;
      }

      lastTouchStartRef.current = startTime;

      // Don't prevent default on touch start to avoid passive listener issues
      // We'll prevent default on touch move when drag is active

      const touch = e.touches[0];
      const element = e.currentTarget as HTMLElement;

      // Reset drag state to prevent double starts
      dragStartedRef.current = false;
      touchStartTimeRef.current = startTime;

      // Clear any existing timer to prevent memory leaks
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Set up long press detection with improved timing
      const longPressTimer = setTimeout(() => {
        setTouchState(prev => {
          // Double-check that we haven't already started a drag
          if (dragStartedRef.current) {
            console.warn(
              '[useTouchDrag] Long press triggered but drag already started, ignoring'
            );
            return prev;
          }

          // Check if touch is still active and hasn't moved too much
          const deltaY = Math.abs(prev.currentY - prev.startY);
          const deltaX = Math.abs(prev.currentX - prev.startX);

          if (
            prev.isActive &&
            deltaY < movementThreshold &&
            deltaX < movementThreshold
          ) {
            try {
              // Mark drag as started to prevent double starts
              dragStartedRef.current = true;

              // Create and store drag item
              const dragItem = createDragItem();
              dragItemRef.current = dragItem;

              console.log(
                '[useTouchDrag] Long press successful, starting drag',
                {
                  dragItem,
                  touchDuration: Date.now() - touchStartTimeRef.current,
                  movement: { deltaX, deltaY },
                  timestamp: Date.now(),
                }
              );

              // Call callbacks with error handling
              try {
                onDragStart?.(dragItem);
              } catch (error) {
                console.error(
                  '[useTouchDrag] Error in onDragStart callback:',
                  error
                );
              }

              provideHapticFeedback(100);

              // CRITICAL FIX: Apply visual feedback for mobile touch drag
              // Since HTML5 drag animation may not work on mobile, we need to provide our own
              if (prev.element) {
                try {
                  // Add drag-active class for visual feedback
                  prev.element.classList.add('touch-drag-active');

                  // Apply immediate visual feedback
                  prev.element.style.opacity = '0.7';
                  prev.element.style.transform = 'scale(1.02)';
                  prev.element.style.zIndex = '1000';
                  prev.element.style.pointerEvents = 'none';

                  console.log(
                    '[useTouchDrag] Applied touch drag visual feedback',
                    {
                      element: prev.element.tagName,
                      timestamp: Date.now(),
                    }
                  );
                } catch (error) {
                  console.debug(
                    '[useTouchDrag] Could not apply visual feedback:',
                    error
                  );
                }
              }

              return {
                ...prev,
                isLongPress: true,
              };
            } catch (error) {
              console.error(
                '[useTouchDrag] Error during long press drag start:',
                error
              );
              dragStartedRef.current = false;
              return prev;
            }
          } else {
            console.debug(
              '[useTouchDrag] Long press cancelled due to movement or inactive touch',
              {
                isActive: prev.isActive,
                movement: { deltaX, deltaY },
                threshold: movementThreshold,
              }
            );
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

      // Only log occasionally to reduce spam
      if (Date.now() % 200 < 50) {
        // Log roughly every 200ms
        console.log('[useTouchDrag] Touch move detected:', {
          isActive: touchState.isActive,
          isLongPress: touchState.isLongPress,
          dragStarted: dragStartedRef.current,
          clientY: touch.clientY,
          deltaY,
          deltaX,
          timestamp: Date.now(),
        });
      }

      // Update current position and get the updated state
      let currentTouchState = touchState;
      setTouchState(prev => {
        currentTouchState = {
          ...prev,
          currentY: touch.clientY,
          currentX: touch.clientX,
        };
        return currentTouchState;
      });

      // Cancel long press if user moves too much before it triggers
      if (
        !currentTouchState.isLongPress &&
        !dragStartedRef.current &&
        (deltaY > movementThreshold || deltaX > movementThreshold)
      ) {
        if (currentTouchState.longPressTimer) {
          console.debug(
            '[useTouchDrag] Cancelling long press due to movement',
            {
              movement: { deltaX, deltaY },
              threshold: movementThreshold,
              touchDuration: Date.now() - touchStartTimeRef.current,
            }
          );

          clearTimeout(currentTouchState.longPressTimer);
          setTouchState(prev => ({
            ...prev,
            longPressTimer: null,
          }));
        }
        return;
      }

      // Handle dragging if drag has been started (either by long press or other means)
      if (dragStartedRef.current) {
        // Prevent scrolling during drag - only if event is cancelable
        try {
          if (e.cancelable) {
            e.preventDefault();
          }
        } catch (error) {
          // Ignore passive event listener errors
          console.debug(
            '[useTouchDrag] Could not prevent default on touch move (passive listener)'
          );
        }

        // Check auto-scroll if function is provided
        try {
          checkAutoScroll?.(touch.clientY);
        } catch (error) {
          console.error('[useTouchDrag] Error in checkAutoScroll:', error);
        }

        // Notify about drag movement
        try {
          onDragMove?.(touch.clientX, touch.clientY);
        } catch (error) {
          console.error('[useTouchDrag] Error in onDragMove:', error);
        }

        // Dispatch custom drag over event for all drag types (internal and external)
        if (scrollContainer && data && type) {
          try {
            // Use different event names based on drag type for better handling
            const eventName =
              type === 'internal-track'
                ? 'internalDragOver'
                : 'externalDragOver';

            const customEvent = new CustomEvent(eventName, {
              detail: {
                clientX: touch.clientX,
                clientY: touch.clientY,
                draggedItem: dragItemRef.current,
              },
            });

            // Only log occasionally to reduce spam
            if (Date.now() % 300 < 50) {
              console.log(`[useTouchDrag] Dispatching ${eventName} event:`, {
                clientY: touch.clientY,
                draggedItem: dragItemRef.current,
                scrollContainer: scrollContainer.tagName,
                timestamp: Date.now(),
              });
            }

            scrollContainer.dispatchEvent(customEvent);
          } catch (error) {
            console.error(
              '[useTouchDrag] Error dispatching drag over event:',
              error
            );
          }
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

      const touchDuration = Date.now() - touchStartTimeRef.current;
      const wasLongPress = touchState.isLongPress;
      const dragWasStarted = dragStartedRef.current;

      console.log('[useTouchDrag] Touch end', {
        wasLongPress,
        dragWasStarted,
        touchDuration,
        timestamp: Date.now(),
      });

      // Clear long press timer to prevent memory leaks
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Handle drop if drag was started (regardless of long press state at this point)
      if (dragWasStarted) {
        const touch = e.changedTouches[0];

        // Capture drag item before any state changes
        const currentDragItem = dragItemRef.current;

        // Dispatch custom drop event for all drag types (internal and external)
        if (scrollContainer && data && type) {
          try {
            // Use different event names based on drag type for better handling
            const eventName =
              type === 'internal-track' ? 'internalDrop' : 'externalDrop';

            const customEvent = new CustomEvent(eventName, {
              detail: {
                clientX: touch.clientX,
                clientY: touch.clientY,
                draggedItem: currentDragItem,
              },
            });
            console.log(`[useTouchDrag] Dispatching ${eventName} event:`, {
              clientY: touch.clientY,
              draggedItem: currentDragItem,
              scrollContainer: scrollContainer.tagName,
              timestamp: Date.now(),
            });
            scrollContainer.dispatchEvent(customEvent);
          } catch (error) {
            console.error(
              '[useTouchDrag] Error dispatching drop event:',
              error
            );
          }
        }

        // Provide success haptic feedback
        provideHapticFeedback([30, 50, 30]);

        console.log('[useTouchDrag] Ending drag with success', {
          dragItem: currentDragItem,
          touchDuration,
          timestamp: Date.now(),
        });

        // Notify drag end with success - use immediate execution instead of setTimeout
        // to prevent timing issues with component unmounting
        try {
          onDragEnd?.(currentDragItem, true);
        } catch (error) {
          console.error('[useTouchDrag] Error in onDragEnd callback:', error);
        }
      } else {
        // No drag was started, this is just a normal touch
        console.debug('[useTouchDrag] Touch ended without drag operation', {
          touchDuration,
          wasLongPress,
          timestamp: Date.now(),
        });
      }

      // Clean up visual feedback
      if (touchState.element) {
        try {
          touchState.element.classList.remove('touch-drag-active');
          touchState.element.style.opacity = '';
          touchState.element.style.transform = '';
          touchState.element.style.zIndex = '';
          touchState.element.style.pointerEvents = '';

          console.log('[useTouchDrag] Cleaned up touch drag visual feedback', {
            element: touchState.element.tagName,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.debug(
            '[useTouchDrag] Could not clean up visual feedback:',
            error
          );
        }
      }

      // Reset all state immediately to prevent race conditions
      dragStartedRef.current = false;
      touchStartTimeRef.current = 0;
      lastTouchStartRef.current = 0;

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

      // Clear drag item ref after a small delay to ensure callbacks have executed
      setTimeout(() => {
        dragItemRef.current = null;
      }, 50); // Increased from 10ms to 50ms for better reliability
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
    console.log('[useTouchDrag] Cleanup triggered', {
      wasActive: touchState.isActive,
      wasLongPress: touchState.isLongPress,
      dragStarted: dragStartedRef.current,
      timestamp: Date.now(),
    });

    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
    }

    // Clean up visual feedback
    if (touchState.element) {
      try {
        touchState.element.classList.remove('touch-drag-active');
        touchState.element.style.opacity = '';
        touchState.element.style.transform = '';
        touchState.element.style.zIndex = '';
        touchState.element.style.pointerEvents = '';
      } catch (error) {
        console.debug(
          '[useTouchDrag] Could not clean up visual feedback during cleanup:',
          error
        );
      }
    }

    // If drag was active, notify about cancellation
    if (dragStartedRef.current && dragItemRef.current) {
      try {
        onDragEnd?.(dragItemRef.current, false);
      } catch (error) {
        console.error(
          '[useTouchDrag] Error in onDragEnd during cleanup:',
          error
        );
      }
    }

    // Reset all state
    dragStartedRef.current = false;
    touchStartTimeRef.current = 0;
    lastTouchStartRef.current = 0;

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
  }, [
    touchState.longPressTimer,
    touchState.isActive,
    touchState.isLongPress,
    touchState.element,
    onDragEnd,
  ]);

  return {
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cleanup,
    provideHapticFeedback,
  };
};
