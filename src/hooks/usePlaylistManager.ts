import { useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PlaylistContext from '../context/PlaylistContext';
import { Playlist, Track, SelectedPlaylist, PlaylistRatioConfig, PlaylistState } from '../types';

// Search and filter options
export interface PlaylistSearchOptions {
  query?: string;
  minTracks?: number;
  maxTracks?: number;
  owner?: string;
  sortBy?: 'name' | 'trackCount' | 'owner' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// Enhanced playlist manager hook interface
export interface UsePlaylistManagerReturn {
  // State
  playlists: Playlist[];
  selectedPlaylists: SelectedPlaylist[];
  isLoading: boolean;
  error: string | null;
  
  // Search and filtering
  searchQuery: string;
  filteredPlaylists: Playlist[];
  searchResults: Playlist[];
  
  // Actions
  fetchPlaylists: () => Promise<void>;
  selectPlaylist: (playlist: Playlist, config?: PlaylistRatioConfig) => Promise<void>;
  deselectPlaylist: (playlistId: string) => void;
  updatePlaylistConfig: (playlistId: string, config: PlaylistRatioConfig) => void;
  clearSelectedPlaylists: () => void;
  clearError: () => void;
  
  // Search and filtering
  setSearchQuery: (query: string) => void;
  searchPlaylists: (options: PlaylistSearchOptions) => Playlist[];
  filterPlaylists: (playlists: Playlist[], options: PlaylistSearchOptions) => Playlist[];
  
  // Utility methods
  isPlaylistSelected: (playlistId: string) => boolean;
  getSelectedPlaylist: (playlistId: string) => SelectedPlaylist | undefined;
  getPlaylistTracks: (playlistId: string) => Promise<Track[]>;
  
  // Cache management
  clearCache: () => void;
  getCacheStats: () => { size: number; hitRate: number };
}

// Cache configuration
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 300; // 300ms

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Enhanced usePlaylistManager hook that provides comprehensive playlist management
 * with debounced search, caching, and efficient data handling
 */
export function usePlaylistManager(): UsePlaylistManagerReturn {
  const context = useContext(PlaylistContext);
  
  if (context === undefined) {
    throw new Error('usePlaylistManager must be used within a PlaylistProvider');
  }

  const {
    state,
    fetchUserPlaylists,
    fetchPlaylistTracks,
    selectPlaylist: contextSelectPlaylist,
    deselectPlaylist: contextDeselectPlaylist,
    updatePlaylistConfig: contextUpdatePlaylistConfig,
    clearSelectedPlaylists: contextClearSelectedPlaylists,
    clearError: contextClearError,
    isPlaylistSelected: contextIsPlaylistSelected,
    getSelectedPlaylist: contextGetSelectedPlaylist,
  } = context;

  // Local state for search and caching
  const [searchQuery, setSearchQuery] = useState('');
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  const cacheStatsRef = useRef({ hits: 0, misses: 0 });

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  // Cache management utilities
  const setCache = useCallback(<T>(key: string, data: T, customExpiry?: number): void => {
    const expiry = customExpiry || CACHE_EXPIRY_TIME;
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry,
    });
  }, []);

  const getCache = useCallback(<T>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) {
      cacheStatsRef.current.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      cacheRef.current.delete(key);
      cacheStatsRef.current.misses++;
      return null;
    }

    cacheStatsRef.current.hits++;
    return entry.data as T;
  }, []);

  const clearCache = useCallback((): void => {
    cacheRef.current.clear();
    cacheStatsRef.current = { hits: 0, misses: 0 };
  }, []);

  const getCacheStats = useCallback(() => {
    const { hits, misses } = cacheStatsRef.current;
    const total = hits + misses;
    return {
      size: cacheRef.current.size,
      hitRate: total > 0 ? hits / total : 0,
    };
  }, []);

  // Enhanced playlist fetching with caching
  const fetchPlaylists = useCallback(async (): Promise<void> => {
    const cacheKey = 'user-playlists';
    const cached = getCache<Playlist[]>(cacheKey);
    
    if (cached && cached.length > 0) {
      // Use cached data but still fetch in background for freshness
      setTimeout(() => {
        fetchUserPlaylists().then(freshPlaylists => {
          setCache(cacheKey, state.userPlaylists);
        }).catch(error => {
          console.warn('Background playlist refresh failed:', error);
        });
      }, 0);
      return;
    }

    try {
      await fetchUserPlaylists();
      setCache(cacheKey, state.userPlaylists);
    } catch (error) {
      throw error;
    }
  }, [fetchUserPlaylists, getCache, setCache, state.userPlaylists]);

  // Enhanced track fetching with caching
  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<Track[]> => {
    const cacheKey = `playlist-tracks-${playlistId}`;
    const cached = getCache<Track[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const tracks = await fetchPlaylistTracks(playlistId);
      setCache(cacheKey, tracks);
      return tracks;
    } catch (error) {
      throw error;
    }
  }, [fetchPlaylistTracks, getCache, setCache]);

  // Enhanced playlist selection with caching
  const selectPlaylist = useCallback(async (
    playlist: Playlist, 
    config?: PlaylistRatioConfig
  ): Promise<void> => {
    try {
      // Use cached tracks if available
      const cacheKey = `playlist-tracks-${playlist.id}`;
      const cachedTracks = getCache<Track[]>(cacheKey);
      
      if (cachedTracks) {
        await contextSelectPlaylist({ ...playlist, tracks: cachedTracks }, config);
      } else {
        await contextSelectPlaylist(playlist, config);
        // Cache the tracks after selection
        const selectedPlaylist = contextGetSelectedPlaylist(playlist.id);
        if (selectedPlaylist?.tracks) {
          setCache(cacheKey, selectedPlaylist.tracks);
        }
      }
    } catch (error) {
      throw error;
    }
  }, [contextSelectPlaylist, contextGetSelectedPlaylist, getCache, setCache]);

  // Filter playlists based on search options
  const filterPlaylists = useCallback((
    playlists: Playlist[], 
    options: PlaylistSearchOptions
  ): Playlist[] => {
    let filtered = [...playlists];

    // Text search
    if (options.query && options.query.trim()) {
      const query = options.query.toLowerCase().trim();
      filtered = filtered.filter(playlist =>
        playlist.name.toLowerCase().includes(query) ||
        playlist.description?.toLowerCase().includes(query) ||
        playlist.owner.displayName.toLowerCase().includes(query)
      );
    }

    // Track count filters
    if (options.minTracks !== undefined) {
      filtered = filtered.filter(playlist => playlist.trackCount >= options.minTracks!);
    }
    if (options.maxTracks !== undefined) {
      filtered = filtered.filter(playlist => playlist.trackCount <= options.maxTracks!);
    }

    // Owner filter
    if (options.owner) {
      const owner = options.owner.toLowerCase();
      filtered = filtered.filter(playlist =>
        playlist.owner.displayName.toLowerCase().includes(owner)
      );
    }

    // Sorting
    if (options.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'trackCount':
            comparison = a.trackCount - b.trackCount;
            break;
          case 'owner':
            comparison = a.owner.displayName.localeCompare(b.owner.displayName);
            break;
          case 'recent':
            // Assuming playlists have a lastModified or similar field
            // For now, sort by name as fallback
            comparison = a.name.localeCompare(b.name);
            break;
          default:
            comparison = 0;
        }

        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, []);

  // Search playlists with caching
  const searchPlaylists = useCallback((options: PlaylistSearchOptions): Playlist[] => {
    const cacheKey = `search-${JSON.stringify(options)}`;
    const cached = getCache<Playlist[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const results = filterPlaylists(state.userPlaylists, options);
    setCache(cacheKey, results, 2 * 60 * 1000); // Cache search results for 2 minutes
    
    return results;
  }, [state.userPlaylists, filterPlaylists, getCache, setCache]);

  // Memoized filtered playlists based on debounced search query
  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return state.userPlaylists;
    }

    return filterPlaylists(state.userPlaylists, {
      query: debouncedSearchQuery,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, [state.userPlaylists, debouncedSearchQuery, filterPlaylists]);

  // Memoized search results (same as filtered for now, but could be different)
  const searchResults = useMemo(() => {
    return filteredPlaylists;
  }, [filteredPlaylists]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    // State
    playlists: state.userPlaylists,
    selectedPlaylists: state.selectedPlaylists,
    isLoading: state.isLoading,
    error: state.error,
    
    // Search and filtering
    searchQuery,
    filteredPlaylists,
    searchResults,
    
    // Actions
    fetchPlaylists,
    selectPlaylist,
    deselectPlaylist: contextDeselectPlaylist,
    updatePlaylistConfig: contextUpdatePlaylistConfig,
    clearSelectedPlaylists: contextClearSelectedPlaylists,
    clearError: contextClearError,
    
    // Search and filtering
    setSearchQuery,
    searchPlaylists,
    filterPlaylists,
    
    // Utility methods
    isPlaylistSelected: contextIsPlaylistSelected,
    getSelectedPlaylist: contextGetSelectedPlaylist,
    getPlaylistTracks,
    
    // Cache management
    clearCache,
    getCacheStats,
  };
}

export default usePlaylistManager;