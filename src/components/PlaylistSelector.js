import React, { useState } from 'react';
import { getSpotifyApi } from '../utils/spotify';

const PlaylistSelector = ({ accessToken, selectedPlaylists, onPlaylistSelect, onError }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const extractPlaylistId = (url) => {
    // Handle different Spotify URL formats
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /^([a-zA-Z0-9]+)$/ // Just the ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddPlaylist = async () => {
    if (!playlistUrl.trim()) {
      onError('Please enter a playlist URL');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl.trim());
    if (!playlistId) {
      onError('Invalid Spotify playlist URL. Please use a valid Spotify playlist link.');
      return;
    }

    // Check if already added
    if (selectedPlaylists.find(p => p.id === playlistId)) {
      onError('This playlist is already added');
      return;
    }

    try {
      setLoading(true);
      const api = getSpotifyApi(accessToken);
      const response = await api.get(`/playlists/${playlistId}`);
      const playlist = response.data;
      
      // Add cover image URL if available
      const playlistWithImage = {
        ...playlist,
        coverImage: playlist.images?.[0]?.url || null
      };
      
      onPlaylistSelect(playlistWithImage);
      setPlaylistUrl('');
      
    } catch (err) {
      if (err.response?.status === 404) {
        onError('Playlist not found. Make sure the playlist is public or you have access to it.');
      } else if (err.response?.status === 403) {
        onError('Access denied. The playlist might be private.');
      } else {
        onError('Failed to load playlist. Please check the URL and try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlaylist = (playlistId) => {
    const playlist = selectedPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      onPlaylistSelect(playlist); // This will remove it due to toggle logic
    }
  };

  return (
    <div className="card">
      <h2>Add Playlists to Mix</h2>
      <p>Add 2-10 Spotify playlists using their URLs</p>
      
      <div style={{ marginBottom: '20px' }}>
        <div className="input-group">
          <label>Spotify Playlist URL:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/... or spotify:playlist:..."
              style={{ flex: 1 }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlaylist()}
            />
            <button 
              className="btn" 
              onClick={handleAddPlaylist}
              disabled={loading || !playlistUrl.trim()}
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
        
        <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
          You can paste: Full URL, share link, or just the playlist ID
        </div>
      </div>
      
      {selectedPlaylists.length > 0 && (
        <div>
          <h3>Selected Playlists ({selectedPlaylists.length})</h3>
          {selectedPlaylists.map(playlist => (
            <div key={playlist.id} className="playlist-item">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {playlist.coverImage && (
                  <img 
                    src={playlist.coverImage} 
                    alt={playlist.name} 
                    className="playlist-cover" 
                  />
                )}
                <div className="playlist-info">
                  <strong>{playlist.name}</strong>
                  <div style={{ fontSize: '14px', opacity: '0.8' }}>
                    {playlist.tracks.total} tracks • by {playlist.owner.display_name}
                  </div>
                </div>
              </div>
              <button
                className="btn"
                onClick={() => handleRemovePlaylist(playlist.id)}
                style={{
                  background: '#ff4444',
                  padding: '8px 16px',
                  fontSize: '14px'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      
      {selectedPlaylists.length >= 10 && (
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '4px', fontSize: '14px' }}>
          Maximum of 10 playlists reached
        </div>
      )}
    </div>
  );
};

export default PlaylistSelector;