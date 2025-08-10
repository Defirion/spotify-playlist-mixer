// Popularity quadrants management
// This module handles the creation and management of popularity-based track quadrants

import { SpotifyTrack } from '../../types/spotify';
import {
  PopularityQuadrants,
  PopularityPools,
  PlaylistTracks,
  TrackWithPopularity,
  QuadrantOptions,
} from './types';
import {
  calculateAdjustedPopularity,
  sortTracksByPopularity,
} from './popularityCalculator';
import { conditionalShuffleQuadrants } from './trackShuffler';
import { safeObjectKeys, logDebugInfo } from './mixerUtils';

/**
 * Divide tracks into popularity quadrants based on adjusted popularity
 * Moved from original playlistMixer.ts file
 * @param tracks - Array of Spotify tracks to divide into quadrants
 * @param recencyBoost - Whether to apply recency boost to popularity calculations
 * @returns PopularityQuadrants object with tracks divided into four tiers
 */
export const createPopularityQuadrants = (
  tracks: SpotifyTrack[],
  recencyBoost: boolean = false
): PopularityQuadrants => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    logDebugInfo(
      'warn',
      'createPopularityQuadrants received empty or invalid tracks array'
    );
    return {
      topHits: [],
      popular: [],
      moderate: [],
      deepCuts: [],
    };
  }

  // Calculate adjusted popularity for all tracks
  const tracksWithPopularity: TrackWithPopularity[] = tracks.map(track => {
    const popularityData = calculateAdjustedPopularity(track, recencyBoost);
    return {
      ...track,
      ...popularityData,
    };
  });

  // Sort by adjusted popularity (highest first)
  const sortedTracks = sortTracksByPopularity(tracksWithPopularity);

  const totalTracks = sortedTracks.length;
  const quarterSize = Math.ceil(totalTracks / 4);

  const quadrants: PopularityQuadrants = {
    topHits: sortedTracks.slice(0, quarterSize), // 0-25% (most popular)
    popular: sortedTracks.slice(quarterSize, quarterSize * 2), // 25-50%
    moderate: sortedTracks.slice(quarterSize * 2, quarterSize * 3), // 50-75%
    deepCuts: sortedTracks.slice(quarterSize * 3), // 75-100% (least popular)
  };

  // Log quadrant information with relative rankings (development only)
  if (process.env.NODE_ENV === 'development') {
    logDebugInfo(
      'info',
      `📊 Popularity Quadrants Created (relative to this playlist):`
    );
    logDebugInfo(
      'info',
      `  🔥 Top Hits: ${quadrants.topHits.length} tracks (${Math.round(quadrants.topHits[quadrants.topHits.length - 1]?.adjustedPopularity || 0)}-${Math.round(quadrants.topHits[0]?.adjustedPopularity || 0)} popularity)`
    );
    logDebugInfo(
      'info',
      `  ⭐ Popular: ${quadrants.popular.length} tracks (${Math.round(quadrants.popular[quadrants.popular.length - 1]?.adjustedPopularity || 0)}-${Math.round(quadrants.popular[0]?.adjustedPopularity || 0)} popularity)`
    );
    logDebugInfo(
      'info',
      `  📻 Moderate: ${quadrants.moderate.length} tracks (${Math.round(quadrants.moderate[quadrants.moderate.length - 1]?.adjustedPopularity || 0)}-${Math.round(quadrants.moderate[0]?.adjustedPopularity || 0)} popularity)`
    );
    logDebugInfo(
      'info',
      `  💎 Deep Cuts: ${quadrants.deepCuts.length} tracks (${Math.round(quadrants.deepCuts[quadrants.deepCuts.length - 1]?.adjustedPopularity || 0)}-${Math.round(quadrants.deepCuts[0]?.adjustedPopularity || 0)} popularity)`
    );
  }

  return quadrants;
};

/**
 * Create popularity-based track pools for each playlist
 * Moved from original playlistMixer.ts file
 * @param playlistTracks - Object mapping playlist IDs to track arrays
 * @param options - Options for quadrant creation including recency boost and shuffling
 * @returns PopularityPools object with quadrants for each playlist
 */
