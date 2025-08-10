// Complex mixing calculations and logic
// This module handles the detailed calculations for mixing ratios, target counts, and track selection

import { MixOptions, RatioConfig } from '../../types/mixer';
import { PlaylistTracks, MixedTrack } from './types';
import {
  safeObjectKeys,
  calculateTotalDuration,
  logDebugInfo,
} from './mixerUtils';

/**
 * Calculate target song counts for each playlist based on ratios and options
 */
export const calculateTargetCounts = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  options: MixOptions,
  playlistIds: string[],
  totalWeight: number
): {
  estimatedTotalSongs: number;
  targetCounts: { [key: string]: number };
} => {
  const { totalSongs, targetDuration, useTimeLimit, useAllSongs } = options;

  let estimatedTotalSongs: number;

  if (useAllSongs) {
    estimatedTotalSongs = calculateOptimalMixLength(
      playlistTracks,
      ratioConfig,
      playlistIds,
      totalWeight
    );
  } else if (useTimeLimit) {
    estimatedTotalSongs = Math.ceil(targetDuration / 3.5);
  } else {
    estimatedTotalSongs = totalSongs;
  }

  // Calculate target counts for each playlist
  const targetCounts: { [key: string]: number } = {};
  playlistIds.forEach(playlistId => {
    const weight = ratioConfig[playlistId].weight || 1;
    const targetRatio = weight / totalWeight;
    targetCounts[playlistId] = Math.round(estimatedTotalSongs * targetRatio);

    logDebugInfo(
      'info',
      `🎯 ${playlistId}: weight ${weight}/${totalWeight} = ${Math.round(targetRatio * 100)}% → ~${targetCounts[playlistId]} songs`
    );
  });

  return { estimatedTotalSongs, targetCounts };
};

/**
 * Calculate optimal mix length for "use all songs" mode
 */
const calculateOptimalMixLength = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  playlistIds: string[],
  totalWeight: number
): number => {
  const hasTimeBasedWeighting = playlistIds.some(
    id => ratioConfig[id].weightType === 'time'
  );

  if (hasTimeBasedWeighting) {
    return calculateOptimalMixLengthByTime(
      playlistTracks,
      ratioConfig,
      playlistIds,
      totalWeight
    );
  } else {
    return calculateOptimalMixLengthByFrequency(
      playlistTracks,
      ratioConfig,
      playlistIds,
      totalWeight
    );
  }
};

/**
 * Calculate optimal mix length based on time weighting
 */
const calculateOptimalMixLengthByTime = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  playlistIds: string[],
  totalWeight: number
): number => {
  let minPossibleDuration = Infinity;

  playlistIds.forEach(playlistId => {
    const config = ratioConfig[playlistId];
    const weight = config.weight || 1;
    const targetRatio = weight / totalWeight;
    const availableCount = playlistTracks[playlistId].length;

    const playlistTracksData = playlistTracks[playlistId] || [];
    const totalDuration = calculateTotalDuration(playlistTracksData);
    const avgDurationSeconds =
      playlistTracksData.length > 0
        ? totalDuration / playlistTracksData.length / 1000
        : 210;
    const availableDurationSeconds = availableCount * avgDurationSeconds;

    const maxTotalDurationIfThisLimits = availableDurationSeconds / targetRatio;

    if (maxTotalDurationIfThisLimits < minPossibleDuration) {
      minPossibleDuration = maxTotalDurationIfThisLimits;
    }

    logDebugInfo(
      'info',
      `📊 ${playlistId}: ${availableCount} songs (${Math.round(availableDurationSeconds / 60)}m), ${Math.round(targetRatio * 100)}% time ratio → max total: ${Math.round(maxTotalDurationIfThisLimits / 60)}m`
    );
  });

  const overallAvgDuration =
    playlistIds.reduce((sum, id) => {
      const playlistTracksData = playlistTracks[id] || [];
      const totalDuration = calculateTotalDuration(playlistTracksData);
      const avgDuration =
        playlistTracksData.length > 0
          ? totalDuration / playlistTracksData.length / 1000
          : 210;
      return sum + avgDuration;
    }, 0) / playlistIds.length;

  const estimatedSongs = Math.floor(
    (minPossibleDuration / overallAvgDuration) * 1.05
  );
  logDebugInfo(
    'info',
    `🎯 useAllSongs (time-based): optimal mix = ${Math.round(minPossibleDuration / 60)}m ≈ ${estimatedSongs} songs`
  );
  return estimatedSongs;
};

