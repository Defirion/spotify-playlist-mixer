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
      
      // Generate preview - use full settings if toggle is enabled
      let previewOptions;
      if (localMixOptions.fullSamplePreview) {
        // Use actual settings for full sample
        previewOptions = { ...localMixOptions };
      } else {
        // Generate limited preview that maintains proper ratios
        let previewSongCount;
        if (localMixOptions.useTimeLimit) {
          // For time-based: estimate songs needed, then scale down proportionally
          const estimatedSongs = Math.ceil(localMixOptions.targetDuration / 3.5); // ~3.5 min per song
          previewSongCount = Math.min(Math.max(estimatedSongs * 0.3, 20), 50); // 30% of estimated, min 20, max 50
        } else {
          // For song-count: use proportional sample
          previewSongCount = Math.min(Math.max(localMixOptions.totalSongs * 0.3, 20), 50); // 30% of total, min 20, max 50
        }
        
        previewOptions = {
          ...localMixOptions,
          totalSongs: Math.round(previewSongCount),
          useTimeLimit: false // Always use song count for limited preview performance
        };
      }
      
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

  // Calculate total available content from selected playlists
  const getTotalAvailableContent = () => {
    const totalSongs = selectedPlaylists.reduce((sum, playlist) => sum + playlist.tracks.total, 0);
    
    // Calculate real total duration using actual average duration data
    let totalDurationMinutes = 0;
    let hasRealData = true;
    
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes = (playlist.tracks.total * playlist.realAverageDurationSeconds) / 60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        // Fallback to estimate if no real data available
        totalDurationMinutes += playlist.tracks.total * 3.5;
        hasRealData = false;
      }
    }
    
    return {
      totalSongs,
      totalDurationMinutes: Math.round(totalDurationMinutes),
      totalDurationHours: totalDurationMinutes / 60,
      hasRealDurationData: hasRealData
    };
  };

  // Calculate when ratios will start breaking down
  const getRatioBreakdownPoint = () => {
    if (selectedPlaylists.length === 0 || !ratioConfig) return null;
    
    // Calculate total weight for ratio calculations
    const totalWeight = selectedPlaylists.reduce((sum, playlist) => {
      const config = ratioConfig[playlist.id] || { weight: 1 };
      return sum + config.weight;
    }, 0);
    
    // Calculate how many songs each playlist can contribute based on their ratios
    const playlistLimits = selectedPlaylists.map(playlist => {
      const config = ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 };
      const availableSongs = playlist.tracks.total;
      
      // Calculate maximum songs this playlist can contribute based on its max group size
      const maxGroups = Math.floor(availableSongs / config.max);
      const maxContribution = maxGroups * config.max;
      
      // Calculate how many total songs we could have if this playlist is the limiting factor
      const targetRatio = config.weight / totalWeight;
      const maxTotalIfLimiting = Math.floor(maxContribution / targetRatio);
      
      return {
        name: playlist.name,
        available: availableSongs,
        maxContribution,
        maxTotalIfLimiting,
        targetRatio,
        config
      };
    });
    
    // Find the actual limiting playlist (the one that gives us the smallest total)
    const limitingPlaylist = playlistLimits.reduce((min, current) => 
      current.maxTotalIfLimiting < min.maxTotalIfLimiting ? current : min
    );
    
    return {
      limitingPlaylist: limitingPlaylist.name,
      perfectRatioLimit: limitingPlaylist.maxTotalIfLimiting,
      totalAvailable: playlistLimits.reduce((sum, p) => sum + p.available, 0)
    };
  };

  // Check if current settings exceed available content
  const getExceedsLimitWarning = () => {
    if (selectedPlaylists.length === 0) return null;
    
    const available = getTotalAvailableContent();
    const ratioBreakdown = getRatioBreakdownPoint();
    
    if (localMixOptions.useTimeLimit) {
      // Only show time-based warnings when we have real duration data
      if (available.totalDurationMinutes !== null && localMixOptions.targetDuration > available.totalDurationMinutes) {
        // Calculate when ratios will break down for time-based playlists
        const perfectRatioMinutes = ratioBreakdown ? Math.round((ratioBreakdown.perfectRatioLimit * 3.5)) : available.totalDurationMinutes;
        
        return {
          type: 'time',
          requested: localMixOptions.targetDuration,
          available: available.totalDurationMinutes,
          availableFormatted: formatTotalDuration(available.totalDurationMinutes * 60 * 1000),
          requestedFormatted: `${(localMixOptions.targetDuration / 60).toFixed(1)}h`,
          ratioBreakdown: ratioBreakdown,
          perfectRatioLimit: perfectRatioMinutes,
          perfectRatioFormatted: formatTotalDuration(perfectRatioMinutes * 60 * 1000)
        };
      }
    } else {
      if (localMixOptions.totalSongs > available.totalSongs) {
        return {
          type: 'songs',
          requested: localMixOptions.totalSongs,
          available: available.totalSongs,
          availableFormatted: `${available.totalSongs} songs`,
          requestedFormatted: `${localMixOptions.totalSongs} songs`,
          ratioBreakdown: ratioBreakdown,
          perfectRatioLimit: ratioBreakdown?.perfectRatioLimit || available.totalSongs,
          perfectRatioFormatted: `${ratioBreakdown?.perfectRatioLimit || available.totalSongs} songs`
        };
      }
    }
    
    return null;
  };

  const exceedsLimit = getExceedsLimitWarning();
  const ratioBreakdown = getRatioBreakdownPoint();

  // Check if ratios will break down (only when user requests more than perfect ratio limit)
  const getRatioAccuracyWarning = () => {
    if (!ratioBreakdown || selectedPlaylists.length === 0) return null;
    
    const available = getTotalAvailableContent();
    const perfectRatioMinutes = Math.round(ratioBreakdown.perfectRatioLimit * 3.5);
    
    // Only show if user is requesting more than the perfect ratio limit
    let showWarning = false;
    if (localMixOptions.useTimeLimit) {
      showWarning = localMixOptions.targetDuration > perfectRatioMinutes;
    } else {
      showWarning = localMixOptions.totalSongs > ratioBreakdown.perfectRatioLimit;
    }
    
    // And only if perfect ratio limit is less than total available content
    if (showWarning && ratioBreakdown.perfectRatioLimit < available.totalSongs) {
      return {
        limitingPlaylist: ratioBreakdown.limitingPlaylist,
        perfectRatioLimit: ratioBreakdown.perfectRatioLimit,
        perfectRatioFormatted: localMixOptions.useTimeLimit 
          ? formatTotalDuration(perfectRatioMinutes * 60 * 1000)
          : `${ratioBreakdown.perfectRatioLimit} songs`,
        totalAvailable: available.totalSongs,
        totalAvailableFormatted: localMixOptions.useTimeLimit
          ? (available.totalDurationMinutes !== null ? formatTotalDuration(available.totalDurationMinutes * 60 * 1000) : 'calculating...')
          : `${available.totalSongs} songs`
      };
    }
    
    return null;
  };

  const ratioAccuracyWarning = getRatioAccuracyWarning();

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
                <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Duration: {(localMixOptions.targetDuration / 60).toFixed(1)} hours
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>1h</span>
                  <input
                    type="range"
                    min="60"
                    max="1200"
                    step="30"
                    value={localMixOptions.targetDuration}
                    onChange={(e) => setLocalMixOptions({...localMixOptions, targetDuration: parseInt(e.target.value)})}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>20h</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Custom:</span>
                  <input
                    type="number"
                    min="30"
                    max="2400"
                    step="30"
                    value={Math.round(localMixOptions.targetDuration)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 60;
                      setLocalMixOptions({...localMixOptions, targetDuration: Math.max(30, Math.min(2400, value))});
                    }}
                    style={{ 
                      width: '80px', 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: 'var(--hunter-green)',
                      border: '1px solid var(--fern-green)',
                      borderRadius: '4px',
                      color: 'var(--mindaro)'
                    }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>min</span>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  Perfect for parties, workouts, or long events
                </div>
              </>
            ) : (
              <>
                <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Songs: {localMixOptions.totalSongs} tracks
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>10</span>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={localMixOptions.totalSongs}
                    onChange={(e) => setLocalMixOptions({...localMixOptions, totalSongs: parseInt(e.target.value)})}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>200</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Custom:</span>
                  <input
                    type="number"
                    min="5"
                    max="1000"
                    step="5"
                    value={localMixOptions.totalSongs}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 10;
                      setLocalMixOptions({...localMixOptions, totalSongs: Math.max(5, Math.min(1000, value))});
                    }}
                    style={{ 
                      width: '80px', 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: 'var(--hunter-green)',
                      border: '1px solid var(--fern-green)',
                      borderRadius: '4px',
                      color: 'var(--mindaro)'
                    }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>songs</span>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  Choose exact number of songs for your playlist
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Limit Exceeded Warning */}
      {exceedsLimit && (
        <div style={{ 
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(255, 165, 0, 0.15)',
          border: '2px solid #FFA500',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#FFA500' }}>
                Exceeding Available Content
              </h4>
              <p style={{ margin: '0 0 12px 0', lineHeight: '1.4' }}>
                You've requested <strong>{exceedsLimit.requestedFormatted}</strong> but your playlists only contain <strong>{exceedsLimit.availableFormatted}</strong> total.
              </p>
              <div style={{ 
                fontSize: '13px', 
                opacity: '0.9',
                padding: '8px 12px',
                background: 'rgba(255, 165, 0, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 165, 0, 0.3)',
                marginBottom: '8px'
              }}>
                <strong>📋 What will happen:</strong> The app will create a playlist with all available content ({exceedsLimit.availableFormatted}).
              </div>
              {exceedsLimit.ratioBreakdown && exceedsLimit.perfectRatioLimit < exceedsLimit.available && (
                <div style={{ 
                  fontSize: '12px', 
                  opacity: '0.85',
                  padding: '8px 12px',
                  background: 'rgba(255, 165, 0, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 165, 0, 0.2)'
                }}>
                  <strong>⚖️ Ratio accuracy:</strong> Your configured ratios will be maintained perfectly for the first <strong>{exceedsLimit.perfectRatioFormatted}</strong>. After that, <strong>{exceedsLimit.ratioBreakdown.limitingPlaylist}</strong> will run out first, and the remaining content will come from other playlists.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Independent Ratio Accuracy Warning */}
      {ratioAccuracyWarning && !exceedsLimit && (
        <div style={{ 
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(54, 162, 235, 0.15)',
          border: '2px solid #36A2EB',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚖️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#36A2EB' }}>
                Ratio Accuracy Notice
              </h4>
              <p style={{ margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Your configured ratios will be maintained perfectly for the first <strong>{ratioAccuracyWarning.perfectRatioFormatted}</strong>.
              </p>
              <div style={{ 
                fontSize: '13px', 
                opacity: '0.9',
                padding: '8px 12px',
                background: 'rgba(54, 162, 235, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(54, 162, 235, 0.3)'
              }}>
                <strong>📋 After that:</strong> <strong>{ratioAccuracyWarning.limitingPlaylist}</strong> will run out first, and the remaining content ({ratioAccuracyWarning.totalAvailableFormatted} total available) will come from other playlists with adjusted ratios.
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: localMixOptions.popularityStrategy === 'mixed' ? 'not-allowed' : 'pointer', 
          marginTop: '12px',
          opacity: localMixOptions.popularityStrategy === 'mixed' ? 0.5 : 1
        }}>
          <input
            type="checkbox"
            checked={localMixOptions.popularityStrategy === 'mixed' ? true : localMixOptions.recencyBoost}
            disabled={localMixOptions.popularityStrategy === 'mixed'}
            onChange={(e) => setLocalMixOptions({...localMixOptions, recencyBoost: e.target.checked})}
          />
          Boost recent tracks (newer songs get popularity bonus)
        </label>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: localMixOptions.popularityStrategy === 'mixed' ? 'not-allowed' : 'pointer', 
          marginTop: '8px',
          opacity: localMixOptions.popularityStrategy === 'mixed' ? 0.5 : 1
        }}>
          <input
            type="checkbox"
            checked={localMixOptions.popularityStrategy === 'mixed' ? true : localMixOptions.shuffleWithinGroups}
            disabled={localMixOptions.popularityStrategy === 'mixed'}
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
        <h3>👀 DEMO Preview Your Mix</h3>
        <p style={{ marginBottom: '16px', fontSize: '14px', opacity: '0.8' }}>
          See how your playlist will look before creating it
        </p>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          cursor: 'pointer', 
          marginBottom: '12px',
          fontSize: '14px'
        }}>
          <input
            type="checkbox"
            checked={localMixOptions.fullSamplePreview || false}
            onChange={(e) => setLocalMixOptions({...localMixOptions, fullSamplePreview: e.target.checked})}
          />
          Generate full sample playlist (uses your actual settings instead of limited preview)
        </label>
        
        <button 
          className="btn" 
          onClick={generatePreview}
          disabled={previewLoading || selectedPlaylists.length < 2}
          style={{ marginRight: '12px' }}
        >
          {previewLoading ? 
            (localMixOptions.fullSamplePreview ? 'Generating Full Sample...' : 'Generating DEMO Preview...') : 
            (localMixOptions.fullSamplePreview ? '🎵 Generate Full Sample' : '🔍 Generate DEMO Preview')
          }
        </button>
      </div>

      {preview && (
        <div style={{ marginBottom: '20px' }}>
          {/* Important Notice - Moved Higher */}
          <div style={{ 
            fontSize: '13px', 
            opacity: '0.9',
            textAlign: 'center',
            marginBottom: '16px',
            padding: '12px',
            background: localMixOptions.fullSamplePreview ? 'rgba(29, 185, 84, 0.15)' : 'rgba(144, 169, 85, 0.15)',
            borderRadius: '8px',
            border: localMixOptions.fullSamplePreview ? '1px solid #1DB954' : '1px solid var(--moss-green)'
          }}>
            {localMixOptions.fullSamplePreview ? (
              <><strong>🎵 FULL SAMPLE:</strong> This is your complete playlist using your actual settings ({localMixOptions.useTimeLimit ? `${(localMixOptions.targetDuration / 60).toFixed(1)} hours` : `${localMixOptions.totalSongs} songs`}).</>
            ) : (
              <><strong>📋 DEMO PREVIEW:</strong> This shows a sample of your mix. Your full playlist will have {localMixOptions.useTimeLimit ? `${(localMixOptions.targetDuration / 60).toFixed(1)} hours` : `${localMixOptions.totalSongs} songs`} of music with the same ratios and strategy.</>
            )}
          </div>

          {/* Stats Summary */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid var(--fern-green)'
          }}>
            <h4 style={{ margin: '0 0 12px 0' }}>📊 DEMO Preview Stats</h4>
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

          {/* Popularity Quadrants Analysis */}
          {localMixOptions.popularityStrategy !== 'mixed' && (
            <div style={{ 
              background: 'var(--hunter-green)', 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid var(--fern-green)',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 12px 0' }}>🎯 Popularity Distribution</h4>
              {(() => {
                // Calculate popularity quadrants
                const tracksWithPopularity = preview.tracks.filter(track => track.popularity !== undefined);
                if (tracksWithPopularity.length === 0) {
                  return <div style={{ fontSize: '14px', opacity: '0.7' }}>No popularity data available for analysis</div>;
                }

                // Sort tracks by popularity to create relative quadrants (matches mixing algorithm)
                const sortedByPopularity = [...tracksWithPopularity].sort((a, b) => b.popularity - a.popularity);
                const quarterSize = Math.floor(sortedByPopularity.length / 4);
                
                const topHits = sortedByPopularity.slice(0, quarterSize);
                const popular = sortedByPopularity.slice(quarterSize, quarterSize * 2);
                const moderate = sortedByPopularity.slice(quarterSize * 2, quarterSize * 3);
                const deepCuts = sortedByPopularity.slice(quarterSize * 3);
                
                // Get popularity ranges for each quadrant
                const getRange = (tracks) => {
                  if (tracks.length === 0) return 'N/A';
                  const min = Math.min(...tracks.map(t => t.popularity));
                  const max = Math.max(...tracks.map(t => t.popularity));
                  return min === max ? `${min}` : `${min}-${max}`;
                };

                const quadrants = {
                  [`🔥 Top Hits (${getRange(topHits)})`]: topHits.length,
                  [`⭐ Popular (${getRange(popular)})`]: popular.length,
                  [`📻 Moderate (${getRange(moderate)})`]: moderate.length,
                  [`💎 Deep Cuts (${getRange(deepCuts)})`]: deepCuts.length
                };

                const totalWithData = tracksWithPopularity.length;
                
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    {Object.entries(quadrants).map(([label, count]) => {
                      const percentage = totalWithData > 0 ? Math.round((count / totalWithData) * 100) : 0;
                      const color = label.includes('Top Hits') ? '#FF5722' :
                                   label.includes('Popular') ? '#FF8F00' :
                                   label.includes('Moderate') ? '#00BCD4' : '#E91E63';
                      
                      return (
                        <div key={label} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '12px',
                          borderRadius: '6px',
                          border: `2px solid ${color}`,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: color }}>
                            {count}
                          </div>
                          <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '4px' }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '2px' }}>
                            {percentage}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '12px', textAlign: 'center' }}>
                Strategy: <strong>{localMixOptions.popularityStrategy}</strong>
                {(() => {
                  const tracksWithPopularity = preview.tracks.filter(track => track.popularity !== undefined);
                  return tracksWithPopularity.length < preview.tracks.length && 
                    ` • ${preview.tracks.length - tracksWithPopularity.length} songs without popularity data`;
                })()}
              </div>
            </div>
          )}

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
            
            {(() => {
              // Calculate relative popularity quadrants for track labeling
              const tracksWithPop = preview.tracks.filter(t => t.popularity !== undefined);
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
              
              return preview.tracks.map((track, index) => {
                const sourcePlaylist = selectedPlaylists.find(p => p.id === track.sourcePlaylist);
                const quadrant = getTrackQuadrant(track);
                
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
                  </div>
                  <div style={{ fontSize: '11px', opacity: '0.6' }}>
                    {formatDuration(track.duration_ms || 0)}
                  </div>
                </div>
                );
              });
            })()}
          </div>
          
          {!localMixOptions.fullSamplePreview && (
            <div style={{ 
              fontSize: '11px', 
              opacity: '0.7',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              This is just a preview. Your full playlist will have {localMixOptions.useTimeLimit ? `${localMixOptions.targetDuration} minutes` : `${localMixOptions.totalSongs} songs`} of music.
            </div>
          )}
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