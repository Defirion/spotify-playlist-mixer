import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { handleTrackSelection } from '../utils/dragAndDrop';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import useDraggable from '../hooks/useDraggable';
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

    // Get scroll container for drag operations
    const scrollContainer = useMemo(() => {
      return document.querySelector(
        '[data-preview-panel="true"]'
      ) as HTMLElement | null;
    }, []);

    // Use the unified draggable hook for modal-level drag handling
    const { isDragging } = useDraggable({
      type: 'modal-track',
      scrollContainer,
    });

    // Create a single draggable instance for all tracks
    const trackDraggable = useDraggable({
      type: 'modal-track',
      scrollContainer,
      onDragStart: item => {
        console.log(
          '[AddUnselectedModal] Track drag start:',
          item?.payload?.track?.name
        );
      },
      onDragEnd: (item, result) => {
        console.log(
          '[AddUnselectedModal] Track drag end:',
          item?.payload?.track?.name,
          result
        );
      },
    });

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
        className={isDragging ? styles.modalDragging : ''}
        style={{
          opacity: isDragging ? 0 : 1,
          pointerEvents: isDragging ? 'none' : 'auto',
          transition: 'opacity 0.2s ease',
        }}
        backdropStyle={{
          pointerEvents: isDragging ? 'none' : 'auto',
          opacity: isDragging ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
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
              // Pass drag handlers that use useDraggable
              onTrackDragStart={(e, track) => {
                // Set the track data for this drag operation
                trackDraggable.startDrag(track);
                if (trackDraggable.dragHandleProps.onDragStart) {
                  trackDraggable.dragHandleProps.onDragStart(e);
                }
              }}
              onTrackDragEnd={(e, track) => {
                if (trackDraggable.dragHandleProps.onDragEnd) {
                  trackDraggable.dragHandleProps.onDragEnd(e);
                }
              }}
              onTrackTouchStart={(e, track) => {
                // Set the track data for this drag operation
                trackDraggable.startDrag(track);
                if (trackDraggable.dragHandleProps.onTouchStart) {
                  trackDraggable.dragHandleProps.onTouchStart(e);
                }
              }}
              onTrackTouchMove={(e, track) => {
                if (trackDraggable.dragHandleProps.onTouchMove) {
                  trackDraggable.dragHandleProps.onTouchMove(e);
                }
              }}
              onTrackTouchEnd={(e, track) => {
                if (trackDraggable.dragHandleProps.onTouchEnd) {
                  trackDraggable.dragHandleProps.onTouchEnd(e);
                }
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
