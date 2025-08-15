// Utility functions for track management

import { MixedTrack, SpotifyTrack } from '../types';

/**
 * Format duration from milliseconds to MM:SS format
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get track quadrant based on track properties
 * This is a simplified version that uses popularity as a proxy
 */
export function getTrackQuadrant(track: SpotifyTrack): string {
  // Simplified logic using popularity and track name length as proxies
  // In a real implementation, this would use audio features
  const popularity = track.popularity || 50;
  const nameLength = track.name.length;

  if (popularity > 50 && nameLength > 20) return 'high-energy-high-valence';
  if (popularity > 50 && nameLength <= 20) return 'high-energy-low-valence';
  if (popularity <= 50 && nameLength > 20) return 'low-energy-high-valence';
  return 'low-energy-low-valence';
}

/**
 * Get popularity style based on quadrant and popularity
 */
export function getPopularityStyle(
  quadrant: string,
  popularity?: number
): { background: string; color: string; text: string } {
  // This is a simplified version - the original might have more complex logic
  const popularityText = popularity ? `${popularity}%` : '';

  switch (quadrant) {
    case 'high-energy-high-valence':
      return { background: '#4CAF50', color: '#fff', text: popularityText };
    case 'high-energy-low-valence':
      return { background: '#FF5722', color: '#fff', text: popularityText };
    case 'low-energy-high-valence':
      return { background: '#2196F3', color: '#fff', text: popularityText };
    default:
      return { background: '#9E9E9E', color: '#fff', text: popularityText };
  }
}

/**
 * Generate a unique instance ID for a track
 * This allows the same Spotify track to be added multiple times
 */
export function generateTrackInstanceId(): string {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the unique identifier for drag/drop operations
 * Uses instanceId if available, falls back to Spotify track ID
 */
export function getTrackDragId(track: MixedTrack): string {
  return track.instanceId || track.id;
}

/**
 * Create a MixedTrack with a unique instance ID
 * This allows adding the same Spotify track multiple times
 */
export function createMixedTrackInstance(
  track: SpotifyTrack | MixedTrack,
  sourcePlaylist: string
): MixedTrack {
  const mixedTrack: MixedTrack = {
    ...track,
    sourcePlaylist,
    instanceId: generateTrackInstanceId(),
  };

  return mixedTrack;
}

/**
 * Ensure a track has an instance ID
 * If it doesn't have one, generate it
 */
export function ensureTrackInstanceId(track: MixedTrack): MixedTrack {
  if (!track.instanceId) {
    return {
      ...track,
      instanceId: generateTrackInstanceId(),
    };
  }
  return track;
}
