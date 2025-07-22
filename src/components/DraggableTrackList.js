import React, { useState, useEffect } from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import { getPopularityIcon } from '../utils/dragAndDrop';
import { useDrag } from './DragContext';

const DraggableTrackList = ({ tracks, selectedPlaylists, onTrackOrderChange, formatDuration, accessToken }) => {
  const {
    draggedItem,
    isDragging,
    endDrag,
    cancelDrag,
    notifyHTML5DragStart,
    notifyHTML5DragEnd,
    notifyTouchDragStart,
    notifyTouchDragEnd,
    unifiedCleanup
  } = useDrag();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [localTracks, setLocalTracks] = useState(tracks);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  
  // Static container height - 85% of viewport height
  const containerHeight = Math.floor(window.innerHeight * 0.85);

  // Ref for the scrollable container
  const scrollContainerRef = React.useRef(null);

  // Auto-scroll state and refs
  const autoScrollRef = React.useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Touch drag state for mobile
  const [touchDragState, setTouchDragState] = useState({
    isDragging: false,
    startY: 0,
    currentY: 0,
    draggedElement: null,
    startIndex: null,
    longPressTimer: null,
    isLongPress: false,
    scrollY: 0 // Store page scroll position when drag starts
  });



  // Store unifiedCleanup in a ref to avoid useEffect re-runs
  const unifiedCleanupRef = React.useRef(unifiedCleanup);
  unifiedCleanupRef.current = unifiedCleanup;

  // Auto-scroll functionality with acceleration
  const currentScrollSpeed = React.useRef(0);
  
  const startAutoScroll = (direction, targetSpeed) => {
    console.log('[AutoScroll] startAutoScroll called:', { direction, targetSpeed, isAlreadyScrolling: !!autoScrollRef.current });
    
    if (autoScrollRef.current) {
      // Update target speed if already scrolling
      console.log('[AutoScroll] Updating existing scroll speed from', currentScrollSpeed.current, 'to', targetSpeed);
      currentScrollSpeed.current = targetSpeed;
      return;
    }

    currentScrollSpeed.current = targetSpeed;

    const scroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollAmount = currentScrollSpeed.current;
      const currentScrollTop = container.scrollTop;
      const maxScrollTop = container.scrollHeight - container.clientHeight;

      console.log('[AutoScroll] Scrolling:', {
        direction,
        scrollAmount,
        currentScrollTop,
        maxScrollTop,
        willScroll: (direction === 'up' && currentScrollTop > 0) || (direction === 'down' && currentScrollTop < maxScrollTop)
      });

      if (direction === 'up' && currentScrollTop > 0) {
        container.scrollTop = Math.max(0, currentScrollTop - scrollAmount);
      } else if (direction === 'down' && currentScrollTop < maxScrollTop) {
        container.scrollTop = Math.min(maxScrollTop, currentScrollTop + scrollAmount);
      }

      // Continue scrolling if still needed
      if (
        (direction === 'up' && container.scrollTop > 0) ||
        (direction === 'down' && container.scrollTop < maxScrollTop)
      ) {
        autoScrollRef.current = requestAnimationFrame(scroll);
      } else {
        console.log('[AutoScroll] Reached scroll boundary, stopping');
        stopAutoScroll();
      }
    };

    console.log('[AutoScroll] Starting new scroll animation');
    setIsAutoScrolling(true);
    autoScrollRef.current = requestAnimationFrame(scroll);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    currentScrollSpeed.current = 0;
    setIsAutoScrolling(false);
  };

  // Calculate scroll speed based on distance from edge with smooth acceleration
  const calculateScrollSpeed = (distanceFromEdge, maxDistance, isOutOfBounds = false) => {
    if (isOutOfBounds) {
      // Super fast scrolling when out of bounds
      // Speed increases with distance outside container
      const outOfBoundsDistance = Math.abs(distanceFromEdge);
      const baseOutOfBoundsSpeed = 30; // Faster than max in-bounds speed
      const maxOutOfBoundsSpeed = 60; // Maximum turbo speed
      
      // Linear acceleration for out-of-bounds (up to 100px outside)
      const outOfBoundsAcceleration = Math.min(1, outOfBoundsDistance / 100);
      const speed = baseOutOfBoundsSpeed + (maxOutOfBoundsSpeed - baseOutOfBoundsSpeed) * outOfBoundsAcceleration;
      
      console.log('[AutoScroll] OUT OF BOUNDS Speed Calculation:', {
        distanceFromEdge,
        outOfBoundsDistance,
        outOfBoundsAcceleration,
        baseOutOfBoundsSpeed,
        maxOutOfBoundsSpeed,
        finalSpeed: speed
      });
      
      return speed;
    }
    
    // Normal in-bounds calculation
    // Normalize distance (0 = at edge, 1 = at threshold)
    const normalizedDistance = Math.max(0, Math.min(1, distanceFromEdge / maxDistance));
    
    // Invert so closer to edge = higher value
    const proximity = 1 - normalizedDistance;
    
    // Apply exponential curve for smooth acceleration
    // proximity^2 gives nice acceleration curve
    const accelerationFactor = Math.pow(proximity, 2);
    
    // Base speed 2px, max speed 20px per frame
    const minSpeed = 2;
    const maxSpeed = 20;
    
    const speed = minSpeed + (maxSpeed - minSpeed) * accelerationFactor;
    
    console.log('[AutoScroll] IN BOUNDS Speed Calculation:', {
      distanceFromEdge,
      maxDistance,
      normalizedDistance,
      proximity,
      accelerationFactor,
      finalSpeed: speed
    });
    
    return speed;
  };

  // Check if drag position is near container edges and trigger auto-scroll
  const checkAutoScroll = (clientY) => {
    const container = scrollContainerRef.current;
    if (!container) {
      console.log('[AutoScroll] No container ref');
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const scrollThreshold = 80; // Threshold for in-bounds scrolling

    const distanceFromTop = clientY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - clientY;

    // Debug logging
    console.log('[AutoScroll] Debug Info:', {
      clientY,
      containerTop: containerRect.top,
      containerBottom: containerRect.bottom,
      distanceFromTop,
      distanceFromBottom,
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      maxScrollTop: container.scrollHeight - container.clientHeight
    });

    // Add a small buffer to make out-of-bounds detection more sensitive
    const outOfBoundsBuffer = 5; // 5px buffer zone
    
    // Check if dragging above container (out of bounds or very close)
    if (clientY < (containerRect.top + outOfBoundsBuffer) && container.scrollTop > 0) {
      const speed = calculateScrollSpeed(distanceFromTop, scrollThreshold, true);
      console.log('[AutoScroll] OUT OF BOUNDS - Above container:', {
        clientY,
        containerTop: containerRect.top,
        bufferZone: containerRect.top + outOfBoundsBuffer,
        distanceFromTop,
        speed,
        isOutOfBounds: true
      });
      startAutoScroll('up', speed);
    }
    // Check if dragging below container (out of bounds or very close)
    else if (clientY > (containerRect.bottom - outOfBoundsBuffer) && container.scrollTop < container.scrollHeight - container.clientHeight) {
      const speed = calculateScrollSpeed(distanceFromBottom, scrollThreshold, true);
      console.log('[AutoScroll] OUT OF BOUNDS - Below container:', {
        clientY,
        containerBottom: containerRect.bottom,
        bufferZone: containerRect.bottom - outOfBoundsBuffer,
        distanceFromBottom,
        speed,
        isOutOfBounds: true
      });
      startAutoScroll('down', speed);
    }
    // Check if near top edge but still in bounds (outside the out-of-bounds buffer)
    else if (distanceFromTop < scrollThreshold && distanceFromTop >= outOfBoundsBuffer && container.scrollTop > 0) {
      const speed = calculateScrollSpeed(distanceFromTop, scrollThreshold, false);
      console.log('[AutoScroll] IN BOUNDS - Near top:', {
        distanceFromTop,
        speed,
        isOutOfBounds: false
      });
      startAutoScroll('up', speed);
    }
    // Check if near bottom edge but still in bounds (outside the out-of-bounds buffer)
    else if (distanceFromBottom < scrollThreshold && distanceFromBottom >= outOfBoundsBuffer && container.scrollTop < container.scrollHeight - container.clientHeight) {
      const speed = calculateScrollSpeed(distanceFromBottom, scrollThreshold, false);
      console.log('[AutoScroll] IN BOUNDS - Near bottom:', {
        distanceFromBottom,
        speed,
        isOutOfBounds: false
      });
      startAutoScroll('down', speed);
    }
    // Not in scroll zone, stop auto-scroll
    else {
      console.log('[AutoScroll] Not in scroll zone - stopping');
      stopAutoScroll();
    }
  };

  // Centralized scroll lock management - handles all drag operations
  useEffect(() => {
    // Apply scroll lock for both internal drags and external drags from modals
    const isDragActive = (
      draggedIndex !== null ||
      isDragging ||
      touchDragState.isDragging
    );

    if (isDragActive) {
      // Only lock if not already locked and capture current scroll position
      if (document.body.style.position !== 'fixed') {
        const scrollY = window.scrollY;

        // Store scroll position BEFORE applying styles
        document.body.dataset.scrollY = scrollY.toString();

        // Apply scroll lock styles
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.backgroundColor = '#1e2a1e'; // Darker green background
      }
    } else {
      // Only restore if currently locked
      if (document.body.style.position === 'fixed') {
        const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);

        // Remove scroll lock styles
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.backgroundColor = ''; // Revert background color on unmount
        delete document.body.dataset.scrollY;

        // Restore scroll position immediately, then again after animation frame
        window.scrollTo(0, scrollY);
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    }
  }, [draggedIndex, isDragging, touchDragState.isDragging, touchDragState.longPressTimer]);

  // Separate useEffect for component unmount cleanup
  useEffect(() => {
    return () => {
      console.log('[DraggableTrackList] Component unmounting - cleaning up');

      // Stop auto-scrolling
      stopAutoScroll();

      // Always restore scroll state on unmount
      if (document.body.style.position === 'fixed') {
        const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.style.backgroundColor = ''; // Revert background color on unmount
        delete document.body.dataset.scrollY;

        // Restore scroll position
        window.scrollTo(0, scrollY);
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }

      // Clear any pending timers and cleanup drag states
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
      }

      // Unified cleanup on unmount - use ref to avoid dependency issues
      unifiedCleanupRef.current('component-unmount');
    };
  }, [touchDragState.longPressTimer]); // Empty dependency array - only runs on actual unmount

  // Update local tracks when props change
  React.useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  // Handle external drag over events from modals
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleExternalDragOver = (e) => {
      const { clientX, clientY } = e.detail;
      console.log('[DraggableTrackList] External drag over event received:', clientX, clientY);

      // Find which track element is being hovered over
      const trackElements = container.querySelectorAll('[data-track-index]');
      let foundDropTarget = false;

      for (let i = 0; i < trackElements.length; i++) {
        const trackElement = trackElements[i];
        const rect = trackElement.getBoundingClientRect();
        const hoverIndex = parseInt(trackElement.getAttribute('data-track-index'));

        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const midpoint = rect.top + rect.height / 2;
          const isTopHalf = clientY < midpoint;

          setDropLinePosition({
            index: isTopHalf ? hoverIndex : hoverIndex + 1,
            isTopHalf
          });
          foundDropTarget = true;
          console.log('[DraggableTrackList] Drop position set:', isTopHalf ? hoverIndex : hoverIndex + 1);
          break;
        }
      }

      // If not over a specific track, check if over container for end position
      if (!foundDropTarget) {
        const containerRect = container.getBoundingClientRect();
        if (
          clientX >= containerRect.left &&
          clientX <= containerRect.right &&
          clientY >= containerRect.top &&
          clientY <= containerRect.bottom
        ) {
          setDropLinePosition({ index: localTracks.length, isTopHalf: false });
          console.log('[DraggableTrackList] Drop position set to end:', localTracks.length);
        }
      }
    };

    const handleExternalDrop = (e) => {
      const { clientX, clientY, draggedItem } = e.detail;
      console.log('[DraggableTrackList] 🎯 External drop event received!', clientX, clientY);
      console.log('[DraggableTrackList] Current dropLinePosition:', dropLinePosition);

      // If no dropLinePosition, calculate it from the drop coordinates
      let finalDropPosition = dropLinePosition;

      if (!finalDropPosition) {
        console.log('[DraggableTrackList] No dropLinePosition, calculating from coordinates');

        // Find which track element is being hovered over
        const trackElements = container.querySelectorAll('[data-track-index]');
        let foundDropTarget = false;

        for (let i = 0; i < trackElements.length; i++) {
          const trackElement = trackElements[i];
          const rect = trackElement.getBoundingClientRect();
          const hoverIndex = parseInt(trackElement.getAttribute('data-track-index'));

          if (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
          ) {
            const midpoint = rect.top + rect.height / 2;
            const isTopHalf = clientY < midpoint;

            finalDropPosition = {
              index: isTopHalf ? hoverIndex : hoverIndex + 1,
              isTopHalf
            };
            foundDropTarget = true;
            console.log('[DraggableTrackList] Calculated drop position:', finalDropPosition);
            break;
          }
        }

        // If not over a specific track, check if over container for end position
        if (!foundDropTarget) {
          const containerRect = container.getBoundingClientRect();
          if (
            clientX >= containerRect.left &&
            clientX <= containerRect.right &&
            clientY >= containerRect.top &&
            clientY <= containerRect.bottom
          ) {
            finalDropPosition = { index: localTracks.length, isTopHalf: false };
            console.log('[DraggableTrackList] Drop position set to end:', localTracks.length);
          }
        }
      }

      // Process the drop if we have a valid position
      if (finalDropPosition !== null) {
        console.log('[DraggableTrackList] 🎯 PROCESSING DROP from custom event!');
        console.log('[DraggableTrackList] draggedItem:', draggedItem);
        console.log('[DraggableTrackList] finalDropPosition:', finalDropPosition);
        console.log('[DraggableTrackList] localTracks before:', localTracks.length);

        const { data: track, type } = draggedItem;
        const newTracks = [...localTracks];
        const insertIndex = finalDropPosition.index;

        console.log('[DraggableTrackList] Inserting track:', track.name, 'at index:', insertIndex);

        // Insert the track at the specified position
        newTracks.splice(insertIndex, 0, track);

        console.log('[DraggableTrackList] localTracks after:', newTracks.length);

        setLocalTracks(newTracks);

        // Notify parent component of the new track list
        if (onTrackOrderChange) {
          console.log('[DraggableTrackList] Calling onTrackOrderChange with', newTracks.length, 'tracks');
          onTrackOrderChange(newTracks);
        } else {
          console.log('[DraggableTrackList] WARNING: onTrackOrderChange is not defined!');
        }

        // Keep both modals open for continued use after successful drop
        if (type === 'modal-track') {
          console.log('[DraggableTrackList] Keeping AddUnselectedModal open for continued use');
        }
        if (type === 'search-track') {
          console.log('[DraggableTrackList] Keeping SpotifySearchModal open for continued use');
        }

        // Provide completion haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }

        console.log('[DraggableTrackList] 🎯 DROP COMPLETED SUCCESSFULLY from custom event!');

        // Reset states and end drag
        setDropLinePosition(null);
        endDrag('success');
      } else {
        console.log('[DraggableTrackList] No valid drop position could be determined');
      }
    };

    container.addEventListener('externalDragOver', handleExternalDragOver);
    container.addEventListener('externalDrop', handleExternalDrop);
    return () => {
      container.removeEventListener('externalDragOver', handleExternalDragOver);
      container.removeEventListener('externalDrop', handleExternalDrop);
    };
  }, [dropLinePosition, endDrag, localTracks, onTrackOrderChange]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global drag event listeners to capture out-of-bounds dragging
  useEffect(() => {
    const handleGlobalDragOver = (e) => {
      // Only handle if we have an active drag operation
      if (draggedIndex !== null || isDragging) {
        console.log('[AutoScroll] Global drag over detected:', {
          clientY: e.clientY,
          draggedIndex,
          isDragging,
          target: e.target.tagName
        });
        checkAutoScroll(e.clientY);
      }
    };

    const handleGlobalTouchMove = (e) => {
      // Only handle if we have an active touch drag operation
      if ((touchDragState.isDragging && touchDragState.isLongPress) || isDragging) {
        const touch = e.touches[0];
        if (touch) {
          console.log('[AutoScroll] Global touch move detected:', {
            clientY: touch.clientY,
            touchDragState: touchDragState.isDragging,
            isDragging,
            target: e.target.tagName
          });
          checkAutoScroll(touch.clientY);
        }
      }
    };

    // Add global listeners when any drag is active
    if (draggedIndex !== null || isDragging || (touchDragState.isDragging && touchDragState.isLongPress)) {
      console.log('[AutoScroll] Adding global drag listeners');
      document.addEventListener('dragover', handleGlobalDragOver, { passive: false });
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      
      return () => {
        console.log('[AutoScroll] Removing global drag listeners');
        document.removeEventListener('dragover', handleGlobalDragOver);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
      };
    }
  }, [draggedIndex, isDragging, touchDragState.isDragging, touchDragState.isLongPress]);



  // Global touch end listener for mobile drag cancellation (internal drags)
  useEffect(() => {
    if (!isMobile) return;

    const handleGlobalTouchEnd = (e) => {
      // Only handle if we have an active internal touch drag
      if (
        touchDragState.isLongPress &&
        touchDragState.isDragging &&
        draggedIndex !== null
      ) {
        console.log('[DraggableTrackList] Global touch end detected during internal drag');

        // Check if we have a valid drop position
        if (!dropLinePosition) {
          console.log('[DraggableTrackList] Global touch end without valid drop position - cancelling drag');
          cancelDrag('touch-global-no-position');

          // Reset local touch state
          setTouchDragState({
            isDragging: false,
            startY: 0,
            currentY: 0,
            draggedElement: null,
            startIndex: null,
            longPressTimer: null,
            isLongPress: false,
            scrollY: 0
          });
          setDraggedIndex(null);
          setDropLinePosition(null);
        }
      }
    };

    // Add global listener
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isMobile, touchDragState.isLongPress, touchDragState.isDragging, draggedIndex, dropLinePosition, cancelDrag]);

  const handleDragStart = (e, index) => {
    console.log('[DraggableTrackList] HTML5 drag start for index:', index);
    setDraggedIndex(index);
    notifyHTML5DragStart();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Check auto-scroll based on mouse position
    checkAutoScroll(e.clientY);

    // Check if it's an external drag from context or dataTransfer
    const isExternalDrag = isDragging || e.dataTransfer.types.includes('application/json');

    if (isExternalDrag && isDragging) {
      console.log('[DraggableTrackList] External drag detected in dragOver, index:', index);
    }

    // For internal drags, skip if no drag is active or dragging over self
    if (!isExternalDrag && (draggedIndex === null || draggedIndex === index)) return;

    // Calculate if we're in the top or bottom half of the element
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;

    // Determine the insertion position
    let insertPosition;
    if (isTopHalf) {
      insertPosition = index;
    } else {
      insertPosition = index + 1;
    }

    // Don't show drop line if it would be the same position (only for internal drags)
    if (!isExternalDrag && draggedIndex !== null) {
      if (draggedIndex < insertPosition && insertPosition === draggedIndex + 1) return;
      if (draggedIndex > insertPosition && insertPosition === draggedIndex) return;
    }

    setDropLinePosition({ index: insertPosition, isTopHalf });
  };

  const handleDragLeave = (e) => {
    // Store references before setTimeout to avoid null issues
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    // Use a small delay to prevent flickering when moving between elements
    setTimeout(() => {
      // Check if we're still dragging and haven't entered another element
      if (draggedIndex !== null && currentTarget && !relatedTarget?.closest('[draggable="true"]')) {
        const container = currentTarget.closest('[style*="maxHeight"]');
        if (container && !container.contains(relatedTarget)) {
          setDropLinePosition(null);
        }
      }
    }, 10);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    console.log('[DraggableTrackList] handleDrop called, isDragging:', isDragging, 'draggedItem:', draggedItem);

    // Stop auto-scrolling on drop
    stopAutoScroll();

    let dropProcessed = false;

    // Handle external drag from context first (most reliable)
    if (isDragging && draggedItem) {
      console.log('[DraggableTrackList] Processing external drag drop:', draggedItem);
      const { data: track, type } = draggedItem;
      const newTracks = [...localTracks];
      const insertIndex = dropLinePosition ? dropLinePosition.index : localTracks.length;

      // Insert the track at the specified position
      newTracks.splice(insertIndex, 0, track);

      setLocalTracks(newTracks);

      // Notify parent component of the new track list
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }

      setDropLinePosition(null);
      endDrag('success'); // Clear context state with success

      // Keep both modals open for continued use after successful drop
      if (type === 'modal-track') {
        console.log('[DraggableTrackList] Keeping AddUnselectedModal open for continued use');
      }
      if (type === 'search-track') {
        console.log('[DraggableTrackList] Keeping SpotifySearchModal open for continued use');
      }

      dropProcessed = true;
    }

    // Fallback: Check dataTransfer for external drags (backward compatibility)
    if (!dropProcessed) {
      try {
        const dragData = e.dataTransfer.getData('application/json');
        if (dragData) {
          const { type, track } = JSON.parse(dragData);
          if (type === 'modal-track' || type === 'search-track') {
            const newTracks = [...localTracks];
            const insertIndex = dropLinePosition ? dropLinePosition.index : localTracks.length;

            newTracks.splice(insertIndex, 0, track);
            setLocalTracks(newTracks);

            if (onTrackOrderChange) {
              onTrackOrderChange(newTracks);
            }

            setDropLinePosition(null);

            // Keep both modals open for continued use after successful drop
            if (type === 'modal-track') {
              console.log('[DraggableTrackList] Keeping AddUnselectedModal open for continued use');
            }
            if (type === 'search-track') {
              console.log('[DraggableTrackList] Keeping SpotifySearchModal open for continued use');
            }

            dropProcessed = true;
          }
        }
      } catch (error) {
        // Not a modal or search track, continue with normal drag handling
      }
    }

    // Handle normal internal drag and drop
    if (!dropProcessed) {
      if (draggedIndex === null || !dropLinePosition) {
        console.log('[DraggableTrackList] Invalid internal drop - cleaning up');
        setDraggedIndex(null);
        setDropLinePosition(null);
        return;
      }

      const newTracks = [...localTracks];
      const draggedTrack = newTracks[draggedIndex];

      // Remove the dragged track
      newTracks.splice(draggedIndex, 1);

      // Calculate the correct insertion index
      let insertIndex = dropLinePosition.index;
      if (draggedIndex < dropLinePosition.index) {
        insertIndex = dropLinePosition.index - 1;
      }

      // Insert at new position
      newTracks.splice(insertIndex, 0, draggedTrack);

      setLocalTracks(newTracks);

      // Notify parent component of the new order
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }

      setDraggedIndex(null);
      setDropLinePosition(null);

      console.log('[DraggableTrackList] Internal drop completed successfully');
    }
  };

  const handleDragEnd = (e) => {
    console.log('[DraggableTrackList] HTML5 drag end');

    // Stop auto-scrolling
    stopAutoScroll();

    // Notify context that HTML5 drag ended
    notifyHTML5DragEnd();

    // Reset local HTML5 states
    setDraggedIndex(null);
    setDropLinePosition(null);

    // Check if drop was successful by examining the dropEffect
    const wasSuccessful = e?.dataTransfer?.dropEffect !== 'none';
    console.log('[DraggableTrackList] HTML5 drag ended, successful:', wasSuccessful);
  };

  const handleRemoveTrack = (index) => {
    const newTracks = [...localTracks];
    newTracks.splice(index, 1);
    setLocalTracks(newTracks);

    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
  };



  // Calculate relative popularity quadrants for track labeling
  const tracksWithPop = localTracks.filter(t => t.popularity !== undefined);
  const sortedByPop = [...tracksWithPop].sort((a, b) => b.popularity - a.popularity);
  const qSize = Math.floor(sortedByPop.length / 4);

  const getTrackQuadrant = (track) => {
    if (track.popularity === undefined) return null;
    const index = sortedByPop.findIndex(t => t.id === track.id);
    if (index < qSize) return 'topHits';
    if (index < qSize * 2) return 'popular';
    if (index < qSize * 3) return 'moderate';
    return 'deepCuts';
  };

  const handleAddUnselectedTracks = (tracksToAdd) => {
    const newTracks = [...localTracks, ...tracksToAdd];
    setLocalTracks(newTracks);

    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
  };

  const handleAddSpotifyTracks = (tracksToAdd) => {
    const newTracks = [...localTracks, ...tracksToAdd];
    setLocalTracks(newTracks);

    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
  };

  // Helper function to truncate text with ellipsis
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };



  const handleTouchStart = (e, index) => {
    if (!isMobile) return;
    e.stopPropagation();

    const touch = e.touches[0];
    const element = e.currentTarget;

    // Clear any existing timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
    }

    // Set up long press detection (250ms)
    const longPressTimer = setTimeout(() => {
      // Check if user hasn't moved much (not scrolling)
      const currentY = touchDragState.currentY || touch.clientY;
      const deltaY = Math.abs(currentY - touch.clientY);

      if (deltaY < 12) { // User hasn't moved much, activate drag mode
        console.log('[DraggableTrackList] Touch long press activated for index:', index);

        setTouchDragState(prev => ({
          ...prev,
          isLongPress: true,
          isDragging: false, // Don't start dragging yet, wait for movement
          scrollY: 0 // Store page scroll position when drag starts
        }));
        setDraggedIndex(index);
        notifyTouchDragStart();

        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 250);

    setTouchDragState({
      isDragging: false,
      startY: touch.clientY,
      currentY: touch.clientY,
      draggedElement: element,
      startIndex: index,
      longPressTimer,
      isLongPress: false,
    });
  };

  const handleTouchMove = (e, index) => {
    if (!isMobile || touchDragState.startIndex === null) return;

    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);

    // Update current position
    setTouchDragState(prev => ({ ...prev, currentY: touch.clientY }));

    // If long press hasn't activated yet and user moves too much, cancel it
    if (!touchDragState.isLongPress && deltaY > 20) {
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
        setTouchDragState(prev => ({
          ...prev,
          longPressTimer: null
        }));
      }
      return; // Allow normal scrolling
    }

    // If long press is active, handle dragging
    if (touchDragState.isLongPress) {
      e.preventDefault();
      e.stopPropagation();

      let isCurrentlyDragging = touchDragState.isDragging;
      if (!isCurrentlyDragging && deltaY > 8) { // Start dragging
        isCurrentlyDragging = true;
        setTouchDragState(prev => ({ ...prev, isDragging: true }));
      }

      if (isCurrentlyDragging) {
        // Check auto-scroll for touch drag
        checkAutoScroll(touch.clientY);

        const elementFromPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const trackElement = elementFromPoint?.closest('[data-track-index]');
        if (trackElement) {
          const hoverIndex = parseInt(trackElement.getAttribute('data-track-index'));
          if (hoverIndex !== touchDragState.startIndex && !isNaN(hoverIndex)) {
            const rect = trackElement.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isTopHalf = touch.clientY < midpoint;
            setDropLinePosition({ index: isTopHalf ? hoverIndex : hoverIndex + 1, isTopHalf });
          }
        } else {
          setDropLinePosition(null);
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!isMobile) return;
    e.stopPropagation();

    console.log('[DraggableTrackList] Touch end - isDragging:', touchDragState.isDragging, 'dropLinePosition:', dropLinePosition);

    // Stop auto-scrolling
    stopAutoScroll();

    // Clear long press timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
    }

    // If we were dragging, perform the reorder
    if (touchDragState.isDragging && dropLinePosition && draggedIndex !== null) {
      const newTracks = [...localTracks];
      const draggedTrack = newTracks[draggedIndex];

      // Remove the dragged track
      newTracks.splice(draggedIndex, 1);

      // Calculate the correct insertion index
      let insertIndex = dropLinePosition.index;
      if (draggedIndex < dropLinePosition.index) {
        insertIndex = dropLinePosition.index - 1;
      }

      // Insert at new position
      newTracks.splice(insertIndex, 0, draggedTrack);

      setLocalTracks(newTracks);

      // Notify parent component of the new order
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }

      // Provide completion haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }

      console.log('[DraggableTrackList] Touch drop completed successfully');
    } else if (touchDragState.isDragging) {
      // Was dragging but no valid drop position - cancel the drag
      console.log('[DraggableTrackList] Touch drag cancelled - no valid drop position');
      cancelDrag('touch-no-drop-position');
    }

    // Notify context system
    if (touchDragState.isLongPress) {
      notifyTouchDragEnd();
    }

    // Reset all local touch drag state
    setTouchDragState({
      isDragging: false,
      startY: 0,
      currentY: 0,
      draggedElement: null,
      startIndex: null,
      longPressTimer: null,
      isLongPress: false,
      scrollY: 0
    });
    setDraggedIndex(null);
    setDropLinePosition(null);
  };

  const handleTouchCancel = (e) => {
    if (!isMobile) return;

    console.log('[DraggableTrackList] Touch cancel detected - cancelling drag');

    // Stop auto-scrolling
    stopAutoScroll();

    // Clear long press timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
    }

    // If a drag was in progress, cancel it
    if (touchDragState.isLongPress) {
      cancelDrag('touch-cancel-event');
      notifyTouchDragEnd();
    }

    // Reset all local touch drag state
    setTouchDragState({
      isDragging: false,
      startY: 0,
      currentY: 0,
      draggedElement: null,
      startIndex: null,
      longPressTimer: null,
      isLongPress: false,
      scrollY: 0
    });
    setDraggedIndex(null);
    setDropLinePosition(null);
  };

  // Touch handlers for external drags (from modals)
  const handleExternalTouchMove = (e) => {
    if (!isMobile || !isDragging || !draggedItem) return;

    e.preventDefault(); // Prevent scrolling during external drag
    console.log('[DraggableTrackList] 🎯 Touch move detected during external drag!');

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    // Check auto-scroll for external touch drag
    checkAutoScroll(clientY);

    console.log(`[handleExternalTouchMove] Touch: clientX=${clientX}, clientY=${clientY}`);

    let foundDropTarget = false;

    if (!scrollContainerRef.current) {
      console.log('[handleExternalTouchMove] scrollContainerRef.current is null.');
      return;
    }

    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    console.log(`[handleExternalTouchMove] Container Rect: top=${containerRect.top}, left=${containerRect.left}, width=${containerRect.width}, height=${containerRect.height}`);

    // Iterate through all track elements to find the hover target
    const trackElements = scrollContainerRef.current.querySelectorAll('[data-track-index]');
    console.log(`[handleExternalTouchMove] Found ${trackElements.length} track elements.`);

    for (let i = 0; i < trackElements.length; i++) {
      const trackElement = trackElements[i];
      const rect = trackElement.getBoundingClientRect();
      const hoverIndex = parseInt(trackElement.getAttribute('data-track-index'));

      console.log(`[handleExternalTouchMove] Checking track ${hoverIndex}: Rect: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const midpoint = rect.top + rect.height / 2;
        const isTopHalf = clientY < midpoint;

        setDropLinePosition({
          index: isTopHalf ? hoverIndex : hoverIndex + 1,
          isTopHalf
        });
        foundDropTarget = true;
        console.log(`[handleExternalTouchMove] Hovering over track index: ${hoverIndex}, dropLinePosition: ${isTopHalf ? hoverIndex : hoverIndex + 1}`);
        break; // Found the target, exit loop
      }
    }

    // If no specific track element is hovered, check if over the main container
    if (!foundDropTarget) {
      if (
        clientX >= containerRect.left &&
        clientX <= containerRect.right &&
        clientY >= containerRect.top &&
        clientY <= containerRect.bottom
      ) {
        // If over the container but not a specific track, set drop position to end of list
        setDropLinePosition({ index: localTracks.length, isTopHalf: false });
        console.log(`[handleExternalTouchMove] Hovering over container background, dropLinePosition: ${localTracks.length}`);
      } else {
        // If not over any valid drop target, clear drop line
        setDropLinePosition(null);
        console.log('[handleExternalTouchMove] Not hovering over any valid drop target or container.');
      }
    }
  };



  return (
    <>
      <div style={{
        position: 'relative',
        marginBottom: '16px'
      }}>
        <div
          ref={scrollContainerRef}
          data-preview-panel="true"
          style={{
            background: 'var(--hunter-green)',
            borderRadius: '8px',
            border: '1px solid var(--fern-green)',
            height: `${containerHeight}px`,
            overflowY: (touchDragState.isLongPress || draggedIndex !== null || isDragging) ? 'hidden' : 'auto', // Disable internal scrolling during any drag operation
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
          onTouchMove={isMobile ? handleExternalTouchMove : undefined}
          onDragOver={(e) => {
            e.preventDefault();

            // Check auto-scroll based on mouse position
            checkAutoScroll(e.clientY);

            // Check if it's an external drag (from context or dataTransfer)
            const isExternalDrag = isDragging || e.dataTransfer.types.includes('application/json');

            // If dragging over empty space or container, set drop position to end
            if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
              // Only show drop line if there's an active drag
              if (isExternalDrag || draggedIndex !== null) {
                console.log('[DraggableTrackList] Container dragOver - setting drop position to end');
                setDropLinePosition({ index: localTracks.length, isTopHalf: false });
              }
            }
          }}
          onDrop={(e) => {
            // Stop auto-scrolling on drop
            stopAutoScroll();
            
            // Handle drops on empty space or container
            if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
              console.log('[DraggableTrackList] Container drop detected');
              handleDrop(e, localTracks.length);
            }
          }}
        >
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--fern-green)',
            position: 'sticky',
            top: 0,
            background: 'var(--hunter-green)',
            zIndex: 1
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <strong>🎵 {localTracks.length} Songs</strong>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    // Re-initialize modal even if already open
                    if (showAddUnselectedModal) {
                      setShowAddUnselectedModal(false);
                      // Use setTimeout to ensure state update completes before reopening
                      setTimeout(() => setShowAddUnselectedModal(true), 0);
                    } else {
                      setShowAddUnselectedModal(true);
                    }
                  }}
                  style={{
                    background: 'var(--moss-green)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--fern-green)';
                    e.target.style.transform = 'translateY(-1px)';
                    const iconSpan = e.target.querySelector('span');
                    if (iconSpan) iconSpan.style.backgroundColor = '#3d5a26';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'var(--moss-green)';
                    e.target.style.transform = 'translateY(0)';
                    const iconSpan = e.target.querySelector('span');
                    if (iconSpan) iconSpan.style.backgroundColor = '#7a9147';
                  }}
                  title="Add songs that weren't selected from your playlists"
                >
                  <span style={{
                    backgroundColor: '#7a9147',
                    borderRadius: '3px',
                    padding: '2px',
                    transition: 'background-color 0.2s ease',
                    fontSize: '10px'
                  }}>➕</span>
                  {!isMobile && <span>Add Unselected</span>}
                </button>

                <button
                  onClick={() => {
                    // Re-initialize modal even if already open
                    if (showSpotifySearch) {
                      setShowSpotifySearch(false);
                      // Use setTimeout to ensure state update completes before reopening
                      setTimeout(() => setShowSpotifySearch(true), 0);
                    } else {
                      setShowSpotifySearch(true);
                    }
                  }}
                  style={{
                    background: '#1DB954',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1ed760';
                    e.target.style.transform = 'translateY(-1px)';
                    const iconSpan = e.target.querySelector('span');
                    if (iconSpan) iconSpan.style.backgroundColor = '#17c653';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#1DB954';
                    e.target.style.transform = 'translateY(0)';
                    const iconSpan = e.target.querySelector('span');
                    if (iconSpan) iconSpan.style.backgroundColor = '#189a47';
                  }}
                  title="Search and add songs directly from Spotify"
                >
                  <span style={{
                    backgroundColor: '#189a47',
                    borderRadius: '3px',
                    padding: '2px',
                    transition: 'background-color 0.2s ease',
                    fontSize: '10px'
                  }}>🎵</span>
                  {!isMobile && <span>Add from Spotify</span>}
                </button>


              </div>
            </div>

            <div style={{
              fontSize: '11px',
              opacity: '0.7',
              lineHeight: '1.3',
              userSelect: 'none', // Prevent text selection here specifically
              WebkitUserSelect: 'none' // For Safari
            }}>
              💡 <strong>{isMobile ? 'Long press any track and drag to reorder' : 'Drag and drop to reorder'}</strong> • <strong>Click ✕ to remove tracks</strong>{!isMobile && ' • '}<strong>{!isMobile && 'Drag bottom edge to resize'}</strong>
            </div>
          </div>

          {/* Empty state drop zone */}
          {localTracks.length === 0 && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--mindaro)',
              opacity: '0.6',
              fontSize: '14px',
              borderStyle: (isDragging || dropLinePosition) ? 'dashed' : 'none',
              borderWidth: '2px',
              borderColor: 'var(--moss-green)',
              borderRadius: '8px',
              margin: '20px',
              backgroundColor: (isDragging || dropLinePosition) ? 'rgba(144, 169, 85, 0.1)' : 'transparent',
              transition: 'all 0.2s ease'
            }}>
              {(isDragging || dropLinePosition) ?
                '🎵 Drop track here to add it to your playlist' :
                'No tracks in preview yet. Generate a preview or drag tracks from the modal.'
              }
            </div>
          )}

          {/* Drop line at the end when dragging over empty space */}
          {dropLinePosition && dropLinePosition.index === localTracks.length && localTracks.length > 0 && (
            <div style={{
              height: '3px',
              background: 'var(--moss-green)',
              borderRadius: '2px',
              boxShadow: '0 0 8px rgba(144, 169, 85, 0.6)',
              animation: 'pulse 1s infinite',
              margin: '8px 16px',
              pointerEvents: 'none'
            }} />
          )}

          {localTracks.map((track, index) => {
            const sourcePlaylist = selectedPlaylists.find(p => p.id === track.sourcePlaylist);
            const quadrant = getTrackQuadrant(track);
            const isDragging = draggedIndex === index;

            const showDropLineAbove = dropLinePosition && dropLinePosition.index === index;
            const showDropLineBelow = dropLinePosition && dropLinePosition.index === index + 1;

            return (
              <div
                key={`${track.id}-${index}`}
                draggable={!isMobile}
                data-track-index={index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={isMobile ? (e) => handleTouchStart(e, index) : undefined}
                onTouchMove={isMobile ? (e) => handleTouchMove(e, index) : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
                onTouchCancel={isMobile ? handleTouchCancel : undefined}

                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderBottom: index < localTracks.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                  borderTop: showDropLineAbove ? '3px solid var(--moss-green)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: isMobile ? 'default' : 'grab',
                  opacity: isDragging || (isMobile && touchDragState.isDragging && touchDragState.startIndex === index) ? 0.5 : 1,
                  backgroundColor: (isMobile && touchDragState.isLongPress && touchDragState.startIndex === index) ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  position: 'relative',
                  boxShadow: showDropLineAbove ? '0 -2px 8px rgba(144, 169, 85, 0.6)' : 'none',
                  touchAction: (isMobile && touchDragState.isLongPress) ? 'none' : 'pan-y' // Prevent scrolling when long press is active
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      marginRight: isMobile ? '8px' : '12px',
                      fontSize: isMobile ? '14px' : '16px',
                      opacity: touchDragState.isLongPress && touchDragState.startIndex === index ? '1' : '0.5',
                      cursor: isMobile ? 'default' : 'grab',
                      padding: isMobile ? '4px' : '0',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⋮⋮
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flex: 1 }}>
                    {track.album?.images?.[0]?.url && (
                      <img
                        src={track.album.images[2]?.url || track.album.images[1]?.url || track.album.images[0]?.url}
                        alt={`${track.album.name} album cover`}
                        style={{
                          width: isMobile ? '32px' : '40px',
                          height: isMobile ? '32px' : '40px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '500',
                        fontSize: isMobile ? '13px' : '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.3',
                        maxHeight: isMobile ? '2.6em' : '2.8em'
                      }}>
                        {index + 1}. {isMobile ? truncateText(track.name, 25) : track.name}
                      </div>
                      <div style={{
                        fontSize: isMobile ? '11px' : '12px',
                        opacity: '0.7',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px'
                      }}>
                        <span>{truncateText(track.artists?.[0]?.name || 'Unknown Artist', isMobile ? 15 : 25)}</span>
                        <span>•</span>
                        <span style={{
                          color: track.sourcePlaylist === 'search' ? 'var(--mindaro)' : 'var(--moss-green)'
                        }}>
                          {track.sourcePlaylist === 'search' ?
                            (isMobile ? '🔍' : '🔍 Spotify Search') :
                            truncateText(sourcePlaylist?.name || 'Unknown', isMobile ? 12 : 20)
                          }
                        </span>
                        {quadrant && (
                          <>
                            <span>•</span>
                            <span style={{ 
                              fontSize: isMobile ? '10px' : '10px',
                              background: quadrant === 'topHits' ? 'rgba(255, 87, 34, 0.2)' :
                                quadrant === 'popular' ? 'rgba(255, 193, 7, 0.2)' :
                                  quadrant === 'moderate' ? 'rgba(0, 188, 212, 0.2)' :
                                    'rgba(233, 30, 99, 0.2)',
                              color: quadrant === 'topHits' ? '#FF5722' :
                                quadrant === 'popular' ? '#FF8F00' :
                                  quadrant === 'moderate' ? '#00BCD4' :
                                    '#E91E63',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }} title={
                              quadrant === 'topHits' ? `Top Hits (${track.popularity})` :
                                quadrant === 'popular' ? `Popular (${track.popularity})` :
                                  quadrant === 'moderate' ? `Moderate (${track.popularity})` :
                                    `Deep Cuts (${track.popularity})`
                            }>
                              {isMobile ? 
                                getPopularityIcon(quadrant) :
                                (quadrant === 'topHits' ? `🔥 Top Hits (${track.popularity})` :
                                  quadrant === 'popular' ? `⭐ Popular (${track.popularity})` :
                                    quadrant === 'moderate' ? `📻 Moderate (${track.popularity})` :
                                      `💎 Deep Cuts (${track.popularity})`)
                              }
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', opacity: '0.6' }}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTrack(index);
                    }}
                    style={{
                      background: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#cc0000'}
                    onMouseLeave={(e) => e.target.style.background = '#ff4444'}
                    title="Remove track from playlist"
                  >
                    ×
                  </button>
                </div>

                {/* Drop line below - positioned absolutely within the track element */}
                {showDropLineBelow && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '16px',
                    right: '16px',
                    height: '3px',
                    background: 'var(--moss-green)',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(144, 169, 85, 0.6)',
                    animation: 'pulse 1s infinite',
                    pointerEvents: 'none',
                    zIndex: 10
                  }} />
                )}
              </div>
            );
          })}
        </div>





      </div>

      {/* Modals rendered outside the relative container for proper centering */}
      <AddUnselectedModal
        isOpen={showAddUnselectedModal}
        onClose={() => setShowAddUnselectedModal(false)}
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        currentTracks={localTracks}
        onAddTracks={handleAddUnselectedTracks}
      />

      <SpotifySearchModal
        isOpen={showSpotifySearch}
        onClose={() => setShowSpotifySearch(false)}
        accessToken={accessToken}
        onAddTracks={handleAddSpotifyTracks}
      />
    </>
  );
};

export default DraggableTrackList;