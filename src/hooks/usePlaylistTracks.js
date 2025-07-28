import { useState, useEffect, useCallback, useRef } from 'react';
import SpotifyService from '../services/spotify';

/**
 * Custom hook for fetching playlist tracks
 * Provides automatic pagination, loading states, and error handling
 *
 * @param {string} accessToken - Spotify access token
 * @param {string} playlistId - Spotify playlist ID
 * @param {Object} options - Hook options
 * @param {string} options.market - Market code for track availability
 * @param {boolean} options.autoFetch - Whether to fetch automatically when playlistId changes (default: true)
 * @param {Function} options.onProgress - Progress callback function
 * @returns {Object} - Hook state and methods
 */
const usePlaylistTracks = (accessToken, playlistId, options = {}) => {
  const { market, autoFetch = true, onProgress } = options;

  // State
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

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
   * Internal progress handler
   */
  const handleProgress = useCallback(
    progressData => {
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
  const fetchTracks = useCallback(async () => {
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

      const playlistTracks = await spotifyServiceRef.current.getPlaylistTracks(
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

      setTracks(playlistTracks);
      setProgress({
        loaded: playlistTracks.length,
        total: playlistTracks.length,
        percentage: 100,
      });
    } catch (err) {
      // Don't set error if request was aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err);
        console.error('Error fetching playlist tracks:', err);
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
  const refresh = useCallback(() => {
    fetchTracks();
  }, [fetchTracks]);

  /**
   * Clear tracks and reset state
   */
  const clear = useCallback(() => {
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
  const retry = useCallback(() => {
    fetchTracks();
  }, [fetchTracks]);

  /**
   * Get track by ID
   */
  const getTrackById = useCallback(
    trackId => {
      return tracks.find(track => track.id === trackId);
    },
    [tracks]
  );

  /**
   * Filter tracks by criteria
   */
  const filterTracks = useCallback(
    filterFn => {
      return tracks.filter(filterFn);
    },
    [tracks]
  );

  /**
   * Get tracks with specific properties
   */
  const getTracksWithProperty = useCallback(
    (property, value) => {
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
