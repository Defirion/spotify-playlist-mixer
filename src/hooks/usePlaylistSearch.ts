import { useState, useEffect, useCallback, useRef } from 'react';
import { SpotifyPlaylist } from '../types';
import { getSpotifyApi } from '../utils/spotify';

interface UsePlaylistSearchOptions {
  accessToken: string | null;
  debounceMs?: number;
  limit?: number;
}

interface UsePlaylistSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SpotifyPlaylist[];
  loading: boolean;
  error: string | null;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  clearResults: () => void;
}

/**
 * Custom hook for searching Spotify playlists
 * Handles debounced search, loading states, and error handling
 */
export const usePlaylistSearch = ({
  accessToken,
  debounceMs = 150,
  limit = 10,
}: UsePlaylistSearchOptions): UsePlaylistSearchReturn => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchPlaylists = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !accessToken) {
        setResults([]);
        setLoading(false);
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

        const api = getSpotifyApi(accessToken);
        const response = await api.get(
          `/search?q=${encodeURIComponent(searchQuery)}&type=playlist&limit=${limit}`
        );

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setResults(response.data.playlists.items || []);
        setShowResults(true);
      } catch (err) {
        // Don't set error if request was aborted
        if (!abortControllerRef.current?.signal.aborted) {
          console.error('Failed to search playlists:', err);
          setError('Failed to search playlists. Please try again.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, limit]
  );

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't search if query is empty or looks like a URL
    if (!query.trim() || isValidSpotifyLink(query.trim())) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      searchPlaylists(query);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, debounceMs, searchPlaylists]);

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

  const clearResults = useCallback(() => {
    setResults([]);
    setShowResults(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    showResults,
    setShowResults,
    clearResults,
  };
};

// Helper function to check if input is a Spotify link
const isValidSpotifyLink = (input: string): boolean => {
  const spotifyUrlRegex =
    /^(https?:\/\/(open\.)?spotify\.com\/(playlist|track|album)\/[a-zA-Z0-9]+(\?.*)?)$/;
  const spotifyUriRegex = /^spotify:(playlist|track|album):[a-zA-Z0-9]+$/;
  return spotifyUrlRegex.test(input) || spotifyUriRegex.test(input);
};