export const createPopularityPools = (
  playlistTracks: PlaylistTracks,
  options: QuadrantOptions
): PopularityPools => {
  if (!playlistTracks || typeof playlistTracks !== 'object') {
    logDebugInfo(
      'warn',
      'createPopularityPools received invalid playlistTracks'
    );
    return {};
  }

  const { recencyBoost, shuffleWithinGroups } = options;
  const popularityPools: PopularityPools = {};

  safeObjectKeys(playlistTracks).forEach(playlistId => {
    const tracks = playlistTracks[playlistId];

    if (!Array.isArray(tracks) || tracks.length === 0) {
      popularityPools[playlistId] = {
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      };
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      logDebugInfo(
        'info',
        `🎼 Processing playlist: ${playlistId} (${tracks.length} tracks)`
      );
    }

    // Create quadrants - this is now relative to THIS playlist only
    const quadrants = createPopularityQuadrants(tracks, recencyBoost);

    // Shuffle within quadrants if requested
    const finalQuadrants = conditionalShuffleQuadrants(
      quadrants,
      shuffleWithinGroups
    );

    popularityPools[playlistId] = finalQuadrants;
  });

  return popularityPools;
};

/**
 * Get statistics about quadrant distribution for debugging
 * @param quadrants - Popularity quadrants to analyze
 * @returns Object containing statistics about the quadrants
 */
export const getQuadrantStats = (
  quadrants: PopularityQuadrants
): {
  totalTracks: number;
  quadrantCounts: {
    topHits: number;
    popular: number;
    moderate: number;
    deepCuts: number;
  };
  quadrantPercentages: {
    topHits: number;
    popular: number;
    moderate: number;
    deepCuts: number;
  };
  popularityRanges: {
    topHits: { min: number; max: number };
    popular: { min: number; max: number };
    moderate: { min: number; max: number };
    deepCuts: { min: number; max: number };
  };
  averagePopularityByQuadrant: {
    topHits: number;
    popular: number;
    moderate: number;
    deepCuts: number;
  };
} => {
  const totalTracks =
    quadrants.topHits.length +
    quadrants.popular.length +
    quadrants.moderate.length +
    quadrants.deepCuts.length;

  if (totalTracks === 0) {
    return {
      totalTracks: 0,
      quadrantCounts: { topHits: 0, popular: 0, moderate: 0, deepCuts: 0 },
      quadrantPercentages: { topHits: 0, popular: 0, moderate: 0, deepCuts: 0 },
      popularityRanges: {
        topHits: { min: 0, max: 0 },
        popular: { min: 0, max: 0 },
        moderate: { min: 0, max: 0 },
        deepCuts: { min: 0, max: 0 },
      },
      averagePopularityByQuadrant: {
        topHits: 0,
        popular: 0,
        moderate: 0,
        deepCuts: 0,
      },
    };
  }

  const getQuadrantRange = (tracks: TrackWithPopularity[]) => {
    if (tracks.length === 0) return { min: 0, max: 0 };
    const popularities = tracks.map(t => t.adjustedPopularity);
    return {
      min: Math.min(...popularities),
      max: Math.max(...popularities),
    };
  };

  const getQuadrantAverage = (tracks: TrackWithPopularity[]) => {
    if (tracks.length === 0) return 0;
    const sum = tracks.reduce(
      (acc, track) => acc + track.adjustedPopularity,
      0
    );
    return Math.round((sum / tracks.length) * 10) / 10;
  };

  return {
    totalTracks,
    quadrantCounts: {
      topHits: quadrants.topHits.length,
      popular: quadrants.popular.length,
      moderate: quadrants.moderate.length,
      deepCuts: quadrants.deepCuts.length,
    },
    quadrantPercentages: {
      topHits: Math.round((quadrants.topHits.length / totalTracks) * 100),
      popular: Math.round((quadrants.popular.length / totalTracks) * 100),
      moderate: Math.round((quadrants.moderate.length / totalTracks) * 100),
      deepCuts: Math.round((quadrants.deepCuts.length / totalTracks) * 100),
    },
    popularityRanges: {
      topHits: getQuadrantRange(quadrants.topHits),
      popular: getQuadrantRange(quadrants.popular),
      moderate: getQuadrantRange(quadrants.moderate),
      deepCuts: getQuadrantRange(quadrants.deepCuts),
    },
    averagePopularityByQuadrant: {
      topHits: getQuadrantAverage(quadrants.topHits),
      popular: getQuadrantAverage(quadrants.popular),
      moderate: getQuadrantAverage(quadrants.moderate),
      deepCuts: getQuadrantAverage(quadrants.deepCuts),
    },
  };
};

/**
 * Validate that quadrants are properly formed and contain valid data
 * @param quadrants - Popularity quadrants to validate
 * @returns Object containing validation results and any issues found
 */
