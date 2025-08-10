import { useState, useCallback, useRef, useEffect } from 'react';
import { mixPlaylists } from '../utils/mixer';
import SpotifyService from '../services/spotify';
import {
  SpotifyPlaylist,
  SpotifyTrack,
  MixOptions,
  RatioConfig,
  MixedTrack,
} from '../types';

interface PlaylistStats {
  [playlistId: string]: {
    name: string;
    count: number;
    totalDuration: number;
  };
}

interface MixPreview {
  tracks: MixedTrack[];
  stats: PlaylistStats;
  totalDuration: number;
  usedStrategy: string;
  exhaustedPlaylists: string[];
  stoppedEarly: boolean;
}

interface MixPreviewState {
  preview: MixPreview | null;
  loading: boolean;
  error: string | null;
  customTrackOrder: MixedTrack[] | null;
}

interface UseMixPreviewOptions {
  onError?: (error: string) => void;
}

interface UseMixPreviewReturn {
  state: MixPreviewState;
  generatePreview: (
    selectedPlaylists: SpotifyPlaylist[],
    ratioConfig: RatioConfig,
    mixOptions: MixOptions
  ) => Promise<void>;
  updateTrackOrder: (reorderedTracks: MixedTrack[]) => void;
  clearPreview: () => void;
  getPreviewTracks: () => MixedTrack[];
}

/**
 * Custom hook for handling mix preview functionality
 * Manages preview generation, track reordering, and statistics calculation
 */
