// Playlist mixer utility - now delegates to the refactored modular structure
// This file maintains backward compatibility for existing imports
//
// @deprecated This file is deprecated. Please import from 'src/utils/mixer' instead.
// This compatibility layer will be removed in a future version.
//
// Migration guide:
// - Change: import { mixPlaylists } from '../utils/playlistMixer'
// - To:     import { mixPlaylists } from '../utils/mixer'

// Re-export the main mixing function from the new modular structure
export { mixPlaylists } from './mixer/playlistMixer';

// Re-export types that might be used by consumers
export type {
  PlaylistTracks,
  MixedTrack,
  PopularityPools,
  PopularityStrategy,
} from './mixer/types';

export type { MixingContext, MixingState } from './mixer/playlistMixer';

// Re-export utility functions that might be used
export {
  validateInputs,
  createMixingContext,
  calculateTargetCounts,
} from './mixer/playlistMixer';
