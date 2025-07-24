import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';

/**
 * Custom hook for Spotify search functionality
 * Provides search functionality with loading states, error handling, and debouncing
 *
 * @param {string} accessToken - Spotify access token
 * @param {Object} options - Hook options
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 300)
 * @param {boolean} options.autoSearch - Whether to search automatically when query changes (default: true)
 * @param {number} options.limit - Number of results per page (default: 20)
 * @param {string} options.market - Market code for track availability
 * @returns {Object} - Hook state and methods
 */
const useSpotifySearch = (accessToken, options = {}) => {
  const { debounceMs = 300, autoSearch = true, limit = 20, market } = options;

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Refs
  const debounceTimeoutRef = useRef(null);
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

  // Clear results when query is empty
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      setTotal(0);
      setOffset(0);
      setError(null);
    }
  }, [query]);

  /**
   * Perform search with the current query
   * @param {Object} searchOptions - Search options
   * @param {boolean} searchOptions.append - Whether to append results (for pagination)
   * @param {number} searchOptions.customOffset - Custom offset for pagination
   */
  const performSearch = useCallback(
    async (searchOptions = {}) => {
      const { append = false, customOffset } = searchOptions;

      if (!spotifyServiceRef.current) {
        setError(new Error('Spotify service not initialized'));
        return;
      }

      if (!query.trim()) {
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

        const searchOffset =
          customOffset !== undefined ? customOffset : append ? offset : 0;

        const searchResults = await spotifyServiceRef.current.searchTracks(
          query,
          {
            limit,
            offset: searchOffset,
            market,
          }
        );

        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        if (append) {
          setResults(prevResults => [...prevResults, ...searchResults.tracks]);
          setOffset(searchOffset + searchResults.tracks.length);
        } else {
          setResults(searchResults.tracks);
          setOffset(searchResults.tracks.length);
        }

        setHasMore(searchResults.hasMore);
        setTotal(searchResults.total);
      } catch (err) {
        // Don't set error if request was aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err);
          console.error('Search error:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [query, limit, market, offset]
  );

  // Debounced search effect
  useEffect(() => {
    if (!autoSearch || !query.trim()) {
      return;
    }

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, autoSearch, debounceMs, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Manually trigger a search (useful when autoSearch is false)
   */
  const search = useCallback(
    searchQuery => {
      if (searchQuery !== undefined) {
        setQuery(searchQuery);
      }

      // Reset pagination for new search
      setOffset(0);
      performSearch({ append: false });
    },
    [performSearch]
  );

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      performSearch({ append: true });
    }
  }, [loading, hasMore, performSearch]);

  /**
   * Clear search results and query
   */
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasMore(false);
    setTotal(0);
    setOffset(0);
    setError(null);

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Retry the last search (useful for error recovery)
   */
  const retry = useCallback(() => {
    if (query.trim()) {
      setOffset(0);
      performSearch({ append: false });
    }
  }, [query, performSearch]);

  return {
    // State
    query,
    results,
    loading,
    error,
    hasMore,
    total,

    // Actions
    setQuery,
    search,
    loadMore,
    clear,
    retry,

    // Computed values
    isEmpty: results.length === 0 && !loading,
    isInitialLoad: loading && results.length === 0,
    isLoadingMore: loading && results.length > 0,
  };
};

export default useSpotifySearch;
