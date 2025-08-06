import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useRef,
  useMemo,
} from 'react';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import useSpotifySearch from '../hooks/useSpotifySearch';

import { useDragState } from '../hooks/drag/useDragState';
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

    // Use the Spotify search hook with auto-search enabled
    const {
      query,
      results: searchResults,
      loading,
      error,
      setQuery,
      search,
      clear,
    } = useSpotifySearch(accessToken, {
      autoSearch: true, // Enable search-as-you-type
      debounceMs: 300, // Add debouncing to avoid too many API calls
      limit: 20,
    });

    // Use drag state hook for modal coordination
    const { isDragging, draggedItem, startDrag, endDrag } = useDragState();

    // Determine if this modal should be muted during drag operations
    // According to Requirement 8.3: ALL modals should become muted during ANY drag operation
    // so the drag can be completed on the preview panel behind the modal
    const shouldMuteModal = useMemo(() => {
      return isDragging && !!draggedItem;
    }, [isDragging, draggedItem]);

    // Calculate modal styles based on drag state
    const modalStyles = useMemo(
      () => ({
        opacity: shouldMuteModal ? 0 : 1,
        pointerEvents: shouldMuteModal ? ('none' as const) : ('auto' as const),
        zIndex: shouldMuteModal ? -1 : 1000, // Move modal behind everything during drag
        transition: 'opacity 0.2s ease-in-out',
      }),
      [shouldMuteModal]
    );

    const backdropStyles = useMemo(
      () => ({
        pointerEvents: shouldMuteModal ? ('none' as const) : ('auto' as const),
        opacity: shouldMuteModal ? 0 : 1,
        transition: 'opacity 0.2s ease-in-out',
      }),
      [shouldMuteModal]
    );

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
      // Manual search is now optional since autoSearch is enabled
      // This will be triggered by Enter key or search button click
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

    // Handle keyboard events for search input
    const handleKeyDown = useCallback(
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

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        clear();
        setSelectedTracksToAdd(new Set());
      }
    }, [isOpen, clear]);

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="🎵 Search Spotify"
        size="large"
        className={`${styles.modal} ${shouldMuteModal ? styles.modalMuted : ''} ${isDragging ? styles.dragging : ''} ${className}`}
        style={modalStyles}
        backdropStyle={backdropStyles}
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
              placeholder="Type to search songs, artists, or albums..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={styles.searchInput}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              autoFocus
            />
            <button
              onClick={handleSpotifySearch}
              disabled={loading || !query.trim()}
              className={styles.searchButton}
              title="Search manually (searches automatically as you type)"
            >
              {loading ? 'Searching...' : '🔍'}
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
              tracks={searchResults}
              selectedTracks={selectedTracksToAdd}
              onTrackSelect={handleTrackSelect}
              draggable={true}
              showDragHandle={true}
              // Drag handlers for search-track type
              onTrackDragStart={(e, track) => {
                // Create drag item with proper search-track type
                const dragItem = {
                  id: track.id,
                  type: 'search-track' as const,
                  payload: {
                    track: track,
                    query: query,
                  },
                  timestamp: Date.now(),
                };

                // Set drag data for HTML5 drag and drop first
                e.dataTransfer.effectAllowed = 'copy'; // Use 'copy' for external tracks
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify(dragItem)
                );

                // Update global drag state after a small delay to ensure HTML5 drag has started
                setTimeout(() => {
                  startDrag(dragItem);
                }, 0);

                console.log('[SpotifySearchModal] Starting drag:', dragItem);
              }}
              onTrackDragEnd={(e, track) => {
                console.log(
                  '[SpotifySearchModal] Drag ended for track:',
                  track.name
                );
                // Don't end the drag state immediately - let the drop zone handle it
                // The drag state will be cleaned up by the DraggableTrackList drop handler
                // or by a timeout if the drop fails
                setTimeout(() => {
                  // Only end drag if it's still active (no successful drop occurred)
                  if (isDragging) {
                    console.log(
                      '[SpotifySearchModal] Cleaning up drag state after timeout'
                    );
                    endDrag();
                  }
                }, 100);
              }}
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
