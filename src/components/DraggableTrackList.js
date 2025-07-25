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

const DraggableTrackList = ({
  tracks,
  selectedPlaylists,
  onTrackOrderChange,
  formatDuration,
  accessToken,
}) => {
  const { isDragging, draggedItem, endDrag } = useDrag();
  const [localTracks, setLocalTracks] = useState(tracks);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Static container height - 85% of viewport height
  const containerHeight = Math.floor(window.innerHeight * 0.85);
  const scrollContainerRef = useRef(null);

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

  // Drag and drop handlers
  const handleDragStart = useCallback((e, index) => {
    console.log('[DraggableTrackList] HTML5 drag start for index:', index);
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  }, []);

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
        draggedItem
      );

      stopAutoScroll();

      let dropProcessed = false;

      // Handle external drag from context first (most reliable)
      if (isDragging && draggedItem) {
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
        setLocalTracks(newTracks);

        if (onTrackOrderChange) {
          onTrackOrderChange(newTracks);
        }

        setDropLinePosition(null);
        endDrag('success');

        dropProcessed = true;
      }

      // Fallback: Check dataTransfer for external drags
      if (!dropProcessed) {
        try {
          const dragData = e.dataTransfer.getData('application/json');
          if (dragData) {
            const { type, track } = JSON.parse(dragData);
            if (type === 'modal-track' || type === 'search-track') {
              const newTracks = [...localTracks];
              const insertIndex = dropLinePosition
                ? dropLinePosition.index
                : localTracks.length;

              newTracks.splice(insertIndex, 0, track);
              setLocalTracks(newTracks);

              if (onTrackOrderChange) {
                onTrackOrderChange(newTracks);
              }

              setDropLinePosition(null);
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
          console.log(
            '[DraggableTrackList] Invalid internal drop - cleaning up'
          );
          setDraggedIndex(null);
          setDropLinePosition(null);
          return;
        }

        const newTracks = [...localTracks];
        const draggedTrack = newTracks[draggedIndex];

        newTracks.splice(draggedIndex, 1);

        let insertIndex = dropLinePosition.index;
        if (draggedIndex < dropLinePosition.index) {
          insertIndex = dropLinePosition.index - 1;
        }

        newTracks.splice(insertIndex, 0, draggedTrack);
        setLocalTracks(newTracks);

        if (onTrackOrderChange) {
          onTrackOrderChange(newTracks);
        }

        setDraggedIndex(null);
        setDropLinePosition(null);

        console.log(
          '[DraggableTrackList] Internal drop completed successfully'
        );
      }
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
    ]
  );

  const handleDragEnd = useCallback(
    e => {
      console.log('[DraggableTrackList] HTML5 drag end');
      stopAutoScroll();
      setDraggedIndex(null);
      setDropLinePosition(null);
    },
    [stopAutoScroll]
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
        setLocalTracks(newTracks);

        if (onTrackOrderChange) {
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

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  const handleRemoveTrack = useCallback(
    index => {
      const newTracks = [...localTracks];
      newTracks.splice(index, 1);
      setLocalTracks(newTracks);

      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange]
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
      setLocalTracks(newTracks);

      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange]
  );

  const handleAddSpotifyTracks = useCallback(
    tracksToAdd => {
      const newTracks = [...localTracks, ...tracksToAdd];
      setLocalTracks(newTracks);

      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange]
  );

  // Helper function to truncate text with ellipsis
  const truncateText = useCallback((text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }, []);

  // Simplified external touch handler for modal drags
  const handleExternalTouchMove = useCallback(
    e => {
      if (!isMobile || !isDragging || !draggedItem) return;

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
    [isMobile, isDragging, draggedItem, checkAutoScroll]
  );

  return (
    <>
      <div
        style={{
          position: 'relative',
          marginBottom: '16px',
        }}
      >
        <div
          ref={scrollContainerRef}
          data-preview-panel="true"
          style={{
            background: 'var(--hunter-green)',
            borderRadius: '8px',
            border: '1px solid var(--fern-green)',
            height: `${containerHeight}px`,
            overflowY: isDragging || draggedIndex !== null ? 'hidden' : 'auto',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
          }}
          onTouchMove={isMobile ? handleExternalTouchMove : undefined}
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
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--fern-green)',
              position: 'sticky',
              top: 0,
              background: 'var(--hunter-green)',
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <strong>🎵 {localTracks.length} Songs</strong>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    if (showAddUnselectedModal) {
                      setShowAddUnselectedModal(false);
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
                    whiteSpace: 'nowrap',
                  }}
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
                    style={{
                      backgroundColor: '#7a9147',
                      borderRadius: '3px',
                      padding: '2px',
                      fontSize: '10px',
                    }}
                  >
                    ➕
                  </span>
                  {!isMobile && <span>Add Unselected</span>}
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
                    whiteSpace: 'nowrap',
                  }}
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
                    style={{
                      backgroundColor: '#189a47',
                      borderRadius: '3px',
                      padding: '2px',
                      fontSize: '10px',
                    }}
                  >
                    🎵
                  </span>
                  {!isMobile && <span>Add from Spotify</span>}
                </button>
              </div>
            </div>

            <div
              style={{
                fontSize: '11px',
                opacity: '0.7',
                lineHeight: '1.3',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              💡{' '}
              <strong>
                {isMobile
                  ? 'Long press any track and drag to reorder'
                  : 'Drag and drop to reorder'}
              </strong>{' '}
              • <strong>Click ✕ to remove tracks</strong>
            </div>
          </div>

          {/* Drop line at the end when dragging over empty space */}
          {dropLinePosition &&
            dropLinePosition.index === localTracks.length &&
            localTracks.length > 0 && (
              <div
                style={{
                  height: '3px',
                  background: 'var(--moss-green)',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px rgba(144, 169, 85, 0.6)',
                  animation: 'pulse 1s infinite',
                  margin: '8px 16px',
                  pointerEvents: 'none',
                }}
              />
            )}

          {/* Empty state drop zone */}
          {localTracks.length === 0 && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--mindaro)',
                opacity: '0.6',
                fontSize: '14px',
                borderStyle: isDragging || dropLinePosition ? 'dashed' : 'none',
                borderWidth: '2px',
                borderColor: 'var(--moss-green)',
                borderRadius: '8px',
                margin: '20px',
                backgroundColor:
                  isDragging || dropLinePosition
                    ? 'rgba(144, 169, 85, 0.1)'
                    : 'transparent',
                transition: 'all 0.2s ease',
              }}
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
                key={`${track.id}-${index}`}
                draggable={!isMobile}
                data-track-index={index}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderBottom:
                    index < localTracks.length - 1
                      ? '1px solid rgba(79, 119, 45, 0.3)'
                      : 'none',
                  borderTop: showDropLineAbove
                    ? '3px solid var(--moss-green)'
                    : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: isMobile ? 'default' : 'grab',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  position: 'relative',
                  boxShadow: showDropLineAbove
                    ? '0 -2px 8px rgba(144, 169, 85, 0.6)'
                    : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      marginRight: isMobile ? '8px' : '12px',
                      fontSize: isMobile ? '14px' : '16px',
                      opacity: '0.5',
                      cursor: isMobile ? 'default' : 'grab',
                      padding: isMobile ? '4px' : '0',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ⋮⋮
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '8px' : '12px',
                      flex: 1,
                    }}
                  >
                    {track.album?.images?.[0]?.url && (
                      <img
                        src={
                          track.album.images[2]?.url ||
                          track.album.images[1]?.url ||
                          track.album.images[0]?.url
                        }
                        alt={`${track.album.name} album cover`}
                        style={{
                          width: isMobile ? '32px' : '40px',
                          height: isMobile ? '32px' : '40px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        onError={e => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: '500',
                          fontSize: isMobile ? '13px' : '14px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.3',
                          maxHeight: isMobile ? '2.6em' : '2.8em',
                        }}
                      >
                        {index + 1}.{' '}
                        {isMobile ? truncateText(track.name, 25) : track.name}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '11px' : '12px',
                          opacity: '0.7',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px',
                        }}
                      >
                        <span>
                          {truncateText(
                            track.artists?.[0]?.name || 'Unknown Artist',
                            isMobile ? 15 : 25
                          )}
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
                          {track.sourcePlaylist === 'search'
                            ? isMobile
                              ? '🔍'
                              : '🔍 Spotify Search'
                            : truncateText(
                                sourcePlaylist?.name || 'Unknown',
                                isMobile ? 12 : 20
                              )}
                        </span>
                        {quadrant && (
                          <>
                            <span>•</span>
                            <span
                              style={{
                                fontSize: isMobile ? '10px' : '10px',
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
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '500',
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
                              {isMobile
                                ? getPopularityIcon(quadrant)
                                : quadrant === 'topHits'
                                  ? `🔥 Top Hits (${track.popularity})`
                                  : quadrant === 'popular'
                                    ? `⭐ Popular (${track.popularity})`
                                    : quadrant === 'moderate'
                                      ? `📻 Moderate (${track.popularity})`
                                      : `💎 Deep Cuts (${track.popularity})`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div style={{ fontSize: '11px', opacity: '0.6' }}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                  <button
                    onClick={e => {
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
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => (e.target.style.background = '#cc0000')}
                    onMouseLeave={e => (e.target.style.background = '#ff4444')}
                    title="Remove track from playlist"
                  >
                    ×
                  </button>
                </div>

                {/* Drop line below */}
                {showDropLineBelow && (
                  <div
                    style={{
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
                      zIndex: 10,
                    }}
                  />
                )}
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
