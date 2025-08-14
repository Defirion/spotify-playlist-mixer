// Track utility functions (extracted from removed dragAndDrop utilities)

import { SpotifyTrack } from '../types/spotify';

/**
 * Format duration from milliseconds to human-readable format
 */
export const formatDuration = (durationMs: number): string => {
  if (typeof durationMs !== 'number' || durationMs < 0 || isNaN(durationMs)) {
    return '0:00';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get track quadrant based on audio features (simplified version)
 */
export const getTrackQuadrant = (track: SpotifyTrack): string => {
  // Simplified implementation - in the future this could use audio features
  // For now, return a default quadrant
  return 'moderate-energy-moderate-valence';
};

/**
 * Get popularity style based on quadrant and popularity score
 */
export const getPopularityStyle = (
  quadrant: string,
  popularity: number
): { background: string; color: string; text: string } | null => {
  if (typeof popularity !== 'number') {
    return null;
  }

  // Simple popularity styling based on score
  if (popularity >= 80) {
    return {
      background: '#4CAF50',
      color: '#fff',
      text: 'Hit',
    };
  } else if (popularity >= 60) {
    return {
      background: '#FF9800',
      color: '#fff',
      text: 'Popular',
    };
  } else if (popularity >= 40) {
    return {
      background: '#2196F3',
      color: '#fff',
      text: 'Moderate',
    };
  } else {
    return {
      background: '#9C27B0',
      color: '#fff',
      text: 'Deep Cut',
    };
  }
};
