// Calculations for ratio-aware playlist mixing.

import { MixOptions, RatioConfig } from '../../types/mixer';
import { PlaylistTracks, MixedTrack } from './types';
import {
  safeObjectKeys,
  calculateTotalDuration,
  logDebugInfo,
} from './mixerUtils';

export const shouldContinueMixing = (
  options: MixOptions,
  mixedTracks: MixedTrack[],
  playlistExhausted: { [key: string]: boolean }
): boolean => {
  const hasAvailableTracks = safeObjectKeys(playlistExhausted).some(
    id => !playlistExhausted[id]
  );

  if (options.useAllSongs) {
    return hasAvailableTracks;
  }

  if (options.useTimeLimit) {
    return (
      hasAvailableTracks &&
      calculateTotalDuration(mixedTracks) / 1000 < options.targetDurationSeconds
    );
  }

  return hasAvailableTracks && mixedTracks.length < options.totalSongs;
};

export const shouldStopDueToExhaustion = (
  continueWhenPlaylistEmpty: boolean,
  playlistExhausted: { [key: string]: boolean },
  totalPlaylistCount: number
): boolean => {
  const exhaustedCount = safeObjectKeys(playlistExhausted).filter(
    id => playlistExhausted[id]
  ).length;

  return (
    exhaustedCount === totalPlaylistCount ||
    (!continueWhenPlaylistEmpty && exhaustedCount > 0)
  );
};

/** Select the playlist furthest below its configured ratio. */
export const getNextPlaylistId = (
  ratioConfig: RatioConfig,
  totalWeight: number,
  playlistCounts: { [key: string]: number },
  playlistDurations: { [key: string]: number },
  playlistExhausted: { [key: string]: boolean },
  mixedTracks: MixedTrack[],
  playlistTracks: PlaylistTracks,
  playlistIds: string[]
): string | null => {
  let bestPlaylistId: string | null = null;
  let maxDeficit = -Infinity;

  for (const playlistId of playlistIds) {
    if (playlistExhausted[playlistId]) continue;

    const availableTracks = playlistTracks[playlistId] || [];
    const usedTrackIds = new Set(mixedTracks.map(track => track.id));
    if (!availableTracks.some(track => !usedTrackIds.has(track.id))) {
      playlistExhausted[playlistId] = true;
      continue;
    }

    const config = ratioConfig[playlistId];
    const targetRatio = (config.weight || 1) / totalWeight;
    const totalDuration = Object.values(playlistDurations).reduce(
      (sum, duration) => sum + duration,
      0
    );
    const currentRatio =
      config.weightType === 'time'
        ? totalDuration > 0
          ? playlistDurations[playlistId] / totalDuration
          : 0
        : mixedTracks.length > 0
          ? playlistCounts[playlistId] / mixedTracks.length
          : 0;
    const deficit = targetRatio - currentRatio;

    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      bestPlaylistId = playlistId;
    }
  }

  return bestPlaylistId;
};

/** Add one configured group from a playlist to the mix. */
export const addSongsFromPlaylist = (
  playlistId: string,
  ratioConfig: RatioConfig,
  totalWeight: number,
  playlistTracks: PlaylistTracks,
  mixedTracks: MixedTrack[],
  playlistCounts: { [key: string]: number },
  playlistDurations: { [key: string]: number },
  shouldContinue: () => boolean
): number => {
  const config = ratioConfig[playlistId];
  const availableTracks = playlistTracks[playlistId] || [];
  const usedTrackIds = new Set(mixedTracks.map(track => track.id));
  let songsToTake = Math.max(1, config.min || 1);

  if (config.max > config.min) {
    const totalDuration = Object.values(playlistDurations).reduce(
      (sum, duration) => sum + duration,
      0
    );
    const targetRatio = (config.weight || 1) / totalWeight;
    if (
      config.weightType === 'time' &&
      totalDuration > 0 &&
      playlistDurations[playlistId] < totalDuration * targetRatio * 0.8
    ) {
      songsToTake = config.max;
    }
  }

  let songsAdded = 0;
  for (const track of availableTracks) {
    if (songsAdded >= songsToTake || !shouldContinue()) break;
    if (usedTrackIds.has(track.id)) continue;

    mixedTracks.push({
      ...track,
      sourcePlaylist: playlistId,
      instanceId: `mix:${playlistId}:${track.id}`,
    });
    usedTrackIds.add(track.id);
    playlistCounts[playlistId]++;
    playlistDurations[playlistId] += track.durationMs || 0;
    songsAdded++;

    logDebugInfo('info', `Added ${track.title} from playlist ${playlistId}`);
  }

  return songsAdded;
};
