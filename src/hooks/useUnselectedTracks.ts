import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { SpotifyTrack, SpotifyPlaylist } from '../types';
import { getNextPlaylistOffset } from '../services/_helpers/pagination';

interface TrackWithSource extends SpotifyTrack {
  sourcePlaylist?: string;
  sourcePlaylistName?: string;
}

interface UseUnselectedTracksOptions {
  accessToken: string;
  selectedPlaylists: SpotifyPlaylist[];
  currentTracks: SpotifyTrack[];
}

interface UseUnselectedTracksReturn {
  tracks: TrackWithSource[];
  filteredTracks: TrackWithSource[];
  loading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  retry: () => void;
}

/**
 * Hook for fetching and managing unselected tracks from playlists.
 * Follows the pattern of useSpotifySearch for consistency.
 */
export const useUnselectedTracks = ({
  accessToken,
  selectedPlaylists,
  currentTracks,
}: UseUnselectedTracksOptions): UseUnselectedTracksReturn => {
  const [allPlaylistTracks, setAllPlaylistTracks] = useState<TrackWithSource[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const requestRef = useRef<AbortController | null>(null);

  // Memoize helper function to prevent recreation
  const fetchPlaylistTracks = useCallback(
    async (
      api: any,
      playlistId: string,
      signal: AbortSignal
    ): Promise<SpotifyTrack[]> => {
      let allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 50;

      while (true) {
        const response = await api.get(
          `/playlists/${playlistId}/items?offset=${offset}&limit=${limit}`,
          { signal }
        );
        if (signal.aborted)
          throw new DOMException('Request canceled', 'AbortError');
        const items = response.data.items || [];
        const tracks = items
          .map((item: any) =>
            item?.item !== undefined ? item.item : item?.track
          )
          .filter(
            (track: any) =>
              track &&
              track.id &&
              track.type !== 'episode' &&
              !track.is_local &&
              track.is_playable !== false
          );

        allTracks = [...allTracks, ...tracks];

        // Page size is based on raw playlist items, not playable tracks:
        // Spotify can include unavailable items that are filtered above.
        const nextOffset = getNextPlaylistOffset(response.data, offset, limit);
        if (nextOffset === null) break;
        offset = nextOffset;
      }

      return allTracks;
    },
    []
  );

  // Fetch all tracks from playlists
  const fetchAllPlaylistTracks = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (!accessToken || selectedPlaylists.length === 0) {
      setAllPlaylistTracks([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const api = getSpotifyApi(accessToken);

      // Get all tracks from selected playlists
      const allTracks: TrackWithSource[] = [];
      for (const playlist of selectedPlaylists) {
        const tracks = await fetchPlaylistTracks(
          api,
          playlist.id,
          controller.signal
        );
        if (controller.signal.aborted) return;
        tracks.forEach(track => {
          allTracks.push({
            ...track,
            sourcePlaylist: playlist.id,
            sourcePlaylistName: playlist.name,
          });
        });
      }

      setAllPlaylistTracks(allTracks);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Failed to fetch playlist tracks:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to fetch playlist tracks')
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [accessToken, selectedPlaylists, fetchPlaylistTracks]);

  // Memoize expensive track filtering operations
  const uniqueUnselectedTracks = useMemo(() => {
    if (allPlaylistTracks.length === 0) return [];

    // Get IDs of currently selected tracks
    const currentTrackIds = new Set(currentTracks.map(track => track.id));

    // Filter out tracks that are already in the current playlist
    const unselected = allPlaylistTracks.filter(
      track => !currentTrackIds.has(track.id)
    );

    // Remove duplicates (same track from multiple playlists)
    const uniqueUnselected: TrackWithSource[] = [];
    const seenTrackIds = new Set<string>();

    unselected.forEach(track => {
      if (!seenTrackIds.has(track.id)) {
        seenTrackIds.add(track.id);
        uniqueUnselected.push(track);
      }
    });

    return uniqueUnselected;
  }, [allPlaylistTracks, currentTracks]);

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) {
      return uniqueUnselectedTracks;
    }

    const query = searchQuery.toLowerCase();
    return uniqueUnselectedTracks.filter(
      track =>
        track.name.toLowerCase().includes(query) ||
        track.artists?.[0]?.name.toLowerCase().includes(query) ||
        track.album?.name.toLowerCase().includes(query)
    );
  }, [searchQuery, uniqueUnselectedTracks]);

  // Fetch tracks when playlists change
  useEffect(() => {
    fetchAllPlaylistTracks();
    return () => {
      requestRef.current?.abort();
    };
  }, [fetchAllPlaylistTracks]);

  // Retry function for error recovery
  const retry = useCallback(() => {
    fetchAllPlaylistTracks();
  }, [fetchAllPlaylistTracks]);

  return {
    tracks: uniqueUnselectedTracks,
    filteredTracks,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    retry,
  };
};
