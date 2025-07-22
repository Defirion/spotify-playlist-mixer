import React, { useState, useEffect, useCallback } from 'react';
import LoadingOverlay from './LoadingOverlay';
import { getSpotifyApi } from '../utils/spotify';

const PlaylistSelector = ({ accessToken, selectedPlaylists, onPlaylistSelect, onError }) => {
  const [highlightedIndex, setHighlightedIndex] = useState(0); // Start with first item highlighted
  const [playlistInput, setPlaylistInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [inputType, setInputType] = useState('search'); // 'search' or 'url'
  
  // Ref for the input to manage focus
  const inputRef = React.useRef(null);

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

  const isValidSpotifyLink = (input) => {
    const spotifyUrlRegex = /^(https?:\/\/(open\.)?spotify\.com\/(playlist|track|album)\/[a-zA-Z0-9]+(\?.*)?)$/;
    const spotifyUriRegex = /^spotify:(playlist|track|album):[a-zA-Z0-9]+$/;
    return spotifyUrlRegex.test(input) || spotifyUriRegex.test(input);
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

  const searchPlaylists = useCallback(async (query) => {
    if (!query.trim() || isValidSpotifyLink(query)) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    try {
      setSearching(true);
      const api = getSpotifyApi(accessToken);
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&type=playlist&limit=10`);
      setSearchResults(response.data.playlists.items || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Failed to search playlists:', err);
      onError('Failed to search playlists. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [accessToken, onError]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      searchPlaylists(playlistInput);
    }, 150); // 150ms debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [playlistInput, accessToken, searchPlaylists]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setPlaylistInput(value);
    
    if (isValidSpotifyLink(value.trim())) {
      setInputType('url');
      setShowSearchResults(false); // Hide search results if it's a URL
    } else {
      setInputType('search');
      // Search will be triggered by the useEffect debounce
    }
  };

  const handleInputSubmit = async () => {
    if (!playlistInput.trim()) {
      onError('Please enter a playlist URL or search term');
      return;
    }

    const input = playlistInput.trim();
    
    // If it's a valid Spotify URL/ID, add it directly
    if (isValidPlaylistUrl(input)) {
      await handleAddPlaylistByUrl(input);
    } else {
      // If it's not a URL, and not handled by continuous search, initiate a search
      // This case might be less frequent with continuous search, but good as a fallback
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
      setLoading(true); // Set loading true when starting to add a playlist
      setShowSearchResults(false); // Hide search results immediately when loading starts
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
      setSearchResults([]); // Clear search results after adding
      setShowSearchResults(false);
      
      // Auto-focus input for immediate next search
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      
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
      setLoading(false); // Set loading false after playlist addition is complete or fails
    }
  };



  const handleKeyDown = (e) => {
    if (searchResults.length > 0 && showSearchResults) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex === -1 ? 0 : Math.min(prevIndex + 1, searchResults.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prevIndex) => 
          prevIndex <= 0 ? 0 : prevIndex - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex !== -1 && searchResults[highlightedIndex]) {
          handleAddPlaylistByUrl(searchResults[highlightedIndex].id);
        } else {
          handleInputSubmit();
        }
      }
    }
  };

  // Auto-focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Reset highlighted index when search results change and always highlight first result
  useEffect(() => {
    setHighlightedIndex(searchResults.length > 0 ? 0 : -1);
  }, [searchResults, showSearchResults]);

  return (
    <div className="card" style={{ position: 'relative', zIndex: showSearchResults ? 9999 : 'auto' }}>
      {loading && <LoadingOverlay />}
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
      
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <div className="input-group">
          <label>Search playlists or paste URL:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={playlistInput}
              onChange={handleInputChange}
              placeholder="Try: 'salsa romantica', 'bachata sensual' or paste Spotify URL..."
              style={{ flex: 1 }}
              onKeyDown={handleKeyDown}
              onFocus={() => playlistInput.trim() && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 100)} // Delay to allow click on results
            />
            <button 
              className="btn" 
              onClick={handleInputSubmit}
              disabled={searching || !playlistInput.trim() || (inputType === 'url' && !isValidPlaylistUrl(playlistInput))}
            >
              {searching ? 'Searching...' : (inputType === 'url' ? 'Add' : 'Search')}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <div style={{ 
            position: 'absolute',
            top: '100%', // Position below the input
            left: 0,
            right: 0,
            zIndex: 9999, // Ensure it's above other content
            background: 'var(--hunter-green)',
            border: '1px solid var(--fern-green)',
            borderRadius: '0 0 8px 8px',
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
            padding: '8px 0'
          }}>
            {searchResults
              .filter(playlist => playlist && playlist.id) // Filter out null playlists
              .map((playlist, index) => (
              <div
                key={playlist.id}
                onClick={() => handleAddPlaylistByUrl(playlist.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: selectedPlaylists.find(p => p.id === playlist.id) ? 'rgba(79, 119, 45, 0.3)' : (index === highlightedIndex ? 'rgba(79, 119, 45, 0.2)' : 'transparent'),
                  opacity: selectedPlaylists.find(p => p.id === playlist.id) ? 0.7 : 1,
                  transition: 'background-color 0.2s, opacity 0.2s'
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
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
      

      
      {selectedPlaylists.length >= 10 && (
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '4px', fontSize: '14px' }}>
          Maximum of 10 playlists reached
        </div>
      )}
    </div>
  );
};

export default PlaylistSelector;