import { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag } from '../components/DragContext';

/**
 * Unified drag-and-drop hook that handles mouse, touch, and keyboard interactions
 * @param {Object} options - Configuration options
 * @param {Function} options.onDragStart - Called when drag starts
 * @param {Function} options.onDragEnd - Called when drag ends
 * @param {Function} options.onDrop - Called when item is dropped
 * @param {Function} options.onDragOver - Called during drag over
 * @param {string} options.type - Type of draggable item (default: 'default')
 * @param {*} options.data - Data to be dragged
 * @param {boolean} options.disabled - Whether dragging is disabled
 * @param {number} options.longPressDelay - Long press delay in ms (default: 250)
 * @param {number} options.scrollThreshold - Auto-scroll threshold in px (default: 80)
 * @param {HTMLElement} options.scrollContainer - Container for auto-scrolling
 * @returns {Object} Drag handlers and state
 */
const useDraggable = ({
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  type = 'default',
  data,
  disabled = false,
  longPressDelay = 250,
  scrollThreshold = 80,
  scrollContainer,
} = {}) => {
  const dragContext = useDrag();

  // Internal state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);

  // Touch state
  const [touchState, setTouchState] = useState({
    isActive: false,
    startY: 0,
    currentY: 0,
    startX: 0,
    currentX: 0,
    longPressTimer: null,
    isLongPress: false,
    element: null,
  });

  // Keyboard state
  const [keyboardState, setKeyboardState] = useState({
    isActive: false,
    selectedIndex: -1,
    isDragging: false,
  });

  // Refs for cleanup and state tracking
  const autoScrollRef = useRef(null);
  const currentScrollSpeed = useRef(0);
  const dragStateRef = useRef({
    html5Active: false,
    touchActive: false,
    keyboardActive: false,
  });

  // Auto-scroll functionality
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    currentScrollSpeed.current = 0;
  }, []);

  const calculateScrollSpeed = useCallback(
    (distanceFromEdge, maxDistance, isOutOfBounds = false) => {
      if (isOutOfBounds) {
        const outOfBoundsDistance = Math.abs(distanceFromEdge);
        const baseOutOfBoundsSpeed = 30;
        const maxOutOfBoundsSpeed = 60;
        const outOfBoundsAcceleration = Math.min(1, outOfBoundsDistance / 100);
        return (
          baseOutOfBoundsSpeed +
          (maxOutOfBoundsSpeed - baseOutOfBoundsSpeed) * outOfBoundsAcceleration
        );
      }

      const normalizedDistance = Math.max(
        0,
        Math.min(1, distanceFromEdge / maxDistance)
      );
      const proximity = 1 - normalizedDistance;
      const accelerationFactor = Math.pow(proximity, 2);
      const minSpeed = 2;
      const maxSpeed = 20;
      return minSpeed + (maxSpeed - minSpeed) * accelerationFactor;
    },
    []
  );

  const startAutoScroll = useCallback(
    (direction, targetSpeed) => {
      if (!scrollContainer) return;

      if (autoScrollRef.current) {
        currentScrollSpeed.current = targetSpeed;
        return;
      }

      currentScrollSpeed.current = targetSpeed;

      const scroll = () => {
        const container = scrollContainer;
        if (!container) return;

        const scrollAmount = currentScrollSpeed.current;
        const currentScrollTop = container.scrollTop;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        if (direction === 'up' && currentScrollTop > 0) {
          container.scrollTop = Math.max(0, currentScrollTop - scrollAmount);
        } else if (direction === 'down' && currentScrollTop < maxScrollTop) {
          container.scrollTop = Math.min(
            maxScrollTop,
            currentScrollTop + scrollAmount
          );
        }

        if (
          (direction === 'up' && container.scrollTop > 0) ||
          (direction === 'down' && container.scrollTop < maxScrollTop)
        ) {
          autoScrollRef.current = requestAnimationFrame(scroll);
        } else {
          stopAutoScroll();
        }
      };

      autoScrollRef.current = requestAnimationFrame(scroll);
    },
    [scrollContainer, stopAutoScroll]
  );

  const checkAutoScroll = useCallback(
    clientY => {
      if (!scrollContainer) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const outOfBoundsBuffer = 5;

      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      // Check for out-of-bounds scrolling
      if (
        clientY < containerRect.top + outOfBoundsBuffer &&
        scrollContainer.scrollTop > 0
      ) {
        const speed = calculateScrollSpeed(
          distanceFromTop,
          scrollThreshold,
          true
        );
        startAutoScroll('up', speed);
      } else if (
        clientY > containerRect.bottom - outOfBoundsBuffer &&
        scrollContainer.scrollTop <
          scrollContainer.scrollHeight - scrollContainer.clientHeight
      ) {
        const speed = calculateScrollSpeed(
          distanceFromBottom,
          scrollThreshold,
          true
        );
        startAutoScroll('down', speed);
      } else if (
        distanceFromTop < scrollThreshold &&
        distanceFromTop >= outOfBoundsBuffer &&
        scrollContainer.scrollTop > 0
      ) {
        const speed = calculateScrollSpeed(
          distanceFromTop,
          scrollThreshold,
          false
        );
        startAutoScroll('up', speed);
      } else if (
        distanceFromBottom < scrollThreshold &&
        distanceFromBottom >= outOfBoundsBuffer &&
        scrollContainer.scrollTop <
          scrollContainer.scrollHeight - scrollContainer.clientHeight
      ) {
        const speed = calculateScrollSpeed(
          distanceFromBottom,
          scrollThreshold,
          false
        );
        startAutoScroll('down', speed);
      } else {
        stopAutoScroll();
      }
    },
    [
      scrollContainer,
      scrollThreshold,
      calculateScrollSpeed,
      startAutoScroll,
      stopAutoScroll,
    ]
  );

  // Provide haptic feedback
  const provideHapticFeedback = useCallback(pattern => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Unified drag start
  const startDrag = useCallback(
    (item, dragType = type) => {
      if (disabled) return;

      setIsDragging(true);
      setDraggedItem(item);

      // Notify context
      if (dragContext) {
        dragContext.startDrag(item, dragType);
      }

      // Call user callback
      if (onDragStart) {
        onDragStart(item, dragType);
      }

      // Provide haptic feedback
      provideHapticFeedback(50);
    },
    [disabled, type, dragContext, onDragStart, provideHapticFeedback]
  );

  // Unified drag end
  const endDrag = useCallback(
    (reason = 'success') => {
      setIsDragging(false);
      setDraggedItem(null);
      setDropPosition(null);

      // Stop auto-scrolling
      stopAutoScroll();

      // Reset all states
      setTouchState(prev => ({
        ...prev,
        isActive: false,
        isLongPress: false,
        longPressTimer: null,
      }));

      setKeyboardState(prev => ({
        ...prev,
        isDragging: false,
      }));

      // Notify context
      if (dragContext) {
        dragContext.endDrag(reason);
      }

      // Call user callback
      if (onDragEnd) {
        onDragEnd(reason);
      }

      // Reset state tracking
      dragStateRef.current = {
        html5Active: false,
        touchActive: false,
        keyboardActive: false,
      };
    },
    [dragContext, onDragEnd, stopAutoScroll]
  );

  // HTML5 Drag Handlers
  const handleDragStart = useCallback(
    e => {
      if (disabled) {
        e.preventDefault();
        return;
      }

      dragStateRef.current.html5Active = true;

      if (dragContext) {
        dragContext.notifyHTML5DragStart();
      }

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.target.outerHTML);

      if (data) {
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({ type, data })
        );
      }

      startDrag(data || e.target, 'html5');
    },
    [disabled, dragContext, data, type, startDrag]
  );

  const handleDragEnd = useCallback(
    e => {
      dragStateRef.current.html5Active = false;

      if (dragContext) {
        dragContext.notifyHTML5DragEnd();
      }

      const wasSuccessful = e?.dataTransfer?.dropEffect !== 'none';
      endDrag(wasSuccessful ? 'success' : 'cancel');
    },
    [dragContext, endDrag]
  );

  const handleDragOver = useCallback(
    e => {
      if (disabled) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Check auto-scroll
      checkAutoScroll(e.clientY);

      // Calculate drop position
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const isTopHalf = e.clientY < midpoint;

      const position = {
        isTopHalf,
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.currentTarget,
      };

      setDropPosition(position);

      if (onDragOver) {
        onDragOver(e, position);
      }
    },
    [disabled, checkAutoScroll, onDragOver]
  );

  const handleDrop = useCallback(
    e => {
      if (disabled) return;

      e.preventDefault();
      stopAutoScroll();

      let dropData = null;

      // Try to get data from context first
      if (dragContext && dragContext.draggedItem) {
        dropData = dragContext.draggedItem;
      } else {
        // Fallback to dataTransfer
        try {
          const jsonData = e.dataTransfer.getData('application/json');
          if (jsonData) {
            dropData = JSON.parse(jsonData);
          }
        } catch (error) {
          console.warn('Failed to parse drop data:', error);
        }
      }

      if (onDrop && dropData) {
        onDrop(dropData, dropPosition, e);
      }

      endDrag('success');
    },
    [disabled, stopAutoScroll, dragContext, onDrop, dropPosition, endDrag]
  );

  // Touch Handlers
  const handleTouchStart = useCallback(
    e => {
      if (disabled) return;

      const touch = e.touches[0];
      const element = e.currentTarget;

      // Clear any existing timer
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Set up long press detection
      const longPressTimer = setTimeout(() => {
        const currentY = touchState.currentY || touch.clientY;
        const currentX = touchState.currentX || touch.clientX;
        const deltaY = Math.abs(currentY - touch.clientY);
        const deltaX = Math.abs(currentX - touch.clientX);

        // Only start long press if user hasn't moved much
        if (deltaY < 15 && deltaX < 15) {
          dragStateRef.current.touchActive = true;

          if (dragContext) {
            dragContext.notifyTouchDragStart();
          }

          setTouchState(prev => ({
            ...prev,
            isLongPress: true,
          }));

          startDrag(data || element, 'touch');
          provideHapticFeedback(100); // Stronger feedback for long press
        }
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
      dragContext,
      data,
      startDrag,
      provideHapticFeedback,
    ]
  );

  const handleTouchMove = useCallback(
    e => {
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

      // Cancel long press if user moves too much
      if (!touchState.isLongPress && (deltaY > 15 || deltaX > 15)) {
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
        if (e.cancelable) {
          e.preventDefault();
        }

        // Check auto-scroll
        checkAutoScroll(touch.clientY);

        // Dispatch custom drag over event for external listeners
        if (scrollContainer) {
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
      touchState.currentY,
      touchState.currentX,
      checkAutoScroll,
      scrollContainer,
      data,
      type,
    ]
  );

  const handleTouchEnd = useCallback(
    e => {
      if (disabled || !touchState.isActive) return;

      // Clear long press timer
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Handle drop if long press was active
      if (touchState.isLongPress) {
        const touch = e.changedTouches[0];

        // Dispatch custom drop event
        if (scrollContainer) {
          const customEvent = new CustomEvent('externalDrop', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
              draggedItem: { data, type },
            },
          });
          scrollContainer.dispatchEvent(customEvent);
        }

        dragStateRef.current.touchActive = false;

        if (dragContext) {
          dragContext.notifyTouchDragEnd();
        }

        provideHapticFeedback([30, 50, 30]); // Success feedback
      }

      // Reset touch state
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
    },
    [
      disabled,
      touchState,
      scrollContainer,
      data,
      type,
      dragContext,
      provideHapticFeedback,
    ]
  );

  // Keyboard Handlers
  const handleKeyDown = useCallback(
    e => {
      if (disabled) return;

      const { key } = e;

      switch (key) {
        case ' ': // Spacebar - select/start drag
          e.preventDefault();
          if (!keyboardState.isDragging) {
            dragStateRef.current.keyboardActive = true;
            setKeyboardState(prev => ({ ...prev, isDragging: true }));
            startDrag(data || e.target, 'keyboard');
          } else {
            // Drop
            if (onDrop) {
              onDrop({ data, type }, dropPosition, e);
            }
            endDrag('success');
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (keyboardState.isDragging && onDragOver) {
            const position = { direction: 'up', key: 'ArrowUp' };
            setDropPosition(position);
            onDragOver(e, position);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (keyboardState.isDragging && onDragOver) {
            const position = { direction: 'down', key: 'ArrowDown' };
            setDropPosition(position);
            onDragOver(e, position);
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (keyboardState.isDragging) {
            dragStateRef.current.keyboardActive = false;
            setKeyboardState(prev => ({ ...prev, isDragging: false }));
            endDrag('cancel');
          }
          break;

        default:
          break;
      }
    },
    [
      disabled,
      keyboardState,
      data,
      type,
      startDrag,
      onDrop,
      dropPosition,
      endDrag,
      onDragOver,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();

      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }
    };
  }, [stopAutoScroll, touchState.longPressTimer]);

  // Return drag handlers and state
  const dragHandleProps = {
    draggable: !disabled,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onKeyDown: handleKeyDown,
    tabIndex: disabled ? -1 : 0,
    role: 'button',
    'aria-grabbed': isDragging,
  };

  const dropZoneProps = {
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragLeave: e => {
      // Clear drop position when leaving drop zone
      setTimeout(() => {
        if (!e.relatedTarget?.closest('[draggable="true"]')) {
          setDropPosition(null);
        }
      }, 10);
    },
  };

  return {
    // Props to spread on draggable elements
    dragHandleProps,

    // Props to spread on drop zones
    dropZoneProps,

    // State
    isDragging,
    draggedItem,
    dropPosition,

    // Touch state for external use
    touchState: {
      isLongPress: touchState.isLongPress,
      isActive: touchState.isActive,
    },

    // Keyboard state for external use
    keyboardState: {
      isDragging: keyboardState.isDragging,
      selectedIndex: keyboardState.selectedIndex,
    },

    // Manual control functions
    startDrag,
    endDrag,

    // Auto-scroll control
    checkAutoScroll,
    stopAutoScroll,

    // Utility functions
    provideHapticFeedback,
  };
};

export default useDraggable;
