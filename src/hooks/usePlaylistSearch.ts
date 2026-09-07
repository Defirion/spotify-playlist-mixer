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

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const api = getSpotifyApi(accessToken);
        const requestUrl = `/search?q=${encodeURIComponent(
          searchQuery
        )}&type=playlist&limit=${limit}`;

        try {
          if (process.env.NODE_ENV === 'development') {
            const maskedToken = accessToken
              ? accessToken.length > 10
                ? `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`
                : accessToken
              : null;
            const defaultAuthHeader =
              api?.defaults?.headers?.Authorization ||
              api?.defaults?.headers?.common?.Authorization;
            // eslint-disable-next-line no-console
            console.debug('DEBUG (usePlaylistSearch): performing request', {
              url: requestUrl,
              accessTokenPresent: !!accessToken,
              maskedToken,
              defaultAuthHeader,
            });
          }
        } catch (_) {
          // Debug logging must never affect search behavior.
        }

        const response = await api.get(requestUrl);

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const items = response?.data?.playlists?.items;
        if (!Array.isArray(items)) {
          console.error(
            'Unexpected Spotify API response shape for playlist search:',
            response
          );
          setResults([]);
          setShowResults(false);
          setError('Spotify returned an unexpected playlist search response.');
          return;
        }

        setResults(items.filter((playlist: any) => playlist && playlist.id));
        setShowResults(true);
      } catch (err) {
        if (!abortControllerRef.current?.signal.aborted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const maybeResponse = (err as any)?.response ?? null;
          const status = maybeResponse?.status;
          const spotifyMessage = maybeResponse?.data?.error?.message;

          console.error('Failed to search playlists:', err);

          const message = status
            ? `Spotify playlist search failed (${status})${
                spotifyMessage ? `: ${spotifyMessage}` : ''
              }`
            : 'Failed to search playlists. Please try again.';

          setError(message);
          setResults([]);
          setShowResults(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, limit]
  );

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!query.trim() || isValidSpotifyLink(query.trim())) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      searchPlaylists(query);
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, debounceMs, searchPlaylists]);

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

const isValidSpotifyLink = (input: string): boolean => {
  const spotifyUrlRegex =
    /^(https?:\/\/(open\.)?spotify\.com\/(playlist|track|album)\/[a-zA-Z0-9]+(\?.*)?)$/;
  const spotifyUriRegex = /^spotify:(playlist|track|album):[a-zA-Z0-9]+$/;
  return spotifyUrlRegex.test(input) || spotifyUriRegex.test(input);
};
