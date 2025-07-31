import { useCallback } from 'react';
import { SpotifyPlaylist } from '../types';
import { getSpotifyApi } from '../utils/spotify';

interface UseSpotifyUrlHandlerOptions {
  accessToken: string | null;
  selectedPlaylists: SpotifyPlaylist[];
  onPlaylistSelect: (playlist: SpotifyPlaylist) => void;
  onError: (error: string) => void;
}

interface UseSpotifyUrlHandlerReturn {
  isValidSpotifyLink: (input: string) => boolean;
  isValidPlaylistUrl: (input: string) => boolean;
  extractPlaylistId: (url: string) => string | null;
  handleAddPlaylistByUrl: (input: string) => Promise<void>;
}

/**
 * Custom hook for handling Spotify URL validation and playlist addition
 * Handles URL parsing, validation, and playlist fetching from Spotify API
 */
export const useSpotifyUrlHandler = ({
  accessToken,
  selectedPlaylists,
  onPlaylistSelect,
  onError,
}: UseSpotifyUrlHandlerOptions): UseSpotifyUrlHandlerReturn => {
  const extractPlaylistId = useCallback((url: string): string | null => {
    // Handle different Spotify URL formats
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /^([a-zA-Z0-9]{22})$/, // Just the ID (22 characters for Spotify)
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, []);

  const isValidSpotifyLink = useCallback((input: string): boolean => {
    const spotifyUrlRegex =
      /^(https?:\/\/(open\.)?spotify\.com\/(playlist|track|album)\/[a-zA-Z0-9]+(\?.*)?)$/;
    const spotifyUriRegex = /^spotify:(playlist|track|album):[a-zA-Z0-9]+$/;
    return spotifyUrlRegex.test(input) || spotifyUriRegex.test(input);
  }, []);

  const isValidPlaylistUrl = useCallback((input: string): boolean => {
    const trimmedInput = input.trim();
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
      /^[a-zA-Z0-9]{22}$/, // Spotify playlist IDs are exactly 22 characters
    ];
    return patterns.some(pattern => pattern.test(trimmedInput));
  }, []);

  const handleAddPlaylistByUrl = useCallback(
    async (input: string): Promise<void> => {
      if (!accessToken) {
        onError('No access token available');
        return;
      }

      const playlistId = extractPlaylistId(input);
      if (!playlistId) {
        onError(
          'Invalid Spotify playlist URL. Please use a valid Spotify playlist link.'
        );
        return;
      }

      // Check if already added
      if (selectedPlaylists.find(p => p.id === playlistId)) {
        onError('This playlist is already added');
        return;
      }

      try {
        const api = getSpotifyApi(accessToken);
        const response = await api.get(`/playlists/${playlistId}`);
        const playlist = response.data;

        // Fetch all tracks to calculate real average duration
        let allTracks: any[] = [];
        let offset = 0;
        const limit = 100;

        while (true) {
          const tracksResponse = await api.get(
            `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}`
          );
          const items = tracksResponse.data.items || [];
          const tracks = items
            .filter(
              (item: any) =>
                item.track && item.track.id && item.track.duration_ms
            ) // Filter out null tracks and those without duration
            .map((item: any) => item.track);

          allTracks = [...allTracks, ...tracks];

          if (tracks.length < limit) break;
          offset += limit;
        }

        // Calculate real average duration
        let realAverageDuration = null;
        if (allTracks.length > 0) {
          const totalDurationMs = allTracks.reduce(
            (sum: number, track: any) => sum + track.duration_ms,
            0
          );
          realAverageDuration = Math.round(
            totalDurationMs / allTracks.length / 1000
          ); // Convert to seconds
        }

        // Add cover image URL and real duration data
        const playlistWithRealData: SpotifyPlaylist = {
          ...playlist,
          coverImage: playlist.images?.[0]?.url || null,
          realAverageDurationSeconds: realAverageDuration,
          tracksWithDuration: allTracks.length, // Tracks that have duration data
        };

        onPlaylistSelect(playlistWithRealData);
      } catch (err: any) {
        if (err.response?.status === 404) {
          onError(
            'Playlist not found. Make sure the playlist is public or you have access to it.'
          );
        } else if (err.response?.status === 403) {
          onError('Access denied. The playlist might be private.');
        } else {
          onError(
            'Failed to load playlist. Please check the URL and try again.'
          );
        }
        console.error(err);
      }
    },
    [
      accessToken,
      selectedPlaylists,
      onPlaylistSelect,
      onError,
      extractPlaylistId,
    ]
  );

  return {
    isValidSpotifyLink,
    isValidPlaylistUrl,
    extractPlaylistId,
    handleAddPlaylistByUrl,
  };
};
