import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';
import { UseSpotifySearchOptions, UseSpotifySearchReturn } from '../types';

/**
 * Custom hook for Spotify search functionality
 * Provides search functionality with loading states, error handling, and debouncing
 */
const useSpotifySearch = (
  accessToken: string | null,
  options: UseSpotifySearchOptions = {}
): UseSpotifySearchReturn => {
  const { debounceMs = 300, autoSearch = true, limit = 20, market } = options;

  // State
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  // Refs
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const spotifyServiceRef = useRef<SpotifyService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
   */
  const performSearch = useCallback(
    async (searchOptions: { append?: boolean; customOffset?: number } = {}) => {
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
    async (searchQuery?: string) => {
      const queryToSearch = searchQuery !== undefined ? searchQuery : query;

      if (searchQuery !== undefined) {
        setQuery(searchQuery);
      }

      if (!queryToSearch || !queryToSearch.trim()) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      // Reset pagination for new search
      setOffset(0);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        if (!spotifyServiceRef.current) {
          throw new Error('Spotify service not initialized');
        }

        const searchResults = await spotifyServiceRef.current.searchTracks(
          queryToSearch,
          {
            limit,
            offset: 0,
            market,
          }
        );

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setResults(searchResults.tracks);
        setOffset(searchResults.tracks.length);
        setHasMore(searchResults.hasMore);
        setTotal(searchResults.total);
      } catch (err) {
        // Don't set error if request was aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err as Error);
          console.error('Search error:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [query, limit, market]
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
