import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';
import type { SpotifyTrack, GetPlaylistTracksOptions } from '../types';

// Progress tracking interface
interface ProgressData {
  loaded: number;
  total: number;
  percentage: number;
}

// Hook options interface
interface UsePlaylistTracksOptions
  extends Omit<GetPlaylistTracksOptions, 'onProgress'> {
  autoFetch?: boolean;
  onProgress?: (progress: ProgressData) => void;
}

// Hook return interface
interface UsePlaylistTracksReturn {
  // State
  tracks: SpotifyTrack[];
  loading: boolean;
  error: Error | null;
  progress: ProgressData;

  // Actions
  fetchTracks: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  retry: () => Promise<void>;

  // Utility methods
  getTrackById: (trackId: string) => SpotifyTrack | undefined;
  filterTracks: (filterFn: (track: SpotifyTrack) => boolean) => SpotifyTrack[];
  getTracksWithProperty: <K extends keyof SpotifyTrack>(
    property: K,
    value: SpotifyTrack[K]
  ) => SpotifyTrack[];

  // Computed values
  isEmpty: boolean;
  hasData: boolean;
  totalTracks: number;
  isComplete: boolean;
}

/**
 * Custom hook for fetching playlist tracks
 * Provides automatic pagination, loading states, and error handling
 *
 * @param accessToken - Spotify access token
 * @param playlistId - Spotify playlist ID
 * @param options - Hook options
 * @returns Hook state and methods
 */
const usePlaylistTracks = (
  accessToken: string | null,
  playlistId: string | null,
  options: UsePlaylistTracksOptions = {}
): UsePlaylistTracksReturn => {
  const { market, autoFetch = true, onProgress } = options;

  // State
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<ProgressData>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  // Refs
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

  /**
   * Internal progress handler
   */
  const handleProgress = useCallback(
    (progressData: ProgressData): void => {
      setProgress(progressData);
      if (onProgress && typeof onProgress === 'function') {
        onProgress(progressData);
      }
    },
    [onProgress]
  );

  /**
   * Fetch tracks for the current playlist
   */
  const fetchTracks = useCallback(async (): Promise<void> => {
    if (!spotifyServiceRef.current) {
      setError(new Error('Spotify service not initialized'));
      return;
    }

    if (!playlistId) {
      setTracks([]);
      setProgress({ loaded: 0, total: 0, percentage: 0 });
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
      setProgress({ loaded: 0, total: 0, percentage: 0 });

      const result = await spotifyServiceRef.current.getPlaylistTracks(
        playlistId,
        {
          market,
          onProgress: handleProgress,
        }
      );

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Handle both service response format and direct tracks array (for backward compatibility)
      const playlistTracks = Array.isArray(result) ? result : result.tracks;
      setTracks(playlistTracks);
      setProgress({
        loaded: playlistTracks.length,
        total: playlistTracks.length,
        percentage: 100,
      });
    } catch (err) {
      // Don't set error if request was aborted
      if (!abortControllerRef.current?.signal.aborted) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        console.error('Error fetching playlist tracks:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [playlistId, market, handleProgress]);

  // Auto-fetch effect
  useEffect(() => {
    if (!playlistId) {
      // Clear tracks when playlistId is null
      setTracks([]);
      setError(null);
      setProgress({ loaded: 0, total: 0, percentage: 0 });
      return;
    }

    if (autoFetch) {
      fetchTracks();
    }
  }, [playlistId, autoFetch, fetchTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Manually refresh the tracks
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchTracks();
  }, [fetchTracks]);

  /**
   * Clear tracks and reset state
   */
  const clear = useCallback((): void => {
    setTracks([]);
    setError(null);
    setProgress({ loaded: 0, total: 0, percentage: 0 });

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Retry the last fetch (useful for error recovery)
   */
  const retry = useCallback(async (): Promise<void> => {
    await fetchTracks();
  }, [fetchTracks]);

  /**
   * Get track by ID
   */
  const getTrackById = useCallback(
    (trackId: string): SpotifyTrack | undefined => {
      return tracks.find(track => track.id === trackId);
    },
    [tracks]
  );

  /**
   * Filter tracks by criteria
   */
  const filterTracks = useCallback(
    (filterFn: (track: SpotifyTrack) => boolean): SpotifyTrack[] => {
      return tracks.filter(filterFn);
    },
    [tracks]
  );

  /**
   * Get tracks with specific properties
   */
  const getTracksWithProperty = useCallback(
    <K extends keyof SpotifyTrack>(
      property: K,
      value: SpotifyTrack[K]
    ): SpotifyTrack[] => {
      return tracks.filter(track => track[property] === value);
    },
    [tracks]
  );

  return {
    // State
    tracks,
    loading,
    error,
    progress,

    // Actions
    fetchTracks,
    refresh,
    clear,
    retry,

    // Utility methods
    getTrackById,
    filterTracks,
    getTracksWithProperty,

    // Computed values
    isEmpty: (tracks?.length || 0) === 0 && !loading,
    hasData: (tracks?.length || 0) > 0,
    totalTracks: tracks?.length || 0,
    isComplete: progress.percentage === 100 && !loading,
  };
};

export default usePlaylistTracks;
