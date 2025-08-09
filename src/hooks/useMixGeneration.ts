import { useState, useCallback, useRef, useEffect } from 'react';
import { mixPlaylists } from '../utils/playlistMixer';
import SpotifyService from '../services/spotify';
import {
  SpotifyPlaylist,
  SpotifyTrack,
  MixOptions,
  RatioConfig,
  MixedTrack,
} from '../types';

interface MixGenerationState {
  loading: boolean;
  error: string | null;
  mixedTracks: MixedTrack[];
  exhaustedPlaylists: string[];
  stoppedEarly: boolean;
}

interface UseMixGenerationOptions {
  onError?: (error: string) => void;
  onSuccess?: (tracks: MixedTrack[]) => void;
}

interface UseMixGenerationReturn {
  state: MixGenerationState;
  generateMix: (
    selectedPlaylists: SpotifyPlaylist[],
    ratioConfig: RatioConfig,
    mixOptions: MixOptions
  ) => Promise<MixedTrack[]>;
  createPlaylist: (
    playlistName: string,
    tracks: MixedTrack[]
  ) => Promise<SpotifyPlaylist>;
  reset: () => void;
}

/**
 * Custom hook for handling playlist mixing logic
 * Encapsulates the complex business logic for generating mixed playlists
 */
export const useMixGeneration = (
  accessToken: string,
  options: UseMixGenerationOptions = {}
): UseMixGenerationReturn => {
  const { onError, onSuccess } = options;

  const [state, setState] = useState<MixGenerationState>({
    loading: false,
    error: null,
    mixedTracks: [],
    exhaustedPlaylists: [],
    stoppedEarly: false,
  });

  const spotifyServiceRef = useRef<SpotifyService | null>(null);

  // Initialize Spotify service
  useEffect(() => {
    if (accessToken) {
      spotifyServiceRef.current = new SpotifyService(accessToken);
    } else {
      spotifyServiceRef.current = null;
    }
  }, [accessToken]);

  const generateMix = useCallback(
    async (
      selectedPlaylists: SpotifyPlaylist[],
      ratioConfig: RatioConfig,
      mixOptions: MixOptions
    ): Promise<MixedTrack[]> => {
      if (!spotifyServiceRef.current) {
        throw new Error('Spotify service not available');
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        // Validate inputs
        if (!selectedPlaylists || selectedPlaylists.length < 2) {
          throw new Error('Please select at least 2 playlists');
        }

        // Fetch all tracks from selected playlists
        const playlistTracks: Record<string, SpotifyTrack[]> = {};
        for (const playlist of selectedPlaylists) {
          try {
            const result = await spotifyServiceRef.current.getPlaylistTracks(
              playlist.id
            );
            if (result.tracks.length === 0) {
              console.warn(`Playlist ${playlist.name} has no tracks`);
            }
            playlistTracks[playlist.id] = result.tracks;
          } catch (err) {
            console.error(`Failed to fetch tracks from ${playlist.name}:`, err);
            playlistTracks[playlist.id] = []; // Continue with empty array
          }
        }

        // Check if we have any tracks
        const totalAvailableTracks = Object.values(playlistTracks).reduce(
          (sum, tracks) => sum + tracks.length,
          0
        );
        if (totalAvailableTracks === 0) {
          throw new Error('No tracks found in selected playlists');
        }

        // Generate mix using the standard algorithm
        const mixResult = mixPlaylists(playlistTracks, ratioConfig, mixOptions);

        // Handle different return types from mixPlaylists
        let mixedTracks: MixedTrack[] = [];
        let exhaustedPlaylists: string[] = [];
        let stoppedEarly = false;

        if (mixResult === null || mixResult === undefined) {
          console.error('mixResult is null or undefined');
          mixedTracks = [];
        } else if (Array.isArray(mixResult)) {
          mixedTracks = [...mixResult];
          exhaustedPlaylists = (mixResult as any).exhaustedPlaylists || [];
          stoppedEarly = (mixResult as any).stoppedEarly || false;
        } else if (mixResult && typeof mixResult === 'object') {
          const resultObj = mixResult as any;
          if (Array.isArray(resultObj.tracks)) {
            mixedTracks = [...resultObj.tracks];
          } else {
            console.error(
              'mixResult.tracks is not an array:',
              resultObj.tracks
            );
            mixedTracks = [];
          }
          exhaustedPlaylists = resultObj.exhaustedPlaylists || [];
          stoppedEarly = resultObj.stoppedEarly || false;
        } else {
          console.error(
            'mixResult is not an array or object:',
            typeof mixResult,
            mixResult
          );
          mixedTracks = [];
        }

        // Final safety check
        if (!Array.isArray(mixedTracks)) {
          console.error('mixedTracks is not an array after processing!');
          mixedTracks = [];
        }

        if (mixedTracks.length === 0) {
          throw new Error('Failed to mix playlists - no tracks generated');
        }

        // Show warning if playlists were exhausted and mixing stopped early
        if (stoppedEarly && exhaustedPlaylists.length > 0) {
          const exhaustedNames = exhaustedPlaylists
            .map(id => selectedPlaylists.find(p => p.id === id)?.name || id)
            .join(', ');
          console.warn(
            `⚠️ Mixing stopped early because these playlists ran out of songs: ${exhaustedNames}`
          );
        }

        setState(prev => ({
          ...prev,
          loading: false,
          mixedTracks,
          exhaustedPlaylists,
          stoppedEarly,
        }));

        if (onSuccess) {
          onSuccess(mixedTracks);
        }

        return mixedTracks;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        if (onError) {
          onError(errorMessage);
        }

        throw err;
      }
    },
    [onError, onSuccess]
  );

  const createPlaylist = useCallback(
    async (playlistName: string, tracks: MixedTrack[]) => {
      if (!spotifyServiceRef.current) {
        throw new Error('Spotify service not available');
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        if (!playlistName.trim()) {
          throw new Error('Please enter a playlist name');
        }

        if (tracks.length === 0) {
          throw new Error('No tracks to add to playlist');
        }

        // Get user profile
        const userProfile = await spotifyServiceRef.current.getUserProfile();
        const userId = userProfile.id;

        // Create new playlist
        const newPlaylist = await spotifyServiceRef.current.createPlaylist(
          userId,
          {
            name: playlistName.trim(),
            description: `Mixed playlist created with Spotify Playlist Mixer`,
            public: false,
          }
        );

        // Extract track URIs
        const trackUris = tracks
          .filter(track => {
            if (!track || !track.uri) {
              console.warn('Skipping track due to missing URI:', track);
              return false;
            }
            return true;
          })
          .map(track => track.uri);

        if (trackUris.length === 0) {
          throw new Error('No valid track URIs found');
        }

        // Add tracks to playlist
        await spotifyServiceRef.current.addTracksToPlaylist(newPlaylist.id, {
          uris: trackUris,
        });

        // Calculate total duration for display
        const totalDuration = tracks.reduce(
          (sum, track) => sum + (track.duration_ms || 0),
          0
        );
        const durationMinutes = Math.round(totalDuration / (1000 * 60));

        setState(prev => ({
          ...prev,
          loading: false,
        }));

        return {
          ...newPlaylist,
          tracks: { total: trackUris.length, href: '' },
          duration: durationMinutes,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        if (onError) {
          onError('Failed to create mixed playlist: ' + errorMessage);
        }

        throw err;
      }
    },
    [onError]
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      mixedTracks: [],
      exhaustedPlaylists: [],
      stoppedEarly: false,
    });
  }, []);

  return {
    state,
    generateMix,
    createPlaylist,
    reset,
  };
};
