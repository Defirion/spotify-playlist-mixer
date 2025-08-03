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
import useDraggable from '../hooks/useDraggable';
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

    // Get scroll container for drag operations
    const scrollContainer = useMemo(() => {
      return document.querySelector(
        '[data-preview-panel="true"]'
      ) as HTMLElement | null;
    }, []);

    // Use the unified draggable hook
    const { isDragging, startDrag, endDrag } = useDraggable({
      type: 'search-track',
      scrollContainer,
    });

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

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        clear();
        setSelectedTracksToAdd(new Set());
      }
    }, [isOpen, clear]);

    // Define modal and backdrop styles based on drag state
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
              tracks={searchResults}
              selectedTracks={selectedTracksToAdd}
              onTrackSelect={handleTrackSelect}
              draggable={true}
              showDragHandle={true}
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
