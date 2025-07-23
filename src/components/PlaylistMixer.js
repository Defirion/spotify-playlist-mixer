import React, { useState } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { mixPlaylists } from '../utils/playlistMixer';
import DraggableTrackList from './DraggableTrackList';

const PlaylistMixer = ({ accessToken, selectedPlaylists, ratioConfig, mixOptions, onMixedPlaylist, onError }) => {
  const [loading, setLoading] = useState(false);
  const [localMixOptions, setLocalMixOptions] = useState({
    ...mixOptions,
    useAllSongs: mixOptions.useAllSongs !== undefined ? mixOptions.useAllSongs : true
  });
  
  // Debug logging to see what options are being used
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Local mix options in PlaylistMixer:', localMixOptions);
  }
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [customTrackOrder, setCustomTrackOrder] = useState(null);

  // Sync localMixOptions with mixOptions when it changes (from presets)
  React.useEffect(() => {
    setLocalMixOptions(prev => ({
      ...mixOptions,
      // Ensure useAllSongs is properly set if not defined
      useAllSongs: mixOptions.useAllSongs !== undefined ? mixOptions.useAllSongs : prev.useAllSongs
    }));
    // Clear preview when settings change so user knows to regenerate
    setPreview(null);
    setCustomTrackOrder(null);
  }, [mixOptions]);

  // Clear preview when ratioConfig changes
  React.useEffect(() => {
    setPreview(null);
    setCustomTrackOrder(null);
  }, [ratioConfig]);

  const handlePreviewOrderChange = (reorderedTracks) => {
    setCustomTrackOrder(reorderedTracks);
    
    // Recalculate stats for the updated track list
    if (preview && reorderedTracks) {
      const updatedStats = {};
      selectedPlaylists.forEach(playlist => {
        updatedStats[playlist.id] = {
          name: playlist.name,
          count: reorderedTracks.filter(track => track.sourcePlaylist === playlist.id).length,
          totalDuration: reorderedTracks
            .filter(track => track.sourcePlaylist === playlist.id)
            .reduce((sum, track) => sum + (track.duration_ms || 0), 0)
        };
      });

      // Add Spotify Search stats if there are any search tracks
      const searchTracks = reorderedTracks.filter(track => track.sourcePlaylist === 'search');
      if (searchTracks.length > 0) {
        updatedStats['search'] = {
          name: '🔍 Spotify Search',
          count: searchTracks.length,
          totalDuration: searchTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
        };
      }
      
      const updatedPreview = {
        ...preview,
        tracks: reorderedTracks,
        stats: updatedStats,
        totalDuration: reorderedTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0)
      };
      
      setPreview(updatedPreview);
    }
  };

  const handleMix = async () => {
    try {
      setLoading(true);
      const api = getSpotifyApi(accessToken);
      
      // Validate inputs
      if (!selectedPlaylists || selectedPlaylists.length < 2) {
        throw new Error('Please select at least 2 playlists');
      }
      
      if (!localMixOptions.playlistName.trim()) {
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
      
      // Use custom track order if available, otherwise mix the playlists according to ratios
      let mixedTracks;
      if (customTrackOrder && customTrackOrder.length > 0) {
        // Use the custom reordered tracks from preview
        mixedTracks = customTrackOrder;
      } else {
        // Generate new mix using the standard algorithm
        mixedTracks = mixPlaylists(playlistTracks, ratioConfig, localMixOptions);
        
        // Show warning if playlists were exhausted and mixing stopped early
        if (mixedTracks.stoppedEarly && mixedTracks.exhaustedPlaylists && mixedTracks.exhaustedPlaylists.length > 0) {
          const exhaustedNames = mixedTracks.exhaustedPlaylists.map(id => selectedPlaylists.find(p => p.id === id)?.name || id).join(', ');
          console.warn(`⚠️ Mixing stopped early because these playlists ran out of songs: ${exhaustedNames}`);
        }
      }
      
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
      
      // Generate full sample using actual settings
      const previewTracks = mixPlaylists(playlistTracks, ratioConfig, localMixOptions);
      
      // Debug logging for useAllSongs
      if (localMixOptions.useAllSongs && process.env.NODE_ENV === 'development') {
        console.log(`🎵 Preview generated: ${previewTracks.length} tracks for useAllSongs mode`);
        console.log('Local mix options:', localMixOptions);
      }
      
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
        totalDuration: previewTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0),
        usedStrategy: localMixOptions.popularityStrategy,
        exhaustedPlaylists: previewTracks.exhaustedPlaylists || [],
        stoppedEarly: previewTracks.stoppedEarly || false
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
    
    for (const playlist of selectedPlaylists) {
      if (playlist.realAverageDurationSeconds) {
        const playlistDurationMinutes = (playlist.tracks.total * playlist.realAverageDurationSeconds) / 60;
        totalDurationMinutes += playlistDurationMinutes;
      } else {
        // Fallback to estimate if no real data available
        totalDurationMinutes += playlist.tracks.total * 3.5;
      }
    }
    
    return {
      totalSongs,
      totalDurationMinutes: Math.round(totalDurationMinutes)
    };
  };

  // Check if current settings exceed available content
  const getExceedsLimitWarning = () => {
    if (selectedPlaylists.length === 0) return null;
    
    const available = getTotalAvailableContent();
    
    if (localMixOptions.useTimeLimit) {
      if (available.totalDurationMinutes !== null && localMixOptions.targetDuration > available.totalDurationMinutes) {
        return {
          type: 'time',
          requested: localMixOptions.targetDuration,
          available: available.totalDurationMinutes,
          availableFormatted: formatTotalDuration(available.totalDurationMinutes * 60 * 1000),
          requestedFormatted: `${(localMixOptions.targetDuration / 60).toFixed(1)}h`
        };
      }
    } else {
      if (localMixOptions.totalSongs > available.totalSongs) {
        return {
          type: 'songs',
          requested: localMixOptions.totalSongs,
          available: available.totalSongs,
          availableFormatted: `${available.totalSongs} songs`,
          requestedFormatted: `${localMixOptions.totalSongs} songs`
        };
      }
    }
    
    return null;
  };

  const exceedsLimit = getExceedsLimitWarning();

  const getRatioImbalanceWarning = () => {
    if (selectedPlaylists.length < 2 || !ratioConfig) {
      return null;
    }

    const { totalSongs, useTimeLimit, targetDuration, continueWhenPlaylistEmpty, useAllSongs } = localMixOptions;
    const playlistIdsWithWeights = Object.keys(ratioConfig).filter(id => ratioConfig[id] && ratioConfig[id].weight > 0);

    if (playlistIdsWithWeights.length < 2) {
      return null;
    }

    const totalWeight = playlistIdsWithWeights.reduce((sum, id) => sum + ratioConfig[id].weight, 0);

    if (totalWeight === 0) {
      return null;
    }

    let minExhaustionPoint = Infinity;
    let limitingPlaylistName = '';

    for (const playlistId of playlistIdsWithWeights) {
      const playlist = selectedPlaylists.find(p => p.id === playlistId);
      if (!playlist) continue;

      const config = ratioConfig[playlistId];
      const weight = config.weight || 1;
      let exhaustionPoint = Infinity;

      const availableCount = playlist.tracks.total;
      const avgSongDurationSeconds = playlist.realAverageDurationSeconds || 210; // 3.5 min default
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Calculating exhaustion for ${playlist.name}:`);
        console.log(`  - Available tracks: ${availableCount}`);
        console.log(`  - Weight: ${weight}/${totalWeight}`);
        console.log(`  - Weight type: ${config.weightType}`);
        console.log(`  - Avg song duration: ${avgSongDurationSeconds}s`);
      }
      
      if (availableCount === 0) {
        exhaustionPoint = 0;
      } else {
        const targetRatio = weight / totalWeight;
        
        if (config.weightType === 'time') {
          // Weight represents time proportion
          // When this playlist is exhausted, total mix duration = available duration / target ratio
          const availableDurationSeconds = availableCount * avgSongDurationSeconds;
          const totalMixDurationWhenExhausted = availableDurationSeconds / targetRatio;
          
          if (useTimeLimit || useAllSongs) {
            // Return in milliseconds for time-based calculations
            exhaustionPoint = totalMixDurationWhenExhausted * 1000;
          } else {
            // Convert to song count for song-based calculations
            exhaustionPoint = Math.floor(totalMixDurationWhenExhausted / avgSongDurationSeconds);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`  - Available duration: ${Math.round(availableDurationSeconds/60)}m`);
            console.log(`  - Target ratio: ${Math.round(targetRatio * 100)}%`);
            console.log(`  - Total mix when exhausted: ${Math.round(totalMixDurationWhenExhausted/60)}m`);
            console.log(`  - Exhaustion point: ${useTimeLimit || useAllSongs ? Math.round(exhaustionPoint/60000) + 'm' : exhaustionPoint + ' songs'}`);
          }
        } else {
          // Weight represents frequency proportion
          // When this playlist is exhausted at N songs, total mix = N * (total_weight/weight) songs
          const totalSongsWhenExhausted = availableCount * (totalWeight / weight);
          
          if (useTimeLimit || useAllSongs) {
            // Convert to milliseconds for time-based calculations
            exhaustionPoint = totalSongsWhenExhausted * avgSongDurationSeconds * 1000;
          } else {
            // Keep as song count
            exhaustionPoint = Math.floor(totalSongsWhenExhausted);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`  - Total songs when exhausted: ${Math.round(totalSongsWhenExhausted)}`);
            console.log(`  - Exhaustion point: ${useTimeLimit || useAllSongs ? Math.round(exhaustionPoint/60000) + 'm' : exhaustionPoint + ' songs'}`);
          }
        }
      }

      // Sanity check to prevent ridiculous numbers
      if (exhaustionPoint > (useTimeLimit || useAllSongs ? 24 * 60 * 60 * 1000 : 10000)) {
        exhaustionPoint = useTimeLimit || useAllSongs ? availableCount * avgSongDurationSeconds * 1000 : availableCount;
      }
      
      if (exhaustionPoint < minExhaustionPoint) {
        minExhaustionPoint = exhaustionPoint;
        limitingPlaylistName = playlist.name;
      }
    }

    // Format the display value based on the mode
    let displayValue = minExhaustionPoint;
    let unit = '';
    
    if (useTimeLimit || useAllSongs) {
      // minExhaustionPoint is in milliseconds
      displayValue = formatTotalDuration(minExhaustionPoint);
      unit = ''; // Unit is already part of the formatted string
    } else {
      // minExhaustionPoint is in song count
      displayValue = Math.round(minExhaustionPoint);
      unit = 'songs';
    }

    // For "use all songs" mode, always show the warning since we'll hit imbalance
    if (useAllSongs) {
      return {
        limitingPlaylistName,
        mixWillBecomeImbalancedAt: minExhaustionPoint === Infinity ? 'never' : displayValue,
        unit: unit,
        willStopEarly: !continueWhenPlaylistEmpty,
        isUseAllSongs: true
      };
    }

    // Determine the target length (songs or duration) for comparison
    const targetLength = useTimeLimit ? targetDuration * 60 * 1000 : totalSongs;

    // Show warning if the exhaustion point is significantly less than the target length (< 90%)
    if (targetLength > minExhaustionPoint && minExhaustionPoint < targetLength * 0.9) {
      return {
        limitingPlaylistName,
        mixWillBecomeImbalancedAt: displayValue,
        unit: unit,
        willStopEarly: !continueWhenPlaylistEmpty
      };
    }

    return null;
  };

  const ratioImbalance = getRatioImbalanceWarning();

  return (
    <div className="card">
      <h2>🎵 Create Your Mix</h2>
      <p style={{ marginBottom: '24px', opacity: '0.8' }}>
        Blend your playlists into the perfect mix
      </p>
      
      {/* Playlist Basics */}
      <div style={{ 
        background: 'var(--hunter-green)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        border: '1px solid var(--fern-green)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📝 Playlist Details
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="input-group">
            <label style={{ fontWeight: '500' }}>What should we call your mix?</label>
            <input
              type="text"
              value={localMixOptions.playlistName}
              onChange={(e) => setLocalMixOptions({...localMixOptions, playlistName: e.target.value})}
              placeholder="My Awesome Mix"
              style={{ fontSize: '16px', padding: '12px' }}
            />
          </div>
          
          <div className="input-group">
            <label style={{ fontWeight: '500' }}>How long should your mix be?</label>
            <div className="toggle-group" style={{ marginBottom: '12px' }}>
              <button
                type="button"
                className={`toggle-option ${localMixOptions.useAllSongs ? 'active' : ''}`}
                onClick={() => setLocalMixOptions({...localMixOptions, useAllSongs: true, useTimeLimit: false})}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🎵 Mix as long as we have songs
              </button>
              <button
                type="button"
                className={`toggle-option ${!localMixOptions.useAllSongs ? 'active' : ''}`}
                onClick={() => setLocalMixOptions({...localMixOptions, useAllSongs: false})}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ⚙️ Advanced Options
              </button>
            </div>
          
            <div style={{ marginTop: '12px' }}>
              {localMixOptions.useAllSongs ? (
                <div style={{ 
                  padding: '16px', 
                  background: 'rgba(29, 185, 84, 0.1)', 
                  border: '1px solid rgba(29, 185, 84, 0.3)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>🎵</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#1db954' }}>
                    Mix as long as we have songs
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.8', lineHeight: '1.4' }}>
                    We'll use all available songs from your playlists according to your ratios. 
                    This will likely trigger the Ratio Imbalance Alert below.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="toggle-group" style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      className={`toggle-option ${!localMixOptions.useTimeLimit ? 'active' : ''}`}
                      onClick={() => setLocalMixOptions({...localMixOptions, useTimeLimit: false})}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      🔢 Number of Songs
                    </button>
                    <button
                      type="button"
                      className={`toggle-option ${localMixOptions.useTimeLimit ? 'active' : ''}`}
                      onClick={() => setLocalMixOptions({...localMixOptions, useTimeLimit: true})}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      ⏱️ Hours & Minutes
                    </button>
                  </div>
                  
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Tips */}
      {exceedsLimit && (
        <div style={{ 
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ffc107' }}>
                Heads up!
              </h4>
              <p style={{ margin: '0', lineHeight: '1.4', fontSize: '14px' }}>
                You want <strong>{exceedsLimit.requestedFormatted}</strong> but only have <strong>{exceedsLimit.availableFormatted}</strong> available. 
                We'll use everything you've got!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ratio Imbalance Warning */}
      {ratioImbalance && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(23, 162, 184, 0.1)',
          border: '1px solid rgba(23, 162, 184, 0.3)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>🤔</span>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#17a2b8' }}>
                Ratio Imbalance Alert
              </h4>
              <p style={{ margin: '0', lineHeight: '1.4', fontSize: '14px' }}>
                {ratioImbalance.isUseAllSongs ? (
                  <>
                    Since you're mixing as long as you have songs, <strong>{ratioImbalance.limitingPlaylistName}</strong> will run out first after about <strong>{ratioImbalance.mixWillBecomeImbalancedAt} {ratioImbalance.unit}</strong>.
                    {ratioImbalance.willStopEarly
                      ? " The mix will stop there to maintain balanced ratios."
                      : " The mix will continue using songs from the remaining playlists until all are exhausted."
                    }
                  </>
                ) : (
                  <>
                    With your current ratio settings, we'll run out of songs from <strong>{ratioImbalance.limitingPlaylistName}</strong> after about <strong>{ratioImbalance.mixWillBecomeImbalancedAt} {ratioImbalance.unit}</strong>.
                    {ratioImbalance.willStopEarly
                      ? " The mix will stop there, creating a shorter but balanced playlist."
                      : " The mix will continue using songs from the remaining playlists to reach your target length."
                    }
                  </>
                )}
              </p>
            </div>
          </div>
          
          {/* Mixing Behavior Control */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            padding: '12px', 
            borderRadius: '8px',
            marginTop: '12px'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localMixOptions.continueWhenPlaylistEmpty}
                onChange={(e) => setLocalMixOptions({...localMixOptions, continueWhenPlaylistEmpty: e.target.checked})}
                style={{ transform: 'scale(1.2)', marginTop: '2px' }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  Continue mixing when playlists run out
                </span>
                <span style={{ fontSize: '12px', opacity: '0.8', lineHeight: '1.3' }}>
                  {localMixOptions.continueWhenPlaylistEmpty 
                    ? "When a playlist runs out, we'll keep adding songs from other playlists until we reach your target. Your mix will be the full length but may have more songs from some playlists."
                    : "When any playlist runs out, we'll stop mixing right there. Your mix will be shorter but will maintain the ratios you set."
                  }
                </span>
              </div>
            </label>
          </div>
        </div>
      )}
      
      {/* Music Style */}
      <div style={{ 
        background: 'var(--hunter-green)', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        border: '1px solid var(--fern-green)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎨 Song Order Style
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: '0.8' }}>
          How should we arrange your songs?
        </p>
        
        <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`toggle-option ${localMixOptions.popularityStrategy === 'mixed' ? 'active' : ''}`}
            onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'mixed'})}
            style={{ padding: '12px 8px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎲</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Random Mix</div>
          </button>
          <button
            type="button"
            className={`toggle-option ${localMixOptions.popularityStrategy === 'front-loaded' ? 'active' : ''}`}
            onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'front-loaded'})}
            style={{ padding: '12px 8px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>🔥</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Hits First</div>
          </button>
          <button
            type="button"
            className={`toggle-option ${localMixOptions.popularityStrategy === 'mid-peak' ? 'active' : ''}`}
            onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'mid-peak'})}
            style={{ padding: '12px 8px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎉</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Party Mode</div>
          </button>
          <button
            type="button"
            className={`toggle-option ${localMixOptions.popularityStrategy === 'crescendo' ? 'active' : ''}`}
            onClick={() => setLocalMixOptions({...localMixOptions, popularityStrategy: 'crescendo'})}
            style={{ padding: '12px 8px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>📈</div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Build Up</div>
          </button>
        </div>
        
        <div style={{ 
          fontSize: '13px', 
          opacity: '0.7', 
          padding: '12px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {localMixOptions.popularityStrategy === 'mixed' && '🎲 Songs mixed randomly throughout'}
          {localMixOptions.popularityStrategy === 'front-loaded' && '🔥 Popular hits at the start, then deeper cuts'}
          {localMixOptions.popularityStrategy === 'mid-peak' && '🎉 Build to the biggest hits in the middle - perfect for parties!'}
          {localMixOptions.popularityStrategy === 'crescendo' && '📈 Start mellow, build to your biggest bangers at the end'}
        </div>
        
        {localMixOptions.popularityStrategy !== 'mixed' && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: 'pointer',
              padding: '8px 0'
            }}>
              <input
                type="checkbox"
                checked={localMixOptions.recencyBoost}
                onChange={(e) => setLocalMixOptions({...localMixOptions, recencyBoost: e.target.checked})}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontSize: '14px' }}>
                ✨ Favor newer songs (give recent tracks a boost)
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Action Buttons - Only show when no preview */}
      {!preview && (
        <div style={{ 
          background: 'var(--hunter-green)', 
          padding: '20px', 
          borderRadius: '12px', 
          marginBottom: '20px',
          border: '1px solid var(--fern-green)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            🚀 Ready to Create?
          </h3>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn" 
              onClick={generatePreview}
              disabled={previewLoading || selectedPlaylists.length < 2}
              style={{ 
                background: 'var(--moss-green)',
                border: '2px solid var(--mindaro)',
                padding: '12px 24px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {previewLoading ? (
                <>⏳ Generating Preview...</>
              ) : (
                <>👀 Preview First</>
              )}
            </button>
            
            <button
              className="btn"
              onClick={handleMix}
              disabled={loading || selectedPlaylists.length < 2 || !localMixOptions.playlistName.trim()}
              style={{ 
                background: 'var(--fern-green)',
                border: '2px solid var(--moss-green)',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>⏳ Creating Playlist...</>
              ) : (
                <>✨ Create My Mix</>
              )}
            </button>
          </div>
          
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', opacity: '0.7' }}>
            Preview lets you see and adjust your mix before creating the final playlist
          </p>
        </div>
      )}

      {preview && (
        <div style={{ marginBottom: '20px' }}>
          {/* Preview Header */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            padding: '20px', 
            borderRadius: '12px 12px 0 0', 
            border: '1px solid var(--fern-green)',
            borderBottom: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎵 Your Mix Preview
              </h3>
              <div style={{ fontSize: '14px', opacity: '0.8' }}>
                {localMixOptions.useTimeLimit ? `${formatTotalDuration(preview.totalDuration)}` : `${preview.tracks.length} songs`}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              {Object.entries(preview.stats).map(([playlistId, stats]) => (
                <div key={playlistId} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '8px 12px', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', opacity: '0.7', marginBottom: '2px' }}>
                    {stats.name.length > 20 ? stats.name.substring(0, 20) + '...' : stats.name}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {stats.count} songs
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.6' }}>
                    {formatTotalDuration(stats.totalDuration)}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              fontSize: '13px', 
              opacity: '0.8',
              textAlign: 'center',
              padding: '8px 12px',
              background: 'rgba(29, 185, 84, 0.2)',
              borderRadius: '6px'
            }}>
              ✨ Using <strong>{preview.usedStrategy === 'mixed' ? 'Random Mix' : 
                preview.usedStrategy === 'front-loaded' ? 'Hits First' :
                preview.usedStrategy === 'mid-peak' ? 'Party Mode' : 'Build Up'}</strong> style
            </div>

            {/* Exhausted Playlists Warning */}
            {preview.exhaustedPlaylists && preview.exhaustedPlaylists.length > 0 && (
              <div style={{ 
                marginTop: '12px',
                padding: '12px',
                background: preview.stoppedEarly ? 'rgba(255, 193, 7, 0.2)' : 'rgba(23, 162, 184, 0.2)',
                border: `1px solid ${preview.stoppedEarly ? 'rgba(255, 193, 7, 0.4)' : 'rgba(23, 162, 184, 0.4)'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>{preview.stoppedEarly ? '⚠️' : 'ℹ️'}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: preview.stoppedEarly ? '#ffc107' : '#17a2b8' }}>
                    {preview.stoppedEarly ? 'Mixing Stopped Early' : 'Some Playlists Exhausted'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.9', lineHeight: '1.3' }}>
                  {preview.stoppedEarly 
                    ? `Stopped mixing because ${preview.exhaustedPlaylists.map(id => selectedPlaylists.find(p => p.id === id)?.name || id).join(', ')} ran out of songs. Enable "Continue mixing" to use remaining playlists.`
                    : `Ran out of songs from: ${preview.exhaustedPlaylists.map(id => selectedPlaylists.find(p => p.id === id)?.name || id).join(', ')}. Continued with remaining playlists.`
                  }
                </div>
              </div>
            )}
          </div>
          
          {/* Track List Preview */}
          <DraggableTrackList
            tracks={preview.tracks}
            selectedPlaylists={selectedPlaylists}
            onTrackOrderChange={handlePreviewOrderChange}
            formatDuration={formatDuration}
            accessToken={accessToken}
            maxHeight="400px"
            showPlaylistSource={true}
          />
          
          {/* Preview Action Buttons */}
          <div style={{ 
            background: 'var(--hunter-green)', 
            padding: '20px', 
            borderRadius: '0 0 12px 12px', 
            border: '1px solid var(--fern-green)',
            borderTop: 'none',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn" 
                onClick={generatePreview}
                disabled={previewLoading || selectedPlaylists.length < 2}
                style={{ 
                  background: 'var(--moss-green)',
                  border: '2px solid var(--mindaro)',
                  padding: '8px 16px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {previewLoading ? (
                  <>⏳ Regenerating...</>
                ) : (
                  <>🔄 Regenerate</>
                )}
              </button>
              
              <button
                className="btn"
                onClick={handleMix}
                disabled={loading || selectedPlaylists.length < 2 || !localMixOptions.playlistName.trim()}
                style={{ 
                  background: 'var(--fern-green)',
                  border: '2px solid var(--moss-green)',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>⏳ Creating Playlist...</>
                ) : (
                  <>✨ Create This Playlist</>
                )}
              </button>
            </div>
            
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', opacity: '0.7' }}>
              Happy with your mix? Create the playlist or regenerate with your current settings
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistMixer;