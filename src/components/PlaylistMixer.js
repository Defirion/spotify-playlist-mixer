import React, { useState } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { mixPlaylists } from '../utils/playlistMixer';

const PlaylistMixer = ({ accessToken, selectedPlaylists, ratioConfig, onMixedPlaylist, onError }) => {
  const [loading, setLoading] = useState(false);
  const [mixOptions, setMixOptions] = useState({
    totalSongs: 100,
    targetDuration: 240, // minutes
    useTimeLimit: false,
    playlistName: 'My Mixed Playlist',
    shuffleWithinGroups: true
  });

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
      const mixedTracks = mixPlaylists(playlistTracks, ratioConfig, mixOptions);
      
      if (mixedTracks.length === 0) {
        throw new Error('Failed to mix playlists - no tracks generated');
      }
      
      // Create new playlist
      const userResponse = await api.get('/me');
      const userId = userResponse.data.id;
      
      const playlistResponse = await api.post(`/users/${userId}/playlists`, {
        name: mixOptions.playlistName.trim(),
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

  return (
    <div className="card">
      <h2>Mix Your Playlists</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="input-group">
          <label>Playlist Name:</label>
          <input
            type="text"
            value={mixOptions.playlistName}
            onChange={(e) => setMixOptions({...mixOptions, playlistName: e.target.value})}
          />
        </div>
        
        <div className="input-group">
          <label>Playlist Size:</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-option ${!mixOptions.useTimeLimit ? 'active' : ''}`}
              onClick={() => setMixOptions({...mixOptions, useTimeLimit: false})}
            >
              Song Count
            </button>
            <button
              type="button"
              className={`toggle-option ${mixOptions.useTimeLimit ? 'active' : ''}`}
              onClick={() => setMixOptions({...mixOptions, useTimeLimit: true})}
            >
              Time Duration
            </button>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            {mixOptions.useTimeLimit ? (
              <>
                <input
                  type="number"
                  min="30"
                  max="600"
                  value={mixOptions.targetDuration}
                  onChange={(e) => setMixOptions({...mixOptions, targetDuration: parseInt(e.target.value)})}
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
                  value={mixOptions.totalSongs}
                  onChange={(e) => setMixOptions({...mixOptions, totalSongs: parseInt(e.target.value)})}
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={mixOptions.shuffleWithinGroups}
            onChange={(e) => setMixOptions({...mixOptions, shuffleWithinGroups: e.target.checked})}
          />
          Shuffle songs within each playlist
        </label>
        <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
          Randomizes the order of songs within each playlist before mixing
        </div>
      </div>
      
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