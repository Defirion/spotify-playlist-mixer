import React, { useState, useEffect } from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import { getPopularityIcon } from '../utils/dragAndDrop';
import { useDrag } from '../contexts/DragContext';

const DraggableTrackList = ({ tracks, selectedPlaylists, onTrackOrderChange, formatDuration, accessToken }) => {
  const { draggedItem, isDragging, endDrag, cancelDrag } = useDrag();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [localTracks, setLocalTracks] = useState(tracks);
  const [containerHeight, setContainerHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [normalHeight, setNormalHeight] = useState(400);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  
  // Ref for the scrollable container
  const scrollContainerRef = React.useRef(null);

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

  // Centralized scroll lock management - handles all drag operations
  useEffect(() => {
    const isDragActive = (
      draggedIndex !== null || 
      isDragging
    );

    if (isDragActive) {
      // Only lock if not already locked
      if (document.body.style.position !== 'fixed') {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        // Store scroll position for restoration
        document.body.dataset.scrollY = scrollY.toString();
      }
    } else {
      // Only restore if currently locked
      if (document.body.style.position === 'fixed') {
        const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        delete document.body.dataset.scrollY;
        
        // Restore scroll position after a brief delay to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    }

    // Cleanup function for component unmount
    return () => {
      // Always restore scroll state on unmount
      if (document.body.style.position === 'fixed') {
        const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        delete document.body.dataset.scrollY;
        
        // Restore scroll position
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
      
      // Clear any pending timers
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
      }
    };
  }, [draggedIndex, isDragging, touchDragState.longPressTimer]);

  // Update local tracks when props change
  React.useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  // Handle window resize for mobile detection and optimal height
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth <= 480;
      setIsMobile(nowMobile);

      // Auto-adjust height when switching to/from mobile or on mobile resize
      if (nowMobile) {
        setContainerHeight(getMobileOptimalHeight());
      } else if (wasMobile && !nowMobile) {
        // Switching from mobile to desktop, restore normal height
        setContainerHeight(400);
      }
    };

    window.addEventListener('resize', handleResize);

    // Set initial optimal height for mobile
    if (isMobile) {
      setContainerHeight(getMobileOptimalHeight());
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Handle orientation changes on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () => {
      // Small delay to let the viewport settle after orientation change
      setTimeout(() => {
        setContainerHeight(getMobileOptimalHeight());
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [isMobile]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Check if it's an external drag from context or dataTransfer
    // Check if it's an external drag from context or dataTransfer
    // Check if it's an external drag from context or dataTransfer
    const isExternalDrag = isDragging || e.dataTransfer.types.includes('application/json');
    
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

    // Handle external drag from context first (most reliable)
    if (isDragging && draggedItem) {
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
      endDrag(); // Clear context state

      // Close the appropriate modal after successful drop
      if (type === 'modal-track') {
        setShowAddUnselectedModal(false);
      }
      if (type === 'search-track') {
        setShowSpotifySearch(false);
      }

      return;
    }

    // Fallback: Check dataTransfer for external drags (backward compatibility)
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

          // Close the appropriate modal after successful drop
          if (type === 'modal-track') {
            setShowAddUnselectedModal(false);
          }
          if (type === 'search-track') {
            setShowSpotifySearch(false);
          }

          return;
        }
      }
    } catch (error) {
      // Not a modal or search track, continue with normal drag handling
    }

    // Handle normal internal drag and drop
    if (draggedIndex === null || !dropLinePosition) {
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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropLinePosition(null);
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

  // Calculate 85% of screen height
  const getMaxHeight = () => {
    return Math.floor(window.innerHeight * 0.85);
  };

  // Calculate optimal height for mobile viewport
  const getMobileOptimalHeight = () => {
    // Use most of the viewport height, pushing other content below the fold
    // Only reserve minimal space for essential UI elements
    const viewportHeight = window.innerHeight;
    const reservedSpace = 60; // Minimal space for essential UI only
    return Math.max(400, viewportHeight - reservedSpace);
  };

  // Double-click to maximize/minimize
  const handleDoubleClick = () => {
    if (isMaximized) {
      // Minimize to normal height
      setContainerHeight(normalHeight);
      setIsMaximized(false);
    } else {
      // Save current height as normal height and maximize
      setNormalHeight(containerHeight);
      setContainerHeight(getMaxHeight());
      setIsMaximized(true);
    }
  };

  // Resize functionality
  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();

    const startY = e.clientY;
    const startHeight = containerHeight;
    const maxHeight = getMaxHeight();

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
      setContainerHeight(newHeight);

      // Update maximized state based on height
      if (newHeight >= maxHeight - 10) {
        if (!isMaximized) {
          setNormalHeight(startHeight);
          setIsMaximized(true);
        }
      } else {
        if (isMaximized) {
          setIsMaximized(false);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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



  // Touch drag handlers for mobile - completely prevent scrolling during long press
  const handleTouchStart = (e, index) => {
    if (!isMobile) return;

    const touch = e.touches[0];
    const element = e.currentTarget;

    // Clear any existing timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
    }

    // Set up long press detection (300ms)
    const longPressTimer = setTimeout(() => {
      // Check if user hasn't moved much (not scrolling)
      const currentY = touchDragState.currentY || touch.clientY;
      const deltaY = Math.abs(currentY - touch.clientY);
      
      if (deltaY < 8) { // User hasn't moved much, activate drag mode
        setTouchDragState(prev => ({ 
          ...prev, 
          isLongPress: true,
          isDragging: false, // Don't start dragging yet, wait for movement
          scrollY: 0 // No longer needed - centralized scroll lock handles this
        }));
        setDraggedIndex(index);
        
        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 300);

    setTouchDragState({
      isDragging: false,
      startY: touch.clientY,
      currentY: touch.clientY,
      draggedElement: element,
      startIndex: index,
      longPressTimer,
      isLongPress: false,
      scrollY: 0 // Initialize to 0, only set when long press actually activates
    });
  };

  const handleTouchMove = (e, index) => {
    if (!isMobile || touchDragState.startIndex === null) return;

    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);
    
    // Update current position
    setTouchDragState(prev => ({ ...prev, currentY: touch.clientY }));

    // If long press hasn't activated yet and user moves too much, cancel it
    if (!touchDragState.isLongPress && deltaY > 12) {
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
        setTouchDragState(prev => ({ 
          ...prev, 
          longPressTimer: null 
        }));
      }
      return; // Allow normal scrolling
    }
    
    // If long press was active but user cancelled by moving too much, cancel drag
    if (touchDragState.isLongPress && !touchDragState.isDragging && deltaY > 20) {
      // Reset drag state - centralized scroll lock will handle restoration
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
      return;
    }

    // If long press is active, handle dragging
    if (touchDragState.isLongPress) {
      // Start dragging if moved enough
      if (!touchDragState.isDragging && deltaY > 3) {
        setTouchDragState(prev => ({ ...prev, isDragging: true }));
      }

      // If dragging, handle drop positioning
      if (touchDragState.isDragging || deltaY > 3) {
        // Find the element we're hovering over
        const elementFromPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const trackElement = elementFromPoint?.closest('[data-track-index]');

        if (trackElement) {
          const hoverIndex = parseInt(trackElement.getAttribute('data-track-index'));
          if (hoverIndex !== touchDragState.startIndex && !isNaN(hoverIndex)) {
            // Calculate drop position
            const rect = trackElement.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isTopHalf = touch.clientY < midpoint;

            setDropLinePosition({
              index: isTopHalf ? hoverIndex : hoverIndex + 1,
              isTopHalf
            });
          }
        }

        setTouchDragState(prev => ({ ...prev, isDragging: true }));
      }

      // Always prevent scrolling when long press is active
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e) => {
    if (!isMobile) return;

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
    }

    // Reset all drag state
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
    console.log(`[handleExternalTouchMove] isMobile: ${isMobile}, isDragging: ${isDragging}, draggedItem: ${draggedItem ? 'exists' : 'null'}`);
    if (!isMobile || !isDragging || !draggedItem) return;

    e.preventDefault(); // Prevent scrolling during external drag
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

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

  const handleExternalTouchEnd = (e) => {
    console.log(`[handleExternalTouchEnd] isMobile: ${isMobile}, isDragging: ${isDragging}, draggedItem: ${draggedItem ? 'exists' : 'null'}`);
    if (!isMobile || !isDragging || !draggedItem) return;

    console.log('External Touch End. dropLinePosition:', dropLinePosition);

    // Handle the drop if we have a valid drop position
    if (dropLinePosition !== null) {
      const { data: track, type } = draggedItem;
      const newTracks = [...localTracks];
      const insertIndex = dropLinePosition.index;

      // Insert the track at the specified position
      newTracks.splice(insertIndex, 0, track);

      setLocalTracks(newTracks);

      // Notify parent component of the new track list
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }

      // Close the appropriate modal after successful drop
      if (type === 'modal-track') {
        setShowAddUnselectedModal(false);
      }
      if (type === 'search-track') {
        setShowSpotifySearch(false);
      }

      // Provide completion haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    } else {
      console.log('No valid drop position on touch end.');
    }

    // Reset states
    setDropLinePosition(null);
    endDrag();
  };

  return (
    <div style={{
      position: 'relative',
      marginBottom: '16px'
    }}>
      <div
        ref={scrollContainerRef}
        style={{
          background: 'var(--hunter-green)',
          borderRadius: '8px',
          border: '1px solid var(--fern-green)',
          height: `${containerHeight}px`,
          overflowY: (touchDragState.isLongPress || draggedIndex !== null || isDragging) ? 'hidden' : 'auto', // Disable internal scrolling during any drag operation
          borderBottomLeftRadius: isMobile ? '8px' : '0px',
          borderBottomRightRadius: isMobile ? '8px' : '0px'
        }}
        onTouchMove={isMobile ? handleExternalTouchMove : undefined}
        onTouchEnd={isMobile ? handleExternalTouchEnd : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          
          // Check if it's an external drag (from context or dataTransfer)
          const isExternalDrag = isDragging || e.dataTransfer.types.includes('application/json');
          
          // If dragging over empty space or container, set drop position to end
          if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
            // Only show drop line if there's an active drag
            if (isExternalDrag || draggedIndex !== null) {
              setDropLinePosition({ index: localTracks.length, isTopHalf: false });
            }
          }
        }}
        onDrop={(e) => {
          // Handle drops on empty space or container
          if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
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
                onClick={() => setShowAddUnselectedModal(true)}
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
                onClick={() => setShowSpotifySearch(true)}
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
            lineHeight: '1.3'
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
            borderStyle: (contextExternalDragActive || dropLinePosition) ? 'dashed' : 'none',
            borderWidth: '2px',
            borderColor: 'var(--moss-green)',
            borderRadius: '8px',
            margin: '20px',
            backgroundColor: (contextExternalDragActive || dropLinePosition) ? 'rgba(144, 169, 85, 0.1)' : 'transparent',
            transition: 'all 0.2s ease'
          }}>
            {(contextExternalDragActive || dropLinePosition) ?
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
              ref={node => {
                if (node) {
                  // Ensure we only add the listener once and remove it on unmount/re-render
                  if (node.__touchMoveHandler__) {
                    node.removeEventListener('touchmove', node.__touchMoveHandler__);
                  }
                  if (isMobile) {
                    const handler = (e) => handleTouchMove(e, index);
                    node.addEventListener('touchmove', handler, { passive: false });
                    node.__touchMoveHandler__ = handler;
                  }
                }
              }}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}

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
                      whiteSpace: 'nowrap'
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
                      gap: '4px'
                    }}>
                      <span>{truncateText(track.artists?.[0]?.name || 'Unknown Artist', isMobile ? 15 : 25)}</span>
                      {isMobile && (
                        <>
                          <span>•</span>
                          <span style={{
                            color: track.sourcePlaylist === 'search' ? 'var(--mindaro)' : 'var(--moss-green)',
                            fontSize: '10px'
                          }}>
                            {track.sourcePlaylist === 'search' ?
                              '🔍' :
                              truncateText(sourcePlaylist?.name || 'Unknown', 12)
                            }
                          </span>
                          {quadrant && (
                            <span style={{ fontSize: '12px' }} title={
                              quadrant === 'topHits' ? `Top Hits (${track.popularity})` :
                                quadrant === 'popular' ? `Popular (${track.popularity})` :
                                  quadrant === 'moderate' ? `Moderate (${track.popularity})` :
                                    `Deep Cuts (${track.popularity})`
                            }>
                              {getPopularityIcon(quadrant)}
                            </span>
                          )}
                        </>
                      )}
                      {!isMobile && (
                        <>
                          {' • '}
                          <span style={{
                            color: track.sourcePlaylist === 'search' ? 'var(--mindaro)' : 'var(--moss-green)',
                            marginLeft: '4px'
                          }}>
                            {track.sourcePlaylist === 'search' ? '🔍 Spotify Search' : (sourcePlaylist?.name || 'Unknown Playlist')}
                          </span>
                        </>
                      )}
                    </div>
                    {!isMobile && track.popularity !== undefined && (
                      <div style={{
                        fontSize: '10px',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{
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
                        }}>
                          {quadrant === 'topHits' ? `🔥 Top Hits (${track.popularity})` :
                            quadrant === 'popular' ? `⭐ Popular (${track.popularity})` :
                              quadrant === 'moderate' ? `📻 Moderate (${track.popularity})` :
                                `💎 Deep Cuts (${track.popularity})`}
                        </span>
                      </div>
                    )}
                    {!isMobile && track.album?.name && (
                      <div style={{ fontSize: '11px', opacity: '0.5', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.album.name}
                      </div>
                    )}
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

      {/* Resize handle - outside the scrollable container - Desktop only */}
      {!isMobile && (
        <div
          onMouseDown={handleResizeStart}
          onDoubleClick={handleDoubleClick}
          style={{
            height: '12px',
            cursor: 'ns-resize',
            background: isResizing ? 'rgba(144, 169, 85, 0.3)' :
              isMaximized ? 'rgba(144, 169, 85, 0.2)' : 'var(--hunter-green)',
            border: '1px solid var(--fern-green)',
            borderTop: isResizing ? '2px solid var(--moss-green)' :
              isMaximized ? '2px solid var(--moss-green)' : '1px solid var(--fern-green)',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.target.style.background = 'rgba(144, 169, 85, 0.1)';
              e.target.style.borderTop = '2px solid rgba(144, 169, 85, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.target.style.background = isMaximized ? 'rgba(144, 169, 85, 0.2)' : 'var(--hunter-green)';
              e.target.style.borderTop = isMaximized ? '2px solid var(--moss-green)' : '1px solid var(--fern-green)';
            }
          }}
          title={isMaximized ? "Drag to resize • Double-click to minimize" : "Drag to resize • Double-click to maximize"}
        >
          <div style={{
            width: '30px',
            height: '3px',
            background: 'rgba(144, 169, 85, 0.6)',
            borderRadius: '2px',
            opacity: isResizing ? 1 : 0.7
          }} />
        </div>
      )}



      {/* Add Unselected Modal */}
      <AddUnselectedModal
        isOpen={showAddUnselectedModal}
        onClose={() => setShowAddUnselectedModal(false)}
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        currentTracks={localTracks}
        onAddTracks={handleAddUnselectedTracks}

      />

      {/* Spotify Search Modal */}
      <SpotifySearchModal
        isOpen={showSpotifySearch}
        onClose={() => setShowSpotifySearch(false)}
        accessToken={accessToken}
        onAddTracks={handleAddSpotifyTracks}

      />
    </div>
  );
};

export default DraggableTrackList;