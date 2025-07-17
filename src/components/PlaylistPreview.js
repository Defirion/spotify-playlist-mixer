import React, { useState } from 'react';
import { mixPlaylists } from '../utils/playlistMixer';

const PlaylistPreview = ({ 
  accessToken, 
  selectedPlaylists, 
  ratioConfig, 
  mixOptions, 
  onCreatePlaylist,
  onError 
}) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

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

  if (selectedPlaylists.length < 2) {
    return null;
  }

  return (
    <div className="card">
      <h2>👀 Preview Your Mix</h2>
      <p>See how your playlist will look before creating it</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn" 
          onClick={generatePreview}
          disabled={loading}
          style={{ marginRight: '12px' }}
        >
          {loading ? 'Generating Preview...' : '🔍 Generate Preview'}
        </button>
        
        {preview && (
          <button 
            className="btn" 
            onClick={onCreatePlaylist}
            style={{ background: 'var(--moss-green)' }}
          >
            ✅ Looks Good - Create Full Playlist
          </button>
        )}
      </div>

      {preview && (
        <div>
          {/* Stats Summary */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid var(--fern-green)'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>📊 Preview Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(preview.stats).map(([playlistId, stats]) => (
                <div key={playlistId}>
                  <strong>{stats.name}:</strong><br />
                  <span style={{ fontSize: '14px', opacity: '0.8' }}>
                    {stats.count} songs • {formatTotalDuration(stats.totalDuration)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--fern-green)' }}>
              <strong>Total Preview: {preview.tracks.length} songs • {formatTotalDuration(preview.totalDuration)}</strong>
            </div>
          </div>

          {/* Track List */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            borderRadius: '8px', 
            border: '1px solid var(--fern-green)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid var(--fern-green)',
              position: 'sticky',
              top: 0,
              background: 'var(--hunter-green)',
              zIndex: 1
            }}>
              <strong>🎵 First {preview.tracks.length} Songs</strong>
            </div>
            
            {preview.tracks.map((track, index) => {
              const sourcePlaylist = selectedPlaylists.find(p => p.id === track.sourcePlaylist);
              return (
                <div 
                  key={`${track.id}-${index}`}
                  style={{ 
                    padding: '8px 16px', 
                    borderBottom: index < preview.tracks.length - 1 ? '1px solid rgba(79, 119, 45, 0.3)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>
                      {index + 1}. {track.name}
                    </div>
                    <div style={{ fontSize: '14px', opacity: '0.7' }}>
                      {track.artists?.[0]?.name || 'Unknown Artist'} • 
                      <span style={{ color: 'var(--moss-green)', marginLeft: '4px' }}>
                        {sourcePlaylist?.name || 'Unknown Playlist'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.6' }}>
                    {formatDuration(track.duration_ms || 0)}
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
            This is just a preview. Your full playlist will have {mixOptions.useTimeLimit ? `${mixOptions.targetDuration} minutes` : `${mixOptions.totalSongs} songs`} of music.
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistPreview;