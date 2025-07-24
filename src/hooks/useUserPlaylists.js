import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';

/**
 * Custom hook for fetching user playlists
 * Provides pagination, loading states, and error handling
 *
 * @param {string} accessToken - Spotify access token
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch automatically when hook mounts (default: true)
 * @param {boolean} options.fetchAll - Whether to fetch all playlists automatically (default: false)
 * @param {number} options.limit - Number of playlists per page (default: 50)
 * @returns {Object} - Hook state and methods
 */
const useUserPlaylists = (accessToken, options = {}) => {
  const { autoFetch = true, fetchAll = false, limit = 50 } = options;

  // State
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Refs
  const spotifyServiceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initialize Spotify service when access token changes
  useEffect(() => {
    if (accessToken) {
      spotifyServiceRef.current = new SpotifyService(accessToken);
    } else {
      spotifyServiceRef.current = null;
    }
  }, [accessToken]);

  /**
   * Fetch playlists
   * @param {Object} fetchOptions - Fetch options
   * @param {boolean} fetchOptions.append - Whether to append results (for pagination)
   * @param {boolean} fetchOptions.all - Whether to fetch all playlists
   * @param {number} fetchOptions.customOffset - Custom offset for pagination
   */
  const fetchPlaylists = useCallback(
    async (fetchOptions = {}) => {
      const { append = false, all = fetchAll, customOffset } = fetchOptions;

      if (!spotifyServiceRef.current) {
        setError(new Error('Spotify service not initialized'));
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        let result;

        if (all) {
          // Fetch all playlists
          result = await spotifyServiceRef.current.getUserPlaylists({
            all: true,
          });
        } else {
          // Fetch single page
          const fetchOffset =
            customOffset !== undefined ? customOffset : append ? offset : 0;
          result = await spotifyServiceRef.current.getUserPlaylists({
            limit,
            offset: fetchOffset,
          });
        }

        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        if (append && !all) {
          setPlaylists(prevPlaylists => [...prevPlaylists, ...result.items]);
          setOffset(result.offset + result.items.length);
        } else {
          setPlaylists(result.items);
          setOffset(
            all ? result.items.length : result.offset + result.items.length
          );
        }

        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch (err) {
        // Don't set error if request was aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err);
          console.error('Error fetching user playlists:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchAll, limit, offset]
  );

  // Auto-fetch effect
  useEffect(() => {
    if (autoFetch) {
      fetchPlaylists();
    }
  }, [autoFetch, fetchPlaylists]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Load more playlists (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPlaylists({ append: true });
    }
  }, [loading, hasMore, fetchPlaylists]);

  /**
   * Refresh playlists (reload from beginning)
   */
  const refresh = useCallback(() => {
    setOffset(0);
    fetchPlaylists({ append: false });
  }, [fetchPlaylists]);

  /**
   * Fetch all playlists at once
   */
  const fetchAllPlaylists = useCallback(() => {
    fetchPlaylists({ all: true });
  }, [fetchPlaylists]);

  /**
   * Clear playlists and reset state
   */
  const clear = useCallback(() => {
    setPlaylists([]);
    setError(null);
    setHasMore(false);
    setTotal(0);
    setOffset(0);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Retry the last fetch (useful for error recovery)
   */
  const retry = useCallback(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  /**
   * Get playlist by ID
   */
  const getPlaylistById = useCallback(
    playlistId => {
      return playlists.find(playlist => playlist.id === playlistId);
    },
    [playlists]
  );

  /**
   * Filter playlists by criteria
   */
  const filterPlaylists = useCallback(
    filterFn => {
      return playlists.filter(filterFn);
    },
    [playlists]
  );

  /**
   * Search playlists by name (client-side filtering)
   */
  const searchPlaylists = useCallback(
    query => {
      if (!query || query.trim() === '') {
        return playlists;
      }

      const searchTerm = query.toLowerCase().trim();
      return playlists.filter(
        playlist =>
          playlist.name.toLowerCase().includes(searchTerm) ||
          playlist.description?.toLowerCase().includes(searchTerm) ||
          playlist.owner?.display_name?.toLowerCase().includes(searchTerm)
      );
    },
    [playlists]
  );

  /**
   * Get playlists owned by the current user
   */
  const getOwnedPlaylists = useCallback(() => {
    return playlists.filter(playlist => playlist.owner?.id);
  }, [playlists]);

  /**
   * Get collaborative playlists
   */
  const getCollaborativePlaylists = useCallback(() => {
    return playlists.filter(playlist => playlist.collaborative);
  }, [playlists]);

  /**
   * Get public playlists
   */
  const getPublicPlaylists = useCallback(() => {
    return playlists.filter(playlist => playlist.public);
  }, [playlists]);

  return {
    // State
    playlists,
    loading,
    error,
    hasMore,
    total,

    // Actions
    fetchPlaylists,
    loadMore,
    refresh,
    fetchAllPlaylists,
    clear,
    retry,

    // Utility methods
    getPlaylistById,
    filterPlaylists,
    searchPlaylists,
    getOwnedPlaylists,
    getCollaborativePlaylists,
    getPublicPlaylists,

    // Computed values
    isEmpty: playlists.length === 0 && !loading,
    hasData: playlists.length > 0,
    totalPlaylists: playlists.length,
    isInitialLoad: loading && playlists.length === 0,
    isLoadingMore: loading && playlists.length > 0,
  };
};

export default useUserPlaylists;
