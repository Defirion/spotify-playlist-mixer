import React, { useCallback, useEffect, memo } from 'react';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import { useTrackSelection } from '../hooks/useTrackSelection';
// Drag-related imports removed
import { SpotifyTrack } from '../types';
import styles from './TrackSourceModal.module.css';

interface TrackSourceModalProps {
  // Modal props
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;

  // Data props
  tracks: SpotifyTrack[];
  loading: boolean;
  error?: Error | null;
  onAddTracks: (tracks: SpotifyTrack[]) => void;

  // Search props
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchPlaceholder?: string;
  showSearchButton?: boolean;
  onManualSearch?: () => void;

  // Drag props
  dragType: 'modal-track' | 'search-track';
  createDragPayload: (track: SpotifyTrack) => any;

  // Display props
  headerInfo?: string;
  emptyMessage?: string;
  showLoadingIndicator?: boolean;
}

const TrackSourceModal = memo<TrackSourceModalProps>(
  ({
    // Modal props
    isOpen,
    onClose,
    title,
    className = '',

    // Data props
    tracks,
    loading,
    error,
    onAddTracks,

    // Search props
    searchQuery,
    onSearchQueryChange,
    searchPlaceholder = 'Search tracks, artists, or albums...',
    showSearchButton = false,
    onManualSearch,

    // Drag props
    dragType,
    createDragPayload,

    // Display props
    headerInfo,
    emptyMessage = 'No tracks available',
    showLoadingIndicator = false,
  }) => {
    // Drag interaction hooks removed
    const {
      selectedTracksToAdd,
      handleTrackSelect,
      handleAddSelected,
      clearSelection,
    } = useTrackSelection({
      availableTracks: tracks,
      onAddTracks,
    });
    // Drag state hooks removed

    // Enhanced onClose handler
    const handleModalClose = useCallback(() => {
      console.log(`[${title}] Modal closing`);
      onClose();
    }, [onClose, title]);

    // Handle keyboard events for search input
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onManualSearch) {
          onManualSearch();
        }
      },
      [onManualSearch]
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

    // Clear selection when modal closes
    useEffect(() => {
      if (!isOpen) {
        clearSelection();
      }
    }, [isOpen, clearSelection]);

    // Generate header info text
    const displayHeaderInfo =
      headerInfo ||
      (loading ? (
        'Loading...'
      ) : (
        <>
          {tracks.length} tracks {showLoadingIndicator && loading && 'found'}
          {showLoadingIndicator && loading && (
            <span className={styles.loadingIndicator}> • Searching...</span>
          )}{' '}
          • <strong>Click to select</strong> or{' '}
          <strong>drag to playlist</strong>
        </>
      ));

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={title}
        size="large"
        className={`${styles.modal} ${className}`}
        // Drag-related styling removed
      >
        {/* Header Info */}
        <div className={styles.header}>
          <p className={styles.headerInfo}>{displayHeaderInfo}</p>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                className={`${styles.searchInput} ${loading ? styles.searchInputLoading : ''}`}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                autoFocus={dragType === 'search-track'}
              />
              {showLoadingIndicator && loading && (
                <div className={styles.inputLoadingIndicator}>⏳</div>
              )}
            </div>
            {showSearchButton && (
              <button
                onClick={onManualSearch}
                disabled={loading || !searchQuery.trim()}
                className={styles.searchButton}
                title="Search manually (searches automatically as you type)"
              >
                {loading ? 'Searching...' : '🔍'}
              </button>
            )}
          </div>
        </div>

        {/* Track List */}
        <div className={styles.trackListContainer}>
          {error ? (
            <div className={styles.errorState}>
              Error loading tracks. Please try again.
            </div>
          ) : (
            <TrackList
              tracks={tracks}
              selectedTracks={selectedTracksToAdd}
              onTrackSelect={handleTrackSelect}
              // drag props removed
              showCheckbox={true}
              showAlbumArt={true}
              showPopularity={true}
              showDuration={true}
              showSourcePlaylist={dragType === 'modal-track'}
              virtualized={tracks.length > 100}
              containerHeight={400}
              emptyMessage={emptyMessage}
              // Drag handlers removed
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

TrackSourceModal.displayName = 'TrackSourceModal';

export default TrackSourceModal;
