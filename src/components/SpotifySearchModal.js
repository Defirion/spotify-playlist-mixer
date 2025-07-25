import React, { useState, useEffect, useCallback, memo } from 'react';
import { handleTrackSelection } from '../utils/dragAndDrop';
import Modal from './ui/Modal';
import TrackList from './ui/TrackList';
import useSpotifySearch from '../hooks/useSpotifySearch';
import useDraggable from '../hooks/useDraggable';
import { useDrag } from './DragContext';

const SpotifySearchModal = memo(
  ({ isOpen, onClose, accessToken, onAddTracks }) => {
    const [selectedTracksToAdd, setSelectedTracksToAdd] = useState(new Set());

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

    const { startDrag, endDrag } = useDrag();

    // Drag and drop functionality using the new useDraggable hook
    const { isDragging, touchState } = useDraggable({
      type: 'search-track',
      onDragStart: (item, dragType) => {
        console.log('[SpotifySearchModal] Drag start for track:', item?.name);
        startDrag({ data: item, type: 'search-track' }, dragType);
      },
      onDragEnd: reason => {
        console.log('[SpotifySearchModal] Drag end:', reason);
        endDrag(reason);
      },
      scrollContainer: document.querySelector('[data-preview-panel="true"]'),
    });

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
      track => {
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

    // Drag event handlers for TrackList
    const handleTrackDragStart = useCallback(
      (e, track) => {
        console.log('[SpotifySearchModal] Track drag start:', track.name);

        const trackWithSource = {
          ...track,
          sourcePlaylist: 'search',
          sourcePlaylistName: 'Spotify Search',
        };

        // Start drag in context
        startDrag({ data: trackWithSource, type: 'search-track' }, 'html5');

        // Set data for the drag operation (for backward compatibility)
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
              type: 'search-track',
              track: trackWithSource,
            })
          );
        }
      },
      [startDrag]
    );

    // Clear search when modal closes
    useEffect(() => {
      if (!isOpen) {
        clear();
        setSelectedTracksToAdd(new Set());
      }
    }, [isOpen, clear]);

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="🎵 Search Spotify"
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
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--fern-green)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--fern-green)',
                borderRadius: '8px',
                backgroundColor: 'var(--dark-green)',
                color: 'var(--mindaro)',
                outline: 'none',
              }}
              onKeyPress={e => e.key === 'Enter' && handleSpotifySearch()}
              onFocus={e => (e.target.style.borderColor = 'var(--moss-green)')}
              onBlur={e => (e.target.style.borderColor = 'var(--fern-green)')}
              autoFocus
            />
            <button
              onClick={handleSpotifySearch}
              disabled={loading || !query.trim()}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor:
                  loading || !query.trim()
                    ? 'rgba(29, 185, 84, 0.3)'
                    : '#1DB954',
                color: 'white',
                cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!loading && query.trim()) {
                  e.target.style.backgroundColor = '#1ed760';
                }
              }}
              onMouseLeave={e => {
                if (!loading && query.trim()) {
                  e.target.style.backgroundColor = '#1DB954';
                }
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
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
              Searching Spotify...
            </div>
          ) : error ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: 'var(--mindaro)',
                opacity: '0.7',
                textAlign: 'center',
              }}
            >
              Error searching Spotify. Please try again.
            </div>
          ) : (
            <TrackList
              tracks={searchResults.map(track => ({
                ...track,
                sourcePlaylist: 'search',
                sourcePlaylistName: '🔍 Spotify Search',
              }))}
              onTrackSelect={handleTrackSelect}
              selectedTracks={selectedTracksToAdd}
              draggable={true}
              selectable={true}
              showCheckbox={true}
              showAlbumArt={true}
              showPopularity={true}
              showDuration={true}
              showSourcePlaylist={true}
              virtualized={searchResults.length > 100}
              containerHeight={400}
              emptyMessage={
                query
                  ? 'No tracks found. Try a different search term.'
                  : 'Enter a search term to find songs on Spotify'
              }
              onTrackDragStart={handleTrackDragStart}
              onTrackDragEnd={() => endDrag('html5-end')}
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
              onMouseLeave={e =>
                (e.target.style.backgroundColor = 'transparent')
              }
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
                    ? '#1DB954'
                    : 'rgba(29, 185, 84, 0.3)',
                color: 'white',
                cursor:
                  selectedTracksToAdd.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = '#1ed760';
                }
              }}
              onMouseLeave={e => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = '#1DB954';
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
  }
);

SpotifySearchModal.displayName = 'SpotifySearchModal';

export default SpotifySearchModal;
