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
import styles from './DraggableTrackList.module.css';

interface DraggableTrackListProps {
  tracks: MixedTrack[];
  selectedPlaylists: SpotifyPlaylist[];
  onTrackOrderChange?: (tracks: MixedTrack[]) => void;
  formatDuration: (durationMs: number) => string;
  accessToken: string;
}

type QuadrantType = 'topHits' | 'popular' | 'moderate' | 'deepCuts';

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
  const { isDragging, draggedItem } = useDragState();
  const {
    scrollTop,
    captureScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  } = useScrollPosition();

  // Sync localTracks with tracks prop
  useEffect(() => {
    const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;
    console.log(
      '[DraggableTrackList] Tracks prop changed, syncing localTracks',
      {
        newTracksLength: tracks?.length || 0,
        currentScrollTop,
        scrollTopInStore: scrollTop,
        timestamp: Date.now(),
      }
    );

    setLocalTracks(tracks || []);
    // Clear any captured scroll position when tracks change from external source
    // This prevents inappropriate scroll restoration when a new playlist is generated
    clearScrollPosition();
  }, [tracks, clearScrollPosition, scrollTop]);

  // Enhanced drop position state for comprehensive visual feedback
  const [dropPosition, setDropPosition] = useState<{
    index: number;
    isTopHalf: boolean;
    isFirst: boolean;
    isLast: boolean;
    y: number;
  } | null>(null);

  // Restore scroll position after track list updates using useLayoutEffect for synchronous execution
  // Only restore if there's actually a captured scroll position
  useLayoutEffect(() => {
    const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;
    console.log('[DraggableTrackList] useLayoutEffect triggered', {
      localTracksLength: localTracks.length,
      scrollTopInStore: scrollTop,
      currentScrollTop,
      shouldRestore: scrollContainerRef.current && scrollTop !== null,
      timestamp: Date.now(),
    });

    if (scrollContainerRef.current && scrollTop !== null) {
      console.log('[DraggableTrackList] About to restore scroll position', {
        targetScrollTop: scrollTop,
        currentScrollTop,
        timestamp: Date.now(),
      });
      try {
        restoreScrollPosition(scrollContainerRef.current);
      } catch (error) {
        console.error(
          '[DraggableTrackList] Error restoring scroll position:',
          error
        );
      }
    }
  }, [localTracks, scrollTop, restoreScrollPosition]);

  // Monitor scroll container ref changes and track scroll position changes
  const lastScrollTopRef = useRef<number>(0);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const currentScrollTop = scrollContainerRef.current.scrollTop;

      // Check if scroll position changed unexpectedly
      if (currentScrollTop !== lastScrollTopRef.current) {
        console.log('[DraggableTrackList] Scroll position changed', {
          previousScrollTop: lastScrollTopRef.current,
          currentScrollTop,
          difference: currentScrollTop - lastScrollTopRef.current,
          containerHeight: scrollContainerRef.current.clientHeight,
          scrollHeight: scrollContainerRef.current.scrollHeight,
          timestamp: Date.now(),
        });
        lastScrollTopRef.current = currentScrollTop;
      }
    }
  });

  // Add a mutation observer to detect DOM changes that might cause scroll jumps
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let initialScrollTop = container.scrollTop;

    const observer = new MutationObserver(() => {
      const newScrollTop = container.scrollTop;
      if (newScrollTop !== initialScrollTop) {
        console.log('[DraggableTrackList] DOM mutation caused scroll change', {
          initialScrollTop,
          newScrollTop,
          difference: newScrollTop - initialScrollTop,
          timestamp: Date.now(),
        });
        initialScrollTop = newScrollTop;
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [localTracks]);

  // Monitor page-level scroll changes that might be causing the viewport jump
  useEffect(() => {
    let initialPageScrollY = window.scrollY;

    const handlePageScroll = () => {
      const newPageScrollY = window.scrollY;
      if (Math.abs(newPageScrollY - initialPageScrollY) > 10) {
        const stackTrace = new Error().stack;
        console.log('[DraggableTrackList] Page scroll detected', {
          initialPageScrollY,
          newPageScrollY,
          difference: newPageScrollY - initialPageScrollY,
          stackTrace: stackTrace?.split('\n').slice(0, 8).join('\n'),
          timestamp: Date.now(),
        });
        initialPageScrollY = newPageScrollY;
      }
    };

    window.addEventListener('scroll', handlePageScroll);

    // Also check for programmatic page scroll changes
    const checkPageScroll = () => {
      const currentPageScrollY = window.scrollY;
      if (Math.abs(currentPageScrollY - initialPageScrollY) > 10) {
        const stackTrace = new Error().stack;
        console.log('[DraggableTrackList] Programmatic page scroll detected', {
          initialPageScrollY,
          currentPageScrollY,
          difference: currentPageScrollY - initialPageScrollY,
          stackTrace: stackTrace?.split('\n').slice(0, 8).join('\n'),
          timestamp: Date.now(),
        });
        initialPageScrollY = currentPageScrollY;
      }
    };

    const interval = setInterval(checkPageScroll, 100);

    return () => {
      window.removeEventListener('scroll', handlePageScroll);
      clearInterval(interval);
    };
  }, [localTracks]);

  // Monitor focus changes that might cause scroll jumps
  useEffect(() => {
    const handleFocusChange = (e: FocusEvent) => {
      if (e.target && e.target !== document.body) {
        console.log('[DraggableTrackList] Focus change detected', {
          targetElement: (e.target as Element).tagName,
          targetId: (e.target as Element).id,
          targetClass: (e.target as Element).className,
          pageScrollY: window.scrollY,
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [localTracks]);

  // Scroll position capture function with error handling
  const handleScrollPositionCapture = useCallback(() => {
    if (scrollContainerRef.current) {
      const currentScrollTop = scrollContainerRef.current.scrollTop;
      console.log('[DraggableTrackList] Capturing scroll position', {
        currentScrollTop,
        containerHeight: scrollContainerRef.current.clientHeight,
        scrollHeight: scrollContainerRef.current.scrollHeight,
        timestamp: Date.now(),
      });
      try {
        captureScrollPosition(scrollContainerRef.current);
      } catch (error) {
        console.error(
          '[DraggableTrackList] Error capturing scroll position:',
          error
        );
      }
    } else {
      console.warn(
        '[DraggableTrackList] Cannot capture scroll position: scroll container ref is null'
      );
    }
  }, [captureScrollPosition]);

  // Track reordering and management functions
  const handleInternalReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || !onTrackOrderChange) return;

      // Capture scroll position before reordering
      handleScrollPositionCapture();

      const newTracks = [...localTracks];
      const draggedTrack = newTracks[fromIndex];

      // Remove the dragged track from its original position
      newTracks.splice(fromIndex, 1);

      // Calculate the correct insertion index after removal
      let insertIndex = toIndex;
      if (fromIndex < toIndex) {
        insertIndex = toIndex - 1;
      }

      // Insert the track at the new position
      newTracks.splice(insertIndex, 0, draggedTrack);

      onTrackOrderChange(newTracks);
    },
    [localTracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleExternalAdd = useCallback(
    (track: MixedTrack, insertIndex?: number) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before adding external track
      handleScrollPositionCapture();

      const newTracks = [...localTracks];
      const finalInsertIndex = insertIndex ?? localTracks.length;

      newTracks.splice(finalInsertIndex, 0, track);
      onTrackOrderChange(newTracks);
    },
    [localTracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleTrackRemove = useCallback(
    (index: number) => {
      if (!onTrackOrderChange) return;

      // Capture scroll position before removing track
      handleScrollPositionCapture();

      const newTracks = [...localTracks];
      newTracks.splice(index, 1);
      onTrackOrderChange(newTracks);
    },
    [localTracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  // Enhanced drop position calculation with intelligent positioning
  const calculateDropPosition = useCallback(
    (clientY: number, containerElement: HTMLElement) => {
      const trackElements = Array.from(
        containerElement.querySelectorAll('[data-track-index]')
      ) as HTMLElement[];

      // Handle empty list case
      if (trackElements.length === 0) {
        return {
          index: 0,
          isTopHalf: true,
          isFirst: true,
          isLast: true,
          y: clientY,
        };
      }

      // Find the closest track element
      let closestElement: HTMLElement | null = null;
      let closestDistance = Infinity;
      let closestIndex = 0;

      for (const element of trackElements) {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(clientY - elementCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestElement = element;
          closestIndex = parseInt(
            element.getAttribute('data-track-index') || '0'
          );
        }
      }

      if (!closestElement) {
        // Fallback to end of list
        return {
          index: localTracks.length,
          isTopHalf: false,
          isFirst: false,
          isLast: true,
          y: clientY,
        };
      }

      const rect = closestElement.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const isTopHalf = clientY < midpoint;

      // Calculate insertion index
      let insertIndex = isTopHalf ? closestIndex : closestIndex + 1;

      // Handle boundary cases
      const isFirst = insertIndex === 0;
      const isLast = insertIndex >= localTracks.length;

      // Clamp index to valid range
      insertIndex = Math.max(0, Math.min(insertIndex, localTracks.length));

      return {
        index: insertIndex,
        isTopHalf,
        isFirst,
        isLast,
        y: clientY,
      };
    },
    [localTracks.length]
  );

  // Clear drop position when drag ends with proper cleanup
  useEffect(() => {
    if (!isDragging) {
      // Use setTimeout to ensure drop events complete before clearing visual feedback
      const cleanup = setTimeout(() => {
        setDropPosition(null);
      }, 100);

      return () => clearTimeout(cleanup);
    }
  }, [isDragging]);

  // Enhanced drop handler with comprehensive edge case handling
  const handleContainerDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!draggedItem) {
        console.warn('[DraggableTrackList] Drop event without draggedItem');
        setDropPosition(null);
        return;
      }

      try {
        // Use the enhanced drop position calculation
        const dropPos = calculateDropPosition(e.clientY, e.currentTarget);
        const dropIndex = dropPos.index;

        console.log('[DraggableTrackList] Drop calculated:', {
          dropIndex,
          isFirst: dropPos.isFirst,
          isLast: dropPos.isLast,
          draggedItemType: draggedItem.type,
        });

        // Handle different drag source types with proper validation
        if (isDragSourceType(draggedItem, 'internal-track')) {
          // Handle internal reordering with boundary checks
          const sourceIndex = draggedItem.payload.index;

          // Prevent dropping on the same position
          if (sourceIndex !== dropIndex && sourceIndex !== dropIndex - 1) {
            handleInternalReorder(sourceIndex, dropIndex);
          } else {
            console.log('[DraggableTrackList] Ignoring drop at same position');
          }
        } else if (
          isDragSourceType(draggedItem, 'modal-track') ||
          isDragSourceType(draggedItem, 'search-track')
        ) {
          // Handle external track addition with validation
          const track = draggedItem.payload.track;

          // Validate track data
          if (!track || !track.id) {
            console.error(
              '[DraggableTrackList] Invalid track data for external drop'
            );
            return;
          }

          // Check for duplicates
          const isDuplicate = localTracks.some(
            existingTrack => existingTrack.id === track.id
          );
          if (isDuplicate) {
            console.warn(
              '[DraggableTrackList] Attempted to add duplicate track:',
              track.id
            );
            // Could show user feedback here
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
        } else {
          console.warn(
            '[DraggableTrackList] Unknown drag source type:',
            draggedItem.type
          );
        }
      } catch (error) {
        console.error('[DraggableTrackList] Error handling drop:', error);
      } finally {
        // Always clear drop position after handling
        setDropPosition(null);
      }
    },
    [
      draggedItem,
      localTracks,
      calculateDropPosition,
      handleInternalReorder,
      handleExternalAdd,
    ]
  );

  // Enhanced drag over handler with intelligent visual feedback
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!draggedItem) {
        setDropPosition(null);
        return;
      }

      // Set appropriate drop effect based on drag source
      if (isDragSourceType(draggedItem, 'internal-track')) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'copy';
      }

      try {
        // Calculate drop position with enhanced logic
        const newDropPosition = calculateDropPosition(
          e.clientY,
          e.currentTarget
        );

        // Only update if position actually changed to reduce re-renders
        setDropPosition(prevPosition => {
          if (
            !prevPosition ||
            prevPosition.index !== newDropPosition.index ||
            prevPosition.isTopHalf !== newDropPosition.isTopHalf
          ) {
            return newDropPosition;
          }
          return prevPosition;
        });
      } catch (error) {
        console.error(
          '[DraggableTrackList] Error calculating drop position:',
          error
        );
        setDropPosition(null);
      }
    },
    [draggedItem, calculateDropPosition]
  );

  // Handle drag leave to clean up visual feedback when leaving the container
  const handleContainerDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear if we're actually leaving the container (not just moving to a child)
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDropPosition(null);
      }
    },
    []
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

  // Modal handlers with scroll position preservation
  const handleAddUnselectedTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
      // Capture scroll position before adding tracks
      handleScrollPositionCapture();

      // Convert SpotifyTrack to MixedTrack by ensuring sourcePlaylist is set
      const mixedTracks: MixedTrack[] = tracksToAdd.map(track => ({
        ...track,
        sourcePlaylist: track.sourcePlaylist || 'unknown',
      }));
      const newTracks = [...localTracks, ...mixedTracks];
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  const handleAddSpotifyTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
      // Capture scroll position before adding tracks
      handleScrollPositionCapture();

      // Convert SpotifyTrack to MixedTrack by ensuring sourcePlaylist is set
      const mixedTracks: MixedTrack[] = tracksToAdd.map(track => ({
        ...track,
        sourcePlaylist: track.sourcePlaylist || 'search',
      }));
      const newTracks = [...localTracks, ...mixedTracks];
      if (onTrackOrderChange) {
        onTrackOrderChange(newTracks);
      }
    },
    [localTracks, onTrackOrderChange, handleScrollPositionCapture]
  );

  // Cleanup is handled automatically by useDraggable hook

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
          onScroll={e => {
            const target = e.target as HTMLElement;
            const stackTrace = new Error().stack;
            console.log('[DraggableTrackList] Scroll event detected', {
              scrollTop: target.scrollTop,
              previousScrollTop: lastScrollTopRef.current,
              stackTrace: stackTrace?.split('\n').slice(0, 5).join('\n'),
              timestamp: Date.now(),
            });
            lastScrollTopRef.current = target.scrollTop;
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
