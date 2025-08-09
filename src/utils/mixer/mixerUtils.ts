// Utility functions for the playlist mixer

import { SpotifyTrack } from '../../types/spotify';
import { PlaylistTracks, DebugInfo } from './types';

/**
 * Defensive Object.keys helper to ensure proper array behavior
 * Handles edge cases where Object.keys might return invalid arrays
 */
export const safeObjectKeys = (obj: any): string[] => {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const keys = Object.keys(obj);

  // Ensure the result is a proper array with filter method
  if (!Array.isArray(keys) || typeof keys.filter !== 'function') {
    // Use console.warn directly to avoid potential circular dependency
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ Object.keys returned invalid array, creating manual array'
      );
    }
    const manualKeys: string[] = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        manualKeys.push(key);
      }
    }
    return manualKeys;
  }

  return keys;
};

/**
 * Calculate total duration for a set of tracks (in milliseconds)
 */
export const calculateTotalDuration = (tracks: SpotifyTrack[]): number => {
  if (!Array.isArray(tracks)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ calculateTotalDuration received non-array input', {
        tracks,
      });
    }
    return 0;
  }

  return tracks.reduce((total, track) => {
    if (!track || typeof track.duration_ms !== 'number') {
      return total;
    }
    return total + track.duration_ms;
  }, 0);
};

/**
 * Validate that a track object has the required properties
 */
export const validateTrack = (track: any): track is SpotifyTrack => {
  if (!track || typeof track !== 'object') {
    return false;
  }

  // Check for required properties
  const hasId = typeof track.id === 'string' && track.id.length > 0;
  const hasUri = typeof track.uri === 'string' && track.uri.length > 0;
  const hasName = typeof track.name === 'string' && track.name.length > 0;

  return hasId && hasUri && hasName;
};

/**
 * Clean playlist tracks by removing invalid tracks and empty playlists
 */
export const cleanPlaylistTracks = (playlistTracks: any): PlaylistTracks => {
  if (!playlistTracks || typeof playlistTracks !== 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ cleanPlaylistTracks received invalid input', {
        playlistTracks,
      });
    }
    return {};
  }

  const cleanedPlaylistTracks: PlaylistTracks = {};

  safeObjectKeys(playlistTracks).forEach(playlistId => {
    const playlistData = playlistTracks[playlistId];

    // Ensure we have an array before calling filter
    let tracksArray: any[];
    if (Array.isArray(playlistData)) {
      tracksArray = playlistData;
    } else if (
      playlistData &&
      typeof playlistData === 'object' &&
      Array.isArray((playlistData as any).tracks)
    ) {
      // Handle case where data might be wrapped in an object with tracks property
      tracksArray = (playlistData as any).tracks;
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Invalid playlist data for ${playlistId}, using empty array`
        );
      }
      tracksArray = [];
    }

    // Filter out invalid tracks
    const validTracks = tracksArray.filter(validateTrack);

    if (validTracks.length > 0) {
      cleanedPlaylistTracks[playlistId] = validTracks;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `ℹ️ Cleaned playlist ${playlistId}: ${validTracks.length} valid tracks from ${tracksArray.length} total`
      );
    }
  });

  return cleanedPlaylistTracks;
};

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
 * Centralized debug logging function with consistent formatting
 */
export const logDebugInfo = (
  level: DebugInfo['level'],
  message: string,
  data?: any
): void => {
  // Only log in development environment
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';

  const logMessage = `${prefix} [${timestamp}] ${message}`;

  if (data !== undefined) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
};
