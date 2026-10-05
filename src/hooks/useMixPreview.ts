import { useState, useCallback, useRef, useEffect } from 'react';
import { mixPlaylistsWithResult as mixPlaylists } from '../utils/mixer';
import SpotifyGateway from '../services/spotifyGateway';
import { normalizeSpotifyPlaylist } from '../services/spotifyNormalizer';
import { Track } from '../types/domain';
import { SpotifyPlaylist, MixOptions, RatioConfig, MixedTrack } from '../types';

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

  const gatewayRef = useRef<SpotifyGateway | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Initialize the Spotify adapter
  useEffect(() => {
    requestRef.current?.abort();
    // Token renewal cancels in-flight loading without discarding an edited,
    // completed preview. Logging out still clears all preview data.
    setState(prev =>
      accessToken && prev.preview
        ? { ...prev, loading: false, error: null }
        : {
            preview: null,
            loading: false,
            error: null,
            customTrackOrder: null,
          }
    );
    if (accessToken) {
      gatewayRef.current = new SpotifyGateway(accessToken);
    } else {
      gatewayRef.current = null;
    }
    return () => {
      requestRef.current?.abort();
    };
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
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const service = gatewayRef.current;
      if (!service) {
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
        customTrackOrder: null,
      }));

      try {
        // Fetch all tracks from selected playlists
        const playlistTracks: Record<string, Track[]> = {};
        for (const playlist of selectedPlaylists) {
          const result = await service.getPlaylist(
            normalizeSpotifyPlaylist(playlist),
            {
              signal: controller.signal,
            }
          );
          if (controller.signal.aborted) return;
          playlistTracks[playlist.id] = result.tracks;
        }

        // Generate full sample using actual settings
        const mixResult = mixPlaylists(playlistTracks, ratioConfig, mixOptions);

        const { tracks, exhaustedPlaylists, stoppedEarly } = mixResult;
        const previewTracks = service.toDisplayTracks(tracks);

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
        if (controller.signal.aborted) return;
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
    requestRef.current?.abort();
    setState(prev => ({
      ...prev,
      loading: false,
      preview: null,
      customTrackOrder: null,
      error: null,
    }));
  }, []);

  const getPreviewTracks = useCallback((): MixedTrack[] => {
    // Return custom order if available, otherwise return original preview tracks
    if (state.customTrackOrder !== null) {
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
