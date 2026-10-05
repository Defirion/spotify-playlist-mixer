// Track shuffling and randomization utilities.

import { Track } from '../../types/domain';

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
  playlistTracks: Record<string, Track[]>
): Record<string, Track[]> =>
  Object.fromEntries(
    Object.entries(playlistTracks).map(([playlistId, tracks]) => [
      playlistId,
      shuffleArray(tracks),
    ])
  );
