import React, { useState, useEffect } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import {
  handleTrackSelection,
  getTrackQuadrant,
  formatDuration,
  getPopularityStyle
} from '../utils/dragAndDrop';
import { useDrag } from '../contexts/DragContext';

const SpotifySearchModal = ({ 
  isOpen, 
  onClose, 
  accessToken, 
  onAddTracks
}) => {
  const { isDragging: globalIsDragging, startDrag, endDrag, cancelDrag } = useDrag();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTracksToAdd, setSelectedTracksToAdd] = useState(new Set());
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);



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
    handleTrackSelection(track, selectedTracksToAdd, setSelectedTracksToAdd);
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

  const handleDragStart = (e, track) => {
    const trackWithSource = {
      ...track,
      sourcePlaylist: 'search',
      sourcePlaylistName: 'Spotify Search'
    };
    
    startDrag({
      data: trackWithSource,
      type: 'search-track',
      style: { background: '#1DB954', border: '#1ed760' }
    });
  };

  

  // Touch handlers for mobile
  const [touchDragState, setTouchDragState] = useState({
    isDragging: false,
    startY: 0,
    longPressTimer: null,
    isLongPress: false
  });

  const handleTouchStart = (e, track) => {
    console.log('[SpotifySearchModal] handleTouchStart called.');
    if (!isMobile) {
      console.log('[SpotifySearchModal] Not mobile, returning.');
      return;
    }

    const touch = e.touches[0];

    // Clear any existing timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
      console.log('[SpotifySearchModal] Cleared existing longPressTimer.');
    }

    // Set up long press detection (300ms)
    const longPressTimer = setTimeout(() => {
      // Check if user hasn't moved much (not scrolling)
      const currentY = touchDragState.currentY || touch.clientY;
      const deltaY = Math.abs(currentY - touch.clientY);
      console.log(`[SpotifySearchModal] Long press timer fired. deltaY: ${deltaY}`);
      
      if (deltaY < 8) { // User hasn't moved much, activate drag mode
        setTouchDragState(prev => ({
          ...prev,
          isLongPress: true,
          isDragging: true
        }));
        
        // Prepare track with source info
        const trackWithSource = {
          ...track,
          sourcePlaylist: 'search',
          sourcePlaylistName: 'Spotify Search'
        };
        
        // Start external drag using context
        startDrag({
          data: trackWithSource,
          type: 'search-track',
          style: { background: '#1DB954', border: '#1ed760' }
        });
        console.log('[SpotifySearchModal] startDrag called. globalIsDragging (after call): ', globalIsDragging);
        
        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else {
        console.log('[SpotifySearchModal] Long press cancelled due to excessive movement.');
      }
    }, 300);

    setTouchDragState({
      isDragging: false,
      startY: touch.clientY,
      currentY: touch.clientY,
      longPressTimer,
      isLongPress: false
    });
    console.log('[SpotifySearchModal] touchDragState initialized.');
  };

  const handleTouchMove = (e, track) => {
    if (!isMobile) return;

    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);
    
    // Update current position
    setTouchDragState(prev => ({ ...prev, currentY: touch.clientY }));

    // If long press hasn't activated yet and user moves too much, cancel it
    if (!touchDragState.isLongPress && deltaY > 12) {
      if (touchDragState.longPressTimer) {
        clearTimeout(touchDragState.longPressTimer);
        setTouchDragState(prev => ({ 
          ...prev, 
          longPressTimer: null 
        }));
      }
      return; // Allow normal scrolling
    }

    // If long press is active, prevent scrolling
    if (touchDragState.isLongPress) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e, track) => {
    if (!isMobile) return;

    // Clear long press timer
    if (touchDragState.longPressTimer) {
      clearTimeout(touchDragState.longPressTimer);
    }

    // If we were in long press mode, end the external drag
    if (touchDragState.isLongPress) {
      // The actual drop handling is done in DraggableTrackList
      // We just need to reset our state here
      setTouchDragState({
        isDragging: false,
        startY: 0,
        currentY: 0,
        longPressTimer: null,
        isLongPress: false
      });
    }
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          backgroundColor: (globalIsDragging || touchDragState.isLongPress) ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
          zIndex: (globalIsDragging || touchDragState.isLongPress) ? -1 : 1000,
          opacity: 1,
          pointerEvents: (globalIsDragging || touchDragState.isLongPress) ? 'none' : 'auto',
          transition: 'opacity 0.2s ease'
        }}
        onClick={onClose}
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
          zIndex: (globalIsDragging || touchDragState.isLongPress) ? -1 : 1001,
          opacity: 1,
          pointerEvents: (globalIsDragging || touchDragState.isLongPress) ? 'none' : 'auto',
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
                  draggable={!isMobile}
                  onDragStart={!isMobile ? (e) => handleDragStart(e, track) : undefined}
                  onTouchStart={isMobile ? (e) => handleTouchStart(e, track) : undefined}
                  ref={node => {
                    if (node) {
                      // Ensure we only add the listener once and remove it on unmount/re-render
                      // Store the handler on the node itself to easily remove it
                      if (node.__touchMoveHandler__) {
                        node.removeEventListener('touchmove', node.__touchMoveHandler__);
                      }
                      if (isMobile) {
                        const handler = (e) => handleTouchMove(e, track);
                        node.addEventListener('touchmove', handler, { passive: false });
                        node.__touchMoveHandler__ = handler;
                      }
                    }
                  }}
                  onTouchEnd={isMobile ? (e) => handleTouchEnd(e, track) : undefined}
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