/**
 * Calculate optimal mix length based on frequency weighting
 */
const calculateOptimalMixLengthByFrequency = (
  playlistTracks: PlaylistTracks,
  ratioConfig: RatioConfig,
  playlistIds: string[],
  totalWeight: number
): number => {
  let minPossibleSongs = Infinity;

  playlistIds.forEach(playlistId => {
    const weight = ratioConfig[playlistId].weight || 1;
    const targetRatio = weight / totalWeight;
    const availableCount = playlistTracks[playlistId].length;

    const maxTotalIfThisLimits = Math.floor(availableCount / targetRatio);

    if (maxTotalIfThisLimits < minPossibleSongs) {
      minPossibleSongs = maxTotalIfThisLimits;
    }

    logDebugInfo(
      'info',
      `📊 ${playlistId}: ${availableCount} songs, ${Math.round(targetRatio * 100)}% freq ratio → max total: ${maxTotalIfThisLimits}`
    );
  });

  const estimatedSongs = Math.floor(minPossibleSongs * 1.05);
  logDebugInfo(
    'info',
    `🎯 useAllSongs (frequency-based): optimal mix length = ${estimatedSongs} songs (${minPossibleSongs} + 5% buffer)`
  );
  return estimatedSongs;
};

/**
 * Determine if mixing should continue based on options and current state
 */
export const shouldContinueMixing = (
  options: MixOptions,
  mixedTracks: MixedTrack[],
  estimatedTotalSongs: number,
  playlistExhausted: { [key: string]: boolean }
): boolean => {
  if (options.useAllSongs) {
    const hasAvailableTracks = safeObjectKeys(playlistExhausted).some(
      id => !playlistExhausted[id]
    );
    const belowTarget = mixedTracks.length < estimatedTotalSongs;

    return (
      (belowTarget && hasAvailableTracks) ||
      (options.continueWhenPlaylistEmpty && hasAvailableTracks)
    );
  }

  if (options.useTimeLimit) {
    const currentDuration = calculateTotalDuration(mixedTracks) / (1000 * 60);
    return currentDuration < options.targetDuration;
  }

  return mixedTracks.length < options.totalSongs;
};

/**
 * Check if mixing should stop due to exhausted playlists
 */
export const shouldStopDueToExhaustion = (
  continueWhenPlaylistEmpty: boolean,
  playlistExhausted: { [key: string]: boolean },
  totalPlaylistCount: number
): boolean => {
  const exhaustedPlaylists = safeObjectKeys(playlistExhausted).filter(
    id => playlistExhausted[id]
  );

  if (!continueWhenPlaylistEmpty && exhaustedPlaylists.length > 0) {
    logDebugInfo(
      'info',
      `🛑 Stopping due to exhausted playlist(s): ${exhaustedPlaylists.join(', ')}`
    );
    return true;
  }

  if (exhaustedPlaylists.length === totalPlaylistCount) {
    logDebugInfo('info', '🛑 All playlists exhausted, stopping');
    return true;
  }

  return false;
};

/**
 * Get the next playlist ID to select from based on weight ratios
 */
