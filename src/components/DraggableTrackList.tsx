import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import TrackListItem from './TrackListItem';
import { useDragState, useScrollPosition } from '../store';
import {
  SpotifyTrack,
  SpotifyPlaylist,
  MixedTrack,
  isDragSourceType,
} from '../types';
import { useScrollDebugger } from '../hooks/useScrollDebugger';
import { useDropPosition } from '../hooks/useDropPosition';
import { useCustomTouchEvents } from '../hooks/useCustomTouchEvents';
import { useTrackOperations } from '../hooks/useTrackOperations';
import styles from './DraggableTrackList.module.css';

interface DraggableTrackListProps {
  tracks: MixedTrack[];
  selectedPlaylists: SpotifyPlaylist[];
  onTrackOrderChange?: (tracks: MixedTrack[]) => void;
  formatDuration: (durationMs: number) => string;
  accessToken: string;
}

type QuadrantType = 'topHits' | 'popular' | 'moderate' | 'deepCuts';

/**
 * DraggableTrackList Component
 *
 * A comprehensive drag-and-drop track list component that supports:
 * - Internal track reordering via drag and drop
 * - External track addition from modals
 * - Scroll position preservation during operations
 * - Cross-platform compatibility (mouse, touch, keyboard)
 * - Visual feedback during drag operations
 */
