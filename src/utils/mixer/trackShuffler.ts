// Track shuffling and randomization utilities

import {
  TrackWithPopularity,
  PopularityQuadrants,
  PopularityPools,
} from './types';

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array (original array is not modified)
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Shuffle tracks within each quadrant of a popularity quadrants object
 * @param quadrants - Popularity quadrants to shuffle
 * @returns New quadrants object with shuffled tracks within each quadrant
 */
export const shuffleQuadrants = (
  quadrants: PopularityQuadrants
): PopularityQuadrants => {
  return {
    topHits: shuffleArray(quadrants.topHits),
    popular: shuffleArray(quadrants.popular),
    moderate: shuffleArray(quadrants.moderate),
    deepCuts: shuffleArray(quadrants.deepCuts),
  };
};

/**
 * Shuffle tracks within popularity groups for all playlists
 * @param popularityPools - Popularity pools for all playlists
 * @returns New popularity pools with shuffled tracks within each quadrant
 */
export const shuffleWithinGroups = (
  popularityPools: PopularityPools
): PopularityPools => {
  const shuffledPools: PopularityPools = {};

  Object.keys(popularityPools).forEach(playlistId => {
    shuffledPools[playlistId] = shuffleQuadrants(popularityPools[playlistId]);
  });

  return shuffledPools;
};

/**
 * Get a random track from an array with optional exclusion support
 * @param tracks - Array of tracks to select from
 * @param excludeIds - Set of track IDs to exclude from selection
 * @returns Random track from the array, or null if no valid tracks available
 */
export const getRandomTrack = (
  tracks: TrackWithPopularity[],
  excludeIds?: Set<string>
): TrackWithPopularity | null => {
  if (!tracks || tracks.length === 0) {
    return null;
  }

  // Filter out excluded tracks if exclusion set is provided
  const availableTracks = excludeIds
    ? tracks.filter(track => !excludeIds.has(track.id))
    : tracks;

  if (availableTracks.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableTracks.length);
  return availableTracks[randomIndex];
};

/**
 * Get multiple random tracks from an array with exclusion support
 * @param tracks - Array of tracks to select from
 * @param count - Number of tracks to select
 * @param excludeIds - Set of track IDs to exclude from selection
 * @returns Array of random tracks (may be fewer than requested if not enough available)
 */
export const getRandomTracks = (
  tracks: TrackWithPopularity[],
  count: number,
  excludeIds?: Set<string>
): TrackWithPopularity[] => {
  if (!tracks || tracks.length === 0 || count <= 0) {
    return [];
  }

  // Filter out excluded tracks if exclusion set is provided
  const availableTracks = excludeIds
    ? tracks.filter(track => !excludeIds.has(track.id))
    : [...tracks]; // Create copy to avoid modifying original

  if (availableTracks.length === 0) {
    return [];
  }

  // Shuffle the available tracks and take the first 'count' items
  const shuffledTracks = shuffleArray(availableTracks);
  return shuffledTracks.slice(0, Math.min(count, shuffledTracks.length));
};

/**
 * Shuffle tracks within quadrants while maintaining quadrant structure
 * Used when shuffleWithinGroups option is enabled
 * @param quadrants - Popularity quadrants to process
 * @param shouldShuffle - Whether to actually shuffle or return as-is
 * @returns Quadrants with optionally shuffled tracks
 */
export const conditionalShuffleQuadrants = (
  quadrants: PopularityQuadrants,
  shouldShuffle: boolean
): PopularityQuadrants => {
  if (!shouldShuffle) {
    return quadrants;
  }

  return shuffleQuadrants(quadrants);
};
