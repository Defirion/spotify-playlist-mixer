import { useState, useCallback, useRef, useEffect } from 'react';
import { mixPlaylistsWithResult as mixPlaylists } from '../utils/mixer';
import SpotifyGateway from '../services/spotifyGateway';
import { normalizeSpotifyPlaylist } from '../services/spotifyNormalizer';
import { Track } from '../types/domain';
import { SpotifyPlaylist, MixOptions, RatioConfig, MixedTrack } from '../types';

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
  onEvent?: (event: MixGenerationEvent) => void;
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

export type MixGenerationEvent =
  | { type: 'playlistEmpty'; playlistId: string; name?: string }
  | {
      type: 'playlistFetchFailed';
      playlistId: string;
      name?: string;
      error: string;
    }
  | {
      type: 'mixingStoppedEarly';
      exhaustedPlaylists: string[];
      names: string[];
    }
  | { type: 'skippingTrackMissingUri'; track: any }
  | { type: 'noValidTrackUris' };

/**
 * JSDoc - Events and staleness guarantees
 *
 * Events emitted via the optional `onEvent` callback have the discriminated
 * union shape `MixGenerationEvent` (above). Consumers can switch on `event.type`
 * and expect the listed properties to be present for each variant.
 *
 * Staleness / cancellation behavior:
 * - Each call to `generateMix` increments an internal call id. If a newer
 *   invocation starts before an earlier one finishes, the earlier call will
 *   be canceled and reject with AbortError without updating state or calling
 *   `onSuccess`/`onError`. The latest call owns state updates.
 * - When the `accessToken` prop changes, an internal token version is bumped.
 *   Any in-flight `generateMix` that started with a previous token version will
 *   also be treated as stale and prevented from mutating hook state.
 */

/**
 * Custom hook for handling playlist mixing logic
 * Encapsulates the complex business logic for generating mixed playlists
 */