const DraggableTrackList: React.FC<DraggableTrackListProps> = ({
  tracks,
  selectedPlaylists,
  onTrackOrderChange,
  formatDuration,
  accessToken,
}) => {
  const [localTracks, setLocalTracks] = useState<MixedTrack[]>(tracks || []);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize drag state and scroll position hooks
  const { isDragging, draggedItem, endDrag } = useDragState();
  const { restoreScrollPosition, clearScrollPosition } = useScrollPosition();

  // Initialize extracted hooks
  const { handleScrollEvent } = useScrollDebugger({
    containerRef: scrollContainerRef,
    tracks: localTracks,
  });

  const { dropPosition, updateDropPosition, clearDropPosition } =
    useDropPosition({
      tracksLength: localTracks.length,
    });

  const {
    handleInternalReorder,
    handleExternalAdd,
    handleTrackRemove,
    handleAddUnselectedTracks,
    handleAddSpotifyTracks,
  } = useTrackOperations({
    tracks: localTracks,
    onTrackOrderChange,
    scrollContainerRef,
  });

  // Sync localTracks with tracks prop
  useEffect(() => {
    setLocalTracks(tracks || []);
    // Clear any captured scroll position when tracks change from external source
    // This prevents inappropriate scroll restoration when a new playlist is generated
    clearScrollPosition();
  }, [tracks, clearScrollPosition]);

  // Restore scroll position after track list updates using useLayoutEffect for synchronous execution
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      restoreScrollPosition(scrollContainerRef.current);
    }
  }, [localTracks, restoreScrollPosition]);

  // Initialize custom touch events hook
  useCustomTouchEvents({
    containerRef: scrollContainerRef,
    onTouchDragOver: ({ clientY }) => {
      if (scrollContainerRef.current) {
        updateDropPosition(clientY, scrollContainerRef.current);
      }
    },
    onTouchDrop: ({ clientY, draggedItem }) => {
      if (!draggedItem || !scrollContainerRef.current) {
        clearDropPosition();
        return;
      }

      try {
        const calculatedDropPosition = updateDropPosition(
          clientY,
          scrollContainerRef.current
        );

        if (!calculatedDropPosition) {
          console.warn(
            '[DraggableTrackList] Could not calculate drop position'
          );
          clearDropPosition();
          return;
        }

        // Handle different drag source types
        if (isDragSourceType(draggedItem, 'internal-track')) {
          const sourceIndex = draggedItem.payload.index;
          if (typeof sourceIndex === 'number') {
            handleInternalReorder(sourceIndex, calculatedDropPosition.index);
          }
        } else if (
          isDragSourceType(draggedItem, 'modal-track') ||
          isDragSourceType(draggedItem, 'search-track')
        ) {
          const track = draggedItem.payload.track;
          if (track && track.id) {
            // Convert SpotifyTrack to MixedTrack with proper source attribution
            const mixedTrack: MixedTrack = {
              ...track,
              sourcePlaylist: isDragSourceType(draggedItem, 'modal-track')
                ? draggedItem.payload.source
                : 'search',
            };
            handleExternalAdd(mixedTrack, calculatedDropPosition.index);
          }
        }
      } catch (error) {
        console.error('[DraggableTrackList] Error handling touch drop:', error);
      } finally {
        clearDropPosition();
      }
    },
  });

  // Clear drop position when drag ends with proper cleanup
  useEffect(() => {
    if (!isDragging) {
      const cleanup = setTimeout(() => {
        clearDropPosition();
      }, 100);
      return () => clearTimeout(cleanup);
    }
  }, [isDragging, clearDropPosition]);

  // Enhanced drop handler with comprehensive edge case handling
  const handleContainerDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!draggedItem) {
        clearDropPosition();
        return;
      }

      try {
        // Use the drop position utility
        const calculatedDropPosition = updateDropPosition(
          e.clientY,
          e.currentTarget
        );
        const dropIndex = calculatedDropPosition?.index || 0;

        // Handle different drag source types with proper validation
        if (isDragSourceType(draggedItem, 'internal-track')) {
          const sourceIndex = draggedItem.payload.index;
          if (sourceIndex !== dropIndex && sourceIndex !== dropIndex - 1) {
            handleInternalReorder(sourceIndex, dropIndex);
          }
          endDrag();
        } else if (
          isDragSourceType(draggedItem, 'modal-track') ||
          isDragSourceType(draggedItem, 'search-track')
        ) {
          const track = draggedItem.payload.track;

          if (!track || !track.id) {
            endDrag();
            return;
          }

          // Check for duplicates
          const isDuplicate = localTracks.some(
            existingTrack => existingTrack.id === track.id
          );
          if (isDuplicate) {
            endDrag();
            return;
          }

          // Convert SpotifyTrack to MixedTrack with proper source attribution
          const mixedTrack: MixedTrack = {
            ...track,
            sourcePlaylist: isDragSourceType(draggedItem, 'modal-track')
              ? draggedItem.payload.source
              : 'search',
          };

          handleExternalAdd(mixedTrack, dropIndex);
          endDrag();
        } else {
          endDrag();
        }
      } catch (error) {
        console.error('[DraggableTrackList] Error handling drop:', error);
        endDrag();
      } finally {
        clearDropPosition();
      }
    },
    [
      draggedItem,
      localTracks,
      updateDropPosition,
      clearDropPosition,
      handleInternalReorder,
      handleExternalAdd,
      endDrag,
    ]
  );

  // Enhanced drag over handler with intelligent visual feedback
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!draggedItem) {
        clearDropPosition();
        return;
      }

      // Set appropriate drop effect based on drag source
      if (isDragSourceType(draggedItem, 'internal-track')) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'copy';
      }

      updateDropPosition(e.clientY, e.currentTarget);
    },
    [draggedItem, updateDropPosition, clearDropPosition]
  );

  // Handle drag leave to clean up visual feedback when leaving the container
  const handleContainerDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear if we're actually leaving the container (not just moving to a child)
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        clearDropPosition();
      }
    },
    [clearDropPosition]
  );

  // Calculate popularity quadrants for track labeling
  const tracksWithPop = useMemo(
    () =>
      Array.isArray(localTracks)
        ? localTracks.filter(t => t.popularity !== undefined)
        : [],
    [localTracks]
  );

  const sortedByPop = useMemo(
    () =>
      [...tracksWithPop].sort(
        (a, b) => (b.popularity || 0) - (a.popularity || 0)
      ),
    [tracksWithPop]
  );

  const qSize = Math.floor(sortedByPop.length / 4);

  const getTrackQuadrant = useCallback(
    (track: SpotifyTrack): QuadrantType | null => {
      if (track.popularity === undefined) return null;
      const index = sortedByPop.findIndex(t => t.id === track.id);
      if (index < qSize) return 'topHits';
      if (index < qSize * 2) return 'popular';
      if (index < qSize * 3) return 'moderate';
      return 'deepCuts';
    },
    [sortedByPop, qSize]
  );

  return (
    <>
      <div className={styles.container}>
        <div
          ref={scrollContainerRef}
          data-preview-panel="true"
          className={`${styles.scrollContainer} ${
            isDragging ? styles.dragging : ''
          }`}
          role="region"
          aria-label="Draggable Track List Container"
          tabIndex={0}
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          onDragLeave={handleContainerDragLeave}
          onScroll={handleScrollEvent}
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

          {/* Enhanced drop line rendering for better visual feedback */}
          {dropPosition && dropPosition.isFirst && localTracks.length > 0 && (
            <div className={`${styles.dropLine} ${styles.dropLineFirst}`} />
          )}

          {dropPosition && dropPosition.isLast && localTracks.length > 0 && (
            <div className={`${styles.dropLine} ${styles.dropLineLast}`} />
          )}

          {/* Enhanced empty state drop zone with better feedback */}
          {localTracks.length === 0 && (
            <div
              className={`${styles.emptyState} ${
                isDragging && draggedItem ? styles.dragging : styles.normal
              }`}
            >
              {isDragging && draggedItem ? (
                <div className={styles.emptyStateDropFeedback}>
                  <div className={styles.dropIcon}>🎵</div>
                  <div className={styles.dropText}>
                    Drop track here to add it to your playlist
                  </div>
                  {isDragSourceType(draggedItem, 'internal-track') && (
                    <div className={styles.dropSubtext}>
                      Moving "{draggedItem.payload.track.name}"
                    </div>
                  )}
                  {(isDragSourceType(draggedItem, 'modal-track') ||
                    isDragSourceType(draggedItem, 'search-track')) && (
                    <div className={styles.dropSubtext}>
                      Adding "{draggedItem.payload.track.name}"
                    </div>
                  )}
                </div>
              ) : (
                'No tracks in preview yet. Generate a preview or drag tracks from the modal.'
              )}
            </div>
          )}

          {/* Track List */}
          {Array.isArray(localTracks) &&
            localTracks.map((track, index) => (
              <TrackListItem
                key={track.id}
                track={track}
                index={index}
                selectedPlaylists={selectedPlaylists}
                formatDuration={formatDuration}
                onRemove={handleTrackRemove}
                dropPosition={dropPosition}
                getTrackQuadrant={getTrackQuadrant}
                scrollContainer={scrollContainerRef.current}
              />
            ))}
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
