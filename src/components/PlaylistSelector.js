import React, { useState } from 'react';
import { getSpotifyApi } from '../utils/spotify';

const PlaylistSelector = ({ accessToken, selectedPlaylists, onPlaylistSelect, onError }) => {
  const [playlistInput, setPlaylistInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [inputType, setInputType] = useState('search'); // 'search' or 'url'

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

  const isValidPlaylistUrl = (input) => {
    const trimmedInput = input.trim();
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /^[a-zA-Z0-9]{22}$/ // Spotify playlist IDs are exactly 22 characters
    ];
    return patterns.some(pattern => pattern.test(trimmedInput));
  };

  const searchPlaylists = async (query) => {
    try {
      setLoading(true);
      const api = getSpotifyApi(accessToken);
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=10`);
      setSearchResults(response.data.playlists.items || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Failed to search playlists:', err);
      onError('Failed to search playlists. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setPlaylistInput(value);
    
    // Detect input type for dynamic UI
    if (isValidPlaylistUrl(value.trim())) {
      setInputType('url');
    } else {
      setInputType('search');
    }
  };

  const handleInputSubmit = async () => {
    if (!playlistInput.trim()) {
      onError('Please enter a playlist URL or search term');
      return;
    }

    const input = playlistInput.trim();
    
    // Check if it's a valid playlist URL/ID
    if (isValidPlaylistUrl(input)) {
      await handleAddPlaylistByUrl(input);
    } else {
      // It's a search term, search for playlists
      await searchPlaylists(input);
    }
  };

  const handleAddPlaylistByUrl = async (input) => {
    const playlistId = extractPlaylistId(input);
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
      
      // Fetch all tracks to calculate real average duration
      let allTracks = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const tracksResponse = await api.get(`/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`);
        const tracks = tracksResponse.data.items
          .filter(item => item.track && item.track.id && item.track.duration_ms) // Filter out null tracks and those without duration
          .map(item => item.track);
        
        allTracks = [...allTracks, ...tracks];
        
        if (tracks.length < limit) break;
        offset += limit;
      }
      
      // Calculate real average duration
      let realAverageDuration = null;
      if (allTracks.length > 0) {
        const totalDurationMs = allTracks.reduce((sum, track) => sum + track.duration_ms, 0);
        realAverageDuration = Math.round(totalDurationMs / allTracks.length / 1000); // Convert to seconds
      }
      
      // Add cover image URL and real duration data
      const playlistWithRealData = {
        ...playlist,
        coverImage: playlist.images?.[0]?.url || null,
        realAverageDurationSeconds: realAverageDuration,
        tracksWithDuration: allTracks.length // Tracks that have duration data
      };
      
      onPlaylistSelect(playlistWithRealData);
      setPlaylistInput('');
      setShowSearchResults(false);
      
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



  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{ margin: 0 }}>Add Playlists to Mix</h2>
        <div style={{ 
          fontSize: '14px', 
          opacity: '0.8',
          background: 'rgba(79, 119, 45, 0.2)',
          padding: '4px 12px',
          borderRadius: '12px',
          border: '1px solid var(--fern-green)'
        }}>
          {selectedPlaylists.length}/10 playlists
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div className="input-group">
          <label>Search playlists or paste URL:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={playlistInput}
              onChange={handleInputChange}
              placeholder="Try: 'salsa romantica', 'bachata sensual' or paste Spotify URL..."
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
            />
            <button 
              className="btn" 
              onClick={handleInputSubmit}
              disabled={loading || !playlistInput.trim()}
            >
              {loading ? 'Searching...' : inputType === 'url' ? 'Add' : 'Search'}
            </button>
          </div>
        </div>
        

      </div>

      {/* Search Results */}
      {showSearchResults && (
        <div style={{ 
          marginBottom: '20px',
          background: 'var(--hunter-green)',
          border: '1px solid var(--fern-green)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              🔍 Found {searchResults.length} playlists
            </h3>
            <button
              onClick={() => {
                setShowSearchResults(false);
                setSearchResults([]);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--mindaro)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              ×
            </button>
          </div>
          
          {searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: '0.7', padding: '20px' }}>
              No playlists found. Try a different search term.
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults
                .filter(playlist => playlist && playlist.id) // Filter out null playlists
                .map((playlist, index) => (
                <div
                  key={playlist.id}
                  onClick={() => handleAddPlaylistByUrl(playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    border: selectedPlaylists.find(p => p.id === playlist.id) 
                      ? '2px solid var(--moss-green)' 
                      : '1px solid transparent',
                    opacity: selectedPlaylists.find(p => p.id === playlist.id) ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedPlaylists.find(p => p.id === playlist.id)) {
                      e.target.style.backgroundColor = 'rgba(79, 119, 45, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  {playlist?.images?.[0]?.url && (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name || 'Playlist'}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        marginRight: '12px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                      {playlist?.name || 'Untitled Playlist'}
                    </div>
                    <div style={{ fontSize: '12px', opacity: '0.7' }}>
                      by {playlist?.owner?.display_name || 'Unknown'} • {playlist?.tracks?.total || 0} tracks
                    </div>
                  </div>
                  {selectedPlaylists.find(p => p.id === playlist.id) && (
                    <div style={{ 
                      color: 'var(--moss-green)', 
                      fontSize: '16px',
                      marginLeft: '8px'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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