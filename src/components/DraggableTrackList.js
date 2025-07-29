import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import { getPopularityIcon } from '../utils/dragAndDrop';
import { useDrag } from './DragContext';
import styles from './DraggableTrackList.module.css';

const DraggableTrackList = ({
  tracks,
  selectedPlaylists,
  onTrackOrderChange,
  formatDuration,
  accessToken,
}) => {
  const { isDragging, draggedItem, endDrag, startDrag } = useDrag();
  const [localTracks, setLocalTracks] = useState(tracks);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Touch drag state for track items
  const [touchDragState, setTouchDragState] = useState({
    isActive: false,
    startY: 0,
    startX: 0,
    longPressTimer: null,
    draggedTrackIndex: null,
  });

  const scrollContainerRef = useRef(null);

  // Scroll position preservation for drag operations
  const savedScrollPosition = useRef(null);

  // Auto-scroll functionality
  const autoScrollRef = useRef(null);
  const currentScrollSpeed = useRef(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    currentScrollSpeed.current = 0;
  }, []);

  const startAutoScroll = useCallback(
    (direction, targetSpeed) => {
      if (autoScrollRef.current) {
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
    [stopAutoScroll]
  );

  const checkAutoScroll = useCallback(
    clientY => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const scrollThreshold = 80;

      const distanceFromTop = clientY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - clientY;

      if (distanceFromTop < scrollThreshold && container.scrollTop > 0) {
        const speed = Math.max(2, 20 * (1 - distanceFromTop / scrollThreshold));
        startAutoScroll('up', speed);
      } else if (
        distanceFromBottom < scrollThreshold &&
        container.scrollTop < container.scrollHeight - container.clientHeight
      ) {
        const speed = Math.max(
          2,
          20 * (1 - distanceFromBottom / scrollThreshold)
        );
        startAutoScroll('down', speed);
      } else {
        stopAutoScroll();
      }
    },
    [startAutoScroll, stopAutoScroll]
  );

  // Scroll position preservation helpers
  const captureScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollPosition.current = scrollContainerRef.current.scrollTop;
      console.log(
        '[DraggableTrackList] Captured scroll position:',
        savedScrollPosition.current
      );
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && savedScrollPosition.current !== null) {
      console.log(
        '[DraggableTrackList] Restoring scroll position:',
        savedScrollPosition.current
      );
      scrollContainerRef.current.scrollTop = savedScrollPosition.current;
      savedScrollPosition.current = null; // Clear after use
    }
  }, []);

  // Restore scroll position after localTracks updates (post-render)
  useEffect(() => {
    if (savedScrollPosition.current !== null) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        restoreScrollPosition();
      });
    }
  }, [localTracks, restoreScrollPosition]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e, index) => {
      console.log('[DraggableTrackList] HTML5 drag start for index:', index);
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.target.outerHTML);

      // Notify drag context for consistent background styling
      const track = localTracks[index];
      if (track) {
        startDrag({ data: track, type: 'internal-track' }, 'html5');
      }
    },
    [localTracks, startDrag]
  );

  const handleDragOver = useCallback(
    (e, index) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      // Check auto-scroll based on mouse position
      checkAutoScroll(e.clientY);

      // Check if it's an external drag from context or dataTransfer
      const isExternalDrag =
        isDragging || e.dataTransfer.types.includes('application/json');

      // For internal drags, skip if no drag is active or dragging over self
      if (!isExternalDrag && (draggedIndex === null || draggedIndex === index))
        return;

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
        if (
          draggedIndex < insertPosition &&
          insertPosition === draggedIndex + 1
        )
          return;
        if (draggedIndex > insertPosition && insertPosition === draggedIndex)
          return;
      }

      setDropLinePosition({ index: insertPosition, isTopHalf });
    },
    [draggedIndex, isDragging, checkAutoScroll]
  );

  const handleDragLeave = useCallback(
    e => {
      const currentTarget = e.currentTarget;
      const relatedTarget = e.relatedTarget;

      setTimeout(() => {
        if (
          draggedIndex !== null &&
          currentTarget &&
          !relatedTarget?.closest('[draggable="true"]')
        ) {
          const container = currentTarget.closest('[style*="maxHeight"]');
          if (container && !container.contains(relatedTarget)) {
            setDropLinePosition(null);
          }
        }
      }, 10);
    },
    [draggedIndex]
  );

  const handleDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault();
      console.log(
        '[DraggableTrackList] handleDrop called, isDragging:',
        isDragging,
        'draggedItem:',
        draggedItem,
        'draggedIndex:',
        draggedIndex
      );

      stopAutoScroll();

      // Handle external drag from context first (most reliable)
      if (isDragging && draggedItem && draggedItem.type !== 'internal-track') {
        console.log(
          '[DraggableTrackList] Processing external drag drop:',
          draggedItem
        );
        const { data: track } = draggedItem;
        const newTracks = [...localTracks];
        const insertIndex = dropLinePosition
          ? dropLinePosition.index
          : localTracks.length;

        newTracks.splice(insertIndex, 0, track);

        if (onTrackOrderChange) {
          captureScrollPosition();
          onTrackOrderChange(newTracks);
        }

        setDropLinePosition(null);
        endDrag('success');
        return;
      }

      // Fallback: Check dataTransfer for external drags
      try {
        const dragData = e.dataTransfer.getData('application/json');
        if (dragData) {
          const { type, track } = JSON.parse(dragData);
          if (type === 'modal-track' || type === 'search-track') {
            console.log(
              '[DraggableTrackList] Processing dataTransfer external drag:',
              type
            );
            const newTracks = [...localTracks];
            const insertIndex = dropLinePosition
              ? dropLinePosition.index
              : localTracks.length;

            newTracks.splice(insertIndex, 0, track);

            if (onTrackOrderChange) {
              captureScrollPosition();
              onTrackOrderChange(newTracks);
            }

            setDropLinePosition(null);
            return;
          }
        }
      } catch (error) {
        // Not a modal or search track, continue with normal drag handling
      }

      // Handle normal internal drag and drop
      if (draggedIndex !== null && dropLinePosition) {
        console.log(
          '[DraggableTrackList] Processing internal drag drop from index:',
          draggedIndex,
          'to position:',
          dropLinePosition.index
        );

        const newTracks = [...localTracks];
        const draggedTrack = newTracks[draggedIndex];

        // Remove the dragged track from its original position
        newTracks.splice(draggedIndex, 1);

        // Calculate the correct insertion index after removal
        let insertIndex = dropLinePosition.index;
        if (draggedIndex < dropLinePosition.index) {
          insertIndex = dropLinePosition.index - 1;
        }

        // Insert the track at the new position
        newTracks.splice(insertIndex, 0, draggedTrack);

        if (onTrackOrderChange) {
          captureScrollPosition();
          onTrackOrderChange(newTracks);
        }

        console.log(
          '[DraggableTrackList] Internal drop completed successfully'
        );
      } else {
        console.log(
          '[DraggableTrackList] Invalid internal drop - missing draggedIndex or dropLinePosition'
        );
      }

      // Clean up states
      setDraggedIndex(null);
      setDropLinePosition(null);
    },
    [
      isDragging,
      draggedItem,
      stopAutoScroll,
      dropLinePosition,
      localTracks,
      onTrackOrderChange,
      endDrag,
      draggedIndex,
      captureScrollPosition,
    ]
  );

  const handleDragEnd = useCallback(
    e => {
      console.log('[DraggableTrackList] HTML5 drag end');
      stopAutoScroll();
      setDraggedIndex(null);
      setDropLinePosition(null);

      // End drag in context for consistent background styling
      endDrag('success');
    },
    [stopAutoScroll, endDrag]
  );

  // Update local tracks when props change
  useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  // Handle external drag events from modals (simplified)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleExternalDragOver = e => {
      const { clientX, clientY } = e.detail;
      checkAutoScroll(clientY);

      // Find which track element is being hovered over
      const trackElements = container.querySelectorAll('[data-track-index]');
      let foundDropTarget = false;

      for (let i = 0; i < trackElements.length; i++) {
        const trackElement = trackElements[i];
        const rect = trackElement.getBoundingClientRect();
        const hoverIndex = parseInt(
          trackElement.getAttribute('data-track-index')
        );

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
            isTopHalf,
          });
          foundDropTarget = true;
          break;
        }
      }

      if (!foundDropTarget) {
        const containerRect = container.getBoundingClientRect();
        if (
          clientX >= containerRect.left &&
          clientX <= containerRect.right &&
          clientY >= containerRect.top &&
          clientY <= containerRect.bottom
        ) {
          setDropLinePosition({ index: localTracks.length, isTopHalf: false });
        }
      }
    };

    const handleExternalDrop = e => {
      const { draggedItem } = e.detail;
      if (draggedItem && dropLinePosition) {
        const { data: track } = draggedItem;
        const newTracks = [...localTracks];
        const insertIndex = dropLinePosition.index;

        newTracks.splice(insertIndex, 0, track);

        if (onTrackOrderChange) {
          captureScrollPosition();
          onTrackOrderChange(newTracks);
        }

        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }

        setDropLinePosition(null);
        endDrag('success');
      }
    };

    container.addEventListener('externalDragOver', handleExternalDragOver);
    container.addEventListener('externalDrop', handleExternalDrop);
    return () => {
      container.removeEventListener('externalDragOver', handleExternalDragOver);
      container.removeEventListener('externalDrop', handleExternalDrop);
    };
  }, [
    dropLinePosition,
    endDrag,
    localTracks,
    onTrackOrderChange,
    checkAutoScroll,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();

      // Clean up touch drag timer
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
      }
    };
  }, [stopAutoScroll, touchDragState.longPressTimer]);

  const handleRemoveTrack = useCallback(
    index => {
      const newTracks = [...localTracks];
      newTracks.splice(index, 1);

      if (onTrackOrderChange) {
        captureScrollPosition();
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange, captureScrollPosition]
  );

  // Calculate relative popularity quadrants for track labeling
  const tracksWithPop = useMemo(
    () => localTracks.filter(t => t.popularity !== undefined),
    [localTracks]
  );

  const sortedByPop = useMemo(
    () => [...tracksWithPop].sort((a, b) => b.popularity - a.popularity),
    [tracksWithPop]
  );

  const qSize = Math.floor(sortedByPop.length / 4);

  const getTrackQuadrant = useCallback(
    track => {
      if (track.popularity === undefined) return null;
      const index = sortedByPop.findIndex(t => t.id === track.id);
      if (index < qSize) return 'topHits';
      if (index < qSize * 2) return 'popular';
      if (index < qSize * 3) return 'moderate';
      return 'deepCuts';
    },
    [sortedByPop, qSize]
  );

  const handleAddUnselectedTracks = useCallback(
    tracksToAdd => {
      const newTracks = [...localTracks, ...tracksToAdd];

      if (onTrackOrderChange) {
        captureScrollPosition();
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange, captureScrollPosition]
  );

  const handleAddSpotifyTracks = useCallback(
    tracksToAdd => {
      const newTracks = [...localTracks, ...tracksToAdd];

      if (onTrackOrderChange) {
        captureScrollPosition();
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange, captureScrollPosition]
  );

  // Touch handlers for track items
  const handleTrackTouchStart = useCallback(
    (e, index) => {
      const touch = e.touches[0];

      // Clear any existing timer
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
      }

      // Set up long press detection
      const longPressTimer = setTimeout(() => {
        console.log(
          '[DraggableTrackList] Touch long press detected for index:',
          index
        );
        setTouchDragState(prev => ({
          ...prev,
          draggedTrackIndex: index,
        }));
        setDraggedIndex(index);

        // Notify drag context for consistent background styling
        const track = localTracks[index];
        if (track) {
          startDrag({ data: track, type: 'internal-track' }, 'touch');
        }

        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      }, 250); // 250ms long press delay

      setTouchDragState({
        isActive: true,
        startY: touch.clientY,
        startX: touch.clientX,
        longPressTimer,
        draggedTrackIndex: null,
      });
    },
    [touchDragState.longPressTimer, localTracks, startDrag]
  );

  const handleTrackTouchMove = useCallback(
    (e, index) => {
      if (!touchDragState.isActive) return;

      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - touchDragState.startY);
      const deltaX = Math.abs(touch.clientX - touchDragState.startX);

      // Cancel long press if user moves too much before long press activates
      if (
        touchDragState.draggedTrackIndex === null &&
        (deltaY > 15 || deltaX > 15)
      ) {
        if (touchDragState.longPressTimer) {
          clearTimeout(touchDragState.longPressTimer);
          setTouchDragState(prev => ({
            ...prev,
            longPressTimer: null,
          }));
        }

        // Scroll restoration is now handled centrally by DragContext

        return;
      }

      // Handle dragging if long press is active
      if (touchDragState.draggedTrackIndex !== null) {
        e.preventDefault();

        // Scroll locking is now handled centrally by DragContext

        checkAutoScroll(touch.clientY);

        // Find which track element is being hovered over
        const trackElements =
          scrollContainerRef.current?.querySelectorAll('[data-track-index]');
        let foundDropTarget = false;

        if (trackElements) {
          for (let i = 0; i < trackElements.length; i++) {
            const trackElement = trackElements[i];
            const rect = trackElement.getBoundingClientRect();
            const hoverIndex = parseInt(
              trackElement.getAttribute('data-track-index')
            );

            if (
              touch.clientX >= rect.left &&
              touch.clientX <= rect.right &&
              touch.clientY >= rect.top &&
              touch.clientY <= rect.bottom
            ) {
              const midpoint = rect.top + rect.height / 2;
              const isTopHalf = touch.clientY < midpoint;

              setDropLinePosition({
                index: isTopHalf ? hoverIndex : hoverIndex + 1,
                isTopHalf,
              });
              foundDropTarget = true;
              break;
            }
          }
        }

        if (!foundDropTarget) {
          const containerRect =
            scrollContainerRef.current?.getBoundingClientRect();
          if (
            containerRect &&
            touch.clientX >= containerRect.left &&
            touch.clientX <= containerRect.right &&
            touch.clientY >= containerRect.top &&
            touch.clientY <= containerRect.bottom
          ) {
            setDropLinePosition({
              index: localTracks.length,
              isTopHalf: false,
            });
          }
        }
      }
    },
    [touchDragState, checkAutoScroll, localTracks.length]
  );

  const handleTrackTouchEnd = useCallback(
    (e, index) => {
      // Clear long press timer
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
      }

      // Handle drop if long press was active
      if (touchDragState.draggedTrackIndex !== null && dropLinePosition) {
        console.log(
          '[DraggableTrackList] Touch drop detected from index:',
          touchDragState.draggedTrackIndex,
          'to position:',
          dropLinePosition.index
        );

        const draggedTrackIndex = touchDragState.draggedTrackIndex;
        const newTracks = [...localTracks];
        const draggedTrack = newTracks[draggedTrackIndex];

        // Remove the dragged track from its original position
        newTracks.splice(draggedTrackIndex, 1);

        // Calculate the correct insertion index after removal
        let insertIndex = dropLinePosition.index;
        if (draggedTrackIndex < dropLinePosition.index) {
          insertIndex = dropLinePosition.index - 1;
        }

        // Insert the track at the new position
        newTracks.splice(insertIndex, 0, draggedTrack);

        if (onTrackOrderChange) {
          captureScrollPosition();
          onTrackOrderChange(newTracks);
        }

        // Provide success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }

        console.log('[DraggableTrackList] Touch drop completed successfully');
      }

      // End drag in context for consistent background styling
      if (touchDragState.draggedTrackIndex !== null) {
        endDrag('success');
      }

      // Reset states
      setTouchDragState({
        isActive: false,
        startY: 0,
        startX: 0,
        longPressTimer: null,
        draggedTrackIndex: null,
      });
      setDraggedIndex(null);
      setDropLinePosition(null);
      stopAutoScroll();
    },
    [
      touchDragState,
      dropLinePosition,
      localTracks,
      onTrackOrderChange,
      stopAutoScroll,
      endDrag,
      captureScrollPosition,
    ]
  );

  // Simplified external touch handler for modal drags
  const handleExternalTouchMove = useCallback(
    e => {
      if (!isDragging || !draggedItem) return;

      e.preventDefault();
      const touch = e.touches[0];
      checkAutoScroll(touch.clientY);

      // Dispatch custom event for external drag handling
      if (scrollContainerRef.current) {
        const customEvent = new CustomEvent('externalDragOver', {
          detail: {
            clientX: touch.clientX,
            clientY: touch.clientY,
            draggedItem,
          },
        });
        scrollContainerRef.current.dispatchEvent(customEvent);
      }
    },
    [isDragging, draggedItem, checkAutoScroll]
  );

  return (
    <>
      <div className={styles.container}>
        <div
          ref={scrollContainerRef}
          data-preview-panel="true"
          className={`${styles.scrollContainer} ${isDragging || draggedIndex !== null ? styles.dragging : ''}`}
          onTouchMove={handleExternalTouchMove}
          onDragOver={e => {
            e.preventDefault();
            checkAutoScroll(e.clientY);

            const isExternalDrag =
              isDragging || e.dataTransfer.types.includes('application/json');

            if (
              e.target === e.currentTarget ||
              e.target.closest('[style*="sticky"]')
            ) {
              if (isExternalDrag || draggedIndex !== null) {
                console.log(
                  '[DraggableTrackList] Container dragOver - setting drop position to end'
                );
                setDropLinePosition({
                  index: localTracks.length,
                  isTopHalf: false,
                });
              }
            }
          }}
          onDrop={e => {
            stopAutoScroll();

            if (
              e.target === e.currentTarget ||
              e.target.closest('[style*="sticky"]')
            ) {
              console.log('[DraggableTrackList] Container drop detected');
              handleDrop(e, localTracks.length);
            }
          }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <strong>🎵 {localTracks.length} Songs</strong>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => {
                    if (showAddUnselectedModal) {
                      setShowAddUnselectedModal(false);
                      setTimeout(() => setShowAddUnselectedModal(true), 0);
                    } else {
                      setShowAddUnselectedModal(true);
                    }
                  }}
                  className={styles.addButton}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (showAddUnselectedModal) {
                        setShowAddUnselectedModal(false);
                        setTimeout(() => setShowAddUnselectedModal(true), 0);
                      } else {
                        setShowAddUnselectedModal(true);
                      }
                    }
                  }}
                  tabIndex={0}
                  title="Add songs that weren't selected from your playlists"
                >
                  <span
                    className={`${styles.buttonIcon} ${styles.addButtonIcon}`}
                  >
                    ➕
                  </span>
                  <span className={styles.buttonText}>Add Unselected</span>
                </button>

                <button
                  onClick={() => {
                    if (showSpotifySearch) {
                      setShowSpotifySearch(false);
                      setTimeout(() => setShowSpotifySearch(true), 0);
                    } else {
                      setShowSpotifySearch(true);
                    }
                  }}
                  className={styles.spotifyButton}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (showSpotifySearch) {
                        setShowSpotifySearch(false);
                        setTimeout(() => setShowSpotifySearch(true), 0);
                      } else {
                        setShowSpotifySearch(true);
                      }
                    }
                  }}
                  tabIndex={0}
                  title="Search and add songs directly from Spotify"
                >
                  <span
                    className={`${styles.buttonIcon} ${styles.spotifyButtonIcon}`}
                  >
                    🎵
                  </span>
                  <span className={styles.buttonText}>Add from Spotify</span>
                </button>
              </div>
            </div>

            <div className={styles.helpText}>
              💡{' '}
              <strong>
                <span className={styles.buttonText}>
                  Drag and drop to reorder
                </span>
                <span className={styles.mobileText}>
                  Long press any track and drag to reorder
                </span>
              </strong>{' '}
              • <strong>Click ✕ to remove tracks</strong>
            </div>
          </div>

          {/* Drop line at the end when dragging over empty space */}
          {dropLinePosition &&
            dropLinePosition.index === localTracks.length &&
            localTracks.length > 0 && <div className={styles.dropLine} />}

          {/* Empty state drop zone */}
          {localTracks.length === 0 && (
            <div
              className={`${styles.emptyState} ${
                isDragging || dropLinePosition ? styles.dragging : styles.normal
              }`}
            >
              {isDragging || dropLinePosition
                ? '🎵 Drop track here to add it to your playlist'
                : 'No tracks in preview yet. Generate a preview or drag tracks from the modal.'}
            </div>
          )}

          {/* Track List - Custom Implementation */}
          {localTracks.map((track, index) => {
            const sourcePlaylist = selectedPlaylists.find(
              p => p.id === track.sourcePlaylist
            );
            const quadrant = getTrackQuadrant(track);

            const showDropLineAbove =
              dropLinePosition && dropLinePosition.index === index;
            const showDropLineBelow =
              dropLinePosition && dropLinePosition.index === index + 1;

            return (
              <div
                key={track.id}
                draggable={!('ontouchstart' in window)}
                data-track-index={index}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={e => handleTrackTouchStart(e, index)}
                onTouchMove={e => handleTrackTouchMove(e, index)}
                onTouchEnd={e => handleTrackTouchEnd(e, index)}
                className={styles.trackItem}
                style={{
                  borderTop: showDropLineAbove
                    ? '3px solid var(--moss-green)'
                    : 'none',
                  boxShadow: showDropLineAbove
                    ? '0 -2px 8px rgba(144, 169, 85, 0.6)'
                    : 'none',
                }}
              >
                <div className={styles.trackContent}>
                  <div className={styles.dragHandle}>⋮⋮</div>
                  <div className={styles.trackInfo}>
                    {track.album?.images?.[0]?.url && (
                      <img
                        src={
                          track.album.images[2]?.url ||
                          track.album.images[1]?.url ||
                          track.album.images[0]?.url
                        }
                        alt={`${track.album.name} album cover`}
                        className={styles.albumCover}
                        onError={e => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className={styles.trackDetails}>
                      <div className={styles.trackName}>
                        {index + 1}. {track.name}
                      </div>
                      <div className={styles.trackMeta}>
                        <span>
                          {track.artists?.[0]?.name || 'Unknown Artist'}
                        </span>
                        <span>•</span>
                        <span
                          style={{
                            color:
                              track.sourcePlaylist === 'search'
                                ? 'var(--mindaro)'
                                : 'var(--moss-green)',
                          }}
                        >
                          {track.sourcePlaylist === 'search' ? (
                            <>
                              <span className={styles.buttonText}>
                                🔍 Spotify Search
                              </span>
                              <span className={styles.mobileText}>🔍</span>
                            </>
                          ) : (
                            sourcePlaylist?.name || 'Unknown'
                          )}
                        </span>
                        {quadrant && (
                          <>
                            <span>•</span>
                            <span
                              className={styles.popularityBadge}
                              style={{
                                background:
                                  quadrant === 'topHits'
                                    ? 'rgba(255, 87, 34, 0.2)'
                                    : quadrant === 'popular'
                                      ? 'rgba(255, 193, 7, 0.2)'
                                      : quadrant === 'moderate'
                                        ? 'rgba(0, 188, 212, 0.2)'
                                        : 'rgba(233, 30, 99, 0.2)',
                                color:
                                  quadrant === 'topHits'
                                    ? '#FF5722'
                                    : quadrant === 'popular'
                                      ? '#FF8F00'
                                      : quadrant === 'moderate'
                                        ? '#00BCD4'
                                        : '#E91E63',
                              }}
                              title={
                                quadrant === 'topHits'
                                  ? `Top Hits (${track.popularity})`
                                  : quadrant === 'popular'
                                    ? `Popular (${track.popularity})`
                                    : quadrant === 'moderate'
                                      ? `Moderate (${track.popularity})`
                                      : `Deep Cuts (${track.popularity})`
                              }
                            >
                              <span className={styles.buttonText}>
                                {quadrant === 'topHits'
                                  ? `🔥 Top Hits (${track.popularity})`
                                  : quadrant === 'popular'
                                    ? `⭐ Popular (${track.popularity})`
                                    : quadrant === 'moderate'
                                      ? `📻 Moderate (${track.popularity})`
                                      : `💎 Deep Cuts (${track.popularity})`}
                              </span>
                              <span className={styles.mobileText}>
                                {getPopularityIcon(quadrant)}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.trackActions}>
                  <div className={styles.duration}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveTrack(index);
                    }}
                    className={styles.removeButton}
                    title="Remove track from playlist"
                  >
                    ×
                  </button>
                </div>

                {/* Drop line below */}
                {showDropLineBelow && <div className={styles.dropLineBelow} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
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
