import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import useSpotifySearch from '../hooks/useSpotifySearch';
import useDraggable from '../hooks/useDraggable';
import { useDrag } from './DragContext';
import { handleTrackSelection } from '../utils/dragAndDrop';
import { SpotifyTrack } from '../types';
import styles from './SpotifySearchModal.module.css';

interface SpotifySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onAddTracks: (tracks: SpotifyTrack[]) => void;
  className?: string;
}

const SpotifySearchModal = memo<SpotifySearchModalProps>(
  ({ isOpen, onClose, accessToken, onAddTracks, className = '' }) => {
    const [selectedTracksToAdd, setSelectedTracksToAdd] = useState<Set<string>>(
      new Set()
    );

    // Use the Spotify search hook
    const {
      query,
      results: searchResults,
      loading,
      error,
      setQuery,
      search,
      clear,
    } = useSpotifySearch(accessToken, {
      autoSearch: false, // We'll trigger search manually
      limit: 20,
    });

    const { startDrag, endDrag, isDragging } = useDrag();

    // Ref for the track list container for drag operations
    const trackListContainerRef = useRef<HTMLDivElement>(null);

    // Enhanced onClose handler
    const handleModalClose = useCallback(() => {
      console.log('[SpotifySearchModal] Modal closing');
      onClose();
    }, [onClose]);

    const handleSpotifySearch = useCallback(() => {
      if (!query.trim()) {
        return;
      }
      search();
    }, [query, search]);

    const handleTrackSelect = useCallback(
      (track: SpotifyTrack) => {
        handleTrackSelection(
          track,
          selectedTracksToAdd,
          setSelectedTracksToAdd
        );
      },
      [selectedTracksToAdd]
    );

    const handleAddSelected = useCallback(() => {
      const tracksToAdd = searchResults
        .filter(track => selectedTracksToAdd.has(track.id))
        .map(track => ({
          ...track,
          sourcePlaylist: 'search',
          sourcePlaylistName: 'Spotify Search',
        }));

      onAddTracks(tracksToAdd);

      // Clear selected tracks but keep modal open for continued searching
      setSelectedTracksToAdd(new Set());
    }, [searchResults, selectedTracksToAdd, onAddTracks]);

    // Enhanced drag handlers using useDraggable hook
    const { dragHandleProps, touchState } = useDraggable({
      type: 'search-track',
      onDragStart: item => {
        console.log('[SpotifySearchModal] Track drag start:', item.data?.name);
      },
      onDragEnd: (item, result) => {
        console.log('[SpotifySearchModal] Track drag end:', result?.success);
      },
      scrollContainer: trackListContainerRef.current,
      longPressDelay: 250,
    });

    // Track drag start handler
    const handleTrackDragStart = useCallback(
      (e: React.DragEvent<HTMLDivElement>, track: SpotifyTrack) => {
        console.log('[SpotifySearchModal] Track drag start:', track.name);

        const trackWithSource = {
          ...track,
          sourcePlaylist: 'search',
          sourcePlaylistName: 'Spotify Search',
        };

        // Determine drag type based on device capabilities
        const dragType = 'ontouchstart' in window ? 'touch' : 'html5';

        // Start drag in context
        startDrag({ data: trackWithSource, type: 'search-track' }, dragType);

        // Set data for the drag operation (for backward compatibility with HTML5)
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
              type: 'search-track',
              track: trackWithSource,
            })
          );
        }
      },
      [startDrag]
    );

    // Touch event handlers using useDraggable
    const handleTrackTouchStart = useCallback(
      (e: React.TouchEvent<HTMLDivElement>, track: SpotifyTrack) => {
        const trackWithSource = {
          ...track,
          sourcePlaylist: 'search',
          sourcePlaylistName: 'Spotify Search',
        };

        // Use the useDraggable touch start handler
        const syntheticEvent = {
          ...e,
          currentTarget: e.currentTarget,
        };

        // Set the data for the drag operation
        const enhancedDragHandleProps = {
          ...dragHandleProps,
          onTouchStart: (touchEvent: React.TouchEvent<HTMLElement>) => {
            // Store track data for drag operations
            (touchEvent.currentTarget as any).__dragData = trackWithSource;
            dragHandleProps.onTouchStart(touchEvent);
          },
        };

        enhancedDragHandleProps.onTouchStart(syntheticEvent);
      },
      [dragHandleProps]
    );

    const handleTrackTouchMove = useCallback(
      (e: React.TouchEvent<HTMLDivElement>, track: SpotifyTrack) => {
        if (touchState.isActive) {
          const trackWithSource = {
            ...track,
            sourcePlaylist: 'search',
            sourcePlaylistName: 'Spotify Search',
          };

          // Dispatch custom drag over event for external listeners
          const touch = e.touches[0];
          const trackListContainer = document.querySelector(
            '[data-preview-panel="true"]'
          );
          if (trackListContainer && touchState.isLongPress) {
            const customEvent = new CustomEvent('externalDragOver', {
              detail: {
                clientX: touch.clientX,
                clientY: touch.clientY,
                draggedItem: { data: trackWithSource, type: 'search-track' },
              },
            });
            trackListContainer.dispatchEvent(customEvent);
          }
        }

        dragHandleProps.onTouchMove(e);
      },
      [dragHandleProps, touchState]
    );

    const handleTrackTouchEnd = useCallback(
      (e: React.TouchEvent<HTMLDivElement>, track: SpotifyTrack) => {
        if (touchState.isLongPress) {
          const touch = e.changedTouches[0];
          const trackWithSource = {
            ...track,
            sourcePlaylist: 'search',
            sourcePlaylistName: 'Spotify Search',
          };

          // Find the DraggableTrackList container and dispatch external drop event
          const trackListContainer = document.querySelector(
            '[data-preview-panel="true"]'
          );
          if (trackListContainer) {
            const customEvent = new CustomEvent('externalDrop', {
              detail: {
                clientX: touch.clientX,
                clientY: touch.clientY,
                draggedItem: { data: trackWithSource, type: 'search-track' },
              },
            });
            trackListContainer.dispatchEvent(customEvent);
          }
        } else if (touchState.isActive) {
          // If it was just a tap (no drag), handle track selection
          const deltaY = Math.abs(
            e.changedTouches[0].clientY - (e.currentTarget as any).__startY || 0
          );
          const deltaX = Math.abs(
            e.changedTouches[0].clientX - (e.currentTarget as any).__startX || 0
          );

          // Only treat as tap if minimal movement
          if (deltaY < 10 && deltaX < 10) {
            handleTrackSelect(track);
          }
        }

        dragHandleProps.onTouchEnd(e);
      },
      [dragHandleProps, touchState, handleTrackSelect]
    );

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        clear();
        setSelectedTracksToAdd(new Set());
      }
    }, [isOpen, clear]);

    // Handle keyboard events for search input
    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          handleSpotifySearch();
        }
      },
      [handleSpotifySearch]
    );

    // Handle input focus/blur for styling
    const handleInputFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = 'var(--moss-green)';
      },
      []
    );

    const handleInputBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = 'var(--fern-green)';
      },
      []
    );

    // Determine modal and backdrop styles based on drag state
    const modalStyle = {
      opacity: isDragging ? 0 : 1,
      pointerEvents: isDragging ? ('none' as const) : ('auto' as const),
      transition: 'opacity 0.2s ease',
    };

    const backdropStyle = {
      pointerEvents: isDragging ? ('none' as const) : ('auto' as const),
      opacity: isDragging ? 0 : 1,
      transition: 'opacity 0.2s ease',
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="🎵 Search Spotify"
        size="large"
        className={`${styles.modal} ${isDragging ? styles.dragging : ''} ${className}`}
        style={modalStyle}
        backdropStyle={backdropStyle}
      >
        {/* Header Info */}
        <div className={styles.header}>
          <p className={styles.headerInfo}>
            {loading ? (
              'Searching...'
            ) : (
              <>
                {searchResults.length} tracks found •{' '}
                <strong>Click to select</strong> or{' '}
                <strong>drag to playlist</strong>
              </>
            )}
          </p>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={styles.searchInput}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              autoFocus
            />
            <button
              onClick={handleSpotifySearch}
              disabled={loading || !query.trim()}
              className={styles.searchButton}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Track List */}
        <div className={styles.trackListContainer} ref={trackListContainerRef}>
          {loading ? (
            <div className={styles.loadingState}>Searching Spotify...</div>
          ) : error ? (
            <div className={styles.errorState}>
              Error searching Spotify. Please try again.
            </div>
          ) : (
            <TrackList
              tracks={searchResults.map(track => ({
                ...track,
                sourcePlaylist: 'search',
                sourcePlaylistName: '🔍 Spotify Search',
              }))}
              onTrackDragStart={handleTrackDragStart}
              onTrackTouchStart={handleTrackTouchStart}
              onTrackTouchMove={handleTrackTouchMove}
              onTrackTouchEnd={handleTrackTouchEnd}
              onTrackSelect={handleTrackSelect}
              selectedTracks={selectedTracksToAdd}
              draggable={true}
              selectable={true}
              showCheckbox={true}
              showAlbumArt={true}
              showPopularity={true}
              showDuration={true}
              showSourcePlaylist={true}
              virtualized={searchResults.length > 100}
              containerHeight={400}
              emptyMessage={
                query
                  ? 'No tracks found. Try a different search term.'
                  : 'Enter a search term to find songs on Spotify'
              }
              onTrackDragEnd={() => endDrag('html5-end')}
              className={styles.trackList}
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            {selectedTracksToAdd.size} track
            {selectedTracksToAdd.size !== 1 ? 's' : ''} selected
          </div>
          <div className={styles.footerActions}>
            <button onClick={handleModalClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedTracksToAdd.size === 0}
              className={styles.addButton}
            >
              Add {selectedTracksToAdd.size} Track
              {selectedTracksToAdd.size !== 1 ? 's' : ''} & Continue
            </button>
          </div>
        </div>
      </Modal>
    );
  }
);

SpotifySearchModal.displayName = 'SpotifySearchModal';

export default SpotifySearchModal;
