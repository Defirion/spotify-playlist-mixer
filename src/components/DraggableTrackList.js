import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import TrackList from './ui/TrackList';
import TrackItem from './ui/TrackItem';
import useDraggable from '../hooks/useDraggable';
import useVirtualization from '../hooks/useVirtualization';
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

  // Static container height - 85% of viewport height
  const containerHeight = Math.floor(window.innerHeight * 0.85);
  const scrollContainerRef = useRef(null);

  // Use virtualization for large lists (>100 tracks)
  const shouldVirtualize = localTracks.length > 100;
  const itemHeight = isMobile ? 64 : 72;

  // Use the unified draggable hook for drag-and-drop functionality
  const {
    dragHandleProps,
    dropZoneProps,
    isDragging: isInternalDragging,
    checkAutoScroll,
    stopAutoScroll,
  } = useDraggable({
    onDragStart: (item, type) => {
      console.log('[DraggableTrackList] Drag started:', item, type);
    },
    onDragEnd: reason => {
      console.log('[DraggableTrackList] Drag ended:', reason);
      setDropLinePosition(null);
    },
    onDrop: (draggedData, position, event) => {
      console.log('[DraggableTrackList] Drop received:', draggedData, position);
      handleDrop(draggedData, position, event);
    },
    onDragOver: (event, position) => {
      handleDragOver(event, position);
    },
    scrollContainer: scrollContainerRef.current,
    disabled: false,
  });

  // Simplified drag and drop handlers
  const handleDragOver = useCallback((event, position) => {
    if (!event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = event.clientY < midpoint;

    // Get the track index from the data attribute
    const trackIndex = parseInt(
      event.currentTarget.getAttribute('data-track-index') || '0'
    );

    const insertPosition = isTopHalf ? trackIndex : trackIndex + 1;

    setDropLinePosition({
      index: insertPosition,
      isTopHalf,
    });
  }, []);

  const handleDrop = useCallback(
    (draggedData, position, event) => {
      console.log('[DraggableTrackList] Processing drop:', draggedData);

      let dropProcessed = false;
      const newTracks = [...localTracks];

      // Handle external drag from context (modal tracks)
      if (draggedData && draggedData.data) {
        const track = draggedData.data;
        const insertIndex = dropLinePosition
          ? dropLinePosition.index
          : localTracks.length;

        newTracks.splice(insertIndex, 0, track);
        setLocalTracks(newTracks);

        if (onTrackOrderChange) {
          onTrackOrderChange(newTracks);
        }

        dropProcessed = true;
        console.log('[DraggableTrackList] External drop completed');
      }

      // Handle internal reordering
      if (!dropProcessed && event && event.dataTransfer) {
        try {
          const dragData = event.dataTransfer.getData('application/json');
          if (dragData) {
            const { trackIndex } = JSON.parse(dragData);
            if (typeof trackIndex === 'number' && dropLinePosition) {
              const draggedTrack = newTracks[trackIndex];
              newTracks.splice(trackIndex, 1);

              let insertIndex = dropLinePosition.index;
              if (trackIndex < dropLinePosition.index) {
                insertIndex = dropLinePosition.index - 1;
              }

              newTracks.splice(insertIndex, 0, draggedTrack);
              setLocalTracks(newTracks);

              if (onTrackOrderChange) {
                onTrackOrderChange(newTracks);
              }

              console.log('[DraggableTrackList] Internal reorder completed');
            }
          }
        } catch (error) {
          console.warn('Failed to parse internal drag data:', error);
        }
      }

      setDropLinePosition(null);
    },
    [localTracks, dropLinePosition, onTrackOrderChange]
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

  // Simplified track drag handlers
  const handleTrackDragStart = useCallback((e, track, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ trackIndex: index, track })
    );
    console.log('[DraggableTrackList] Track drag started:', track.name);
  }, []);

  const handleTrackDragEnd = useCallback(
    e => {
      console.log('[DraggableTrackList] Track drag ended');
      setDropLinePosition(null);
      stopAutoScroll();
    },
    [stopAutoScroll]
  );

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

  // Custom track rendering function for the TrackList component
  const renderTrackActions = useCallback(
    (track, index) => {
      const sourcePlaylist = selectedPlaylists.find(
        p => p.id === track.sourcePlaylist
      );
      const quadrant = getTrackQuadrant(track);

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Source playlist info */}
          <div
            style={{
              fontSize: isMobile ? '11px' : '12px',
              opacity: '0.7',
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
          </div>

          {/* Popularity indicator */}
          {quadrant && (
            <span
              style={{
                fontSize: '10px',
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
          )}
        </div>
      );
    },
    [selectedPlaylists, getTrackQuadrant, isMobile, truncateText]
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
            overflowY: isDragging || isInternalDragging ? 'hidden' : 'auto',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
          }}
          onTouchMove={isMobile ? handleExternalTouchMove : undefined}
          {...dropZoneProps}
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

          {/* Track List with Virtualization */}
          <TrackList
            tracks={localTracks.map((track, index) => ({
              ...track,
              sourcePlaylistName: selectedPlaylists.find(
                p => p.id === track.sourcePlaylist
              )?.name,
            }))}
            virtualized={shouldVirtualize}
            draggable={true}
            showDragHandle={true}
            showAlbumArt={true}
            showDuration={true}
            showPopularity={true}
            showSourcePlaylist={true}
            itemHeight={itemHeight}
            containerHeight={containerHeight - 120} // Account for header
            onTrackRemove={track => {
              const index = localTracks.findIndex(t => t.id === track.id);
              if (index !== -1) {
                handleRemoveTrack(index);
              }
            }}
            onTrackDragStart={handleTrackDragStart}
            onTrackDragEnd={handleTrackDragEnd}
            renderTrackActions={renderTrackActions}
            emptyMessage={
              isDragging || dropLinePosition
                ? '🎵 Drop track here to add it to your playlist'
                : 'No tracks in preview yet. Generate a preview or drag tracks from the modal.'
            }
            style={{
              background: 'transparent',
              border: 'none',
            }}
          />
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
