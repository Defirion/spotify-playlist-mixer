// Main playlist mixer orchestrator
// This module coordinates the mixing process by delegating to specialized modules

import { MixOptions, RatioConfig } from '../../types/mixer';
import {
  PlaylistTracks,
  PopularityPools,
  MixedTrack,
  PopularityStrategy,
} from './types';
import {
  safeObjectKeys,
  cleanPlaylistTracks,
  logDebugInfo,
} from './mixerUtils';
import { createPopularityPools } from './popularityQuadrants';
import { createStrategyManager } from './mixingStrategies';

// Mixing context interface for initialization
export interface MixingContext {
  playlistTracks: PlaylistTracks;
  ratioConfig: RatioConfig;
  options: MixOptions;
  popularityPools: PopularityPools;
  playlistIds: string[];
  totalWeight: number;
  estimatedTotalSongs: number;
  targetCounts: { [key: string]: number };
}

// Mixing state interface for tracking progress
export interface MixingState {
  mixedTracks: MixedTrack[];
  playlistCounts: { [key: string]: number };
  playlistDurations: { [key: string]: number };
  playlistExhausted: { [key: string]: boolean };
  attempts: number;
}

/**
 * Create mixing context with all necessary data for the mixing process
 */
export const createMixingContext = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions
): MixingContext => {
  logDebugInfo('info', '🎵 Creating mixing context', {
    playlistCount: safeObjectKeys(playlistTracks).length,
    strategy: options.popularityStrategy,
    recencyBoost: options.recencyBoost,
  });

  // Create popularity pools for each playlist
  const popularityPools = createPopularityPools(playlistTracks, {
    recencyBoost: options.recencyBoost,
    shuffleWithinGroups: options.shuffleWithinGroups,
  });

  // Get valid playlist IDs
  const playlistIds = safeObjectKeys(ratioConfig).filter(
    id => playlistTracks[id] && playlistTracks[id].length > 0
  );

  // Calculate total weight
  const totalWeight = playlistIds.reduce(
    (sum, id) => sum + (ratioConfig[id].weight || 1),
    0
  );

  // Import and use calculation module
  const { calculateTargetCounts } = require('./mixingCalculations');
  const { estimatedTotalSongs, targetCounts } = calculateTargetCounts(
    playlistTracks,
    ratioConfig,
    options,
    playlistIds,
    totalWeight
  );

  return {
    playlistTracks,
    ratioConfig,
    options,
    popularityPools,
    playlistIds,
    totalWeight,
    estimatedTotalSongs,
    targetCounts,
  };
};

/**
 * Validate inputs for the mixing process
 */
export const validateInputs = (
  playlistTracks: any,
  ratioConfig: any,
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
  } else {
    if (
      options.useTimeLimit &&
      (!options.targetDuration || options.targetDuration <= 0)
    ) {
      errors.push('targetDuration must be positive when useTimeLimit is true');
    }
    if (
      !options.useTimeLimit &&
      !options.useAllSongs &&
      (!options.totalSongs || options.totalSongs <= 0)
    ) {
      errors.push(
        'totalSongs must be positive when not using time limit or all songs'
      );
    }
  }

  const cleanedPlaylistTracks = cleanPlaylistTracks(playlistTracks);

  if (safeObjectKeys(cleanedPlaylistTracks).length === 0) {
    errors.push('No valid playlists found after cleaning');
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    logDebugInfo('error', 'Input validation failed', { errors });
  }

  return { isValid, errors, cleanedPlaylistTracks };
};

// Re-export from calculations module for backward compatibility
export { calculateTargetCounts } from './mixingCalculations';

/**
 * Main playlist mixing function - orchestrates the entire mixing process
 */
export const mixPlaylists = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions
): MixedTrack[] => {
  logDebugInfo('info', '=== POPULARITY-AWARE MIXER ===');

  // Validate inputs
  const validation = validateInputs(playlistTracks, ratioConfig, options);
  if (!validation.isValid) {
    return [];
  }

  // Create mixing context
  const context = createMixingContext(
    validation.cleanedPlaylistTracks,
    ratioConfig,
    options
  );

  // Initialize mixing state
  const state = initializeMixingState(context);

  // Get strategy and execute mixing
  const strategyManager = createStrategyManager();
  const strategy = strategyManager.getStrategy(
    options.popularityStrategy as PopularityStrategy
  );

  return executeMixingLoop(context, state, strategy);
};

/**
 * Initialize mixing state with empty values
 */
const initializeMixingState = (context: MixingContext): MixingState => {
  const playlistCounts: { [key: string]: number } = {};
  const playlistDurations: { [key: string]: number } = {};
  const playlistExhausted: { [key: string]: boolean } = {};

  context.playlistIds.forEach(playlistId => {
    playlistCounts[playlistId] = 0;
    playlistDurations[playlistId] = 0;
    playlistExhausted[playlistId] = false;
  });

  return {
    mixedTracks: [],
    playlistCounts,
    playlistDurations,
    playlistExhausted,
    attempts: 0,
  };
};

/**
 * Execute the main mixing loop
 */
const executeMixingLoop = (
  context: MixingContext,
  state: MixingState,
  strategy: any
): MixedTrack[] => {
  const {
    shouldContinueMixing,
    shouldStopDueToExhaustion,
    getNextPlaylistId,
    addSongsFromPlaylist,
  } = require('./mixingCalculations');

  const maxAttempts = context.options.useAllSongs
    ? context.estimatedTotalSongs * 2
    : (context.options.totalSongs || 100) * 10;

  const shouldContinue = () =>
    shouldContinueMixing(
      context.options,
      state.mixedTracks,
      context.estimatedTotalSongs,
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

    const selectedPlaylistId = getNextPlaylistId(
      context.ratioConfig,
      context.totalWeight,
      state.playlistCounts,
      state.playlistDurations,
      state.playlistExhausted,
      state.mixedTracks,
      context.popularityPools,
      context.estimatedTotalSongs,
      strategy,
      context.playlistIds
    );

    if (!selectedPlaylistId) break;

    const songsAdded = addSongsFromPlaylist(
      selectedPlaylistId,
      context.ratioConfig,
      context.totalWeight,
      context.popularityPools,
      context.estimatedTotalSongs,
      strategy,
      state.mixedTracks,
      state.playlistCounts,
      state.playlistDurations,
      shouldContinue
    );

    if (songsAdded === 0) {
      state.playlistExhausted[selectedPlaylistId] = true;
    }
  }

  logDebugInfo(
    'info',
    `🎵 Mixing complete: ${state.mixedTracks.length} tracks in ${state.attempts} attempts`
  );
  return state.mixedTracks;
};
