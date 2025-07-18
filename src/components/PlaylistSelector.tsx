import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePlaylistManager } from '../hooks/usePlaylistManager';
import { Playlist, PlaylistRatioConfig } from '../types';

interface PlaylistSelectorProps {
  onError: (message: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ onError }) => {
  const {
    selectedPlaylists,
    isLoading,
    error,
    selectPlaylist,
    isPlaylistSelected,
    clearError,
    searchPlaylists: searchPlaylistsFromHook
  } = usePlaylistManager();

  const [playlistInput, setPlaylistInput] = useState('');
  const [searchResults, setSearchResults] = useState<Playlist[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [inputType, setInputType] = useState<'search' | 'url'>('search');
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce timer ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear error when component mounts or error changes
  useEffect(() => {
    if (error) {
      onError(error);
      clearError();
    }
  }, [error, onError, clearError]);

  const extractPlaylistId = useCallback((url: string): string | null => {
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
  }, []);

  const isValidPlaylistUrl = useCallback((input: string): boolean => {
    const trimmedInput = input.trim();
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /^[a-zA-Z0-9]{22}$/ // Spotify playlist IDs are exactly 22 characters
    ];
    return patterns.some(pattern => pattern.test(trimmedInput));
  }, []);

  const searchPlaylists = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      // Use the searchPlaylists method from usePlaylistManager hook
      const results = searchPlaylistsFromHook({ query: query.trim() });
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Failed to search playlists:', err);
      onError('Failed to search playlists. Please try again.');
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [searchPlaylistsFromHook, onError]);

  const debouncedSearch = useCallback((query: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaylists(query);
    }, 300); // 300ms debounce
  }, [searchPlaylists]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPlaylistInput(value);
    
    // Detect input type for dynamic UI
    if (isValidPlaylistUrl(value.trim())) {
      setInputType('url');
      setShowSearchResults(false);
    } else {
      setInputType('search');
      // Debounced search for non-URL inputs
      if (value.trim()) {
        debouncedSearch(value.trim());
      } else {
        setShowSearchResults(false);
        setSearchResults([]);
      }
    }
  }, [isValidPlaylistUrl, debouncedSearch]);

  const handleAddPlaylistByUrl = useCallback(async (input: string): Promise<void> => {
    const playlistId = extractPlaylistId(input);
    if (!playlistId) {
      onError('Invalid Spotify playlist URL. Please use a valid Spotify playlist link.');
      return;
    }

    // Check if already added
    if (isPlaylistSelected(playlistId)) {
      onError('This playlist is already added');
      return;
    }

    try {
      // Create a minimal playlist object with the ID
      // The selectPlaylist method will fetch the full details
      const minimalPlaylist: Playlist = {
        id: playlistId,
        name: 'Loading...',
        trackCount: 0,
        owner: { id: 'unknown', displayName: 'Unknown' },
        images: []
      };
      
      // Select the playlist with default config
      // The selectPlaylist method will fetch full details including tracks
      const defaultConfig: PlaylistRatioConfig = { ratio: 1, isEnabled: true };
      await selectPlaylist(minimalPlaylist, defaultConfig);
      
      setPlaylistInput('');
      setShowSearchResults(false);
      
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        onError('Playlist not found. Make sure the playlist is public or you have access to it.');
      } else if (err.message?.includes('403') || err.message?.includes('access denied')) {
        onError('Access denied. The playlist might be private.');
      } else {
        onError('Failed to load playlist. Please check the URL and try again.');
      }
      console.error(err);
    }
  }, [extractPlaylistId, isPlaylistSelected, selectPlaylist, onError]);

  const handleInputSubmit = useCallback(async (): Promise<void> => {
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
  }, [playlistInput, isValidPlaylistUrl, handleAddPlaylistByUrl, searchPlaylists, onError]);

  const handlePlaylistSelect = useCallback(async (playlist: Playlist): Promise<void> => {
    if (isPlaylistSelected(playlist.id)) {
      onError('This playlist is already added');
      return;
    }

    try {
      const defaultConfig: PlaylistRatioConfig = { ratio: 1, isEnabled: true };
      await selectPlaylist(playlist, defaultConfig);
      setPlaylistInput('');
      setShowSearchResults(false);
    } catch (err) {
      console.error('Failed to select playlist:', err);
      onError('Failed to add playlist. Please try again.');
    }
  }, [isPlaylistSelected, selectPlaylist, onError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  }, [handleInputSubmit]);

  const handleCloseSearchResults = useCallback(() => {
    setShowSearchResults(false);
    setSearchResults([]);
  }, []);

  // Memoized search results list for performance
  const searchResultsList = useMemo(() => {
    if (!showSearchResults || searchResults.length === 0) {
      return null;
    }

    return (
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
            onClick={handleCloseSearchResults}
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
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {searchResults.map((playlist) => (
            <PlaylistSearchResult
              key={playlist.id}
              playlist={playlist}
              isSelected={isPlaylistSelected(playlist.id)}
              onSelect={handlePlaylistSelect}
            />
          ))}
        </div>
      </div>
    );
  }, [showSearchResults, searchResults, isPlaylistSelected, handlePlaylistSelect, handleCloseSearchResults]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const isLoadingState = isLoading || isSearching;
  const maxPlaylistsReached = selectedPlaylists.length >= 10;

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
          <label htmlFor="playlist-search-input">Search playlists or paste URL:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="playlist-search-input"
              type="text"
              value={playlistInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Try: 'salsa romantica', 'bachata sensual' or paste Spotify URL..."
              style={{ flex: 1 }}
              disabled={maxPlaylistsReached}
            />
            <button 
              className="btn" 
              onClick={handleInputSubmit}
              disabled={isLoadingState || !playlistInput.trim() || maxPlaylistsReached}
            >
              {isLoadingState ? 'Searching...' : inputType === 'url' ? 'Add' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResultsList}
      
      {maxPlaylistsReached && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: 'rgba(255, 165, 0, 0.1)', 
          borderRadius: '4px', 
          fontSize: '14px' 
        }}>
          Maximum of 10 playlists reached
        </div>
      )}
    </div>
  );
};

// Memoized PlaylistSearchResult component for performance
const PlaylistSearchResult = React.memo<{
  playlist: Playlist;
  isSelected: boolean;
  onSelect: (playlist: Playlist) => void;
}>(({ playlist, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(playlist);
  }, [playlist, onSelect]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelected) {
      (e.target as HTMLDivElement).style.backgroundColor = 'rgba(79, 119, 45, 0.2)';
    }
  }, [isSelected]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelected) {
      (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
    }
  }, [isSelected]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        borderRadius: '6px',
        cursor: isSelected ? 'default' : 'pointer',
        marginBottom: '4px',
        border: isSelected ? '2px solid var(--moss-green)' : '1px solid transparent',
        opacity: isSelected ? 0.5 : 1,
        transition: 'all 0.2s'
      }}
    >
      {playlist.images?.[0]?.url && (
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
          {playlist.name || 'Untitled Playlist'}
        </div>
        <div style={{ fontSize: '12px', opacity: '0.7' }}>
          by {playlist.owner?.displayName || 'Unknown'} • {playlist.trackCount || 0} tracks
        </div>
      </div>
      {isSelected && (
        <div style={{ 
          color: 'var(--moss-green)', 
          fontSize: '16px',
          marginLeft: '8px'
        }}>
          ✓
        </div>
      )}
    </div>
  );
});

export default PlaylistSelector;