export const useMixGeneration = (
  accessToken: string,
  options: UseMixGenerationOptions = {}
): UseMixGenerationReturn => {
  const { onError, onSuccess, onEvent } = options;

  const [state, setState] = useState<MixGenerationState>({
    loading: false,
    error: null,
    mixedTracks: [],
    exhaustedPlaylists: [],
    stoppedEarly: false,
  });

  const gatewayRef = useRef<SpotifyGateway | null>(null);
  const currentCallIdRef = useRef(0); // per-generateMix invocation guard
  const tokenVersionRef = useRef(0); // increments when accessToken changes
  const requestRef = useRef<AbortController | null>(null);
  const savingRef = useRef(false);

  const dispatchEvent = useCallback(
    (e: MixGenerationEvent) => {
      if (onEvent) {
        try {
          onEvent(e);
        } catch {
          /* swallow */
        }
      }
    },
    [onEvent]
  );

  // Initialize the Spotify adapter
  useEffect(() => {
    requestRef.current?.abort();
    setState(prev => ({ ...prev, loading: savingRef.current }));
    if (accessToken) {
      gatewayRef.current = new SpotifyGateway(accessToken);
    } else {
      gatewayRef.current = null;
    }
    tokenVersionRef.current++; // bump version so stale calls abort
    return () => {
      requestRef.current?.abort();
    };
  }, [accessToken]);

  const generateMix = useCallback(
    async (
      selectedPlaylists: SpotifyPlaylist[],
      ratioConfig: RatioConfig,
      mixOptions: MixOptions
    ): Promise<MixedTrack[]> => {
      // increment call id for this invocation
      const callId = ++currentCallIdRef.current;
      const startTokenVersion = tokenVersionRef.current;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const service = gatewayRef.current;
      if (!gatewayRef.current) {
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

        // Fetch all tracks in parallel (Promise.allSettled for robust partial failure handling)
        const fetchSpecs = selectedPlaylists.map(pl => ({
          playlist: pl,
          promise: service!.getPlaylist(normalizeSpotifyPlaylist(pl), {
            signal: controller.signal,
          }),
        }));

        const settledResults = await Promise.allSettled(
          fetchSpecs.map(f => f.promise)
        );
        if (controller.signal.aborted)
          throw new DOMException('Request canceled', 'AbortError');

        const playlistTracks: Record<string, Track[]> = {};
        settledResults.forEach((res, idx) => {
          const { playlist } = fetchSpecs[idx];
          if (res.status === 'fulfilled') {
            const result = res.value;
            if (result.tracks.length === 0) {
              console.warn(`Playlist ${playlist.name} has no tracks`);
              dispatchEvent({
                type: 'playlistEmpty',
                playlistId: playlist.id,
                name: playlist.name,
              });
            }
            playlistTracks[playlist.id] = result.tracks;
          } else {
            console.error(
              `Failed to fetch tracks from ${playlist.name}:`,
              res.reason
            );
            dispatchEvent({
              type: 'playlistFetchFailed',
              playlistId: playlist.id,
              name: playlist.name,
              error:
                res.reason instanceof Error
                  ? res.reason.message
                  : String(res.reason),
            });
            playlistTracks[playlist.id] = [];
          }
        });
        const failedSources = settledResults.flatMap((result, index) =>
          result.status === 'rejected' ? [selectedPlaylists[index].name] : []
        );
        if (failedSources.length > 0)
          throw new Error(
            `Could not load ${failedSources.join(', ')}. The mix was not generated; check playlist access and retry.`
          );

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

        // Keep canonical results separate from editor DTOs
        const {
          tracks: domainTracks,
          exhaustedPlaylists,
          stoppedEarly,
        } = mixResult;
        const mixedTracks = service!.toDisplayTracks(domainTracks);

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
          dispatchEvent({
            type: 'mixingStoppedEarly',
            exhaustedPlaylists,
            names: exhaustedPlaylists.map(
              id => selectedPlaylists.find(p => p.id === id)?.name || id
            ),
          });
        }

        // If this call is stale (a newer generateMix started), do not update state
        if (
          callId !== currentCallIdRef.current ||
          startTokenVersion !== tokenVersionRef.current
        ) {
          return mixedTracks;
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
        // Only update state / call onError for the latest invocation
        if (
          callId === currentCallIdRef.current &&
          startTokenVersion === tokenVersionRef.current &&
          !controller.signal.aborted
        ) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));

          if (onError) {
            onError(errorMessage);
          }
        }

        throw err;
      }
    },
    [onError, onSuccess, dispatchEvent]
  );

  const createPlaylist = useCallback(
    async (playlistName: string, tracks: MixedTrack[]) => {
      if (savingRef.current)
        throw new Error('A playlist save is already in progress');
      const service = gatewayRef.current;
      const tokenVersion = tokenVersionRef.current;
      if (!gatewayRef.current) {
        throw new Error('Spotify service not available');
      }
      savingRef.current = true;

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

        // Extract track URIs
        const trackUris = tracks
          .filter(track => {
            if (!track || !track.uri) {
              console.warn('Skipping track due to missing URI:', track);
              dispatchEvent({ type: 'skippingTrackMissingUri', track });
              return false;
            }
            return true;
          })
          .map(track => track.uri);

        if (trackUris.length === 0) {
          dispatchEvent({ type: 'noValidTrackUris' });
          throw new Error('No valid track URIs found');
        }

        const newPlaylist = await service!.saveDisplayPlaylist(
          playlistName.trim(),
          tracks.filter(track => track && track.uri),
          { isSessionCurrent: () => tokenVersion === tokenVersionRef.current }
        );

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
          items: { total: trackUris.length, href: '' },
          duration: durationMinutes,
        };
      } catch (err) {
        const originalMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        const errorMessage = originalMessage;
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        if (onError) {
          onError('Failed to create mixed playlist: ' + errorMessage);
        }

        throw err;
      } finally {
        savingRef.current = false;
      }
    },
    [onError, dispatchEvent]
  );

  const reset = useCallback(() => {
    requestRef.current?.abort();
    currentCallIdRef.current++;
    setState({
      loading: savingRef.current,
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
