import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { handleTrackSelection } from '../utils/dragAndDrop';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';

import { useDragState } from '../hooks/drag/useDragState';
import { SpotifyTrack, SpotifyPlaylist } from '../types';
import styles from './AddUnselectedModal.module.css';

interface AddUnselectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  currentTracks: SpotifyTrack[];
  onAddTracks: (tracks: SpotifyTrack[]) => void;
}

interface TrackWithSource extends SpotifyTrack {
  sourcePlaylist?: string;
  sourcePlaylistName?: string;
}

const AddUnselectedModal = memo<AddUnselectedModalProps>(
  ({
    isOpen,
    onClose,
    accessToken,
    selectedPlaylists,
    currentTracks,
    onAddTracks,
  }) => {
    const [allPlaylistTracks, setAllPlaylistTracks] = useState<
      TrackWithSource[]
    >([]);
    const [unselectedTracks, setUnselectedTracks] = useState<TrackWithSource[]>(
      []
    );
    const [filteredTracks, setFilteredTracks] = useState<TrackWithSource[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedTracksToAdd, setSelectedTracksToAdd] = useState<Set<string>>(
      new Set()
    );

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

    // Enhanced onClose handler
    const handleModalClose = useCallback(() => {
      console.log('[AddUnselectedModal] Modal closing');
      onClose();
    }, [onClose]);

    useEffect(() => {
      // Filter tracks based on search query
      if (!searchQuery.trim()) {
        setFilteredTracks(unselectedTracks);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = unselectedTracks.filter(
          track =>
            track.name.toLowerCase().includes(query) ||
            track.artists?.[0]?.name.toLowerCase().includes(query) ||
            track.album?.name.toLowerCase().includes(query)
        );
        setFilteredTracks(filtered);
      }
    }, [searchQuery, unselectedTracks]);

    // Memoize helper function to prevent recreation
    const fetchPlaylistTracks = useCallback(
      async (api: any, playlistId: string): Promise<SpotifyTrack[]> => {
        let allTracks: SpotifyTrack[] = [];
        let offset = 0;
        const limit = 100;

        while (true) {
          const response = await api.get(
            `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
          );
          const tracks = response.data.items
            .filter((item: any) => item.track && item.track.id)
            .map((item: any) => item.track);

          allTracks = [...allTracks, ...tracks];

          if (tracks.length < limit) break;
          offset += limit;
        }

        return allTracks;
      },
      []
    );

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
      const tracksToAdd = filteredTracks.filter(track =>
        selectedTracksToAdd.has(track.id)
      );
      onAddTracks(tracksToAdd);

      // Clear selected tracks but keep modal open for continued browsing
      setSelectedTracksToAdd(new Set());
    }, [filteredTracks, selectedTracksToAdd, onAddTracks]);

    // All drag handling is now managed by the useDraggable hook
    // No need for manual drag event handlers

    // Reset selected tracks when modal opens/closes
    useEffect(() => {
      if (!isOpen) {
        setSelectedTracksToAdd(new Set());
      }
    }, [isOpen]);

    // Fetch all tracks from playlists (only when playlists change)
    const fetchAllPlaylistTracks = useCallback(async () => {
      if (selectedPlaylists.length === 0) return;

      try {
        setLoading(true);
        const api = getSpotifyApi(accessToken);

        // Get all tracks from selected playlists
        const allTracks: TrackWithSource[] = [];
        for (const playlist of selectedPlaylists) {
          const tracks = await fetchPlaylistTracks(api, playlist.id);
          tracks.forEach(track => {
            allTracks.push({
              ...track,
              sourcePlaylist: playlist.id,
              sourcePlaylistName: playlist.name,
            });
          });
        }

        setAllPlaylistTracks(allTracks);
      } catch (error) {
        console.error('Failed to fetch playlist tracks:', error);
      } finally {
        setLoading(false);
      }
    }, [accessToken, selectedPlaylists, fetchPlaylistTracks]);

    // Memoize expensive track filtering operations
    const uniqueUnselectedTracks = useMemo(() => {
      if (allPlaylistTracks.length === 0) return [];

      // Get IDs of currently selected tracks
      const currentTrackIds = new Set(currentTracks.map(track => track.id));

      // Filter out tracks that are already in the current playlist
      const unselected = allPlaylistTracks.filter(
        track => !currentTrackIds.has(track.id)
      );

      // Remove duplicates (same track from multiple playlists)
      const uniqueUnselected: TrackWithSource[] = [];
      const seenTrackIds = new Set<string>();

      unselected.forEach(track => {
        if (!seenTrackIds.has(track.id)) {
          seenTrackIds.add(track.id);
          uniqueUnselected.push(track);
        }
      });

      return uniqueUnselected;
    }, [allPlaylistTracks, currentTracks]);

    // Update state when memoized tracks change
    useEffect(() => {
      setUnselectedTracks(uniqueUnselectedTracks);
      setFilteredTracks(uniqueUnselectedTracks);
    }, [uniqueUnselectedTracks]);

    // Fetch all playlist tracks when component mounts or playlists change
    useEffect(() => {
      fetchAllPlaylistTracks();
    }, [fetchAllPlaylistTracks]);

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="➕ Add Unselected Tracks"
        size="large"
        className={`${shouldMuteModal ? styles.modalMuted : ''} ${isDragging ? styles.modalDragging : ''}`}
        style={modalStyles}
        backdropStyle={backdropStyles}
      >
        {/* Header Info */}
        <div className={styles.header}>
          <p className={styles.headerInfo}>
            {loading ? (
              'Loading...'
            ) : (
              <>
                {filteredTracks.length} tracks available •{' '}
                <strong>Click to select</strong> or{' '}
                <strong>drag to playlist</strong>
              </>
            )}
          </p>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search tracks, artists, or albums..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Track List */}
        <div className={styles.trackListContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              Loading unselected tracks...
            </div>
          ) : (
            <TrackList
              tracks={filteredTracks}
              onTrackSelect={handleTrackSelect}
              selectedTracks={selectedTracksToAdd}
              draggable={true}
              selectable={true}
              showCheckbox={true}
              showAlbumArt={true}
              showPopularity={true}
              showDuration={true}
              showSourcePlaylist={true}
              virtualized={filteredTracks.length > 100}
              containerHeight={400}
              emptyMessage={
                searchQuery
                  ? 'No tracks match your search'
                  : 'All tracks from your playlists are already included'
              }
              // Drag handlers for modal-track type
              onTrackDragStart={(e, track) => {
                // Create drag item with proper modal-track type
                const dragItem = {
                  id: track.id,
                  type: 'modal-track' as const,
                  payload: {
                    track: track,
                    source: 'AddUnselectedModal',
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

                console.log('[AddUnselectedModal] Starting drag:', dragItem);
              }}
              onTrackDragEnd={(e, track) => {
                console.log(
                  '[AddUnselectedModal] Drag ended for track:',
                  track.name
                );
                // Don't end the drag state immediately - let the drop zone handle it
                // The drag state will be cleaned up by the DraggableTrackList drop handler
                // or by a timeout if the drop fails
                setTimeout(() => {
                  // Only end drag if it's still active (no successful drop occurred)
                  if (isDragging) {
                    console.log(
                      '[AddUnselectedModal] Cleaning up drag state after timeout'
                    );
                    endDrag();
                  }
                }, 100);
              }}
              style={{
                height: '400px',
                overflowY: 'auto',
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

AddUnselectedModal.displayName = 'AddUnselectedModal';

export default AddUnselectedModal;
