import React, { useState, useEffect } from 'react';
import { mixPlaylists } from '../utils/playlistMixer';

const PlaylistPreview = ({
  accessToken,
  selectedPlaylists,
  ratioConfig,
  mixOptions,
  onCreatePlaylist,
  onError,
  onPreviewOrderChange
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generatePreview = async () => {
    try {
      setLoading(true);
      setPreview(null);

      // Fetch tracks from selected playlists (same logic as PlaylistMixer)
      const { getSpotifyApi } = await import('../utils/spotify');
      const api = getSpotifyApi(accessToken);

      const playlistTracks = {};
      for (const playlist of selectedPlaylists) {
        const tracks = await fetchAllPlaylistTracks(api, playlist.id);
        playlistTracks[playlist.id] = tracks;
      }

      // Generate preview with first 20 songs
      const previewOptions = {
        ...mixOptions,
        totalSongs: mixOptions.useTimeLimit ? Math.min(60, mixOptions.totalSongs || 60) : 20,
        useTimeLimit: false // Always use song count for preview
      };

      const previewTracks = mixPlaylists(playlistTracks, ratioConfig, previewOptions);

      // Calculate some stats
      const playlistStats = {};
      selectedPlaylists.forEach(playlist => {
        playlistStats[playlist.id] = {
          name: playlist.name,
          count: previewTracks.filter(track => track.sourcePlaylist === playlist.id).length,
          totalDuration: previewTracks
            .filter(track => track.sourcePlaylist === playlist.id)
            .reduce((sum, track) => sum + (track.duration_ms || 0), 0)
        };
      });

      // Add Spotify Search stats if there are any search tracks
      const searchTracks = previewTracks.filter(track => track.sourcePlaylist === 'search');
      if (searchTracks.length > 0) {
        playlistStats['search'] = {
          name: '🔍 Spotify Search',
          count: searchTracks.length,
          totalDuration: searchTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
        };
      }

      setPreview({
        tracks: previewTracks,
        stats: playlistStats,
        totalDuration: previewTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
      });

    } catch (err) {
      onError('Failed to generate preview: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPlaylistTracks = async (api, playlistId) => {
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

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newTracks = [...preview.tracks];
    const draggedTrack = newTracks[draggedIndex];

    // Remove the dragged track
    newTracks.splice(draggedIndex, 1);

    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newTracks.splice(insertIndex, 0, draggedTrack);

    // Update preview with new order
    const updatedPreview = {
      ...preview,
      tracks: newTracks
    };

    setPreview(updatedPreview);

    // Notify parent component of the new order
    if (onPreviewOrderChange) {
      onPreviewOrderChange(newTracks);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveTrack = (index) => {
    const newTracks = [...preview.tracks];
    newTracks.splice(index, 1);

    // Recalculate stats for the updated track list
    const updatedStats = {};
    selectedPlaylists.forEach(playlist => {
      updatedStats[playlist.id] = {
        name: playlist.name,
        count: newTracks.filter(track => track.sourcePlaylist === playlist.id).length,
        totalDuration: newTracks
          .filter(track => track.sourcePlaylist === playlist.id)
          .reduce((sum, track) => sum + (track.duration_ms || 0), 0)
      };
    });

    // Add Spotify Search stats if there are any search tracks
    const searchTracks = newTracks.filter(track => track.sourcePlaylist === 'search');
    if (searchTracks.length > 0) {
      updatedStats['search'] = {
        name: '🔍 Spotify Search',
        count: searchTracks.length,
        totalDuration: searchTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
      };
    }

    const updatedPreview = {
      ...preview,
      tracks: newTracks,
      stats: updatedStats,
      totalDuration: newTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
    };

    setPreview(updatedPreview);

    // Notify parent component of the new order
    if (onPreviewOrderChange) {
      onPreviewOrderChange(newTracks);
    }
  };



  if (selectedPlaylists.length < 2) {
    return null;
  }

  return (
    <div className="card">
      <h2>🎵 Your Mix Preview</h2>
      <p style={{ marginBottom: '20px', opacity: '0.8', fontSize: '0.9em' }}>
        Review and adjust your mix preview.
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          className="btn"
          onClick={generatePreview}
          disabled={loading}
          style={{
            background: 'var(--fern-green)',
            border: '2px solid var(--moss-green)',
            padding: '12px 24px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            <>⏳ Generating Preview...</>
          ) : (
            <>🎵 Generate Preview</>
          )}
        </button>

        {preview && (
          <button
            className="btn"
            onClick={onCreatePlaylist}
            style={{
              background: 'var(--moss-green)',
              border: '2px solid var(--mindaro)',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ✨ Create Full Playlist
          </button>
        )}
      </div>



      {preview && (
        <div>
          {/* Quick Stats */}
          <div style={{
            background: 'var(--hunter-green)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid var(--fern-green)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Your Preview
              </h3>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--moss-green)' }}>
                {preview.tracks.length} songs • {formatTotalDuration(preview.totalDuration)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {Object.entries(preview.stats).map(([playlistId, stats]) => (
                <div key={playlistId} style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', opacity: '0.7', marginBottom: '4px' }}>
                    {stats.name.length > 18 ? stats.name.substring(0, 18) + '...' : stats.name}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--mindaro)' }}>
                    {stats.count} songs
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.6' }}>
                    {formatTotalDuration(stats.totalDuration)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track List */}
          <div style={{
            background: 'var(--hunter-green)',
            borderRadius: '12px',
            border: '1px solid var(--fern-green)',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--fern-green)',
              position: 'sticky',
              top: 0,
              background: 'var(--hunter-green)',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🎵 Your Songs ({preview.tracks.length})
                </h4>
                <div style={{ fontSize: '12px', opacity: '0.7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⋮⋮ Reorder
                </div>
              </div>
            </div>

            {preview.tracks.map((track, index) => {
              const sourcePlaylist = selectedPlaylists.find(p => p.id === track.sourcePlaylist);
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

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
                    padding: '8px 8px',
                    borderBottom: index < preview.tracks.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'grab',
                    opacity: isDragging ? 0.5 : 1,
                    backgroundColor: isDragOver ? 'rgba(79, 119, 45, 0.2)' : 'transparent',
                    borderLeft: isDragOver ? '3px solid var(--moss-green)' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{
                      marginRight: '8px',
                      fontSize: '16px',
                      opacity: '0.5',
                      cursor: 'grab'
                    }}>
                      ⋮⋮
                    </div>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {index + 1}. {track.name}
                      </div>
                      <div style={{ fontSize: '14px', opacity: '0.7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.artists?.[0]?.name || 'Unknown Artist'} •
                        <span style={{
                          color: track.sourcePlaylist === 'search' ? 'var(--mindaro)' : 'var(--moss-green)',
                          marginLeft: '4px'
                        }}>
                          {track.sourcePlaylist === 'search' ? '🔍 Spotify Search' : (sourcePlaylist?.name || 'Unknown Playlist')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', opacity: '0.6' }}>
                      {formatDuration(track.duration_ms || 0)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTrack(index);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--mindaro)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '1px 2px',
                        borderRadius: '3px',
                        opacity: '0.5',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = '1';
                        e.target.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                        e.target.style.color = '#ff6b6b';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = '0.5';
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = 'var(--mindaro)';
                      }}
                      title="Remove track"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            opacity: '0.7',
            textAlign: 'center'
          }}>
            Full playlist will have {mixOptions.useTimeLimit ? `${mixOptions.targetDuration} min` : `${mixOptions.totalSongs} songs`}.
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistPreview;