import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';
import { SpotifyPlaylist } from '../types/spotify';
import { GetUserPlaylistsOptions } from '../types/api';

/**
 * Options for the useUserPlaylists hook
 */
export interface UseUserPlaylistsOptions extends GetUserPlaylistsOptions {
  /** Whether to fetch automatically when hook mounts (default: true) */
  autoFetch?: boolean;
  /** Whether to fetch all playlists automatically (default: false) */
  fetchAll?: boolean;
  /** Number of playlists per page (default: 50) */
  limit?: number;
}

/**
 * Options for manual fetch operations
 */
export interface FetchPlaylistsOptions {
  /** Whether to append results (for pagination) */
  append?: boolean;
  /** Whether to fetch all playlists */
  all?: boolean;
  /** Custom offset for pagination */
  customOffset?: number;
}

/**
 * Return type for the useUserPlaylists hook
 */
export interface UseUserPlaylistsReturn {
  // State
  playlists: SpotifyPlaylist[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;

  // Actions
  fetchPlaylists: (options?: FetchPlaylistsOptions) => Promise<void>;
  loadMore: () => void;
  refresh: () => void;
  fetchAllPlaylists: () => void;
  clear: () => void;
  retry: () => void;

  // Utility methods
  getPlaylistById: (playlistId: string) => SpotifyPlaylist | undefined;
  filterPlaylists: (
    filterFn: (playlist: SpotifyPlaylist) => boolean
  ) => SpotifyPlaylist[];
  searchPlaylists: (query: string) => SpotifyPlaylist[];
  getOwnedPlaylists: () => SpotifyPlaylist[];
  getCollaborativePlaylists: () => SpotifyPlaylist[];
  getPublicPlaylists: () => SpotifyPlaylist[];

  // Computed values
  isEmpty: boolean;
  hasData: boolean;
  totalPlaylists: number;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
}

/**
 * Custom hook for fetching user playlists
 * Provides pagination, loading states, and error handling
 */
const useUserPlaylists = (
  accessToken: string | null,
  options: UseUserPlaylistsOptions = {}
): UseUserPlaylistsReturn => {
  const { autoFetch = true, fetchAll = false, limit = 50 } = options;

  // State
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  // Refs
  const spotifyServiceRef = useRef<SpotifyService | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoFetchedRef = useRef<boolean>(false);

  // Initialize Spotify service when access token changes
  useEffect(() => {
    if (accessToken) {
      spotifyServiceRef.current = new SpotifyService(accessToken);
      hasAutoFetchedRef.current = false; // Reset auto-fetch flag when token changes
    } else {
      spotifyServiceRef.current = null;
      hasAutoFetchedRef.current = false;
    }
  }, [accessToken]);

  /**
   * Fetch playlists
   */
  const fetchPlaylists = useCallback(
    async (fetchOptions: FetchPlaylistsOptions = {}): Promise<void> => {
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
          setPlaylists(prevPlaylists => [
            ...prevPlaylists,
            ...result.playlists,
          ]);
          setOffset(result.nextOffset || result.playlists.length);
        } else {
          setPlaylists(result.playlists);
          setOffset(
            all
              ? result.playlists.length
              : result.nextOffset || result.playlists.length
          );
        }

        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch (err) {
        // Don't set error if request was aborted
        if (!abortControllerRef.current?.signal.aborted) {
          const error =
            err instanceof Error ? err : new Error('Unknown error occurred');
          setError(error);
          console.error('Error fetching user playlists:', error);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchAll, limit, offset]
  );

  // Auto-fetch effect
  useEffect(() => {
    if (autoFetch && !hasAutoFetchedRef.current && spotifyServiceRef.current) {
      hasAutoFetchedRef.current = true;
      fetchPlaylists({ append: false });
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
  const loadMore = useCallback((): void => {
    if (!loading && hasMore) {
      fetchPlaylists({ append: true });
    }
  }, [loading, hasMore, fetchPlaylists]);

  /**
   * Refresh playlists (reload from beginning)
   */
  const refresh = useCallback((): void => {
    setOffset(0);
    fetchPlaylists({ append: false });
  }, [fetchPlaylists]);

  /**
   * Fetch all playlists at once
   */
  const fetchAllPlaylists = useCallback((): void => {
    fetchPlaylists({ all: true });
  }, [fetchPlaylists]);

  /**
   * Clear playlists and reset state
   */
  const clear = useCallback((): void => {
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
  const retry = useCallback((): void => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  /**
   * Get playlist by ID
   */
  const getPlaylistById = useCallback(
    (playlistId: string): SpotifyPlaylist | undefined => {
      return playlists.find(playlist => playlist.id === playlistId);
    },
    [playlists]
  );

  /**
   * Filter playlists by criteria
   */
  const filterPlaylists = useCallback(
    (filterFn: (playlist: SpotifyPlaylist) => boolean): SpotifyPlaylist[] => {
      return playlists.filter(filterFn);
    },
    [playlists]
  );

  /**
   * Search playlists by name (client-side filtering)
   */
  const searchPlaylists = useCallback(
    (query: string): SpotifyPlaylist[] => {
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
  const getOwnedPlaylists = useCallback((): SpotifyPlaylist[] => {
    return playlists.filter(playlist => playlist.owner?.id);
  }, [playlists]);

  /**
   * Get collaborative playlists
   */
  const getCollaborativePlaylists = useCallback((): SpotifyPlaylist[] => {
    return playlists.filter(playlist => playlist.collaborative);
  }, [playlists]);

  /**
   * Get public playlists
   */
  const getPublicPlaylists = useCallback((): SpotifyPlaylist[] => {
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
