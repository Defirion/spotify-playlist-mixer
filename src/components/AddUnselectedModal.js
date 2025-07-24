import React, { useState, useEffect, useCallback } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { handleTrackSelection } from '../utils/dragAndDrop';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import useDraggable from '../hooks/useDraggable';

const AddUnselectedModal = ({
  isOpen,
  onClose,
  accessToken,
  selectedPlaylists,
  currentTracks,
  onAddTracks,
}) => {
  const [allPlaylistTracks, setAllPlaylistTracks] = useState([]);
  const [unselectedTracks, setUnselectedTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracksToAdd, setSelectedTracksToAdd] = useState(new Set());

  // Drag and drop functionality using the new useDraggable hook
  const { dragHandleProps, isDragging, touchState } = useDraggable({
    type: 'modal-track',
    onDragStart: (item, dragType) => {
      console.log('[AddUnselectedModal] Drag start for track:', item?.name);
    },
    onDragEnd: reason => {
      console.log('[AddUnselectedModal] Drag end:', reason);
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

  // Helper function to fetch tracks from a single playlist
  const fetchPlaylistTracks = async (api, playlistId) => {
    let allTracks = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await api.get(
        `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
      );
      const tracks = response.data.items
        .filter(item => item.track && item.track.id)
        .map(item => item.track);

      allTracks = [...allTracks, ...tracks];

      if (tracks.length < limit) break;
      offset += limit;
    }

    return allTracks;
  };

  const handleTrackSelect = track => {
    handleTrackSelection(track, selectedTracksToAdd, setSelectedTracksToAdd);
  };

  const handleAddSelected = () => {
    const tracksToAdd = filteredTracks.filter(track =>
      selectedTracksToAdd.has(track.id)
    );
    onAddTracks(tracksToAdd);

    // Clear selected tracks but keep modal open for continued browsing
    setSelectedTracksToAdd(new Set());
  };

  // Drag event handlers for TrackList
  const handleTrackDragStart = (e, track) => {
    console.log('[AddUnselectedModal] Track drag start:', track.name);

    // Set data for the drag operation
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: 'modal-track',
          track: track,
        })
      );
    }
  };

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
      const allTracks = [];
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
  }, [accessToken, selectedPlaylists]);

  // Filter unselected tracks (runs locally, no API calls)
  const filterUnselectedTracks = useCallback(() => {
    if (allPlaylistTracks.length === 0) return;

    // Get IDs of currently selected tracks
    const currentTrackIds = new Set(currentTracks.map(track => track.id));

    // Filter out tracks that are already in the current playlist
    const unselected = allPlaylistTracks.filter(
      track => !currentTrackIds.has(track.id)
    );

    // Remove duplicates (same track from multiple playlists)
    const uniqueUnselected = [];
    const seenTrackIds = new Set();

    unselected.forEach(track => {
      if (!seenTrackIds.has(track.id)) {
        seenTrackIds.add(track.id);
        uniqueUnselected.push(track);
      }
    });

    setUnselectedTracks(uniqueUnselected);
    setFilteredTracks(uniqueUnselected);
  }, [allPlaylistTracks, currentTracks]);

  // Fetch all playlist tracks when component mounts or playlists change
  useEffect(() => {
    fetchAllPlaylistTracks();
  }, [fetchAllPlaylistTracks]);

  // Filter unselected tracks when all tracks or current tracks change
  useEffect(() => {
    filterUnselectedTracks();
  }, [filterUnselectedTracks]);

  // Removed scroll lock - allow page scrolling while modal is open

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="➕ Add Unselected Tracks"
      size="large"
      style={{
        opacity: isDragging || touchState.isLongPress ? 0.3 : 1,
        pointerEvents: isDragging || touchState.isLongPress ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Header Info */}
      <div
        style={{
          padding: '0 20px 16px 20px',
          borderBottom: '1px solid var(--fern-green)',
        }}
      >
        <p
          style={{
            margin: '0',
            fontSize: '14px',
            opacity: '0.7',
            color: 'var(--mindaro)',
          }}
        >
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
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--fern-green)',
        }}
      >
        <input
          type="text"
          placeholder="Search tracks, artists, or albums..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            border: '1px solid var(--fern-green)',
            borderRadius: '8px',
            backgroundColor: 'var(--dark-green)',
            color: 'var(--mindaro)',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--moss-green)')}
          onBlur={e => (e.target.style.borderColor = 'var(--fern-green)')}
        />
      </div>

      {/* Track List */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: 'var(--mindaro)',
              opacity: '0.7',
            }}
          >
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
            onTrackDragStart={handleTrackDragStart}
            style={{
              height: '400px',
              overflowY: 'auto',
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--fern-green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '14px',
            opacity: '0.7',
            color: 'var(--mindaro)',
          }}
        >
          {selectedTracksToAdd.size} track
          {selectedTracksToAdd.size !== 1 ? 's' : ''} selected
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleModalClose}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--fern-green)',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: 'var(--mindaro)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e =>
              (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
            }
            onMouseLeave={e => (e.target.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={handleAddSelected}
            disabled={selectedTracksToAdd.size === 0}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor:
                selectedTracksToAdd.size > 0
                  ? 'var(--moss-green)'
                  : 'rgba(144, 169, 85, 0.3)',
              color: 'white',
              cursor: selectedTracksToAdd.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (selectedTracksToAdd.size > 0) {
                e.target.style.backgroundColor = 'var(--fern-green)';
              }
            }}
            onMouseLeave={e => {
              if (selectedTracksToAdd.size > 0) {
                e.target.style.backgroundColor = 'var(--moss-green)';
              }
            }}
          >
            Add {selectedTracksToAdd.size} Track
            {selectedTracksToAdd.size !== 1 ? 's' : ''} & Continue
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddUnselectedModal;
