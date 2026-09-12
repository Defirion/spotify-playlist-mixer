// Track shuffling and randomization utilities.

import { SpotifyTrack } from '../../types/spotify';

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

/** Shuffle each playlist independently without mutating the input map. */
export const shufflePlaylistTracks = (
  playlistTracks: Record<string, SpotifyTrack[]>
): Record<string, SpotifyTrack[]> =>
  Object.fromEntries(
    Object.entries(playlistTracks).map(([playlistId, tracks]) => [
      playlistId,
      shuffleArray(tracks),
    ])
  );

/**
 * Get a random track from an array with optional exclusion support
 * @param tracks - Array of tracks to select from
 * @param excludeIds - Set of track IDs to exclude from selection
 * @returns Random track from the array, or null if no valid tracks available
 */
export const getRandomTrack = (
  tracks: SpotifyTrack[],
  excludeIds?: Set<string>
): SpotifyTrack | null => {
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
  tracks: SpotifyTrack[],
  count: number,
  excludeIds?: Set<string>
): SpotifyTrack[] => {
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
