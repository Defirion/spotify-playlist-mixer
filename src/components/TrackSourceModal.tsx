import React, { useCallback, useEffect, memo, useState, useRef } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Modal from './ui/Modal';
import TrackItem from './ui/TrackItem';
import SortableWrapper from './SortableWrapper';
import { useTrackSelection } from '../hooks/useTrackSelection';
import { generateTrackInstanceId } from '../utils/trackUtils';
import { SpotifyTrack } from '../types';
import styles from './TrackSourceModal.module.css';
import ErrorHandler from './ErrorHandler';
import { getDisplayErrorWithLabel } from '../utils/normalizeError';

// Track with instance ID for drag operations
interface TrackWithInstanceId extends SpotifyTrack {
  instanceId: string;
}

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
    // Local drag state derived from global dnd-dragging class on the scrolling element.
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Observe class changes on the scrolling element (or documentElement) so we can
    // apply a JS-driven muted class to the modal for environments where global CSS
    // rules aren't applied (tests, some browsers). This makes the behavior testable.
    useEffect(() => {
      const target =
        (document.scrollingElement as HTMLElement) || document.documentElement;

      const update = () =>
        setIsDragging(target.classList.contains('dnd-dragging'));

      // Initialize
      update();

      // Use MutationObserver to watch class attribute changes
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (
            m.type === 'attributes' &&
            (m as MutationRecord).attributeName === 'class'
          ) {
            update();
            break;
          }
        }
      });

      try {
        observer.observe(target, {
          attributes: true,
          attributeFilter: ['class'],
        });
      } catch (e) {
        // Fallback: attach a global listener for events that toggle the class
        window.addEventListener('dragstart', update);
        window.addEventListener('dragend', update);
      }

      return () => {
        observer.disconnect();
        window.removeEventListener('dragstart', update);
        window.removeEventListener('dragend', update);
      };
    }, []);
    // State for tracks with regenerated instance IDs
    const [tracksWithInstanceIds, setTracksWithInstanceIds] = useState<
      TrackWithInstanceId[]
    >([]);

    const {
      selectedTracksToAdd,
      handleTrackSelect,
      handleAddSelected,
      clearSelection,
    } = useTrackSelection({
      availableTracks: tracksWithInstanceIds,
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

    // Initialize tracks with instance IDs when tracks change
    useEffect(() => {
      const tracksWithIds: TrackWithInstanceId[] = tracks.map(track => ({
        ...track,
        instanceId: generateTrackInstanceId(),
      }));
      setTracksWithInstanceIds(tracksWithIds);
    }, [tracks]);

    // Use ref to store the event handler to ensure proper cleanup
    const eventHandlerRef = useRef<EventListener | null>(null);

    // Listen for successful drag operations and regenerate instance IDs
    useEffect(() => {
      const handleTrackDragged = (event: CustomEvent) => {
        // Only process if modal is open
        if (!isOpen) return;

        const { trackId } = event.detail;

        // Find the track that was dragged and regenerate its instance ID
        setTracksWithInstanceIds(prevTracks =>
          prevTracks.map(track =>
            track.id === trackId
              ? { ...track, instanceId: generateTrackInstanceId() }
              : track
          )
        );

        console.log('Regenerated instance ID for dragged track:', trackId);
      };

      // Remove any existing listener first
      if (eventHandlerRef.current) {
        window.removeEventListener(
          'trackDraggedToPreview',
          eventHandlerRef.current
        );
      }

      // Add new listener only if modal is open
      if (isOpen) {
        eventHandlerRef.current = handleTrackDragged as EventListener;
        window.addEventListener(
          'trackDraggedToPreview',
          eventHandlerRef.current
        );
      }

      // Cleanup function
      return () => {
        if (eventHandlerRef.current) {
          window.removeEventListener(
            'trackDraggedToPreview',
            eventHandlerRef.current
          );
          eventHandlerRef.current = null;
        }
      };
    }, [isOpen]);

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
          {tracksWithInstanceIds.length} tracks{' '}
          {showLoadingIndicator && loading && 'found'}
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
        className={`${styles.modal} ${className} ${isDragging ? styles.modalMuted : ''}`}
        dragging={isDragging}
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
            // Preserve legacy simple message for plain Error/string inputs to
            // avoid breaking tests that expect the exact text. For ApiError
            // instances or ApiError-like objects, use the richer ErrorHandler
            // but show a short label in-line.
            typeof error === 'string' || error instanceof Error ? (
              <div className={styles.errorState}>
                Error loading tracks. Please try again.
              </div>
            ) : (
              <div className={styles.errorState}>
                {/* show short label and full ErrorHandler for rich errors */}
                <div className={styles.errorLabel}>
                  {getDisplayErrorWithLabel(error).label}
                </div>
                <ErrorHandler
                  error={error}
                  onDismiss={onClose}
                  onRetry={onManualSearch}
                  className={styles.errorHandler}
                />
              </div>
            )
          ) : tracksWithInstanceIds.length === 0 ? (
            <div className={styles.empty} data-testid="empty-message">
              {emptyMessage}
            </div>
          ) : (
            <SortableContext
              items={tracksWithInstanceIds.map(t => t.instanceId || t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.trackList} data-testid="track-list">
                {tracksWithInstanceIds.map(track => (
                  <SortableWrapper
                    key={track.instanceId || track.id}
                    id={track.instanceId || track.id}
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
                      showSourcePlaylist={false}
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
