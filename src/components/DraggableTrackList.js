import React, { useState } from 'react';
import AddUnselectedModal from './AddUnselectedModal';
import { getSpotifyApi } from '../utils/spotify';

const DraggableTrackList = ({ tracks, selectedPlaylists, onTrackOrderChange, formatDuration, accessToken }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [localTracks, setLocalTracks] = useState(tracks);
  const [containerHeight, setContainerHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [normalHeight, setNormalHeight] = useState(400);
  const [showAddUnselectedModal, setShowAddUnselectedModal] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Update local tracks when props change
  React.useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if it's a modal track being dragged
    const dragData = e.dataTransfer.types.includes('application/json');
    
    if (!dragData && (draggedIndex === null || draggedIndex === index)) return;
    
    // Calculate if we're in the top or bottom half of the element
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;
    
    // Determine the insertion position
    let insertPosition;
    if (isTopHalf) {
      insertPosition = index;
    } else {
      insertPosition = index + 1;
    }
    
    // Don't show drop line if it would be the same position (only for internal drags)
    if (!dragData && draggedIndex !== null) {
      if (draggedIndex < insertPosition && insertPosition === draggedIndex + 1) return;
      if (draggedIndex > insertPosition && insertPosition === draggedIndex) return;
    }
    
    setDropLinePosition({ index: insertPosition, isTopHalf });
  };

  const handleDragLeave = (e) => {
    // Store references before setTimeout to avoid null issues
    const currentTarget = e.currentTarget;
    const relatedTarget = e.relatedTarget;
    
    // Use a small delay to prevent flickering when moving between elements
    setTimeout(() => {
      // Check if we're still dragging and haven't entered another element
      if (draggedIndex !== null && currentTarget && !relatedTarget?.closest('[draggable="true"]')) {
        const container = currentTarget.closest('[style*="maxHeight"]');
        if (container && !container.contains(relatedTarget)) {
          setDropLinePosition(null);
        }
      }
    }, 10);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    // Check if it's a track from the modal or search results
    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (dragData) {
        const { type, track } = JSON.parse(dragData);
        if (type === 'modal-track' || type === 'search-track') {
          // Handle drop from modal or search results
          const newTracks = [...localTracks];
          const insertIndex = dropLinePosition ? dropLinePosition.index : localTracks.length;
          
          // Insert the track at the specified position
          newTracks.splice(insertIndex, 0, track);
          
          setLocalTracks(newTracks);
          
          // Notify parent component of the new track list
          if (onTrackOrderChange) {
            onTrackOrderChange(newTracks);
          }
          
          setDropLinePosition(null);
          
          // If it's a search track, clear the search results
          if (type === 'search-track') {
            setSearchQuery('');
            setSearchResults([]);
          }
          
          return;
        }
      }
    } catch (error) {
      // Not a modal or search track, continue with normal drag handling
    }
    
    // Handle normal internal drag and drop
    if (draggedIndex === null || !dropLinePosition) {
      setDraggedIndex(null);
      setDropLinePosition(null);
      return;
    }

    const newTracks = [...localTracks];
    const draggedTrack = newTracks[draggedIndex];
    
    // Remove the dragged track
    newTracks.splice(draggedIndex, 1);
    
    // Calculate the correct insertion index
    let insertIndex = dropLinePosition.index;
    if (draggedIndex < dropLinePosition.index) {
      insertIndex = dropLinePosition.index - 1;
    }
    
    // Insert at new position
    newTracks.splice(insertIndex, 0, draggedTrack);
    
    setLocalTracks(newTracks);
    
    // Notify parent component of the new order
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
    
    setDraggedIndex(null);
    setDropLinePosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropLinePosition(null);
  };

  const handleRemoveTrack = (index) => {
    const newTracks = [...localTracks];
    newTracks.splice(index, 1);
    setLocalTracks(newTracks);
    
    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
  };

  // Calculate 85% of screen height
  const getMaxHeight = () => {
    return Math.floor(window.innerHeight * 0.85);
  };

  // Double-click to maximize/minimize
  const handleDoubleClick = () => {
    if (isMaximized) {
      // Minimize to normal height
      setContainerHeight(normalHeight);
      setIsMaximized(false);
    } else {
      // Save current height as normal height and maximize
      setNormalHeight(containerHeight);
      setContainerHeight(getMaxHeight());
      setIsMaximized(true);
    }
  };

  // Resize functionality
  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
    
    const startY = e.clientY;
    const startHeight = containerHeight;
    const maxHeight = getMaxHeight();
    
    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
      setContainerHeight(newHeight);
      
      // Update maximized state based on height
      if (newHeight >= maxHeight - 10) {
        if (!isMaximized) {
          setNormalHeight(startHeight);
          setIsMaximized(true);
        }
      } else {
        if (isMaximized) {
          setIsMaximized(false);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate relative popularity quadrants for track labeling
  const tracksWithPop = localTracks.filter(t => t.popularity !== undefined);
  const sortedByPop = [...tracksWithPop].sort((a, b) => b.popularity - a.popularity);
  const qSize = Math.floor(sortedByPop.length / 4);
  
  const getTrackQuadrant = (track) => {
    if (track.popularity === undefined) return null;
    const index = sortedByPop.findIndex(t => t.id === track.id);
    if (index < qSize) return 'topHits';
    if (index < qSize * 2) return 'popular';
    if (index < qSize * 3) return 'moderate';
    return 'deepCuts';
  };

  const handleAddUnselectedTracks = (tracksToAdd) => {
    const newTracks = [...localTracks, ...tracksToAdd];
    setLocalTracks(newTracks);
    
    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }
  };

  const handleSpotifySearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const api = getSpotifyApi(accessToken);
      
      const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`);
      setSearchResults(response.data.tracks.items || []);
      
    } catch (err) {
      console.error('Failed to search for songs:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddSongFromSearch = (song) => {
    // Add sourcePlaylist as 'search' to distinguish from playlist tracks
    const songWithSource = {
      ...song,
      sourcePlaylist: 'search',
      sourcePlaylistName: 'Spotify Search'
    };

    const newTracks = [...localTracks, songWithSource];
    setLocalTracks(newTracks);
    
    // Notify parent component of the new track list
    if (onTrackOrderChange) {
      onTrackOrderChange(newTracks);
    }

    // Clear search after adding
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div style={{ 
      position: 'relative',
      marginBottom: '16px'
    }}>
      <div 
        style={{ 
          background: 'var(--hunter-green)', 
          borderRadius: '8px', 
          border: '1px solid var(--fern-green)',
          height: `${containerHeight}px`,
          overflowY: 'auto',
          borderBottomLeftRadius: '0px',
          borderBottomRightRadius: '0px'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          // If dragging over empty space, set drop position to end
          if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
            setDropLinePosition({ index: localTracks.length, isTopHalf: false });
          }
        }}
        onDrop={(e) => {
          // Handle drops on empty space
          if (e.target === e.currentTarget || e.target.closest('[style*="sticky"]')) {
            handleDrop(e, localTracks.length);
          }
        }}
      >
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid var(--fern-green)',
          position: 'sticky',
          top: 0,
          background: 'var(--hunter-green)',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <strong>🎵 {localTracks.length} Songs</strong>
            <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
              💡 <strong>Drag and drop to reorder</strong> • <strong>Click ✕ to remove tracks</strong> • <strong>Drag bottom edge to resize</strong>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setShowAddUnselectedModal(true)}
              style={{
                background: 'var(--moss-green)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--fern-green)';
                e.target.style.transform = 'translateY(-1px)';
                const iconSpan = e.target.querySelector('span');
                if (iconSpan) iconSpan.style.backgroundColor = '#3d5a26';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--moss-green)';
                e.target.style.transform = 'translateY(0)';
                const iconSpan = e.target.querySelector('span');
                if (iconSpan) iconSpan.style.backgroundColor = '#7a9147';
              }}
              title="Add songs that weren't selected from your playlists"
            >
              <span style={{
                backgroundColor: '#7a9147',
                borderRadius: '4px',
                padding: '4px',
                transition: 'background-color 0.2s ease'
              }}>➕</span>
              Add Unselected
            </button>
            
            <button
              onClick={() => setShowSpotifySearch(!showSpotifySearch)}
              style={{
                background: '#1DB954',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#1ed760';
                e.target.style.transform = 'translateY(-1px)';
                const iconSpan = e.target.querySelector('span');
                if (iconSpan) iconSpan.style.backgroundColor = '#17c653';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1DB954';
                e.target.style.transform = 'translateY(0)';
                const iconSpan = e.target.querySelector('span');
                if (iconSpan) iconSpan.style.backgroundColor = '#189a47';
              }}
              title="Search and add songs directly from Spotify"
            >
              <span style={{
                backgroundColor: '#189a47',
                borderRadius: '4px',
                padding: '4px',
                transition: 'background-color 0.2s ease'
              }}>🎵</span>
              Add from Spotify
            </button>
          </div>
        </div>
      
      {/* Empty state drop zone */}
      {localTracks.length === 0 && (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--mindaro)',
          opacity: '0.6',
          fontSize: '14px',
          borderStyle: dropLinePosition ? 'dashed' : 'none',
          borderWidth: '2px',
          borderColor: 'var(--moss-green)',
          borderRadius: '8px',
          margin: '20px',
          backgroundColor: dropLinePosition ? 'rgba(144, 169, 85, 0.1)' : 'transparent',
          transition: 'all 0.2s ease'
        }}>
          {dropLinePosition ? 
            '🎵 Drop track here to add it to your playlist' : 
            'No tracks in preview yet. Generate a preview or drag tracks from the modal.'
          }
        </div>
      )}

      {/* Drop line at the end when dragging over empty space */}
      {dropLinePosition && dropLinePosition.index === localTracks.length && localTracks.length > 0 && (
        <div style={{
          height: '3px',
          background: 'var(--moss-green)',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(144, 169, 85, 0.6)',
          animation: 'pulse 1s infinite',
          margin: '8px 16px',
          pointerEvents: 'none'
        }} />
      )}

      {localTracks.map((track, index) => {
        const sourcePlaylist = selectedPlaylists.find(p => p.id === track.sourcePlaylist);
        const quadrant = getTrackQuadrant(track);
        const isDragging = draggedIndex === index;

        const showDropLineAbove = dropLinePosition && dropLinePosition.index === index;
        const showDropLineBelow = dropLinePosition && dropLinePosition.index === index + 1;
        
        return (
          <div 
            key={`${track.id}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{ 
              padding: '8px 16px', 
              borderBottom: index < localTracks.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
              borderTop: showDropLineAbove ? '3px solid var(--moss-green)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'grab',
              opacity: isDragging ? 0.5 : 1,
              backgroundColor: 'transparent',
              transition: 'all 0.2s ease',
              userSelect: 'none',
              position: 'relative',
              boxShadow: showDropLineAbove ? '0 -2px 8px rgba(144, 169, 85, 0.6)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ 
                marginRight: '12px', 
                fontSize: '16px', 
                opacity: '0.5',
                cursor: 'grab'
              }}>
                ⋮⋮
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                {track.album?.images?.[0]?.url && (
                  <img 
                    src={track.album.images[2]?.url || track.album.images[1]?.url || track.album.images[0]?.url}
                    alt={`${track.album.name} album cover`}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {index + 1}. {track.name}
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artists?.[0]?.name || 'Unknown Artist'} • 
                    <span style={{ 
                      color: track.sourcePlaylist === 'search' ? 'var(--mindaro)' : 'var(--moss-green)', 
                      marginLeft: '4px' 
                    }}>
                      {track.sourcePlaylist === 'search' ? '🔍 Spotify Search' : (sourcePlaylist?.name || 'Unknown Playlist')}
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
                        {quadrant === 'topHits' ? `🔥 Top Hits (${track.popularity})` :
                         quadrant === 'popular' ? `⭐ Popular (${track.popularity})` :
                         quadrant === 'moderate' ? `📻 Moderate (${track.popularity})` :
                         `💎 Deep Cuts (${track.popularity})`}
                      </span>
                    )}
                  </div>
                  {track.album?.name && (
                    <div style={{ fontSize: '11px', opacity: '0.5', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.album.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '11px', opacity: '0.6' }}>
                {formatDuration(track.duration_ms || 0)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTrack(index);
                }}
                style={{
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#cc0000'}
                onMouseLeave={(e) => e.target.style.background = '#ff4444'}
                title="Remove track from playlist"
              >
                ×
              </button>
            </div>
            
            {/* Drop line below - positioned absolutely within the track element */}
            {showDropLineBelow && (
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                left: '16px',
                right: '16px',
                height: '3px',
                background: 'var(--moss-green)',
                borderRadius: '2px',
                boxShadow: '0 0 8px rgba(144, 169, 85, 0.6)',
                animation: 'pulse 1s infinite',
                pointerEvents: 'none',
                zIndex: 10
              }} />
            )}
          </div>
        );
      })}
      </div>
      
      {/* Resize handle - outside the scrollable container */}
      <div
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        style={{
          height: '12px',
          cursor: 'ns-resize',
          background: isResizing ? 'rgba(144, 169, 85, 0.3)' : 
                     isMaximized ? 'rgba(144, 169, 85, 0.2)' : 'var(--hunter-green)',
          border: '1px solid var(--fern-green)',
          borderTop: isResizing ? '2px solid var(--moss-green)' : 
                    isMaximized ? '2px solid var(--moss-green)' : '1px solid var(--fern-green)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.target.style.background = 'rgba(144, 169, 85, 0.1)';
            e.target.style.borderTop = '2px solid rgba(144, 169, 85, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.target.style.background = isMaximized ? 'rgba(144, 169, 85, 0.2)' : 'var(--hunter-green)';
            e.target.style.borderTop = isMaximized ? '2px solid var(--moss-green)' : '1px solid var(--fern-green)';
          }
        }}
        title={isMaximized ? "Drag to resize • Double-click to minimize" : "Drag to resize • Double-click to maximize"}
      >
        <div style={{
          width: '30px',
          height: '3px',
          background: 'rgba(144, 169, 85, 0.6)',
          borderRadius: '2px',
          opacity: isResizing ? 1 : 0.7
        }} />
      </div>

      {/* Spotify Search Interface */}
      {showSpotifySearch && (
        <div style={{
          background: 'var(--hunter-green)',
          border: '1px solid var(--fern-green)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          marginTop: '-1px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--mindaro)', fontSize: '16px' }}>
            🎵 Search Spotify
          </h3>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs..."
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--fern-green)',
                borderRadius: '6px',
                backgroundColor: 'var(--dark-green)',
                color: 'var(--mindaro)',
                outline: 'none'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSpotifySearch()}
              onFocus={(e) => e.target.style.borderColor = 'var(--moss-green)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--fern-green)'}
            />
            <button
              onClick={handleSpotifySearch}
              disabled={searchLoading || !searchQuery.trim()}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#1DB954',
                color: 'white',
                cursor: searchLoading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid var(--fern-green)',
              borderRadius: '6px',
              backgroundColor: 'var(--dark-green)'
            }}>
              {searchResults.map((song, index) => (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'search-track',
                      track: {
                        ...song,
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
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: index < searchResults.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'grab',
                    transition: 'background-color 0.2s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(29, 185, 84, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.cursor = 'grabbing';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.cursor = 'grab';
                  }}
                >
                  {/* Drag Handle */}
                  <div style={{ 
                    marginRight: '8px', 
                    fontSize: '14px', 
                    opacity: '0.5',
                    cursor: 'grab'
                  }}>
                    ⋮⋮
                  </div>

                  {/* Album Art */}
                  {song.album?.images?.[0]?.url && (
                    <img 
                      src={song.album.images[2]?.url || song.album.images[1]?.url || song.album.images[0]?.url}
                      alt={`${song.album.name} album cover`}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  {/* Song Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      fontSize: '14px',
                      color: 'var(--mindaro)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {song.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      opacity: '0.7',
                      color: 'var(--mindaro)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {song.artists?.[0]?.name || 'Unknown Artist'} • {song.album?.name || 'Unknown Album'}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{
                    fontSize: '11px',
                    opacity: '0.6',
                    color: 'var(--mindaro)',
                    marginRight: '8px'
                  }}>
                    {formatDuration(song.duration_ms || 0)}
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAddSongFromSearch(song)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#1DB954',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1ed760'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1DB954'}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !searchLoading && searchResults.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: 'var(--mindaro)',
              opacity: '0.7',
              fontStyle: 'italic'
            }}>
              No songs found for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Add Unselected Modal */}
      <AddUnselectedModal
        isOpen={showAddUnselectedModal}
        onClose={() => setShowAddUnselectedModal(false)}
        accessToken={accessToken}
        selectedPlaylists={selectedPlaylists}
        currentTracks={localTracks}
        onAddTracks={handleAddUnselectedTracks}
        onDragTrack={(track) => {
          // Optional: Handle when a track starts being dragged from modal
          console.log('Track being dragged from modal:', track.name);
        }}
      />
    </div>
  );
};

export default DraggableTrackList;