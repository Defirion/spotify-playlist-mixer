import React, { useState, useEffect } from 'react';
import { getSpotifyApi } from '../utils/spotify';

const SpotifySearchModal = ({ 
  isOpen, 
  onClose, 
  accessToken, 
  onAddTracks,
  onDragTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTracksToAdd, setSelectedTracksToAdd] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTrackQuadrant = (track) => {
    if (track.popularity === undefined) return null;
    
    // Simple quadrant calculation based on popularity score
    if (track.popularity >= 80) return 'topHits';
    if (track.popularity >= 60) return 'popular';
    if (track.popularity >= 40) return 'moderate';
    return 'deepCuts';
  };

  const handleSpotifySearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const api = getSpotifyApi(accessToken);
      
      const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=20`);
      setSearchResults(response.data.tracks.items || []);
      
    } catch (err) {
      console.error('Failed to search for songs:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSelect = (track) => {
    const newSelected = new Set(selectedTracksToAdd);
    if (newSelected.has(track.id)) {
      newSelected.delete(track.id);
    } else {
      newSelected.add(track.id);
    }
    setSelectedTracksToAdd(newSelected);
  };

  const handleAddSelected = () => {
    const tracksToAdd = searchResults
      .filter(track => selectedTracksToAdd.has(track.id))
      .map(track => ({
        ...track,
        sourcePlaylist: 'search',
        sourcePlaylistName: 'Spotify Search'
      }));
    
    onAddTracks(tracksToAdd);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDragStart = (e, track) => {
    setIsDragging(true);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'modal-track',
      track: {
        ...track,
        sourcePlaylist: 'search',
        sourcePlaylistName: 'Spotify Search'
      }
    }));
    
    // Create a custom drag image
    const dragElement = e.currentTarget.cloneNode(true);
    dragElement.style.width = '400px';
    dragElement.style.opacity = '0.8';
    dragElement.style.transform = 'rotate(2deg)';
    dragElement.style.backgroundColor = '#1DB954';
    dragElement.style.border = '2px solid #1ed760';
    dragElement.style.borderRadius = '8px';
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    document.body.appendChild(dragElement);
    
    e.dataTransfer.setDragImage(dragElement, 200, 30);
    
    // Clean up the drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragElement)) {
        document.body.removeChild(dragElement);
      }
    }, 100);
    
    if (onDragTrack) {
      onDragTrack(track);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onClose();
  };

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedTracksToAdd(new Set());
    }
  }, [isOpen]);

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
        onClick={handleBackdropClick}
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
              🎵 Search Spotify
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: '0.7' }}>
              {loading ? 'Searching...' : (
                <>
                  {searchResults.length} tracks found • <strong>Click to select</strong> or <strong>drag to playlist</strong>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid var(--fern-green)',
                borderRadius: '8px',
                backgroundColor: 'var(--dark-green)',
                color: 'var(--mindaro)',
                outline: 'none'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSpotifySearch()}
              onFocus={(e) => e.target.style.borderColor = 'var(--moss-green)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--fern-green)'}
              autoFocus
            />
            <button
              onClick={handleSpotifySearch}
              disabled={loading || !searchQuery.trim()}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: loading || !searchQuery.trim() ? 'rgba(29, 185, 84, 0.3)' : '#1DB954',
                color: 'white',
                cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading && searchQuery.trim()) {
                  e.target.style.backgroundColor = '#1ed760';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && searchQuery.trim()) {
                  e.target.style.backgroundColor = '#1DB954';
                }
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
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
              Searching Spotify...
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: 'var(--mindaro)',
              opacity: '0.7',
              textAlign: 'center'
            }}>
              {searchQuery ? 'No tracks found. Try a different search term.' : 'Enter a search term to find songs on Spotify'}
            </div>
          ) : (
            searchResults.map((track, index) => {
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
                    borderBottom: index < searchResults.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'grab',
                    backgroundColor: isSelected ? 'rgba(29, 185, 84, 0.2)' : 'transparent',
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
                      e.currentTarget.style.backgroundColor = 'rgba(29, 185, 84, 0.1)';
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
                    border: '2px solid #1DB954',
                    borderRadius: '4px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? '#1DB954' : 'transparent',
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
                      <span style={{ color: '#1DB954', marginLeft: '4px' }}>
                        🔍 Spotify Search
                      </span>
                      {track.popularity !== undefined && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '10px', 
                          background: quadrant === 'topHits' ? 'rgba(255, 87, 34, 0.2)' :
                                    quadrant === 'popular' ? 'rgba(255, 193, 7, 0.2)' :
                                    quadrant === 'moderate' ? 'rgba(0, 188, 212, 0.2)' :
                                    'rgba(233, 30, 99, 0.2)',
                          color: quadrant === 'topHits' ? '#FF5722' :
                               quadrant === 'popular' ? '#FF8F00' :
                               quadrant === 'moderate' ? '#00BCD4' :
                               '#E91E63',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          {quadrant === 'topHits' ? `🔥 ${track.popularity}` :
                           quadrant === 'popular' ? `⭐ ${track.popularity}` :
                           quadrant === 'moderate' ? `📻 ${track.popularity}` :
                           `💎 ${track.popularity}`}
                        </span>
                      )}
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
                backgroundColor: selectedTracksToAdd.size > 0 ? '#1DB954' : 'rgba(29, 185, 84, 0.3)',
                color: 'white',
                cursor: selectedTracksToAdd.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = '#1ed760';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTracksToAdd.size > 0) {
                  e.target.style.backgroundColor = '#1DB954';
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

export default SpotifySearchModal;