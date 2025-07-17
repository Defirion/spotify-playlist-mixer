import React, { useState } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { mixPlaylists } from '../utils/playlistMixer';

const PlaylistMixer = ({ accessToken, selectedPlaylists, ratioConfig, mixOptions, onMixedPlaylist, onError }) => {
  const [loading, setLoading] = useState(false);
  const [localMixOptions, setLocalMixOptions] = useState(mixOptions);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Sync localMixOptions with mixOptions when it changes (from presets)
  React.useEffect(() => {
    setLocalMixOptions(mixOptions);
    // Clear preview when settings change so user knows to regenerate
    setPreview(null);
  }, [mixOptions]);

  // Clear preview when ratioConfig changes
  React.useEffect(() => {
    setPreview(null);
  }, [ratioConfig]);

  const handleMix = async () => {
    try {
      setLoading(true);
      const api = getSpotifyApi(accessToken);
      
      // Validate inputs
      if (!selectedPlaylists || selectedPlaylists.length < 2) {
        throw new Error('Please select at least 2 playlists');
      }
      
      if (!mixOptions.playlistName.trim()) {
        throw new Error('Please enter a playlist name');
      }
      
      // Fetch all tracks from selected playlists
      const playlistTracks = {};
      for (const playlist of selectedPlaylists) {
        try {
          const tracks = await fetchAllPlaylistTracks(api, playlist.id);
          if (tracks.length === 0) {
            console.warn(`Playlist ${playlist.name} has no tracks`);
          }
          playlistTracks[playlist.id] = tracks;
        } catch (err) {
          console.error(`Failed to fetch tracks from ${playlist.name}:`, err);
          playlistTracks[playlist.id] = []; // Continue with empty array
        }
      }
      
      // Check if we have any tracks
      const totalAvailableTracks = Object.values(playlistTracks).reduce((sum, tracks) => sum + tracks.length, 0);
      if (totalAvailableTracks === 0) {
        throw new Error('No tracks found in selected playlists');
      }
      
      // Mix the playlists according to ratios
      const mixedTracks = mixPlaylists(playlistTracks, ratioConfig, localMixOptions);
      
      if (mixedTracks.length === 0) {
        throw new Error('Failed to mix playlists - no tracks generated');
      }
      
      // Create new playlist
      const userResponse = await api.get('/me');
      const userId = userResponse.data.id;
      
      const playlistResponse = await api.post(`/users/${userId}/playlists`, {
        name: localMixOptions.playlistName.trim(),
        description: `Mixed from: ${selectedPlaylists.map(p => p.name).join(', ')}`,
        public: false
      });
      
      const newPlaylist = playlistResponse.data;
      
      // Add tracks to playlist (Spotify API limit: 100 tracks per request)
      const trackUris = mixedTracks.filter(track => track.uri).map(track => track.uri);
      
      if (trackUris.length === 0) {
        throw new Error('No valid track URIs found');
      }
      
      const chunks = [];
      for (let i = 0; i < trackUris.length; i += 100) {
        chunks.push(trackUris.slice(i, i + 100));
      }
      
      for (const chunk of chunks) {
        await api.post(`/playlists/${newPlaylist.id}/tracks`, {
          uris: chunk
        });
      }
      
      // Calculate total duration for display
      const totalDuration = mixedTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
      const durationMinutes = Math.round(totalDuration / (1000 * 60));
      
      onMixedPlaylist({
        ...newPlaylist,
        tracks: { total: trackUris.length },
        duration: durationMinutes
      });
      
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error occurred';
      onError('Failed to create mixed playlist: ' + errorMessage);
      console.error('Playlist mixing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      setPreviewLoading(true);
      setPreview(null);
      
      const api = getSpotifyApi(accessToken);
      
      const playlistTracks = {};
      for (const playlist of selectedPlaylists) {
        const tracks = await fetchAllPlaylistTracks(api, playlist.id);
        playlistTracks[playlist.id] = tracks;
      }
      
      // Generate preview that maintains proper ratios
      let previewSongCount;
      if (localMixOptions.useTimeLimit) {
        // For time-based: estimate songs needed, then scale down proportionally
        const estimatedSongs = Math.ceil(localMixOptions.targetDuration / 3.5); // ~3.5 min per song
        previewSongCount = Math.min(Math.max(estimatedSongs * 0.3, 20), 50); // 30% of estimated, min 20, max 50
      } else {
        // For song-count: use proportional sample
        previewSongCount = Math.min(Math.max(localMixOptions.totalSongs * 0.3, 20), 50); // 30% of total, min 20, max 50
      }
      
      const previewOptions = {
        ...localMixOptions,
        totalSongs: Math.round(previewSongCount),
        useTimeLimit: false // Always use song count for preview performance
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
      setPreviewLoading(false);
    }
  };

  const fetchAllPlaylistTracks = async (api, playlistId) => {
    let allTracks = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await api.get(`/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`);
      const tracks = response.data.items
        .filter(item => item.track && item.track.id) // Filter out null tracks
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

  return (
    <div className="card">
      <h2>Mix Your Playlists</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="input-group">
          <label>Playlist Name:</label>
          <input
            type="text"
            value={localMixOptions.playlistName}
            onChange={(e) => setLocalMixOptions({...localMixOptions, playlistName: e.target.value})}
          />
        </div>
        
        <div className="input-group">
          <label>Playlist Size:</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${!localMixOptions.useTimeLimit ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, useTimeLimit: false})}
            >
              Song Count
            </button>
            <button
              type="button"
              className={`toggle-option ${localMixOptions.useTimeLimit ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, useTimeLimit: true})}
            >
              Time Duration
            </button>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            {localMixOptions.useTimeLimit ? (
              <>
                <input
                  type="number"
                  min="30"
                  max="600"
                  value={localMixOptions.targetDuration}
                  onChange={(e) => setLocalMixOptions({...localMixOptions, targetDuration: parseInt(e.target.value)})}
                  placeholder="Minutes"
                />
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  Target duration in minutes (e.g., 240 = 4 hours)
                </div>
              </>
            ) : (
              <>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={localMixOptions.totalSongs}
                  onChange={(e) => setLocalMixOptions({...localMixOptions, totalSongs: parseInt(e.target.value)})}
                  placeholder="Number of songs"
                />
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  Total number of songs in the playlist
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div className="input-group">
          <label>Popularity Strategy:</label>
          <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              type="button"
              className={`toggle-option ${localMixOptions.popularityStrategy === 'mixed' ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'mixed'})}
            >
              Mixed
            </button>
            <button
              type="button"
              className={`toggle-option ${localMixOptions.popularityStrategy === 'front-loaded' ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'front-loaded'})}
            >
              Front-loaded
            </button>
            <button
              type="button"
              className={`toggle-option ${localMixOptions.popularityStrategy === 'mid-peak' ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'mid-peak'})}
            >
              Mid-peak
            </button>
            <button
              type="button"
              className={`toggle-option ${localMixOptions.popularityStrategy === 'crescendo' ? 'active' : ''}`}
              onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'crescendo'})}
            >
              Crescendo
            </button>
          </div>
          <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
            {localMixOptions.popularityStrategy === 'mixed' && 'Random mix of all popularity levels'}
            {localMixOptions.popularityStrategy === 'front-loaded' && 'Popular songs first, then fade to deep cuts'}
            {localMixOptions.popularityStrategy === 'mid-peak' && 'Build to popular songs in the middle, perfect for parties'}
            {localMixOptions.popularityStrategy === 'crescendo' && 'Build from deep cuts to biggest hits at the end'}
          </div>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px' }}>
          <input
            type="checkbox"
            checked={localMixOptions.recencyBoost}
            onChange={(e) => setLocalMixOptions({...localMixOptions, recencyBoost: e.target.checked})}
          />
          Boost recent tracks (newer songs get popularity bonus)
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
          <input
            type="checkbox"
            checked={localMixOptions.shuffleWithinGroups}
            onChange={(e) => setLocalMixOptions({...localMixOptions, shuffleWithinGroups: e.target.checked})}
          />
          Shuffle within popularity groups
        </label>
        <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
          Randomizes songs within each popularity quadrant while maintaining the overall strategy
        </div>
      </div>
      
      {/* Preview Section */}
      <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid var(--fern-green)' }}>
        <h3>👀 Preview Your Mix</h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', opacity: '0.8' }}>
          See how your playlist will look before creating it
        </p>
        
        <button 
          className="btn" 
          onClick={generatePreview}
          disabled={previewLoading || selectedPlaylists.length < 2}
          style={{ marginRight: '12px' }}
        >
          {previewLoading ? 'Generating Preview...' : '🔍 Generate Preview'}
        </button>
      </div>

      {preview && (
        <div style={{ marginBottom: '20px' }}>
          {/* Stats Summary */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid var(--fern-green)'
          }}>
            <h4 style={{ margin: '0 0 12px 0' }}>📊 Preview Stats</h4>
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
            maxHeight: '300px',
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
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {index + 1}. {track.name}
                    </div>
                    <div style={{ fontSize: '12px', opacity: '0.7' }}>
                      {track.artists?.[0]?.name || 'Unknown Artist'} • 
                      <span style={{ color: 'var(--moss-green)', marginLeft: '4px' }}>
                        {sourcePlaylist?.name || 'Unknown Playlist'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', opacity: '0.6' }}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{ 
            fontSize: '11px', 
            opacity: '0.7',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            This is just a preview. Your full playlist will have {localMixOptions.useTimeLimit ? `${localMixOptions.targetDuration} minutes` : `${localMixOptions.totalSongs} songs`} of music.
          </div>
        </div>
      )}

      <button 
        className="btn" 
        onClick={handleMix} 
        disabled={loading || selectedPlaylists.length < 2}
        style={{ width: '100%', padding: '16px', fontSize: '18px' }}
      >
        {loading ? 'Creating Mixed Playlist...' : '🎵 Create Mixed Playlist'}
      </button>
      
      {loading && (
        <div style={{ marginTop: '16px', textAlign: 'center', opacity: '0.8' }}>
          This might take a moment while we fetch and mix your songs...
        </div>
      )}
    </div>
  );
};

export default PlaylistMixer;