export const getNextPlaylistId = (
  ratioConfig: RatioConfig,
  totalWeight: number,
  playlistCounts: { [key: string]: number },
  playlistDurations: { [key: string]: number },
  playlistExhausted: { [key: string]: boolean },
  mixedTracks: MixedTrack[],
  popularityPools: any,
  estimatedTotalSongs: number,
  strategy: any,
  playlistIds: string[]
): string | null => {
  let bestPlaylistId: string | null = null;
  let maxDeficit = -1;

  for (const playlistId of playlistIds) {
    if (playlistExhausted[playlistId]) continue;

    const config = ratioConfig[playlistId];
    const targetRatio = (config.weight || 1) / totalWeight;
    let currentRatio = 0;

    if (config.weightType === 'time') {
      const totalDurationSoFar = Object.values(playlistDurations).reduce(
        (sum, dur) => sum + dur,
        0
      );
      if (totalDurationSoFar > 0) {
        currentRatio = playlistDurations[playlistId] / totalDurationSoFar;
      }
    } else {
      if (mixedTracks.length > 0) {
        currentRatio = playlistCounts[playlistId] / mixedTracks.length;
      }
    }

    const deficit = targetRatio - currentRatio;

    // Check if playlist still has available tracks
    const availableTracksForPlaylist = strategy.getTracksForPosition(
      popularityPools,
      playlistId,
      mixedTracks.length,
      estimatedTotalSongs
    );
    const usedTrackIds = new Set(mixedTracks.map(t => t.id));
    const hasAvailableTracks = availableTracksForPlaylist.some(
      (track: any) => !usedTrackIds.has(track.id)
    );

    if (!hasAvailableTracks) {
      playlistExhausted[playlistId] = true;
      logDebugInfo('info', `🚫 Playlist ${playlistId} is now exhausted`);
      continue;
    }

    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      bestPlaylistId = playlistId;
    }
  }

  return bestPlaylistId;
};

/**
 * Add songs from the selected playlist to the mix
 */
export const addSongsFromPlaylist = (
  playlistId: string,
  ratioConfig: RatioConfig,
  totalWeight: number,
  popularityPools: any,
  estimatedTotalSongs: number,
  strategy: any,
  mixedTracks: MixedTrack[],
  playlistCounts: { [key: string]: number },
  playlistDurations: { [key: string]: number },
  shouldContinue: () => boolean
): number => {
  const config = ratioConfig[playlistId];
  const currentPosition = mixedTracks.length;

  const availableTracks = strategy.getTracksForPosition(
    popularityPools,
    playlistId,
    currentPosition,
    estimatedTotalSongs
  );

  if (availableTracks.length === 0) {
    return 0;
  }

  // Determine how many songs to take
  let songsToTake = config.min || 1;

  // Check if we should add more songs to balance time
  if (config.max > config.min) {
    const totalDurationSoFar = Object.values(playlistDurations).reduce(
      (sum, dur) => sum + dur,
      0
    );
    const currentPlaylistShare = playlistDurations[playlistId];
    const targetRatio = (config.weight || 1) / totalWeight;
    const expectedShare = totalDurationSoFar * targetRatio;

    if (currentPlaylistShare < expectedShare * 0.8) {
      songsToTake = config.max;
      logDebugInfo(
        'info',
        `Adding extra songs to ${playlistId} for time balance`
      );
    }
  }

  logDebugInfo(
    'info',
    `🎼 Adding ${songsToTake} songs from playlist ${playlistId} (position ${currentPosition}/${estimatedTotalSongs})`
  );

  // Add songs from this playlist
  let songsAdded = 0;
  const usedTrackIds = new Set(mixedTracks.map(t => t.id));

  for (let i = 0; i < songsToTake && shouldContinue(); i++) {
    let selectedTrack = null;
    for (const track of availableTracks) {
      if (!usedTrackIds.has(track.id)) {
        selectedTrack = track;
        break;
      }
    }

    if (selectedTrack) {
      const mixedTrack: MixedTrack = {
        ...selectedTrack,
        sourcePlaylist: playlistId,
      };

      mixedTracks.push(mixedTrack);
      usedTrackIds.add(selectedTrack.id);

      playlistCounts[playlistId]++;
      playlistDurations[playlistId] += selectedTrack.duration_ms || 0;
      songsAdded++;

      logDebugInfo(
        'info',
        `   ✅ Added: ${selectedTrack.name} by ${selectedTrack.artists[0]?.name}`
      );
    } else {
      break;
    }
  }

  return songsAdded;
};