export const validateQuadrants = (
  quadrants: PopularityQuadrants
): {
  isValid: boolean;
  issues: string[];
  totalTracks: number;
  hasEmptyQuadrants: boolean;
  popularityOrderCorrect: boolean;
} => {
  const issues: string[] = [];
  let isValid = true;

  // Check if quadrants object has all required properties
  const requiredQuadrants = ['topHits', 'popular', 'moderate', 'deepCuts'];
  for (const quadrant of requiredQuadrants) {
    if (!quadrants[quadrant as keyof PopularityQuadrants]) {
      issues.push(`Missing quadrant: ${quadrant}`);
      isValid = false;
    } else if (
      !Array.isArray(quadrants[quadrant as keyof PopularityQuadrants])
    ) {
      issues.push(`Quadrant ${quadrant} is not an array`);
      isValid = false;
    }
  }

  if (!isValid) {
    return {
      isValid: false,
      issues,
      totalTracks: 0,
      hasEmptyQuadrants: true,
      popularityOrderCorrect: false,
    };
  }

  const totalTracks =
    quadrants.topHits.length +
    quadrants.popular.length +
    quadrants.moderate.length +
    quadrants.deepCuts.length;

  const hasEmptyQuadrants =
    quadrants.topHits.length === 0 ||
    quadrants.popular.length === 0 ||
    quadrants.moderate.length === 0 ||
    quadrants.deepCuts.length === 0;

  // Check if tracks in each quadrant have valid popularity data
  const validateQuadrantTracks = (
    tracks: TrackWithPopularity[],
    quadrantName: string
  ) => {
    tracks.forEach((track, index) => {
      if (typeof track.adjustedPopularity !== 'number') {
        issues.push(
          `Track ${index} in ${quadrantName} missing adjustedPopularity`
        );
        isValid = false;
      }
      if (!track.id || !track.uri) {
        issues.push(
          `Track ${index} in ${quadrantName} missing required properties`
        );
        isValid = false;
      }
    });
  };

  validateQuadrantTracks(quadrants.topHits, 'topHits');
  validateQuadrantTracks(quadrants.popular, 'popular');
  validateQuadrantTracks(quadrants.moderate, 'moderate');
  validateQuadrantTracks(quadrants.deepCuts, 'deepCuts');

  // Check if popularity order is correct (topHits should have highest, deepCuts lowest)
  let popularityOrderCorrect = true;
  if (totalTracks > 0) {
    const getAveragePopularity = (tracks: TrackWithPopularity[]) => {
      if (tracks.length === 0) return 0;
      return (
        tracks.reduce((sum, track) => sum + track.adjustedPopularity, 0) /
        tracks.length
      );
    };

    const avgTopHits = getAveragePopularity(quadrants.topHits);
    const avgPopular = getAveragePopularity(quadrants.popular);
    const avgModerate = getAveragePopularity(quadrants.moderate);
    const avgDeepCuts = getAveragePopularity(quadrants.deepCuts);

    if (
      !(
        avgTopHits >= avgPopular &&
        avgPopular >= avgModerate &&
        avgModerate >= avgDeepCuts
      )
    ) {
      issues.push('Popularity order is incorrect across quadrants');
      popularityOrderCorrect = false;
    }
  }

  return {
    isValid,
    issues,
    totalTracks,
    hasEmptyQuadrants,
    popularityOrderCorrect,
  };
};

/**
 * Get detailed information about all popularity pools for debugging
 * @param popularityPools - Popularity pools for all playlists
 * @returns Object containing detailed statistics for each playlist
 */
export const getPopularityPoolsStats = (
  popularityPools: PopularityPools
): {
  totalPlaylists: number;
  totalTracks: number;
  playlistStats: {
    [playlistId: string]: ReturnType<typeof getQuadrantStats>;
  };
  overallDistribution: {
    topHits: number;
    popular: number;
    moderate: number;
    deepCuts: number;
  };
} => {
  const playlistIds = safeObjectKeys(popularityPools);
  const playlistStats: {
    [playlistId: string]: ReturnType<typeof getQuadrantStats>;
  } = {};

  let totalTracks = 0;
  let totalTopHits = 0;
  let totalPopular = 0;
  let totalModerate = 0;
  let totalDeepCuts = 0;

  playlistIds.forEach(playlistId => {
    const quadrants = popularityPools[playlistId];
    const stats = getQuadrantStats(quadrants);
    playlistStats[playlistId] = stats;

    totalTracks += stats.totalTracks;
    totalTopHits += stats.quadrantCounts.topHits;
    totalPopular += stats.quadrantCounts.popular;
    totalModerate += stats.quadrantCounts.moderate;
    totalDeepCuts += stats.quadrantCounts.deepCuts;
  });

  return {
    totalPlaylists: playlistIds.length,
    totalTracks,
    playlistStats,
    overallDistribution: {
      topHits: totalTopHits,
      popular: totalPopular,
      moderate: totalModerate,
      deepCuts: totalDeepCuts,
    },
  };
};