export const useMixPreview = (
  accessToken: string,
  options: UseMixPreviewOptions = {}
): UseMixPreviewReturn => {
  const { onError } = options;

  const [state, setState] = useState<MixPreviewState>({
    preview: null,
    loading: false,
    error: null,
    customTrackOrder: null,
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

  const calculatePlaylistStats = useCallback(
    (
      tracks: MixedTrack[],
      selectedPlaylists: SpotifyPlaylist[]
    ): PlaylistStats => {
      const stats: PlaylistStats = {};

      // Calculate stats for each selected playlist
      selectedPlaylists.forEach(playlist => {
        const playlistTracks = tracks.filter(
          track => track && track.sourcePlaylist === playlist.id
        );

        stats[playlist.id] = {
          name: playlist.name,
          count: playlistTracks.length,
          totalDuration: playlistTracks.reduce(
            (sum, track) => sum + (track.duration_ms || 0),
            0
          ),
        };
      });

      // Add Spotify Search stats if there are any search tracks
      const searchTracks = tracks.filter(
        track => track && track.sourcePlaylist === 'search'
      );
      if (searchTracks.length > 0) {
        stats['search'] = {
          name: '🔍 Spotify Search',
          count: searchTracks.length,
          totalDuration: searchTracks.reduce(
            (sum, track) => sum + (track.duration_ms || 0),
            0
          ),
        };
      }

      return stats;
    },
    []
  );

  const generatePreview = useCallback(
    async (
      selectedPlaylists: SpotifyPlaylist[],
      ratioConfig: RatioConfig,
      mixOptions: MixOptions
    ): Promise<void> => {
      if (!spotifyServiceRef.current) {
        const error = 'Spotify service not available';
        setState(prev => ({ ...prev, error }));
        if (onError) onError(error);
        return;
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        preview: null,
      }));

      try {
        // Fetch all tracks from selected playlists
        const playlistTracks: Record<string, SpotifyTrack[]> = {};
        for (const playlist of selectedPlaylists) {
          const result = await spotifyServiceRef.current.getPlaylistTracks(
            playlist.id
          );
          playlistTracks[playlist.id] = result.tracks;
        }

        // Generate full sample using actual settings
        const mixResult = mixPlaylists(playlistTracks, ratioConfig, mixOptions);

        // Handle different return types from mixPlaylists
        let previewTracks: MixedTrack[] = [];
        let exhaustedPlaylists: string[] = [];
        let stoppedEarly = false;

        if (mixResult === null || mixResult === undefined) {
          console.error('mixResult is null or undefined');
          previewTracks = [];
        } else if (Array.isArray(mixResult)) {
          previewTracks = [...mixResult];
          exhaustedPlaylists = (mixResult as any).exhaustedPlaylists || [];
          stoppedEarly = (mixResult as any).stoppedEarly || false;
        } else if (mixResult && typeof mixResult === 'object') {
          const resultObj = mixResult as any;
          if (Array.isArray(resultObj.tracks)) {
            previewTracks = [...resultObj.tracks];
          } else {
            console.error(
              'mixResult.tracks is not an array:',
              resultObj.tracks
            );
            previewTracks = [];
          }
          exhaustedPlaylists = resultObj.exhaustedPlaylists || [];
          stoppedEarly = resultObj.stoppedEarly || false;
        } else {
          console.error(
            'mixResult is not an array or object:',
            typeof mixResult,
            mixResult
          );
          previewTracks = [];
        }

        // Final safety check
        if (!Array.isArray(previewTracks)) {
          console.error('previewTracks is not an array after processing!');
          previewTracks = [];
        }

        // Calculate statistics
        const playlistStats = calculatePlaylistStats(
          previewTracks,
          selectedPlaylists
        );
        const totalDuration = previewTracks.reduce(
          (sum, track) =>
            sum + (track && track.duration_ms ? track.duration_ms : 0),
          0
        );

        const preview: MixPreview = {
          tracks: previewTracks,
          stats: playlistStats,
          totalDuration,
          usedStrategy: mixOptions.popularityStrategy,
          exhaustedPlaylists,
          stoppedEarly,
        };

        setState(prev => ({
          ...prev,
          loading: false,
          preview,
          customTrackOrder: null, // Reset custom order when generating new preview
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        if (onError) {
          onError('Failed to generate preview: ' + errorMessage);
        }
      }
    },
    [calculatePlaylistStats, onError]
  );

  const updateTrackOrder = useCallback(
    (reorderedTracks: MixedTrack[]) => {
      setState(prev => {
        if (!prev.preview) return prev;

        // Recalculate stats for the updated track list
        const selectedPlaylists = Object.keys(prev.preview.stats)
          .filter(id => id !== 'search')
          .map(id => ({
            id,
            name: prev.preview!.stats[id].name,
          })) as SpotifyPlaylist[];

        const updatedStats = calculatePlaylistStats(
          reorderedTracks,
          selectedPlaylists
        );

        // Add search tracks stats if they exist
        const searchTracks = reorderedTracks.filter(
          track => track && track.sourcePlaylist === 'search'
        );
        if (searchTracks.length > 0) {
          updatedStats['search'] = {
            name: '🔍 Spotify Search',
            count: searchTracks.length,
            totalDuration: searchTracks.reduce(
              (sum, track) => sum + (track.duration_ms || 0),
              0
            ),
          };
        }

        const totalDuration = reorderedTracks.reduce(
          (sum, track) =>
            sum + (track && track.duration_ms ? track.duration_ms : 0),
          0
        );

        const updatedPreview: MixPreview = {
          ...prev.preview,
          tracks: reorderedTracks,
          stats: updatedStats,
          totalDuration,
        };

        return {
          ...prev,
          preview: updatedPreview,
          customTrackOrder: reorderedTracks,
        };
      });
    },
    [calculatePlaylistStats]
  );

  const clearPreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      preview: null,
      customTrackOrder: null,
      error: null,
    }));
  }, []);

  const getPreviewTracks = useCallback((): MixedTrack[] => {
    // Return custom order if available, otherwise return original preview tracks
    if (state.customTrackOrder && state.customTrackOrder.length > 0) {
      return state.customTrackOrder;
    }
    return state.preview?.tracks || [];
  }, [state.customTrackOrder, state.preview]);

  return {
    state,
    generatePreview,
    updateTrackOrder,
    clearPreview,
    getPreviewTracks,
  };
};
