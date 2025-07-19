import React, { useState, useEffect, useCallback } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { 
  handleModalDragStart, 
  handleModalDragEnd, 
  handleTrackSelection, 
  handleBackdropClick,
  getTrackQuadrant,
  formatDuration,
  getPopularityStyle
} from '../utils/dragAndDrop';

const AddUnselectedModal = ({ 
  isOpen, 
  onClose, 
  accessToken, 
  selectedPlaylists, 
  currentTracks, 
  onAddTracks,
  onDragTrack
}) => {
  const [allPlaylistTracks, setAllPlaylistTracks] = useState([]);
  const [unselectedTracks, setUnselectedTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracksToAdd, setSelectedTracksToAdd] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Filter tracks based on search query
    if (!searchQuery.trim()) {
      setFilteredTracks(unselectedTracks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = unselectedTracks.filter(track => 
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
      const response = await api.get(`/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`);
      const tracks = response.data.items
        .filter(item => item.track && item.track.id)
        .map(item => item.track);
      
      allTracks = [...allTracks, ...tracks];
      
      if (tracks.length < limit) break;
      offset += limit;
    }
    
    return allTracks;
  };

  const handleTrackSelect = (track) => {
    handleTrackSelection(track, selectedTracksToAdd, setSelectedTracksToAdd);
  };

  const handleAddSelected = () => {
    const tracksToAdd = filteredTracks.filter(track => selectedTracksToAdd.has(track.id));
    onAddTracks(tracksToAdd);
    onClose();
  };

  const handleDragStart = (e, track) => {
    handleModalDragStart(
      e, 
      track, 
      'modal-track', 
      setIsDragging, 
      onDragTrack,
      { background: 'var(--moss-green)', border: 'var(--fern-green)' }
    );
  };

  const handleDragEnd = () => {
    handleModalDragEnd(setIsDragging, onClose);
  };

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
            sourcePlaylistName: playlist.name
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
    const unselected = allPlaylistTracks.filter(track => !currentTrackIds.has(track.id));
    
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDragging ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          opacity: isDragging ? 0 : 1,
          pointerEvents: isDragging ? 'none' : 'auto',
          transition: 'opacity 0.2s ease'
        }}
        onClick={(e) => handleBackdropClick(e, onClose)}
      />
      
      {/* Modal */}
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--hunter-green)',
          border: '2px solid var(--fern-green)',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1001,
          opacity: isDragging ? 0 : 1,
          pointerEvents: isDragging ? 'none' : 'auto',
          transition: 'opacity 0.2s ease'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--fern-green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--mindaro)' }}>
              ➕ Add Unselected Tracks
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: '0.7' }}>
              {loading ? 'Loading...' : (
                <>
                  {filteredTracks.length} tracks available • <strong>Click to select</strong> or <strong>drag to playlist</strong>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mindaro)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fern-green)' }}>
          <input
            type="text"
            placeholder="Search tracks, artists, or albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: '1px solid var(--fern-green)',
              borderRadius: '8px',
              backgroundColor: 'var(--dark-green)',
              color: 'var(--mindaro)',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--moss-green)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--fern-green)'}
          />
        </div>

        {/* Track List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: 'var(--mindaro)',
              opacity: '0.7'
            }}>
              Loading unselected tracks...
            </div>
          ) : filteredTracks.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: 'var(--mindaro)',
              opacity: '0.7',
              textAlign: 'center'
            }}>
              {searchQuery ? 'No tracks match your search' : 'All tracks from your playlists are already included'}
            </div>
          ) : (
            filteredTracks.map((track, index) => {
              const quadrant = getTrackQuadrant(track);
              const isSelected = selectedTracksToAdd.has(track.id);
              
              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, track)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTrackSelect(track)}
                  style={{
                    padding: '12px 20px',
                    borderBottom: index < filteredTracks.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'grab',
                    backgroundColor: isSelected ? 'rgba(144, 169, 85, 0.2)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseDown={(e) => {
                    // Change cursor to grabbing when starting to drag
                    e.currentTarget.style.cursor = 'grabbing';
                  }}
                  onMouseUp={(e) => {
                    // Reset cursor
                    e.currentTarget.style.cursor = 'grab';
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(144, 169, 85, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid var(--moss-green)',
                    borderRadius: '4px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? 'var(--moss-green)' : 'transparent',
                    transition: 'all 0.2s'
                  }}>
                    {isSelected && (
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>

                  {/* Album Art */}
                  {track.album?.images?.[0]?.url && (
                    <img 
                      src={track.album.images[2]?.url || track.album.images[1]?.url || track.album.images[0]?.url}
                      alt={`${track.album.name} album cover`}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        marginRight: '12px',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  {/* Track Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      fontSize: '14px',
                      color: 'var(--mindaro)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {track.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: '0.7',
                      color: 'var(--mindaro)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {track.artists?.[0]?.name || 'Unknown Artist'} • 
                      <span style={{ color: 'var(--moss-green)', marginLeft: '4px' }}>
                        {track.sourcePlaylistName}
                      </span>
                      {track.popularity !== undefined && (() => {
                        const popStyle = getPopularityStyle(quadrant, track.popularity);
                        return (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '10px', 
                            background: popStyle.background,
                            color: popStyle.color,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '500'
                          }}>
                            {popStyle.text}
                          </span>
                        );
                      })()}
                    </div>
                    {track.album?.name && (
                      <div style={{
                        fontSize: '11px',
                        opacity: '0.5',
                        color: 'var(--mindaro)',
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {track.album.name}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div style={{
                    fontSize: '11px',
                    opacity: '0.6',
                    color: 'var(--mindaro)',
                    marginLeft: '12px'
                  }}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--fern-green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', opacity: '0.7', color: 'var(--mindaro)' }}>
            {selectedTracksToAdd.size} track{selectedTracksToAdd.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--fern-green)',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: 'var(--mindaro)',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
                backgroundColor: selectedTracksToAdd.size > 0 ? 'var(--moss-green)' : 'rgba(144, 169, 85, 0.3)',
                color: 'white',
                cursor: selectedTracksToAdd.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = 'var(--fern-green)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = 'var(--moss-green)';
                }
              }}
            >
              Add {selectedTracksToAdd.size} Track{selectedTracksToAdd.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddUnselectedModal;