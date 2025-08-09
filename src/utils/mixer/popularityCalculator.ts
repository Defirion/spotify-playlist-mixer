// Popularity and recency calculations
// This module handles all popularity-related calculations including recency boosts

import { SpotifyTrack } from '../../types/spotify';
import { PopularityData, TrackWithPopularity } from './types';

/**
 * Calculate recency bonus based on release date
 * Boost recent tracks (within 2 years) by up to 20 points
 * @param releaseDate - The release date of the track
 * @returns The recency bonus (0-20)
 */
export const calculateRecencyBonus = (releaseDate: Date): number => {
  const now = new Date();
  const daysSinceRelease =
    (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);

  // Boost recent tracks (within 2 years) by up to 20 points
  if (daysSinceRelease < 730) {
    // 2 years
    return Math.max(0, 20 * (1 - daysSinceRelease / 730));
  }

  return 0;
};

/**
 * Calculate adjusted popularity with optional recency boost
 * Moved from original playlistMixer.ts file
 * @param track - The Spotify track
 * @param recencyBoost - Whether to apply recency boost
 * @returns Popularity data with adjusted values
 */
export const calculateAdjustedPopularity = (
  track: SpotifyTrack,
  recencyBoost: boolean = false
): PopularityData => {
  const basePopularity = track.popularity || 0;

  if (!recencyBoost || !track.album?.release_date) {
    return {
      adjustedPopularity: basePopularity,
      basePopularity,
      recencyBonus: 0,
      releaseYear: track.album?.release_date
        ? new Date(track.album.release_date).getFullYear()
        : 'Unknown',
    };
  }

  const releaseDate = new Date(track.album.release_date);
  const rawRecencyBonus = calculateRecencyBonus(releaseDate);
  const roundedRecencyBonus = Math.round(rawRecencyBonus * 10) / 10; // Round to 1 decimal
  const adjustedPopularity = Math.min(100, basePopularity + rawRecencyBonus);

  return {
    adjustedPopularity,
    basePopularity,
    recencyBonus: roundedRecencyBonus,
    releaseYear: releaseDate.getFullYear(),
  };
};

/**
 * Sort tracks by adjusted popularity (highest first)
 * @param tracks - Array of tracks with popularity data
 * @returns Sorted array of tracks
 */
export const sortTracksByPopularity = (
  tracks: TrackWithPopularity[]
): TrackWithPopularity[] => {
  return [...tracks].sort(
    (a, b) => b.adjustedPopularity - a.adjustedPopularity
  );
};

/**
 * Get popularity statistics and metrics for debugging
 * @param tracks - Array of tracks with popularity data
 * @returns Object containing popularity metrics
 */
export const getPopularityMetrics = (
  tracks: TrackWithPopularity[]
): {
  totalTracks: number;
  averagePopularity: number;
  averageRecencyBonus: number;
  popularityRange: { min: number; max: number };
  recencyBonusRange: { min: number; max: number };
  releaseYearRange: { min: number | string; max: number | string };
  popularityDistribution: {
    topHits: number; // 80-100
    popular: number; // 60-79
    moderate: number; // 40-59
    deepCuts: number; // 0-39
  };
} => {
  if (tracks.length === 0) {
    return {
      totalTracks: 0,
      averagePopularity: 0,
      averageRecencyBonus: 0,
      popularityRange: { min: 0, max: 0 },
      recencyBonusRange: { min: 0, max: 0 },
      releaseYearRange: { min: 'Unknown', max: 'Unknown' },
      popularityDistribution: {
        topHits: 0,
        popular: 0,
        moderate: 0,
        deepCuts: 0,
      },
    };
  }

  const popularityValues = tracks.map(t => t.adjustedPopularity);
  const recencyBonusValues = tracks.map(t => t.recencyBonus);
  const releaseYears = tracks
    .map(t => t.releaseYear)
    .filter(year => typeof year === 'number') as number[];

  const averagePopularity =
    popularityValues.reduce((sum, val) => sum + val, 0) / tracks.length;
  const averageRecencyBonus =
    recencyBonusValues.reduce((sum, val) => sum + val, 0) / tracks.length;

  // Calculate distribution
  const distribution = {
    topHits: tracks.filter(t => t.adjustedPopularity >= 80).length,
    popular: tracks.filter(
      t => t.adjustedPopularity >= 60 && t.adjustedPopularity < 80
    ).length,
    moderate: tracks.filter(
      t => t.adjustedPopularity >= 40 && t.adjustedPopularity < 60
    ).length,
    deepCuts: tracks.filter(t => t.adjustedPopularity < 40).length,
  };

  return {
    totalTracks: tracks.length,
    averagePopularity: Math.round(averagePopularity * 10) / 10,
    averageRecencyBonus: Math.round(averageRecencyBonus * 10) / 10,
    popularityRange: {
      min: Math.min(...popularityValues),
      max: Math.max(...popularityValues),
    },
    recencyBonusRange: {
      min: Math.min(...recencyBonusValues),
      max: Math.max(...recencyBonusValues),
    },
    releaseYearRange: {
      min: releaseYears.length > 0 ? Math.min(...releaseYears) : 'Unknown',
      max: releaseYears.length > 0 ? Math.max(...releaseYears) : 'Unknown',
    },
    popularityDistribution: distribution,
  };
};
