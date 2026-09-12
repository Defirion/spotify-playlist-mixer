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
