import React, { useCallback, useEffect, memo } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Modal from './ui/Modal';
import TrackItem from './ui/TrackItem';
import SortableWrapper from './SortableWrapper';
import { useTrackSelection } from '../hooks/useTrackSelection';
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

  // Drag props removed - will be replaced with dnd-kit

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

    // Display props
    headerInfo,
    emptyMessage = 'No tracks available',
    showLoadingIndicator = false,
  }) => {
    const {
      selectedTracksToAdd,
      handleTrackSelect,
      handleAddSelected,
      clearSelection,
    } = useTrackSelection({
      availableTracks: tracks,
      onAddTracks,
    });

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
          • <strong>Click to select</strong> or <strong>drag to preview</strong>
        </>
      ));

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title={title}
        size="large"
        className={`${styles.modal} ${className}`}
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
                autoFocus={false}
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
          ) : tracks.length === 0 ? (
            <div className={styles.empty} data-testid="empty-message">
              {emptyMessage}
            </div>
          ) : (
            <SortableContext
              items={tracks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.trackList} data-testid="track-list">
                {tracks.map(track => (
                  <SortableWrapper
                    key={track.id}
                    id={track.id}
                    data={{ track, context: 'modal' }}
                  >
                    <TrackItem
                      track={track}
                      onSelect={handleTrackSelect}
                      selected={selectedTracksToAdd.has(track.id)}
                      showCheckbox={true}
                      showAlbumArt={true}
                      showPopularity={true}
                      showDuration={true}
                      showSourcePlaylist={true}
                    />
                  </SortableWrapper>
                ))}
              </div>
            </SortableContext>
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
