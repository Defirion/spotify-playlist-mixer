// Internal types and interfaces for the mixer modules

import { SpotifyTrack } from '../../types/spotify';

// Popularity data interface
export interface PopularityData {
  adjustedPopularity: number;
  basePopularity: number;
  recencyBonus: number;
  releaseYear: number | string;
}

// Extended track interface with popularity data
export interface TrackWithPopularity extends SpotifyTrack {
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

// Debug information interface
export interface DebugInfo {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Popularity strategy types
export type PopularityStrategy =
  | 'mixed'
  | 'front-loaded'
  | 'mid-peak'
  | 'crescendo';

// Mixing strategy interface for strategy pattern
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

// Options for quadrant creation
export interface QuadrantOptions {
  recencyBoost: boolean;
  shuffleWithinGroups: boolean;
}
