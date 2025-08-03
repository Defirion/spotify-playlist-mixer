import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import SpotifySearchModal from './SpotifySearchModal';
import TrackListItem from './TrackListItem';
import useDraggable from '../hooks/useDraggable';
import useTrackReordering from '../hooks/useTrackReordering';
import {
  SpotifyTrack,
  SpotifyPlaylist,
  MixedTrack,
  DragItem,
  DropResult,
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

  // Sync localTracks with tracks prop
  useEffect(() => {
    setLocalTracks(tracks || []);
  }, [tracks]);

  // Initialize custom hooks
  const {
    dropPosition,
    setDropPosition,
    handleInternalReorder,
    handleExternalAdd,
    handleTrackRemove,
    calculateDropPosition,
  } = useTrackReordering({
    tracks: localTracks,
    onTrackOrderChange,
  });

  // Drag handlers using useDraggable
  const handleDragEnd = useCallback(
    (item: DragItem, result: DropResult | null) => {
      setDropPosition(null);
    },
    [setDropPosition]
  );

  const handleDrop = useCallback(
    (item: DragItem, result: DropResult) => {
      if (item.type === 'internal-track') {
        // Handle internal reordering
        const draggedTrackIndex = localTracks.findIndex(
          track => track.id === item.data.id
        );
        if (draggedTrackIndex !== -1 && dropPosition) {
          handleInternalReorder(draggedTrackIndex, dropPosition.index);
        }
      } else {
        // Handle external track addition
        const insertIndex = dropPosition
          ? dropPosition.index
          : localTracks.length;
        handleExternalAdd(item.data, insertIndex);
      }

      setDropPosition(null);
    },
    [
      localTracks,
      dropPosition,
      handleInternalReorder,
      handleExternalAdd,
      setDropPosition,
    ]
  );

  const handleDragOver = useCallback(
    (item: DragItem, position: any) => {
      // Calculate drop position based on the drag position
      if (position.target && position.clientY) {
        const trackIndex = parseInt(
          position.target.getAttribute('data-track-index') || '0'
        );
        const newDropPosition = calculateDropPosition(
          position.clientY,
          position.target,
          trackIndex
        );
        setDropPosition(newDropPosition);
      }
    },
    [calculateDropPosition, setDropPosition]
  );

  // Initialize useDraggable for container-level drag handling
  const containerDraggable = useDraggable({
    type: 'track-list-container',
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    scrollContainer: scrollContainerRef.current,
  });

  // Track-specific drag handlers - using useDraggable
  const trackDragOptions = useMemo(
    () => ({
      type: 'internal-track',
      onDragEnd: handleDragEnd,
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      scrollContainer: scrollContainerRef.current,
    }),
    [handleDragEnd, handleDrop, handleDragOver]
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

  // Modal handlers
  const handleAddUnselectedTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
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
    [localTracks, onTrackOrderChange]
  );

  const handleAddSpotifyTracks = useCallback(
    (tracksToAdd: SpotifyTrack[]) => {
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
    [localTracks, onTrackOrderChange]
  );

  // Cleanup is handled automatically by useDraggable hook

  return (
    <>
      <div className={styles.container}>
        <div
          ref={scrollContainerRef}
          data-preview-panel="true"
          className={`${styles.scrollContainer} ${
            containerDraggable.isDragging ? styles.dragging : ''
          }`}
          role="region"
          aria-label="Draggable Track List Container"
          tabIndex={0}
          {...containerDraggable.dropZoneProps}
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

          {/* Drop line at the end when dragging over empty space */}
          {dropPosition &&
            dropPosition.index === localTracks.length &&
            localTracks.length > 0 && <div className={styles.dropLine} />}

          {/* Empty state drop zone */}
          {localTracks.length === 0 && (
            <div
              className={`${styles.emptyState} ${
                dropPosition ? styles.dragging : styles.normal
              }`}
            >
              {dropPosition
                ? '🎵 Drop track here to add it to your playlist'
                : 'No tracks in preview yet. Generate a preview or drag tracks from the modal.'}
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
                dragOptions={trackDragOptions}
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
