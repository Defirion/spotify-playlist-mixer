import React, { useState } from 'react';

const DraggableTrackList = ({ tracks, selectedPlaylists, onTrackOrderChange, formatDuration }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropLinePosition, setDropLinePosition] = useState(null);
  const [localTracks, setLocalTracks] = useState(tracks);

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
    
    if (draggedIndex === null || draggedIndex === index) return;
    
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
    
    // Don't show drop line if it would be the same position
    if (draggedIndex < insertPosition && insertPosition === draggedIndex + 1) return;
    if (draggedIndex > insertPosition && insertPosition === draggedIndex) return;
    
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

  return (
    <div style={{ 
      background: 'var(--hunter-green)', 
      borderRadius: '8px', 
      border: '1px solid var(--fern-green)',
      maxHeight: '400px',
      overflowY: 'auto',
      marginBottom: '16px'
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid var(--fern-green)',
        position: 'sticky',
        top: 0,
        background: 'var(--hunter-green)',
        zIndex: 1
      }}>
        <strong>🎵 {localTracks.length} Songs</strong>
        <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
          💡 Drag and drop to reorder • Click ✕ to remove tracks
        </div>
      </div>
      
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
                    <span style={{ color: 'var(--moss-green)', marginLeft: '4px' }}>
                      {sourcePlaylist?.name || 'Unknown Playlist'}
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
  );
};

export default DraggableTrackList;