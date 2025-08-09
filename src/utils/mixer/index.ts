// Main export barrel for the playlist mixer modules

// Export the main mixing function
export { mixPlaylists } from './playlistMixer';

// Export types that might be needed by consumers
export type {
  TrackWithPopularity,
  PopularityData,
  PopularityQuadrants,
  PlaylistTracks,
  PopularityPools,
  MixedTrack,
  MixingContext,
  MixingState,
  QuadrantOptions,
  MixingStrategy,
  StrategyManager,
  PopularityCalculator,
  QuadrantManager,
  TrackShuffler,
  MixerUtils,
  MixerOrchestrator,
} from './types';

// Re-export relevant types from the main mixer types for convenience
export type { PopularityStrategy } from '../../types/mixer';
