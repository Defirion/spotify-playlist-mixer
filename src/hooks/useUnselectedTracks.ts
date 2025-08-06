import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSpotifyApi } from '../utils/spotify';
import { SpotifyTrack, SpotifyPlaylist } from '../types';

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

  // Memoize helper function to prevent recreation
  const fetchPlaylistTracks = useCallback(
    async (api: any, playlistId: string): Promise<SpotifyTrack[]> => {
      let allTracks: SpotifyTrack[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await api.get(
          `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
        );
        const tracks = response.data.items
          .filter((item: any) => item.track && item.track.id)
          .map((item: any) => item.track);

        allTracks = [...allTracks, ...tracks];

        if (tracks.length < limit) break;
        offset += limit;
      }

      return allTracks;
    },
    []
  );

  // Fetch all tracks from playlists
  const fetchAllPlaylistTracks = useCallback(async () => {
    if (selectedPlaylists.length === 0) {
      setAllPlaylistTracks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const api = getSpotifyApi(accessToken);

      // Get all tracks from selected playlists
      const allTracks: TrackWithSource[] = [];
      for (const playlist of selectedPlaylists) {
        const tracks = await fetchPlaylistTracks(api, playlist.id);
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
      console.error('Failed to fetch playlist tracks:', err);
      setError(
        err instanceof Error
          ? err
          : new Error('Failed to fetch playlist tracks')
      );
    } finally {
      setLoading(false);
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
