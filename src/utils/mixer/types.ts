// Internal types and interfaces for the playlist mixer modules

import { SpotifyTrack } from '../../types/spotify';
import { PopularityStrategy } from '../../types/mixer';

// Extended track interface with popularity data
export interface TrackWithPopularity extends SpotifyTrack {
  adjustedPopularity: number;
  basePopularity: number;
  recencyBonus: number;
  releaseYear: number | string;
}

// Popularity data calculation result
export interface PopularityData {
  adjustedPopularity: number;
  basePopularity: number;
  recencyBonus: number;
  releaseYear: number | string;
}

// Popularity quadrants interface
export interface PopularityQuadrants {
  topHits: TrackWithPopularity[];
  popular: TrackWithPopularity[];
  moderate: TrackWithPopularity[];
  deepCuts: TrackWithPopularity[];
}

// Playlist tracks mapping
export interface PlaylistTracks {
  [playlistId: string]: SpotifyTrack[];
}

// Popularity pools mapping
export interface PopularityPools {
  [playlistId: string]: PopularityQuadrants;
}

// Extended track interface for mixed results
export interface MixedTrack extends SpotifyTrack {
  sourcePlaylist: string;
}

// Mixing context for orchestration
export interface MixingContext {
  playlistTracks: PlaylistTracks;
  ratioConfig: any; // Will use RatioConfig from mixer types
  options: any; // Will use MixOptions from mixer types
  popularityPools: PopularityPools;
  totalWeight: number;
  estimatedTotalSongs: number;
}

// Mixing state tracking
export interface MixingState {
  mixedTracks: MixedTrack[];
  playlistCounts: { [key: string]: number };
  playlistDurations: { [key: string]: number };
  playlistExhausted: { [key: string]: boolean };
  attempts: number;
}

// Quadrant options for creation
export interface QuadrantOptions {
  recencyBoost: boolean;
  shuffleWithinGroups: boolean;
}

// Strategy interface for mixing strategies
export interface MixingStrategy {
  name: PopularityStrategy;
  getTracksForPosition(
    popularityPools: PopularityPools,
    playlistId: string,
    position: number,
    totalLength: number
  ): TrackWithPopularity[];
}

// Strategy manager interface
export interface StrategyManager {
  getStrategy(strategyName: PopularityStrategy): MixingStrategy;
  getAllStrategies(): MixingStrategy[];
}

// Popularity calculator interface
export interface PopularityCalculator {
  calculateAdjustedPopularity(
    track: SpotifyTrack,
    recencyBoost: boolean
  ): PopularityData;

  calculateRecencyBonus(releaseDate: Date): number;

  sortTracksByPopularity(tracks: TrackWithPopularity[]): TrackWithPopularity[];
}

// Quadrant manager interface
export interface QuadrantManager {
  createPopularityQuadrants(
    tracks: SpotifyTrack[],
    recencyBoost: boolean
  ): PopularityQuadrants;

  createPopularityPools(
    playlistTracks: PlaylistTracks,
    options: QuadrantOptions
  ): PopularityPools;
}

// Track shuffler interface
export interface TrackShuffler {
  shuffleArray<T>(array: T[]): T[];
  shuffleQuadrants(quadrants: PopularityQuadrants): PopularityQuadrants;
  shuffleWithinGroups(popularityPools: PopularityPools): PopularityPools;
}

// Mixer utilities interface
export interface MixerUtils {
  safeObjectKeys(obj: any): string[];
  calculateTotalDuration(tracks: SpotifyTrack[]): number;
  validateTrack(track: SpotifyTrack): boolean;
  cleanPlaylistTracks(playlistTracks: PlaylistTracks): PlaylistTracks;
}

// Main mixer orchestrator interface
export interface MixerOrchestrator {
  mixPlaylists(
    playlistTracks: PlaylistTracks,
    ratioConfig: any, // Will use RatioConfig from mixer types
    options: any // Will use MixOptions from mixer types
  ): MixedTrack[];
}
