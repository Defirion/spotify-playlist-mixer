// Main playlist mixer orchestrator.
//
// Spotify no longer returns catalog popularity. Mixing therefore operates on
// the tracks returned by each playlist and uses only the user's ratio and
// ordering choices.

import { MixResult } from '../../types/domain';
import { MixOptions, RatioConfig } from '../../types/mixer';
import { PlaylistTracks, PlaylistQueues, MixedTrack } from './types';
import {
  safeObjectKeys,
  cleanPlaylistTracks,
  calculateTotalDuration,
  logDebugInfo,
} from './mixerUtils';
import { shufflePlaylistTracks } from './trackShuffler';
import {
  shouldContinueMixing,
  shouldStopDueToExhaustion,
  getNextPlaylistId,
  addSongsFromPlaylist,
} from './mixingCalculations';

export interface MixingContext {
  playlistTracks: PlaylistTracks;
  playlistQueues: PlaylistQueues;
  ratioConfig: RatioConfig;
  options: MixOptions;
  playlistIds: string[];
  totalWeight: number;
}

interface MixingState {
  mixedTracks: MixedTrack[];
  playlistCounts: { [key: string]: number };
  playlistDurations: { [key: string]: number };
  playlistExhausted: { [key: string]: boolean };
  attempts: number;
}

const shouldShuffleTracks = (options: MixOptions): boolean =>
  Boolean(options.shuffleTracks);

export const createMixingContext = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions
): MixingContext => {
  const playlistIds = safeObjectKeys(ratioConfig).filter(id =>
    Array.isArray(playlistTracks[id])
  );
  const totalWeight = playlistIds.reduce(
    (sum, id) => sum + (ratioConfig[id].weight || 1),
    0
  );
  const playlistQueues = shouldShuffleTracks(options)
    ? shufflePlaylistTracks(playlistTracks)
    : Object.fromEntries(
        Object.entries(playlistTracks).map(([id, tracks]) => [id, [...tracks]])
      );

  return {
    playlistTracks,
    playlistQueues,
    ratioConfig,
    options,
    playlistIds,
    totalWeight,
  };
};

export const validateInputs = (
  playlistTracks: unknown,
  ratioConfig: unknown,
  options: MixOptions
): {
  isValid: boolean;
  errors: string[];
  cleanedPlaylistTracks: PlaylistTracks;
} => {
  const errors: string[] = [];
  if (!playlistTracks || safeObjectKeys(playlistTracks).length === 0) {
    errors.push('playlistTracks is empty or invalid');
  }
  if (!ratioConfig || safeObjectKeys(ratioConfig).length === 0) {
    errors.push('ratioConfig is empty or invalid');
  }
  if (!options) {
    errors.push('options is required');
  } else if (
    !options.useAllSongs &&
    options.useTimeLimit &&
    (!options.targetDurationSeconds || options.targetDurationSeconds <= 0)
  ) {
    errors.push(
      'targetDurationSeconds must be positive when useTimeLimit is true'
    );
  } else if (
    !options.useTimeLimit &&
    !options.useAllSongs &&
    (!options.totalSongs || options.totalSongs <= 0)
  ) {
    errors.push(
      'totalSongs must be positive when not using time limit or all songs'
    );
  }

  const cleanedPlaylistTracks = cleanPlaylistTracks(playlistTracks);
  if (safeObjectKeys(cleanedPlaylistTracks).length === 0) {
    errors.push('No valid playlists found after cleaning');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanedPlaylistTracks,
  };
};

export const mixPlaylistsWithResult = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions
): MixResult => {
  const validation = validateInputs(playlistTracks, ratioConfig, options);
  if (!validation.isValid)
    return { tracks: [], exhaustedPlaylists: [], stoppedEarly: false };

  const context = createMixingContext(
    Object.fromEntries(
      safeObjectKeys(playlistTracks).map(id => [
        id,
        validation.cleanedPlaylistTracks[id] || [],
      ])
    ),
    ratioConfig,
    options
  );
  const state = initializeMixingState(context);
  const maxAttempts = Math.max(
    1,
    Object.values(context.playlistQueues).reduce(
      (sum, tracks) => sum + tracks.length,
      0
    ) + context.playlistIds.length
  );
  const shouldContinue = () =>
    shouldContinueMixing(
      context.options,
      state.mixedTracks,
      state.playlistExhausted
    );

  while (shouldContinue() && state.attempts < maxAttempts) {
    state.attempts++;
    if (
      shouldStopDueToExhaustion(
        context.options.continueWhenPlaylistEmpty,
        state.playlistExhausted,
        context.playlistIds.length
      )
    ) {
      break;
    }

    const playlistId = getNextPlaylistId(
      context.ratioConfig,
      context.totalWeight,
      state.playlistCounts,
      state.playlistDurations,
      state.playlistExhausted,
      state.mixedTracks,
      context.playlistQueues,
      context.playlistIds
    );
    if (!playlistId) break;
    // Selection also discovers exhausted sources; honor the policy before
    // taking another group from a surviving source.
    if (
      shouldStopDueToExhaustion(
        context.options.continueWhenPlaylistEmpty,
        state.playlistExhausted,
        context.playlistIds.length
      )
    )
      break;

    const songsAdded = addSongsFromPlaylist(
      playlistId,
      context.ratioConfig,
      context.totalWeight,
      context.playlistQueues,
      state.mixedTracks,
      state.playlistCounts,
      state.playlistDurations,
      shouldContinue
    );
    if (songsAdded === 0) state.playlistExhausted[playlistId] = true;
  }

  logDebugInfo('info', `Mixed ${state.mixedTracks.length} tracks`);
  const usedIds = new Set(state.mixedTracks.map(track => track.id));
  const exhaustedPlaylists = context.playlistIds.filter(
    id => !context.playlistQueues[id].some(track => !usedIds.has(track.id))
  );
  const targetReached =
    !options.useAllSongs &&
    (options.useTimeLimit
      ? calculateTotalDuration(state.mixedTracks) / 1000 >=
        options.targetDurationSeconds
      : state.mixedTracks.length >= options.totalSongs);
  return {
    tracks: state.mixedTracks,
    exhaustedPlaylists,
    stoppedEarly:
      !targetReached &&
      exhaustedPlaylists.length > 0 &&
      (!options.useAllSongs ||
        (!options.continueWhenPlaylistEmpty &&
          exhaustedPlaylists.length < context.playlistIds.length)),
  };
};

const initializeMixingState = (context: MixingContext): MixingState => {
  const playlistCounts: Record<string, number> = {};
  const playlistDurations: Record<string, number> = {};
  const playlistExhausted: Record<string, boolean> = {};

  context.playlistIds.forEach(id => {
    playlistCounts[id] = 0;
    playlistDurations[id] = 0;
    playlistExhausted[id] = context.playlistQueues[id].length === 0;
  });

  return {
    mixedTracks: [],
    playlistCounts,
    playlistDurations,
    playlistExhausted,
    attempts: 0,
  };
};

/** Array convenience for callers that need only tracks. */
export const mixPlaylists = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions
): MixedTrack[] =>
  mixPlaylistsWithResult(playlistTracks, ratioConfig, options).tracks;
